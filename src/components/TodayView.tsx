import { format, parseISO } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import type { ClothingItem, WearLog } from '../types'
import { deleteLog, saveLog, uid } from '../storage'
import { loadSampleData } from '../lib/seed'
import { ItemThumb } from './ItemThumb'

export function TodayView({
  items,
  logs,
  initialDate,
  onChange,
  onGoWardrobe,
}: {
  items: ClothingItem[]
  logs: WearLog[]
  initialDate?: string
  onChange: () => void
  onGoWardrobe: () => void
}) {
  const [date, setDate] = useState(
    () => initialDate || format(new Date(), 'yyyy-MM-dd'),
  )

  useEffect(() => {
    if (initialDate) setDate(initialDate)
  }, [initialDate])
  const existing = useMemo(() => logs.find((l) => l.date === date), [logs, date])

  const [selected, setSelected] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [context, setContext] = useState('')
  const [logId, setLogId] = useState('')
  const [filter, setFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    const log = logs.find((l) => l.date === date)
    setSelected(log?.itemIds ?? [])
    setNotes(log?.notes ?? '')
    setContext(log?.context ?? '')
    setLogId(log?.id ?? '')
    setMsg('')
  }, [date, logs])

  const filtered = useMemo(() => {
    if (!filter) return items
    const f = filter.toLowerCase()
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(f) ||
        i.color.includes(f) ||
        i.category.includes(f),
    )
  }, [items, filter])

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function save() {
    setSaving(true)
    setMsg('')
    try {
      if (selected.length === 0) {
        if (logId) {
          await deleteLog(logId)
          setLogId('')
          setMsg('Cleared log for this day')
          onChange()
        } else {
          setMsg('Pick at least one item')
        }
        return
      }
      const log: WearLog = {
        id: logId || uid('log_'),
        date,
        itemIds: selected,
        notes: notes.trim(),
        context: context.trim(),
      }
      await saveLog(log)
      setLogId(log.id)
      setMsg('Saved')
      onChange()
    } finally {
      setSaving(false)
    }
  }

  const label = (() => {
    try {
      return format(parseISO(date), 'EEE, MMM d')
    } catch {
      return date
    }
  })()

  const wornItems = items.filter((i) => selected.includes(i.id))

  return (
    <section className="view">
      <header className="view-header">
        <div>
          <h1>Log wear</h1>
          <p className="muted">{label}</p>
        </div>
        <input
          type="date"
          className="input date-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </header>

      {items.length === 0 ? (
        <div className="empty">
          <p>Add clothes first, then log what you wear.</p>
          <button type="button" className="btn primary" onClick={onGoWardrobe}>
            Open wardrobe
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={seeding}
            onClick={async () => {
              setSeeding(true)
              try {
                await loadSampleData()
                onChange()
              } finally {
                setSeeding(false)
              }
            }}
          >
            {seeding ? 'Loading demo…' : 'Load sample data'}
          </button>
        </div>
      ) : (
        <>
          {wornItems.length > 0 && (
            <div className="selected-bar">
              <span className="muted">Wearing:</span>
              <div className="thumb-row">
                {wornItems.map((i) => (
                  <ItemThumb
                    key={i.id}
                    item={i}
                    size={48}
                    selected
                    onClick={() => toggle(i.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="filters">
            <input
              className="input"
              placeholder="Filter wardrobe…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <input
              className="input"
              placeholder="Context (work, trip…)"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>

          <div className="pick-grid">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`pick-card ${selected.includes(item.id) ? 'on' : ''}`}
                onClick={() => toggle(item.id)}
              >
                <ItemThumb
                  item={item}
                  size={72}
                  selected={selected.includes(item.id)}
                />
                <span className="pick-name">{item.name}</span>
                <span className="pick-sub">
                  {item.color} · {item.category}
                </span>
              </button>
            ))}
          </div>

          <label className="block-label">
            Notes
            <input
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </label>

          <div className="sticky-actions">
            {msg && <span className="toast">{msg}</span>}
            <button
              type="button"
              className="btn primary wide"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Saving…' : existing || logId ? 'Update log' : 'Save log'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
