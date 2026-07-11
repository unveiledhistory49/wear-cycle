import { useMemo, useState } from 'react'
import type { Category, ClothingItem, Occasion, Season } from '../types'
import { CATEGORIES, COLORS, OCCASIONS, SEASONS } from '../types'
import {
  compressImage,
  deleteItem,
  saveItem,
  savePhoto,
  uid,
} from '../storage'
import { loadSampleData } from '../lib/seed'
import { ItemThumb } from './ItemThumb'

export function WardrobeView({
  items,
  onChange,
}: {
  items: ClothingItem[]
  onChange: () => void
}) {
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all')
  const [filterColor, setFilterColor] = useState<string>('all')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<ClothingItem | null>(null)
  const [adding, setAdding] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (filterCat !== 'all' && i.category !== filterCat) return false
      if (filterColor !== 'all' && i.color !== filterColor) return false
      if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [items, filterCat, filterColor, q])

  return (
    <section className="view">
      <header className="view-header">
        <div>
          <h1>Wardrobe</h1>
          <p className="muted">{items.length} pieces</p>
        </div>
        <button type="button" className="btn primary" onClick={() => setAdding(true)}>
          + Add item
        </button>
      </header>

      <div className="filters">
        <input
          className="input"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value as Category | 'all')}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={filterColor}
          onChange={(e) => setFilterColor(e.target.value)}
        >
          <option value="all">All colors</option>
          {COLORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <p>No items yet.</p>
          <p className="muted">Add a piece with a photo and tags — takes 20 seconds.</p>
          <button type="button" className="btn primary" onClick={() => setAdding(true)}>
            Add first item
          </button>
          {items.length === 0 && (
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
              {seeding ? 'Loading demo…' : 'Or load sample data'}
            </button>
          )}
        </div>
      ) : (
        <ul className="item-list">
          {filtered.map((item) => (
            <li key={item.id} className="item-row">
              <ItemThumb item={item} size={64} />
              <div className="item-meta">
                <strong>{item.name}</strong>
                <span className="tags">
                  <span className="tag">{item.color}</span>
                  <span className="tag">{item.category}</span>
                  {item.occasions.slice(0, 2).map((o) => (
                    <span key={o} className="tag subtle">
                      {o}
                    </span>
                  ))}
                </span>
              </div>
              <div className="item-actions">
                <button type="button" className="btn ghost" onClick={() => setEditing(item)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn ghost danger"
                  onClick={async () => {
                    if (!confirm(`Remove “${item.name}”?`)) return
                    await deleteItem(item.id)
                    onChange()
                  }}
                >
                  Del
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(adding || editing) && (
        <ItemFormModal
          initial={editing}
          onClose={() => {
            setAdding(false)
            setEditing(null)
          }}
          onSaved={() => {
            setAdding(false)
            setEditing(null)
            onChange()
          }}
        />
      )}
    </section>
  )
}

function ItemFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: ClothingItem | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? 'black')
  const [category, setCategory] = useState<Category>(initial?.category ?? 'tops')
  const [occasions, setOccasions] = useState<Occasion[]>(initial?.occasions ?? ['casual'])
  const [seasons, setSeasons] = useState<Season[]>(initial?.seasons ?? ['all'])
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleOcc(o: Occasion) {
    setOccasions((prev) =>
      prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o],
    )
  }

  function toggleSeason(s: Season) {
    setSeasons((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    )
  }

  async function onFile(f: File | null) {
    setFile(f)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      let photoId = initial?.photoId ?? null
      if (file) {
        const blob = await compressImage(file)
        photoId = await savePhoto(blob)
      }
      const item: ClothingItem = {
        id: initial?.id ?? uid('item_'),
        name: name.trim(),
        photoId,
        color,
        category,
        occasions: occasions.length ? occasions : ['casual'],
        seasons: seasons.length ? seasons : ['all'],
        notes: notes.trim(),
        createdAt: initial?.createdAt ?? new Date().toISOString(),
      }
      await saveItem(item)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-label={initial ? 'Edit item' : 'Add item'}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2>{initial ? 'Edit item' : 'Add item'}</h2>
          <button type="button" className="btn ghost" onClick={onClose}>
            ✕
          </button>
        </header>
        <form className="form" onSubmit={submit}>
          <label className="photo-drop">
            {preview ? (
              <img src={preview} alt="" />
            ) : (
              <span>Tap to add photo (optional)</span>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <label>
            Name
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Blue oxford shirt"
              autoFocus
            />
          </label>

          <div className="form-row">
            <label>
              Color
              <select className="input" value={color} onChange={(e) => setColor(e.target.value)}>
                {COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Category
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset>
            <legend>Occasion</legend>
            <div className="chip-row">
              {OCCASIONS.map((o) => (
                <button
                  key={o}
                  type="button"
                  className={`chip ${occasions.includes(o) ? 'on' : ''}`}
                  onClick={() => toggleOcc(o)}
                >
                  {o}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Season</legend>
            <div className="chip-row">
              {SEASONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip ${seasons.includes(s) ? 'on' : ''}`}
                  onClick={() => toggleSeason(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>

          <label>
            Notes
            <input
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </label>

          {error && <p className="error">{error}</p>}

          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
