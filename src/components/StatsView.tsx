import { format, startOfMonth, subDays } from 'date-fns'
import { useMemo } from 'react'
import type { ClothingItem, WearLog } from '../types'
import {
  buildItemStats,
  leastWorn,
  neverWorn,
  styleRut,
  topWorn,
  uniqueItemsInRange,
} from '../lib/stats'
import { ItemThumb } from './ItemThumb'

export function StatsView({
  items,
  logs,
}: {
  items: ClothingItem[]
  logs: WearLog[]
}) {
  const now = new Date()
  const stats = useMemo(() => buildItemStats(items, logs, now), [items, logs])
  const top = useMemo(() => topWorn(stats, 8), [stats])
  const least = useMemo(() => leastWorn(stats, 8), [stats])
  const ruts = useMemo(() => styleRut(stats, 4), [stats])
  const never = useMemo(() => neverWorn(stats), [stats])

  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const today = format(now, 'yyyy-MM-dd')
  const d30 = format(subDays(now, 30), 'yyyy-MM-dd')
  const logsThisMonth = logs.filter((l) => l.date >= monthStart).length
  const unique30 = uniqueItemsInRange(logs, d30, today)

  return (
    <section className="view">
      <header className="view-header">
        <div>
          <h1>Analytics</h1>
          <p className="muted">Simple counts — no fluff</p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="empty">
          <p>Log some wears to see patterns.</p>
        </div>
      ) : (
        <>
          <div className="stat-cards">
            <div className="stat-card">
              <span className="stat-num">{items.length}</span>
              <span className="stat-label">pieces</span>
            </div>
            <div className="stat-card">
              <span className="stat-num">{logsThisMonth}</span>
              <span className="stat-label">days logged this month</span>
            </div>
            <div className="stat-card">
              <span className="stat-num">{unique30}</span>
              <span className="stat-label">unique items · 30d</span>
            </div>
            <div className="stat-card">
              <span className="stat-num">{never.length}</span>
              <span className="stat-label">never worn</span>
            </div>
          </div>

          <StatBlock title="Most worn">
            {top.length === 0 ? (
              <p className="muted">No wears logged yet.</p>
            ) : (
              <ul className="stat-list">
                {top.map((s) => (
                  <li key={s.item.id}>
                    <ItemThumb item={s.item} size={44} />
                    <div className="stat-list-meta">
                      <strong>{s.item.name}</strong>
                      <span className="muted">
                        {s.wearCount}× total · {s.wearsThisMonth}× this month
                        {s.wearsLast30 >= 4
                          ? ` · ${s.wearsLast30}× last 30d`
                          : ''}
                      </span>
                    </div>
                    <span className="stat-badge">{s.wearCount}×</span>
                  </li>
                ))}
              </ul>
            )}
          </StatBlock>

          {ruts.length > 0 && (
            <StatBlock title="Style ruts (4+ wears in 30 days)">
              <ul className="stat-list">
                {ruts.map((s) => (
                  <li key={s.item.id}>
                    <ItemThumb item={s.item} size={44} />
                    <div className="stat-list-meta">
                      <strong>{s.item.name}</strong>
                      <span className="muted">
                        You wore this {s.wearsLast30}× in the last month
                      </span>
                    </div>
                    <span className="stat-badge warn">{s.wearsLast30}×</span>
                  </li>
                ))}
              </ul>
            </StatBlock>
          )}

          <StatBlock title="Least / never worn">
            <ul className="stat-list">
              {least.map((s) => (
                <li key={s.item.id}>
                  <ItemThumb item={s.item} size={44} />
                  <div className="stat-list-meta">
                    <strong>{s.item.name}</strong>
                    <span className="muted">
                      {s.wearCount === 0
                        ? 'Never logged'
                        : s.lastWorn
                          ? `Last worn ${s.lastWorn} · ${s.daysSinceWorn}d ago`
                          : `${s.wearCount}× total`}
                    </span>
                  </div>
                  <span className="stat-badge muted-badge">{s.wearCount}×</span>
                </li>
              ))}
            </ul>
          </StatBlock>
        </>
      )}
    </section>
  )
}

function StatBlock({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="stat-block">
      <h2>{title}</h2>
      {children}
    </div>
  )
}
