import { useEffect, useState } from 'react'
import { adminDeleteGig, adminDeleteJob, adminListUsers, adminStats, type AdminUserRow } from '../lib/api'

export default function AdminDashboardPage() {
  const [data, setData] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [gigId, setGigId] = useState('')
  const [jobId, setJobId] = useState('')
  const [userQ, setUserQ] = useState('')
  const [users, setUsers] = useState<AdminUserRow[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        setError(null)
        setData(await adminStats())
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load admin stats (admin only)')
      }
    })()
  }, [])

  async function refreshUsers() {
    try {
      setError(null)
      setUsers(await adminListUsers({ q: userQ || undefined }))
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load users (admin only)')
    }
  }

  useEffect(() => {
    refreshUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="stack">
      <h1>Admin Analytics</h1>
      {error ? <div className="error">{error}</div> : null}
      {okMsg ? <div className="success">{okMsg}</div> : null}
      {data ? (
        <div className="grid2">
          <div className="statTile">
            <div className="statValue">{data.total_users}</div>
            <div className="statLabel">Total users</div>
          </div>
          <div className="statTile">
            <div className="statValue">{data.total_jobs}</div>
            <div className="statLabel">Total jobs</div>
          </div>
          <div className="statTile">
            <div className="statValue">{data.total_gigs}</div>
            <div className="statLabel">Total gigs</div>
          </div>
          <div className="statTile">
            <div className="statValue">{data.total_applications}</div>
            <div className="statLabel">Total applications</div>
          </div>
          <div className="statTile">
            <div className="statValue">{data.active_jobs}</div>
            <div className="statLabel">Active jobs</div>
          </div>
          <div className="statTile">
            <div className="statValue">{data.most_popular_category ?? '—'}</div>
            <div className="statLabel">Most popular category</div>
          </div>
        </div>
      ) : (
        <div className="card muted">Loading…</div>
      )}

      <div className="card left">
        <h2>Moderation</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          These actions match the backend admin endpoints (delete gig/job).
        </p>
        <div className="grid2" style={{ marginTop: 12 }}>
          <label>
            Delete gig by ID
            <div className="row" style={{ justifyContent: 'flex-start' }}>
              <input value={gigId} onChange={(e) => setGigId(e.target.value)} placeholder="e.g. 12" />
              <button
                type="button"
                className="btn-secondary"
                onClick={async () => {
                  setOkMsg(null)
                  setError(null)
                  const id = Number(gigId)
                  if (!Number.isFinite(id) || id <= 0) {
                    setError('Enter a valid gig id')
                    return
                  }
                  try {
                    await adminDeleteGig(id)
                    setOkMsg(`Deleted gig #${id}`)
                    setGigId('')
                    setData(await adminStats())
                  } catch (e: any) {
                    setError(e?.message ?? 'Failed to delete gig')
                  }
                }}
              >
                Delete
              </button>
            </div>
          </label>
          <label>
            Delete job by ID
            <div className="row" style={{ justifyContent: 'flex-start' }}>
              <input value={jobId} onChange={(e) => setJobId(e.target.value)} placeholder="e.g. 5" />
              <button
                type="button"
                className="btn-secondary"
                onClick={async () => {
                  setOkMsg(null)
                  setError(null)
                  const id = Number(jobId)
                  if (!Number.isFinite(id) || id <= 0) {
                    setError('Enter a valid job id')
                    return
                  }
                  try {
                    await adminDeleteJob(id)
                    setOkMsg(`Deleted job #${id}`)
                    setJobId('')
                    setData(await adminStats())
                  } catch (e: any) {
                    setError(e?.message ?? 'Failed to delete job')
                  }
                }}
              >
                Delete
              </button>
            </div>
          </label>
        </div>
      </div>

      <div className="card left">
        <h2>Users (admin)</h2>
        <div className="row" style={{ marginTop: 10, justifyContent: 'flex-start' }}>
          <input
            value={userQ}
            onChange={(e) => setUserQ(e.target.value)}
            placeholder="Search name/email..."
            style={{ maxWidth: 320 }}
          />
          <button type="button" className="btn-secondary" onClick={() => refreshUsers()}>
            Search
          </button>
        </div>
        {users.length === 0 ? (
          <div className="muted" style={{ marginTop: 12 }}>
            No users found.
          </div>
        ) : (
          <div className="list" style={{ marginTop: 12 }}>
            {users.slice(0, 20).map((u) => (
              <div key={u.id} className="listItem">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 800 }}>{u.name}</div>
                  <span className="pill strong">{u.role}</span>
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {u.email} • Joined {new Date(u.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

