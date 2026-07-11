import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import type { ClothingItem, Occasion, Trip, WearLog } from '../types'
import { OCCASIONS } from '../types'
import { deleteTrip, saveTrip, uid } from '../storage'
import { suggestPacking, tripDayCount } from '../lib/packing'
import { ItemThumb } from './ItemThumb'

export function TripsView({
  items,
  logs,
  trips,
  onChange,
}: {
  items: ClothingItem[]
  logs: WearLog[]
  trips: Trip[]
  onChange: () => void
}) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState(() =>
    format(new Date(), 'yyyy-MM-dd'),
  )
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [occasion, setOccasion] = useState<Occasion | 'any'>('travel')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)

  const suggestions = useMemo(() => {
    return suggestPacking({
      items,
      logs,
      startDate,
      endDate,
      occasion,
    })
  }, [items, logs, startDate, endDate, occasion])

  const days = tripDayCount(startDate, endDate)
  const showSuggestions = preview || !!activeId

  async function createTrip(packedIds?: string[]) {
    if (!name.trim()) {
      alert('Give the trip a name')
      return
    }
    if (endDate < startDate) {
      alert('End date must be on or after start')
      return
    }
    const pack = packedIds ?? suggestions.map((s) => s.item.id)
    const trip: Trip = {
      id: uid('trip_'),
      name: name.trim(),
      startDate,
      endDate,
      occasion,
      packedItemIds: pack,
      createdAt: new Date().toISOString(),
    }
    await saveTrip(trip)
    setActiveId(trip.id)
    setName('')
    setPreview(true)
    onChange()
  }

  return (
    <section className="view">
      <header className="view-header">
        <div>
          <h1>Trips</h1>
          <p className="muted">Pack without repeating recent outfits</p>
        </div>
      </header>

      <div className="card form trip-form">
        <label>
          Trip name
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="NYC work week"
          />
        </label>
        <div className="form-row">
          <label>
            Start
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label>
            End
            <input
              type="date"
              className="input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>
        <label>
          Occasion
          <select
            className="input"
            value={occasion}
            onChange={(e) =>
              setOccasion(e.target.value as Occasion | 'any')
            }
          >
            <option value="any">Any</option>
            {OCCASIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">
          {days > 0 ? `${days} day${days === 1 ? '' : 's'}` : 'Check dates'} ·
          suggestions skip items worn in the 21 days before the trip
        </p>
        <div className="form-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => setPreview(true)}
            disabled={items.length === 0}
          >
            Preview suggestions
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => void createTrip()}
            disabled={items.length === 0}
          >
            Save packing list
          </button>
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="stat-block">
          <h2>Suggested pack ({suggestions.length})</h2>
          <ul className="stat-list">
            {suggestions.map((s) => (
              <li key={s.item.id}>
                <ItemThumb item={s.item} size={44} />
                <div className="stat-list-meta">
                  <strong>{s.item.name}</strong>
                  <span className="muted">{s.reasons.slice(0, 2).join(' · ')}</span>
                </div>
                <span className="stat-badge muted-badge">{s.item.category}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length === 0 && (
        <div className="empty">
          <p>Add wardrobe items first so we can suggest a pack list.</p>
        </div>
      )}

      {trips.length > 0 && (
        <div className="stat-block">
          <h2>Saved trips</h2>
          <ul className="item-list">
            {trips.map((t) => {
              const packed = items.filter((i) => t.packedItemIds.includes(i.id))
              return (
                <li key={t.id} className="item-row trip-row">
                  <div className="item-meta">
                    <strong>{t.name}</strong>
                    <span className="muted">
                      {t.startDate} → {t.endDate} · {t.occasion} ·{' '}
                      {packed.length} items
                    </span>
                    <div className="thumb-row wrap">
                      {packed.slice(0, 8).map((i) => (
                        <ItemThumb key={i.id} item={i} size={36} />
                      ))}
                    </div>
                  </div>
                  <div className="item-actions">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        setActiveId(t.id)
                        setStartDate(t.startDate)
                        setEndDate(t.endDate)
                        setOccasion(t.occasion)
                        setPreview(true)
                      }}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="btn ghost danger"
                      onClick={async () => {
                        if (!confirm(`Delete trip “${t.name}”?`)) return
                        await deleteTrip(t.id)
                        if (activeId === t.id) setActiveId(null)
                        onChange()
                      }}
                    >
                      Del
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
