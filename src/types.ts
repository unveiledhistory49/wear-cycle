export type Category =
  | 'tops'
  | 'bottoms'
  | 'dresses'
  | 'outerwear'
  | 'shoes'
  | 'accessories'
  | 'other'

export type Occasion = 'casual' | 'work' | 'formal' | 'travel' | 'sport' | 'date'

export type Season = 'spring' | 'summer' | 'fall' | 'winter' | 'all'

export interface ClothingItem {
  id: string
  name: string
  photoId: string | null
  color: string
  category: Category
  occasions: Occasion[]
  seasons: Season[]
  notes: string
  createdAt: string
}

export interface WearLog {
  id: string
  date: string // YYYY-MM-DD
  itemIds: string[]
  notes: string
  context: string
}

export interface Trip {
  id: string
  name: string
  startDate: string
  endDate: string
  occasion: Occasion | 'any'
  packedItemIds: string[]
  createdAt: string
}

export type View = 'today' | 'wardrobe' | 'calendar' | 'stats' | 'trips' | 'share'

export const CATEGORIES: Category[] = [
  'tops',
  'bottoms',
  'dresses',
  'outerwear',
  'shoes',
  'accessories',
  'other',
]

export const OCCASIONS: Occasion[] = [
  'casual',
  'work',
  'formal',
  'travel',
  'sport',
  'date',
]

export const SEASONS: Season[] = ['spring', 'summer', 'fall', 'winter', 'all']

export const COLORS = [
  'black',
  'white',
  'gray',
  'navy',
  'blue',
  'red',
  'pink',
  'green',
  'olive',
  'brown',
  'beige',
  'cream',
  'yellow',
  'orange',
  'purple',
  'multicolor',
  'other',
]

export interface ExportBundle {
  version: 1
  exportedAt: string
  items: ClothingItem[]
  logs: WearLog[]
  trips: Trip[]
  /** base64 data URLs keyed by photoId */
  photos: Record<string, string>
}
