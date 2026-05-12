import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '../lib/api'

export default function NotificationsPage({ isAuthed }: { isAuthed: boolean }) {
  const navigate = useNavigate()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    if (!isAuthed) return
    setError(null)
    setLoading(true)
    try {
      setItems(await listNotifications())
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed])

  async function openLinked(n: NotificationItem) {
    if (!n.link) return
    if (!n.is_read) {
      try {
        await markNotificationRead(n.id)
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
      } catch {
        /* ignore */
      }
    }
    navigate(n.link)
  }

  if (!isAuthed) {
    return (
      <div className="card">
        <h1>Notifications</h1>
        <p className="muted">Sign in to see your notifications.</p>
      </div>
    )
  }

  return (
    <div className="stack">
      <div
        className="row"
        style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Notifications</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Open a row to go to the related job, application, or message.
          </p>
        </div>
        {items.some((n) => !n.is_read) ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              await markAllNotificationsRead()
              await refresh()
            }}
          >
            Mark all read
          </button>
        ) : null}
      </div>
      {error ? <div className="error">{error}</div> : null}
      {loading ? <p className="muted">Loading…</p> : null}
      {!loading && items.length === 0 ? (
        <div className="card left">
          <p className="muted">You're all caught up.</p>
        </div>
      ) : null}
      {!loading && items.length > 0 ? (
        <div className="card left notif-page-list">
          {items.map((n) => (
            <div
              key={n.id}
              className={`notif-page-row ${n.is_read ? '' : 'unread'} ${n.link ? 'notif-page-row--clickable' : ''}`}
              role={n.link ? 'button' : undefined}
              tabIndex={n.link ? 0 : undefined}
              onClick={() => void openLinked(n)}
              onKeyDown={(e) => {
                if (!n.link) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  void openLinked(n)
                }
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: n.is_read ? 500 : 600 }}>{n.message}</p>
                <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                  {new Date(n.created_at).toLocaleString()}
                  {n.link ? <span> · {n.link}</span> : null}
                </div>
              </div>
              {!n.is_read ? (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={async (e) => {
                    e.stopPropagation()
                    try {
                      await markNotificationRead(n.id)
                      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
                    } catch {
                      /* ignore */
                    }
                  }}
                >
                  Mark read
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
