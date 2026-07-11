import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ClothingItem, ExportBundle, Trip, WearLog } from './types'

interface WearCycleDB extends DBSchema {
  items: {
    key: string
    value: ClothingItem
    indexes: { 'by-category': string }
  }
  logs: {
    key: string
    value: WearLog
    indexes: { 'by-date': string }
  }
  trips: {
    key: string
    value: Trip
  }
  photos: {
    key: string
    value: { id: string; blob: Blob }
  }
}

const DB_NAME = 'wearcycle'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<WearCycleDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<WearCycleDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const items = db.createObjectStore('items', { keyPath: 'id' })
        items.createIndex('by-category', 'category')
        const logs = db.createObjectStore('logs', { keyPath: 'id' })
        logs.createIndex('by-date', 'date')
        db.createObjectStore('trips', { keyPath: 'id' })
        db.createObjectStore('photos', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

export function uid(prefix = ''): string {
  return `${prefix}${crypto.randomUUID()}`
}

export async function listItems(): Promise<ClothingItem[]> {
  const db = await getDb()
  const items = await db.getAll('items')
  return items.sort((a, b) => a.name.localeCompare(b.name))
}

export async function getItem(id: string): Promise<ClothingItem | undefined> {
  const db = await getDb()
  return db.get('items', id)
}

export async function saveItem(item: ClothingItem): Promise<void> {
  const db = await getDb()
  await db.put('items', item)
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getDb()
  const item = await db.get('items', id)
  await db.delete('items', id)
  if (item?.photoId) {
    await db.delete('photos', item.photoId)
  }
  // strip item from logs
  const logs = await db.getAll('logs')
  for (const log of logs) {
    if (log.itemIds.includes(id)) {
      await db.put('logs', {
        ...log,
        itemIds: log.itemIds.filter((x) => x !== id),
      })
    }
  }
}

export async function savePhoto(blob: Blob): Promise<string> {
  const db = await getDb()
  const id = uid('photo_')
  await db.put('photos', { id, blob })
  return id
}

export async function getPhotoUrl(photoId: string | null): Promise<string | null> {
  if (!photoId) return null
  const db = await getDb()
  const row = await db.get('photos', photoId)
  if (!row) return null
  return URL.createObjectURL(row.blob)
}

export async function listLogs(): Promise<WearLog[]> {
  const db = await getDb()
  const logs = await db.getAll('logs')
  return logs.sort((a, b) => b.date.localeCompare(a.date))
}

export async function getLogByDate(date: string): Promise<WearLog | undefined> {
  const db = await getDb()
  const all = await db.getAllFromIndex('logs', 'by-date', date)
  return all[0]
}

export async function saveLog(log: WearLog): Promise<void> {
  const db = await getDb()
  // keep one log per date
  const existing = await db.getAllFromIndex('logs', 'by-date', log.date)
  for (const e of existing) {
    if (e.id !== log.id) await db.delete('logs', e.id)
  }
  await db.put('logs', log)
}

export async function deleteLog(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('logs', id)
}

export async function listTrips(): Promise<Trip[]> {
  const db = await getDb()
  const trips = await db.getAll('trips')
  return trips.sort((a, b) => b.startDate.localeCompare(a.startDate))
}

export async function saveTrip(trip: Trip): Promise<void> {
  const db = await getDb()
  await db.put('trips', trip)
}

export async function deleteTrip(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('trips', id)
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

export async function exportAll(): Promise<ExportBundle> {
  const db = await getDb()
  const items = await db.getAll('items')
  const logs = await db.getAll('logs')
  const trips = await db.getAll('trips')
  const photoRows = await db.getAll('photos')
  const photos: Record<string, string> = {}
  for (const p of photoRows) {
    photos[p.id] = await blobToDataUrl(p.blob)
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
    logs,
    trips,
    photos,
  }
}

export async function importAll(
  bundle: ExportBundle,
  mode: 'merge' | 'replace',
): Promise<void> {
  const db = await getDb()
  if (mode === 'replace') {
    await db.clear('items')
    await db.clear('logs')
    await db.clear('trips')
    await db.clear('photos')
  }
  for (const [id, dataUrl] of Object.entries(bundle.photos || {})) {
    try {
      const blob = await dataUrlToBlob(dataUrl)
      await db.put('photos', { id, blob })
    } catch {
      // skip broken photo
    }
  }
  for (const item of bundle.items || []) {
    await db.put('items', item)
  }
  for (const log of bundle.logs || []) {
    await db.put('logs', log)
  }
  for (const trip of bundle.trips || []) {
    await db.put('trips', trip)
  }
}

/** Compress image for storage — keep uploads small, no server needed. */
export async function compressImage(
  file: File,
  maxSide = 900,
  quality = 0.72,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob || file),
      'image/jpeg',
      quality,
    )
  })
}
