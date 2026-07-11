import { format, subDays } from 'date-fns'
import type { ClothingItem, Trip, WearLog } from '../types'
import { saveItem, saveLog, savePhoto, saveTrip } from '../storage'

type SeedDef = {
  name: string
  color: ClothingItem['color']
  category: ClothingItem['category']
  occasions: ClothingItem['occasions']
  seasons: ClothingItem['seasons']
  notes: string
  /** hex for generated swatch photo */
  hex: string
}

const SEED_ITEMS: SeedDef[] = [
  {
    name: 'Blue oxford shirt',
    color: 'blue',
    category: 'tops',
    occasions: ['work', 'casual'],
    seasons: ['all'],
    notes: 'Office default — often over-rotated',
    hex: '#3b6ea5',
  },
  {
    name: 'White tee',
    color: 'white',
    category: 'tops',
    occasions: ['casual', 'travel', 'sport'],
    seasons: ['spring', 'summer', 'all'],
    notes: '',
    hex: '#f0f0f0',
  },
  {
    name: 'Black crewneck',
    color: 'black',
    category: 'tops',
    occasions: ['casual', 'date', 'travel'],
    seasons: ['fall', 'winter', 'all'],
    notes: '',
    hex: '#1a1a1a',
  },
  {
    name: 'Navy polo',
    color: 'navy',
    category: 'tops',
    occasions: ['casual', 'work'],
    seasons: ['spring', 'summer'],
    notes: '',
    hex: '#1a2a4a',
  },
  {
    name: 'Gray merino sweater',
    color: 'gray',
    category: 'tops',
    occasions: ['work', 'casual', 'travel'],
    seasons: ['fall', 'winter'],
    notes: 'Travel staple',
    hex: '#7a7f88',
  },
  {
    name: 'Olive chinos',
    color: 'olive',
    category: 'bottoms',
    occasions: ['work', 'casual', 'travel'],
    seasons: ['all'],
    notes: '',
    hex: '#6a7a3a',
  },
  {
    name: 'Dark denim',
    color: 'navy',
    category: 'bottoms',
    occasions: ['casual', 'date', 'travel'],
    seasons: ['all'],
    notes: '',
    hex: '#2c3e5a',
  },
  {
    name: 'Black trousers',
    color: 'black',
    category: 'bottoms',
    occasions: ['work', 'formal'],
    seasons: ['all'],
    notes: '',
    hex: '#222222',
  },
  {
    name: 'Beige linen pants',
    color: 'beige',
    category: 'bottoms',
    occasions: ['casual', 'travel'],
    seasons: ['summer'],
    notes: 'Rarely logged — good rotation candidate',
    hex: '#d4c4a8',
  },
  {
    name: 'Charcoal blazer',
    color: 'gray',
    category: 'outerwear',
    occasions: ['work', 'formal', 'date'],
    seasons: ['fall', 'winter', 'spring'],
    notes: '',
    hex: '#4a4f57',
  },
  {
    name: 'Olive field jacket',
    color: 'olive',
    category: 'outerwear',
    occasions: ['casual', 'travel'],
    seasons: ['fall', 'spring'],
    notes: '',
    hex: '#556b2f',
  },
  {
    name: 'White sneakers',
    color: 'white',
    category: 'shoes',
    occasions: ['casual', 'travel', 'sport'],
    seasons: ['all'],
    notes: '',
    hex: '#e8e8e8',
  },
  {
    name: 'Brown derbies',
    color: 'brown',
    category: 'shoes',
    occasions: ['work', 'formal', 'date'],
    seasons: ['all'],
    notes: '',
    hex: '#6b4423',
  },
  {
    name: 'Black belt',
    color: 'black',
    category: 'accessories',
    occasions: ['work', 'formal', 'casual'],
    seasons: ['all'],
    notes: '',
    hex: '#111111',
  },
  {
    name: 'Navy day dress',
    color: 'navy',
    category: 'dresses',
    occasions: ['work', 'date', 'formal'],
    seasons: ['spring', 'summer', 'fall'],
    notes: 'Demo piece for dress category',
    hex: '#243b6b',
  },
]

/** Solid-color JPEG swatch so thumbs look intentional without real photos. */
async function makeSwatchBlob(
  hex: string,
  label: string,
  size = 320,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return new Blob([], { type: 'image/jpeg' })
  }

  ctx.fillStyle = hex
  ctx.fillRect(0, 0, size, size)

  // subtle gradient for depth
  const g = ctx.createLinearGradient(0, 0, size, size)
  g.addColorStop(0, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(0,0,0,0.18)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  ctx.fillStyle = luminance(hex) > 0.55 ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.9)'
  ctx.font = `700 ${Math.round(size * 0.28)}px system-ui,sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials, size / 2, size / 2)

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.85)
  })
}

function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function dayKey(daysAgo: number, now = new Date()): string {
  return format(subDays(now, daysAgo), 'yyyy-MM-dd')
}

/**
 * Loads demo wardrobe + ~5 weeks of wear logs + a sample trip.
 * Uses fixed seed ids so re-running is idempotent (overwrite same demo rows).
 */
export async function loadSampleData(): Promise<{
  items: number
  logs: number
  trips: number
}> {
  const now = new Date()
  const createdAt = now.toISOString()
  const items: ClothingItem[] = []

  for (let i = 0; i < SEED_ITEMS.length; i++) {
    const def = SEED_ITEMS[i]
    const blob = await makeSwatchBlob(def.hex, def.name)
    const photoId = await savePhoto(blob)
    const item: ClothingItem = {
      id: `seed_item_${i + 1}`,
      name: def.name,
      photoId,
      color: def.color,
      category: def.category,
      occasions: def.occasions,
      seasons: def.seasons,
      notes: def.notes,
      createdAt,
    }
    await saveItem(item)
    items.push(item)
  }

  // Stable shorthand
  const id = (n: number) => `seed_item_${n}`
  // 1 blue oxford, 2 white tee, 3 black crew, 4 navy polo, 5 gray sweater
  // 6 olive chinos, 7 dark denim, 8 black trousers, 9 beige linen
  // 10 blazer, 11 field jacket, 12 sneakers, 13 derbies, 14 belt, 15 dress

  type DayPlan = {
    ago: number
    pieces: number[]
    context: string
    notes?: string
  }

  // Intentional pattern: blue oxford + olive chinos overused (style rut).
  // Beige linen / dress barely used. Mix of work / weekend / trip.
  const plans: DayPlan[] = [
    { ago: 0, pieces: [1, 6, 12, 14], context: 'work', notes: 'Today' },
    { ago: 1, pieces: [1, 8, 13, 14], context: 'work' },
    { ago: 2, pieces: [2, 7, 12], context: 'casual', notes: 'Weekend coffee' },
    { ago: 3, pieces: [1, 6, 12, 14], context: 'work' },
    { ago: 4, pieces: [3, 7, 12], context: 'casual' },
    { ago: 5, pieces: [1, 8, 13], context: 'work' },
    { ago: 6, pieces: [4, 6, 12], context: 'casual' },
    { ago: 7, pieces: [1, 6, 12, 14], context: 'work' },
    { ago: 8, pieces: [5, 7, 12], context: 'travel', notes: 'Train day' },
    { ago: 9, pieces: [1, 8, 13, 10], context: 'work', notes: 'Client meeting' },
    { ago: 10, pieces: [2, 7, 12], context: 'casual' },
    { ago: 11, pieces: [1, 6, 12], context: 'work' },
    { ago: 12, pieces: [3, 7, 11, 12], context: 'casual' },
    { ago: 13, pieces: [1, 6, 13, 14], context: 'work' },
    { ago: 14, pieces: [4, 9, 12], context: 'casual', notes: 'Warm afternoon' },
    { ago: 15, pieces: [1, 8, 13], context: 'work' },
    { ago: 16, pieces: [15, 13], context: 'date', notes: 'Dinner' },
    { ago: 17, pieces: [1, 6, 12, 14], context: 'work' },
    { ago: 18, pieces: [2, 7, 12], context: 'sport', notes: 'Walk / errands' },
    { ago: 19, pieces: [5, 8, 13, 10], context: 'work' },
    { ago: 20, pieces: [1, 6, 12], context: 'work' },
    { ago: 21, pieces: [3, 7, 12], context: 'casual' },
    { ago: 22, pieces: [1, 8, 13, 14], context: 'work' },
    { ago: 23, pieces: [4, 6, 12], context: 'casual' },
    { ago: 24, pieces: [1, 6, 12], context: 'work' },
    { ago: 25, pieces: [2, 7, 11, 12], context: 'travel' },
    { ago: 26, pieces: [1, 8, 13], context: 'work' },
    { ago: 27, pieces: [3, 7, 12], context: 'casual' },
    { ago: 28, pieces: [1, 6, 14, 12], context: 'work' },
    { ago: 30, pieces: [5, 7, 12], context: 'casual' },
    { ago: 32, pieces: [1, 8, 13, 10], context: 'formal', notes: 'Event' },
    { ago: 34, pieces: [2, 6, 12], context: 'casual' },
  ]

  let logCount = 0
  for (const p of plans) {
    const log: WearLog = {
      id: `seed_log_${p.ago}`,
      date: dayKey(p.ago, now),
      itemIds: p.pieces.map(id),
      notes: p.notes ?? '',
      context: p.context,
    }
    await saveLog(log)
    logCount += 1
  }

  // Upcoming trip — pack list biased away from overused blue oxford via algorithm
  // but we store an explicit demo pack for the Share copy feature.
  const start = format(subDays(now, -10), 'yyyy-MM-dd') // 10 days from now
  const end = format(subDays(now, -14), 'yyyy-MM-dd')
  const trip: Trip = {
    id: 'seed_trip_1',
    name: 'Demo: long weekend away',
    startDate: start,
    endDate: end,
    occasion: 'travel',
    packedItemIds: [
      id(2),
      id(3),
      id(5),
      id(7),
      id(9),
      id(11),
      id(12),
      id(4),
    ],
    createdAt,
  }
  await saveTrip(trip)

  return { items: items.length, logs: logCount, trips: 1 }
}

export function isSeedItemId(id: string): boolean {
  return id.startsWith('seed_')
}
