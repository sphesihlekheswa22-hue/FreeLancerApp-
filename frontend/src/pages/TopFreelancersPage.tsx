import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listTopFreelancers } from '../lib/api'

function badgeStyle(badge: string) {
  if (badge === 'Expert') return { borderColor: 'var(--accent-border)', background: 'var(--accent-bg)', color: 'var(--accent)' }
  if (badge === 'Skilled') return { borderColor: 'var(--success)', background: 'var(--success-bg)', color: 'var(--success)' }
  return { borderColor: 'var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }
}

export default function TopFreelancersPage() {
  const [items, setItems] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        setError(null)
        setItems(await listTopFreelancers())
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load rankings')
      }
    })()
  }, [])

  return (
    <div className="stack">
      <div className="row">
        <h1>Top Rated Freelancers</h1>
        <span className="muted">Badges based on rating + completed jobs.</span>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="grid">
        {items.map((u) => (
          <div key={u.id} className="card left">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 900 }}>{u.name}</div>
              <span className="pill" style={badgeStyle(u.badge)}>{u.badge}</span>
            </div>
            <div className="pillRow" style={{ marginTop: 10 }}>
              <span className="pill strong">★ {u.rating}</span>
              <span className="pill">Completed {u.completed_jobs}</span>
            </div>
            <p className="muted" style={{ marginTop: 10 }}>
              {String(u.skills || '')
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean)
                .slice(0, 6)
                .join(' · ') || '—'}
            </p>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <Link className="btn-sm" to={`/users/${u.id}`}>View profile</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

