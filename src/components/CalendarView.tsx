import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { useMemo, useState } from 'react'
import type { ClothingItem, WearLog } from '../types'
import { ItemThumb } from './ItemThumb'

export function CalendarView({
  items,
  logs,
  onOpenLog,
}: {
  items: ClothingItem[]
  logs: WearLog[]
  onOpenLog: (date: string) => void
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<string | null>(
    () => format(new Date(), 'yyyy-MM-dd'),
  )

  const logByDate = useMemo(() => {
    const map = new Map<string, WearLog>()
    for (const l of logs) map.set(l.date, l)
    return map
  }, [logs])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [cursor])

  const dayLog = selected ? logByDate.get(selected) : undefined
  const dayItems = dayLog
    ? items.filter((i) => dayLog.itemIds.includes(i.id))
    : []

  return (
    <section className="view">
      <header className="view-header">
        <div>
          <h1>Calendar</h1>
          <p className="muted">What you wore, when</p>
        </div>
      </header>

      <div className="cal-nav">
        <button
          type="button"
          className="btn ghost"
          onClick={() => setCursor((c) => subMonths(c, 1))}
        >
          ‹
        </button>
        <strong>{format(cursor, 'MMMM yyyy')}</strong>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setCursor((c) => addMonths(c, 1))}
        >
          ›
        </button>
      </div>

      <div className="cal-grid">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <div key={d} className="cal-dow">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const log = logByDate.get(key)
          const inMonth = isSameMonth(day, cursor)
          return (
            <button
              key={key}
              type="button"
              className={[
                'cal-day',
                inMonth ? '' : 'out',
                selected === key ? 'selected' : '',
                log ? 'has-log' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setSelected(key)}
            >
              <span>{format(day, 'd')}</span>
              {log && <span className="cal-dot" />}
            </button>
          )
        })}
      </div>

      <div className="cal-detail card">
        {selected ? (
          <>
            <div className="cal-detail-head">
              <strong>
                {(() => {
                  try {
                    return format(parseISO(selected), 'EEE, MMM d yyyy')
                  } catch {
                    return selected
                  }
                })()}
              </strong>
              <button
                type="button"
                className="btn ghost"
                onClick={() => onOpenLog(selected)}
              >
                {dayLog ? 'Edit log' : 'Log this day'}
              </button>
            </div>
            {dayItems.length === 0 ? (
              <p className="muted">Nothing logged.</p>
            ) : (
              <>
                <div className="thumb-row wrap">
                  {dayItems.map((i) => (
                    <div key={i.id} className="thumb-label">
                      <ItemThumb item={i} size={56} />
                      <span>{i.name}</span>
                    </div>
                  ))}
                </div>
                {dayLog?.context && (
                  <p className="muted">Context: {dayLog.context}</p>
                )}
                {dayLog?.notes && <p className="muted">{dayLog.notes}</p>}
              </>
            )}
          </>
        ) : (
          <p className="muted">Select a day</p>
        )}
      </div>
    </section>
  )
}
