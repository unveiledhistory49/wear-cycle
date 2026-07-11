import { eachDayOfInterval, format, parseISO, subDays } from 'date-fns'
import type { ClothingItem, Occasion, WearLog } from '../types'
import { buildItemStats } from './stats'

export interface PackSuggestion {
  item: ClothingItem
  score: number
  reasons: string[]
}

/**
 * Suggest items for a trip that avoid recent repeats and match occasion/season.
 * Score: higher = better to pack.
 */
export function suggestPacking(opts: {
  items: ClothingItem[]
  logs: WearLog[]
  startDate: string
  endDate: string
  occasion: Occasion | 'any'
  lookbackDays?: number
  limit?: number
}): PackSuggestion[] {
  const {
    items,
    logs,
    startDate,
    endDate,
    occasion,
    lookbackDays = 21,
    limit = 24,
  } = opts

  const start = parseISO(startDate)
  const end = parseISO(endDate)
  const tripDays = Math.max(
    1,
    eachDayOfInterval({ start, end }).length,
  )
  const lookbackFrom = format(subDays(start, lookbackDays), 'yyyy-MM-dd')
  const stats = buildItemStats(items, logs, start)

  const recentIds = new Set<string>()
  for (const log of logs) {
    if (log.date >= lookbackFrom && log.date < startDate) {
      log.itemIds.forEach((id) => recentIds.add(id))
    }
  }

  // month of trip for rough season
  const month = start.getMonth() + 1
  const tripSeasons = seasonsForMonth(month)

  const suggestions: PackSuggestion[] = []

  for (const s of stats) {
    const { item } = s
    const reasons: string[] = []
    let score = 50

    // occasion match
    if (occasion !== 'any') {
      if (item.occasions.includes(occasion)) {
        score += 25
        reasons.push(`fits ${occasion}`)
      } else if (item.occasions.includes('casual') && occasion === 'travel') {
        score += 10
        reasons.push('casual / travel-friendly')
      } else if (item.occasions.length > 0) {
        score -= 15
      }
    }

    // season match
    const seasonOk =
      item.seasons.includes('all') ||
      item.seasons.some((se) => tripSeasons.includes(se))
    if (seasonOk) {
      score += 15
      reasons.push('season match')
    } else {
      score -= 20
      reasons.push('off-season')
    }

    // avoid recent wears
    if (recentIds.has(item.id)) {
      score -= 35
      reasons.push(`worn in last ${lookbackDays}d`)
    } else if (s.lastWorn) {
      score += 12
      reasons.push(`last worn ${s.lastWorn}`)
    } else {
      score += 18
      reasons.push('never logged — good rotation')
    }

    // overused this month → deprioritize
    if (s.wearsLast30 >= 6) {
      score -= 20
      reasons.push(`worn ${s.wearsLast30}× in 30d (rut risk)`)
    } else if (s.wearsLast30 === 0) {
      score += 8
    }

    // variety by category bias: tops/bottoms slightly preferred
    if (item.category === 'tops' || item.category === 'bottoms') score += 5
    if (item.category === 'shoes') score += 3

    suggestions.push({ item, score, reasons })
  }

  suggestions.sort((a, b) => b.score - a.score)

  // diversify categories in top picks
  const picked: PackSuggestion[] = []
  const catCount: Record<string, number> = {}
  const maxPerCat = Math.max(2, Math.ceil(tripDays * 0.6))

  for (const s of suggestions) {
    if (picked.length >= limit) break
    const c = s.item.category
    const n = catCount[c] || 0
    // allow more tops/bottoms for multi-day trips
    const cap =
      c === 'tops' || c === 'bottoms'
        ? Math.max(maxPerCat, tripDays)
        : c === 'shoes'
          ? 3
          : maxPerCat
    if (n >= cap && s.score < 70) continue
    catCount[c] = n + 1
    picked.push(s)
  }

  return picked
}

function seasonsForMonth(month: number): string[] {
  // Northern hemisphere defaults — still useful as a soft signal
  if (month >= 3 && month <= 5) return ['spring', 'all']
  if (month >= 6 && month <= 8) return ['summer', 'all']
  if (month >= 9 && month <= 11) return ['fall', 'all']
  return ['winter', 'all']
}

export function tripDayCount(startDate: string, endDate: string): number {
  try {
    return eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate),
    }).length
  } catch {
    return 0
  }
}
