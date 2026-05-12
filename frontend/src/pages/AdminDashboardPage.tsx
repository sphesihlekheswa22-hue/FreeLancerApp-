import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  adminCreateUser,
  adminDeleteGig,
  adminDeleteJob,
  adminDeleteUser,
  adminListApplications,
  adminListGigs,
  adminListJobs,
  adminListUsers,
  adminStats,
  adminUpdateApplication,
  adminUpdateGig,
  adminUpdateJob,
  adminUpdateUser,
  type AdminApplicationRow,
  type AdminGigRow,
  type AdminJobRow,
  type AdminUserRow,
} from '../lib/api'

type TabKey = 'analytics' | 'users' | 'jobs' | 'gigs' | 'applications'

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<TabKey>('analytics')
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const [stats, setStats] = useState<any | null>(null)

  const [userQ, setUserQ] = useState('')
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<'student' | 'admin'>('student')

  const [jobQ, setJobQ] = useState('')
  const [jobs, setJobs] = useState<AdminJobRow[]>([])

  const [gigQ, setGigQ] = useState('')
  const [gigs, setGigs] = useState<AdminGigRow[]>([])

  const [apps, setApps] = useState<AdminApplicationRow[]>([])

  const tabs = useMemo(
    () =>
      [
        { k: 'analytics' as const, label: 'Analytics' },
        { k: 'users' as const, label: 'Users' },
        { k: 'jobs' as const, label: 'Jobs' },
        { k: 'gigs' as const, label: 'Gigs' },
        { k: 'applications' as const, label: 'Applications' },
      ] satisfies { k: TabKey; label: string }[],
    [],
  )

  async function refreshStats() {
    setError(null)
    try {
      setStats(await adminStats())
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load admin stats (admin only)')
    }
  }

  async function refreshUsers() {
    setError(null)
    try {
      setUsers(await adminListUsers({ q: userQ || undefined }))
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load users (admin only)')
    }
  }

  async function refreshJobs() {
    setError(null)
    try {
      setJobs(await adminListJobs({ q: jobQ || undefined }))
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load jobs (admin only)')
    }
  }

  async function refreshGigs() {
    setError(null)
    try {
      setGigs(await adminListGigs({ q: gigQ || undefined }))
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load gigs (admin only)')
    }
  }

  async function refreshApps() {
    setError(null)
    try {
      setApps(await adminListApplications())
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load applications (admin only)')
    }
  }

  useEffect(() => {
    refreshStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (tab === 'users') void refreshUsers()
    if (tab === 'jobs') void refreshJobs()
    if (tab === 'gigs') void refreshGigs()
    if (tab === 'applications') void refreshApps()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function onCreateUser(e: FormEvent) {
    e.preventDefault()
    setOkMsg(null)
    setError(null)
    try {
      await adminCreateUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
      })
      setOkMsg(`Created user ${newUserEmail}`)
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPassword('')
      setNewUserRole('student')
      await refreshUsers()
      await refreshStats()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create user')
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Full CRUD is admin-only. Changes apply immediately.
          </p>
        </div>
        <div className="pillRow">
          {tabs.map((t) => (
            <button
              key={t.k}
              type="button"
              className={`btn secondary ${tab === t.k ? 'active' : ''}`}
              onClick={() => setTab(t.k)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {okMsg ? <div className="success">{okMsg}</div> : null}

      {tab === 'analytics' ? (
        stats ? (
          <div className="grid2">
            <div className="statTile">
              <div className="statValue">{stats.total_users}</div>
              <div className="statLabel">Total users</div>
            </div>
            <div className="statTile">
              <div className="statValue">{stats.total_jobs}</div>
              <div className="statLabel">Total jobs</div>
            </div>
            <div className="statTile">
              <div className="statValue">{stats.total_gigs}</div>
              <div className="statLabel">Total gigs</div>
            </div>
            <div className="statTile">
              <div className="statValue">{stats.total_applications}</div>
              <div className="statLabel">Total applications</div>
            </div>
            <div className="statTile">
              <div className="statValue">{stats.active_jobs}</div>
              <div className="statLabel">Active jobs</div>
            </div>
            <div className="statTile">
              <div className="statValue">{stats.most_popular_category ?? '—'}</div>
              <div className="statLabel">Most popular category</div>
            </div>
          </div>
        ) : (
          <div className="card muted">Loading…</div>
        )
      ) : null}

      {tab === 'users' ? (
        <div className="stack">
          <div className="card left">
            <h2>Create user</h2>
            <form className="form" onSubmit={onCreateUser}>
              <div className="grid2">
                <label>
                  Name
                  <input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                </label>
                <label>
                  Email
                  <input value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
                </label>
              </div>
              <div className="grid2">
                <label>
                  Password
                  <input value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} type="password" />
                </label>
                <label>
                  Role
                  <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as any)}>
                    <option value="student">student</option>
                    <option value="admin">admin</option>
                  </select>
                </label>
              </div>
              <button type="submit" disabled={!newUserName.trim() || !newUserEmail.trim() || !newUserPassword}>
                Create user
              </button>
            </form>
          </div>

          <div className="card left">
            <h2>Users</h2>
            <div className="row" style={{ marginTop: 10, justifyContent: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <input value={userQ} onChange={(e) => setUserQ(e.target.value)} placeholder="Search name/email..." style={{ maxWidth: 320 }} />
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
                {users.slice(0, 50).map((u) => (
                  <div key={u.id} className="listItem">
                    <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 260 }}>
                        <div style={{ fontWeight: 800 }}>{u.name}</div>
                        <div className="muted" style={{ marginTop: 4 }}>
                          {u.email} • Joined {new Date(u.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                        <select
                          value={u.role}
                          onChange={async (e) => {
                            setOkMsg(null)
                            setError(null)
                            try {
                              const next = e.target.value as any
                              const updated = await adminUpdateUser(u.id, { role: next })
                              setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)))
                              setOkMsg(`Updated role for ${u.email}`)
                            } catch (e: any) {
                              setError(e?.message ?? 'Failed to update role')
                            }
                          }}
                        >
                          <option value="student">student</option>
                          <option value="admin">admin</option>
                        </select>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={async () => {
                            if (!confirm(`Delete user ${u.email}? This cannot be undone.`)) return
                            setOkMsg(null)
                            setError(null)
                            try {
                              await adminDeleteUser(u.id)
                              setUsers((prev) => prev.filter((x) => x.id !== u.id))
                              setOkMsg(`Deleted ${u.email}`)
                              await refreshStats()
                            } catch (e: any) {
                              setError(e?.message ?? 'Failed to delete user')
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'jobs' ? (
        <div className="card left">
          <h2>Jobs</h2>
          <div className="row" style={{ marginTop: 10, justifyContent: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <input value={jobQ} onChange={(e) => setJobQ(e.target.value)} placeholder="Search title/category..." style={{ maxWidth: 320 }} />
            <button type="button" className="btn-secondary" onClick={() => refreshJobs()}>
              Search
            </button>
          </div>
          {jobs.length === 0 ? (
            <div className="muted" style={{ marginTop: 12 }}>
              No jobs found.
            </div>
          ) : (
            <div className="list" style={{ marginTop: 12 }}>
              {jobs.slice(0, 80).map((j) => (
                <div key={j.id} className="listItem">
                  <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 260 }}>
                      <div style={{ fontWeight: 800 }}>{j.title}</div>
                      <div className="muted" style={{ marginTop: 4 }}>
                        #{j.id} • {j.category} • R{j.budget} • Owner #{j.user_id}
                      </div>
                    </div>
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                      <select
                        value={j.status}
                        onChange={async (e) => {
                          setOkMsg(null)
                          setError(null)
                          try {
                            await adminUpdateJob(j.id, { status: e.target.value })
                            setJobs((prev) => prev.map((x) => (x.id === j.id ? { ...x, status: e.target.value } : x)))
                            setOkMsg(`Updated status for job #${j.id}`)
                            await refreshStats()
                          } catch (e: any) {
                            setError(e?.message ?? 'Failed to update job')
                          }
                        }}
                      >
                        <option value="open">open</option>
                        <option value="in_progress">in_progress</option>
                        <option value="completed">completed</option>
                        <option value="closed">closed</option>
                      </select>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={async () => {
                          if (!confirm(`Delete job #${j.id}?`)) return
                          setOkMsg(null)
                          setError(null)
                          try {
                            await adminDeleteJob(j.id)
                            setJobs((prev) => prev.filter((x) => x.id !== j.id))
                            setOkMsg(`Deleted job #${j.id}`)
                            await refreshStats()
                          } catch (e: any) {
                            setError(e?.message ?? 'Failed to delete job')
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === 'gigs' ? (
        <div className="card left">
          <h2>Gigs</h2>
          <div className="row" style={{ marginTop: 10, justifyContent: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <input value={gigQ} onChange={(e) => setGigQ(e.target.value)} placeholder="Search title/category..." style={{ maxWidth: 320 }} />
            <button type="button" className="btn-secondary" onClick={() => refreshGigs()}>
              Search
            </button>
          </div>
          {gigs.length === 0 ? (
            <div className="muted" style={{ marginTop: 12 }}>
              No gigs found.
            </div>
          ) : (
            <div className="list" style={{ marginTop: 12 }}>
              {gigs.slice(0, 80).map((g) => (
                <div key={g.id} className="listItem">
                  <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 260 }}>
                      <div style={{ fontWeight: 800 }}>{g.title}</div>
                      <div className="muted" style={{ marginTop: 4 }}>
                        #{g.id} • {g.category} • R{g.price} • Owner #{g.user_id}
                      </div>
                    </div>
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={async () => {
                          const next = prompt('New price (number):', String(g.price))
                          if (next == null) return
                          const v = Number(next)
                          if (!Number.isFinite(v) || v < 0) {
                            setError('Invalid price')
                            return
                          }
                          setOkMsg(null)
                          setError(null)
                          try {
                            await adminUpdateGig(g.id, { price: v })
                            setGigs((prev) => prev.map((x) => (x.id === g.id ? { ...x, price: v } : x)))
                            setOkMsg(`Updated gig #${g.id}`)
                          } catch (e: any) {
                            setError(e?.message ?? 'Failed to update gig')
                          }
                        }}
                      >
                        Edit price
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={async () => {
                          if (!confirm(`Delete gig #${g.id}?`)) return
                          setOkMsg(null)
                          setError(null)
                          try {
                            await adminDeleteGig(g.id)
                            setGigs((prev) => prev.filter((x) => x.id !== g.id))
                            setOkMsg(`Deleted gig #${g.id}`)
                            await refreshStats()
                          } catch (e: any) {
                            setError(e?.message ?? 'Failed to delete gig')
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === 'applications' ? (
        <div className="card left">
          <h2>Applications</h2>
          {apps.length === 0 ? (
            <div className="muted" style={{ marginTop: 12 }}>
              No applications found.
            </div>
          ) : (
            <div className="list" style={{ marginTop: 12 }}>
              {apps.slice(0, 120).map((a) => (
                <div key={a.id} className="listItem">
                  <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 260 }}>
                      <div style={{ fontWeight: 800 }}>Application #{a.id}</div>
                      <div className="muted" style={{ marginTop: 4 }}>
                        Job #{a.job_id} • Freelancer #{a.freelancer_id} • R{a.expected_price} • {a.estimated_time}
                      </div>
                    </div>
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                      <select
                        value={a.status}
                        onChange={async (e) => {
                          setOkMsg(null)
                          setError(null)
                          try {
                            await adminUpdateApplication(a.id, { status: e.target.value })
                            setApps((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: e.target.value } : x)))
                            setOkMsg(`Updated application #${a.id}`)
                          } catch (e: any) {
                            setError(e?.message ?? 'Failed to update application')
                          }
                        }}
                      >
                        <option value="pending">pending</option>
                        <option value="shortlisted">shortlisted</option>
                        <option value="accepted">accepted</option>
                        <option value="rejected">rejected</option>
                        <option value="completed">completed</option>
                      </select>
                      <span className="pill">{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

