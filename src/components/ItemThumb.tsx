import type { ClothingItem } from '../types'
import { usePhotoUrl } from '../hooks/usePhotoUrl'

export function ItemThumb({
  item,
  size = 56,
  selected,
  onClick,
}: {
  item: ClothingItem
  size?: number
  selected?: boolean
  onClick?: () => void
}) {
  const url = usePhotoUrl(item.photoId)
  const style = {
    width: size,
    height: size,
  } as const

  const inner = (
    <>
      {url ? (
        <img src={url} alt={item.name} className="thumb-img" />
      ) : (
        <span className="thumb-placeholder" style={{ background: colorSwatch(item.color) }}>
          {item.name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className={`thumb ${selected ? 'thumb-selected' : ''}`}
        style={style}
        onClick={onClick}
        title={item.name}
      >
        {inner}
      </button>
    )
  }

  return (
    <div className={`thumb ${selected ? 'thumb-selected' : ''}`} style={style} title={item.name}>
      {inner}
    </div>
  )
}

function colorSwatch(color: string): string {
  const map: Record<string, string> = {
    black: '#222',
    white: '#eee',
    gray: '#888',
    navy: '#1a2a4a',
    blue: '#3b6ea5',
    red: '#b33',
    pink: '#e8a',
    green: '#3a7',
    olive: '#6a7a3a',
    brown: '#6b4423',
    beige: '#d4c4a8',
    cream: '#f5f0e1',
    yellow: '#e6c200',
    orange: '#e07a2f',
    purple: '#6b4c9a',
    multicolor: 'linear-gradient(135deg,#e66,#6ae,#6e6)',
    other: '#555',
  }
  return map[color] || '#555'
}
