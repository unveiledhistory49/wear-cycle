import {
  differenceInCalendarDays,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import type { ClothingItem, WearLog } from '../types'

export interface ItemStats {
  item: ClothingItem
  wearCount: number
  lastWorn: string | null
  daysSinceWorn: number | null
  wearsThisMonth: number
  wearsLast30: number
}

export function buildItemStats(
  items: ClothingItem[],
  logs: WearLog[],
  now = new Date(),
): ItemStats[] {
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const d30 = format(subDays(now, 30), 'yyyy-MM-dd')
  const today = format(now, 'yyyy-MM-dd')

  return items.map((item) => {
    let wearCount = 0
    let lastWorn: string | null = null
    let wearsThisMonth = 0
    let wearsLast30 = 0

    for (const log of logs) {
      if (!log.itemIds.includes(item.id)) continue
      wearCount += 1
      if (!lastWorn || log.date > lastWorn) lastWorn = log.date
      if (log.date >= monthStart) wearsThisMonth += 1
      if (log.date >= d30 && log.date <= today) wearsLast30 += 1
    }

    const daysSinceWorn =
      lastWorn != null
        ? differenceInCalendarDays(now, parseISO(lastWorn))
        : null

    return {
      item,
      wearCount,
      lastWorn,
      daysSinceWorn,
      wearsThisMonth,
      wearsLast30,
    }
  })
}

export function topWorn(stats: ItemStats[], n = 5): ItemStats[] {
  return [...stats]
    .filter((s) => s.wearCount > 0)
    .sort((a, b) => b.wearCount - a.wearCount || b.wearsLast30 - a.wearsLast30)
    .slice(0, n)
}

export function leastWorn(stats: ItemStats[], n = 5): ItemStats[] {
  return [...stats]
    .sort((a, b) => {
      if (a.wearCount !== b.wearCount) return a.wearCount - b.wearCount
      const ad = a.daysSinceWorn ?? 9999
      const bd = b.daysSinceWorn ?? 9999
      return bd - ad
    })
    .slice(0, n)
}

export function neverWorn(stats: ItemStats[]): ItemStats[] {
  return stats.filter((s) => s.wearCount === 0)
}

export function styleRut(
  stats: ItemStats[],
  threshold = 5,
): ItemStats[] {
  return stats
    .filter((s) => s.wearsLast30 >= threshold)
    .sort((a, b) => b.wearsLast30 - a.wearsLast30)
}

export function wearsInMonth(
  logs: WearLog[],
  yearMonth: string, // YYYY-MM
): number {
  return logs.filter((l) => l.date.startsWith(yearMonth)).length
}

export function uniqueItemsInRange(
  logs: WearLog[],
  from: string,
  to: string,
): number {
  const set = new Set<string>()
  for (const log of logs) {
    if (log.date >= from && log.date <= to) {
      log.itemIds.forEach((id) => set.add(id))
    }
  }
  return set.size
}

export function monthLabel(offset = 0, now = new Date()): string {
  return format(subMonths(now, -offset), 'yyyy-MM')
}
