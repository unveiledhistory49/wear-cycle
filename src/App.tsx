import { useCallback, useEffect, useState } from 'react'
import type { ClothingItem, Trip, View, WearLog } from './types'
import { listItems, listLogs, listTrips } from './storage'
import { TodayView } from './components/TodayView'
import { WardrobeView } from './components/WardrobeView'
import { CalendarView } from './components/CalendarView'
import { StatsView } from './components/StatsView'
import { TripsView } from './components/TripsView'
import { ShareView } from './components/ShareView'
import './App.css'

const NAV: { id: View; label: string; short: string }[] = [
  { id: 'today', label: 'Log', short: 'Log' },
  { id: 'wardrobe', label: 'Wardrobe', short: 'Closet' },
  { id: 'calendar', label: 'Calendar', short: 'Cal' },
  { id: 'stats', label: 'Stats', short: 'Stats' },
  { id: 'trips', label: 'Trips', short: 'Trips' },
  { id: 'share', label: 'Share', short: 'Share' },
]

export default function App() {
  const [view, setView] = useState<View>('today')
  const [logDate, setLogDate] = useState<string | undefined>(undefined)
  const [items, setItems] = useState<ClothingItem[]>([])
  const [logs, setLogs] = useState<WearLog[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const [i, l, t] = await Promise.all([
        listItems(),
        listLogs(),
        listTrips(),
      ])
      setItems(i)
      setLogs(l)
      setTrips(t)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">WC</span>
          <div>
            <strong>WearCycle</strong>
            <span className="brand-sub">wardrobe rotation</span>
          </div>
        </div>
      </header>

      <main className="main">
        {!ready && <p className="muted pad">Loading…</p>}
        {error && <p className="error pad">{error}</p>}
        {ready && view === 'today' && (
          <TodayView
            items={items}
            logs={logs}
            initialDate={logDate}
            onChange={refresh}
            onGoWardrobe={() => setView('wardrobe')}
          />
        )}
        {ready && view === 'wardrobe' && (
          <WardrobeView items={items} onChange={refresh} />
        )}
        {ready && view === 'calendar' && (
          <CalendarView
            items={items}
            logs={logs}
            onOpenLog={(date) => {
              setLogDate(date)
              setView('today')
            }}
          />
        )}
        {ready && view === 'stats' && <StatsView items={items} logs={logs} />}
        {ready && view === 'trips' && (
          <TripsView
            items={items}
            logs={logs}
            trips={trips}
            onChange={refresh}
          />
        )}
        {ready && view === 'share' && (
          <ShareView
            items={items}
            logs={logs}
            trips={trips}
            onChange={refresh}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Main">
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`nav-btn ${view === n.id ? 'active' : ''}`}
            onClick={() => setView(n.id)}
          >
            <span className="nav-short">{n.short}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
