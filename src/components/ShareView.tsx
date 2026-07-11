import { useState } from 'react'
import type { ClothingItem, ExportBundle, Trip, WearLog } from '../types'
import { exportAll, importAll } from '../storage'
import { loadSampleData } from '../lib/seed'

export function ShareView({
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
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  async function doSeed() {
    if (
      items.length > 0 &&
      !confirm(
        'Load demo wardrobe + ~5 weeks of wear logs? Existing items with the same demo ids will be overwritten; your other pieces stay.',
      )
    ) {
      return
    }
    setBusy(true)
    setStatus('')
    try {
      const r = await loadSampleData()
      onChange()
      setStatus(
        `Demo loaded: ${r.items} items, ${r.logs} day logs, ${r.trips} trip. Check Stats & Calendar.`,
      )
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Seed failed')
    } finally {
      setBusy(false)
    }
  }

  async function doExport() {
    setBusy(true)
    setStatus('')
    try {
      const bundle = await exportAll()
      const blob = new Blob([JSON.stringify(bundle)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wearcycle-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setStatus('Export downloaded. Share the file with your partner.')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  async function doImport(file: File, mode: 'merge' | 'replace') {
    setBusy(true)
    setStatus('')
    try {
      const text = await file.text()
      const bundle = JSON.parse(text) as ExportBundle
      if (!bundle || bundle.version !== 1 || !Array.isArray(bundle.items)) {
        throw new Error('Not a valid WearCycle export')
      }
      if (
        mode === 'replace' &&
        !confirm('Replace all local data with this file?')
      ) {
        setBusy(false)
        return
      }
      await importAll(bundle, mode)
      onChange()
      setStatus(
        mode === 'merge'
          ? 'Merged partner data into your wardrobe.'
          : 'Replaced local data from file.',
      )
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  function copyPackText() {
    const latest = [...trips].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )[0]
    if (!latest) {
      setStatus('No trip packing list yet — create one under Trips.')
      return
    }
    const names = latest.packedItemIds
      .map((id) => items.find((i) => i.id === id)?.name)
      .filter(Boolean)
    const text = [
      `WearCycle pack: ${latest.name}`,
      `${latest.startDate} → ${latest.endDate} (${latest.occasion})`,
      '',
      ...names.map((n, i) => `${i + 1}. ${n}`),
      '',
      `${logs.length} wear days logged · ${items.length} wardrobe pieces`,
    ].join('\n')
    void navigator.clipboard.writeText(text).then(
      () => setStatus('Packing list copied — paste to partner chat.'),
      () => setStatus(text),
    )
  }

  return (
    <section className="view">
      <header className="view-header">
        <div>
          <h1>Share & backup</h1>
          <p className="muted">No account. Your data stays on this device.</p>
        </div>
      </header>

      <div className="card stack-gap">
        <h2>Partner coordination</h2>
        <p className="muted">
          Export your wardrobe + logs as a file. Your partner imports it (merge)
          to compare pieces, or copy the latest trip packing list into a message.
        </p>
        <div className="form-actions left">
          <button
            type="button"
            className="btn primary"
            onClick={doExport}
            disabled={busy || items.length === 0}
          >
            Export JSON
          </button>
          <button type="button" className="btn ghost" onClick={copyPackText}>
            Copy latest pack list
          </button>
        </div>
      </div>

      <div className="card stack-gap">
        <h2>Import</h2>
        <p className="muted">
          Merge adds their items/logs. Replace wipes yours first.
        </p>
        <div className="form-actions left">
          <label className="btn ghost file-btn">
            Merge file…
            <input
              type="file"
              accept="application/json,.json"
              hidden
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void doImport(f, 'merge')
                e.target.value = ''
              }}
            />
          </label>
          <label className="btn ghost file-btn danger">
            Replace from file…
            <input
              type="file"
              accept="application/json,.json"
              hidden
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void doImport(f, 'replace')
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </div>

      <div className="card stack-gap">
        <h2>Demo data</h2>
        <p className="muted">
          One tap: 15 sample pieces (color swatch photos), 32 wear days with a
          blue-shirt “rut”, and a demo trip packing list.
        </p>
        <div className="form-actions left">
          <button
            type="button"
            className="btn primary"
            onClick={() => void doSeed()}
            disabled={busy}
          >
            {busy ? 'Loading…' : 'Load sample data'}
          </button>
        </div>
      </div>

      <div className="card stack-gap">
        <h2>On this device</h2>
        <p className="muted">
          {items.length} items · {logs.length} day logs · {trips.length} trips
        </p>
        <p className="muted small">
          Photos and history live in browser storage (IndexedDB). Clear site
          data = wipe WearCycle. Export regularly if this wardrobe matters.
        </p>
      </div>

      {status && <p className="toast block-toast">{status}</p>}
    </section>
  )
}
