import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listApplicationsToMyJobs, listMyApplications, setApplicationStatus, type Application } from '../lib/api'

function parseSkills(skills: string): string[] {
  return skills
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function ApplicationsPage({ isAuthed }: { isAuthed: boolean }) {
  const [tab, setTab] = useState<'received' | 'sent'>('received')
  const [items, setItems] = useState<Application[]>([])
  const [sentItems, setSentItems] = useState<(Application & { client?: { id: number; name: string; email: string } })[]>(
    [],
  )
  const [sentFilter, setSentFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function refresh() {
    if (!isAuthed) return
    setError(null)
    setLoading(true)
    try {
      if (tab === 'received') {
        const res = await listApplicationsToMyJobs()
        setItems(res)
      } else {
        const res = await listMyApplications()
        setSentItems(res)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  async function changeStatus(applicationId: number, nextStatus: 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'completed') {
    setError(null)
    setSuccess(null)
    setBusyId(applicationId)
    try {
      await setApplicationStatus({ application_id: applicationId, status: nextStatus })
      // Optimistic update so the UI changes immediately even before refresh.
      setItems((prev) => prev.map((a) => (a.id === applicationId ? { ...a, status: nextStatus } : a)))
      setSuccess(`Updated application #${applicationId} to "${nextStatus}".`)
      // Refresh in background (don't block the UI on network).
      void refresh()
    } catch (err: any) {
      setError(err?.message ?? `Failed to set status: ${nextStatus}`)
    } finally {
      setBusyId(null)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, tab])

  if (!isAuthed) {
    return (
      <div className="card">
        <h1>Applications</h1>
        <p className="muted">Login to manage applications for your posted jobs.</p>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="row">
        <div>
          <h1 style={{ margin: 0 }}>Applications</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Received = proposals to jobs you posted. My applications = proposals you sent.
          </p>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <div className="pillRow">
            <button
              type="button"
              className={`btn secondary ${tab === 'received' ? 'active' : ''}`}
              onClick={() => setTab('received')}
              disabled={loading}
            >
              Received
            </button>
            <button
              type="button"
              className={`btn secondary ${tab === 'sent' ? 'active' : ''}`}
              onClick={() => setTab('sent')}
              disabled={loading}
            >
              My applications
            </button>
          </div>
          <button onClick={refresh} disabled={loading} style={{ marginLeft: 10 }}>
            Refresh
          </button>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}
      {success ? <div className="success">{success}</div> : null}

      {tab === 'received' ? (
        items.length === 0 ? (
          <div className="card muted">No incoming applications yet. Post a job to receive proposals.</div>
        ) : (
          <div className="grid">
            {items.map((a) => (
              <div key={a.id} className="card left">
                <div className="pillRow">
                  <span className="pill">Job: {a.job?.title ?? `#${a.job_id ?? '—'}`}</span>
                  <Link className="pill" to={`/users/${a.freelancer?.id ?? a.freelancer_id ?? 0}`}>
                    {a.freelancer?.name ?? `Freelancer #${a.freelancer_id ?? '—'}`}
                  </Link>
                  <span className={`pill ${a.status === 'accepted' ? 'strong' : ''}`}>{a.status}</span>
                </div>

                {a.freelancer?.profile ? (
                  <div className="card left" style={{ boxShadow: 'none', marginTop: 12 }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 800 }}>{a.freelancer.name}</div>
                      <div className="pill strong">★ {a.freelancer.profile.rating ?? 0}</div>
                    </div>
                    <p className="muted" style={{ marginTop: 8 }}>
                      {a.freelancer.profile.bio || '—'}
                    </p>
                    <div className="chips" style={{ marginTop: 10 }}>
                      {parseSkills(a.freelancer.profile.skills || '')
                        .slice(0, 10)
                        .map((s) => (
                          <span key={s} className="pill">
                            {s}
                          </span>
                        ))}
                    </div>
                    {a.freelancer.profile.portfolio_url ? (
                      <p style={{ marginTop: 10 }}>
                        <a className="pill" href={a.freelancer.profile.portfolio_url} target="_blank">
                          Portfolio
                        </a>
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <h2 className="cardTitle" style={{ marginTop: 6 }}>
                  Proposal
                </h2>
                <p className="muted">{a.proposal}</p>
                <div className="row" style={{ justifyContent: 'flex-start', gap: 10 }}>
                  <span className="pill strong">R{a.expected_price}</span>
                  <span className="pill">{a.estimated_time}</span>
                </div>

                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" disabled={loading || busyId === a.id} onClick={() => changeStatus(a.id, 'shortlisted')}>
                    {busyId === a.id ? 'Saving…' : 'Shortlist'}
                  </button>
                  <button type="button" disabled={loading || busyId === a.id} onClick={() => changeStatus(a.id, 'accepted')}>
                    {busyId === a.id ? 'Saving…' : 'Accept'}
                  </button>
                  <button type="button" disabled={loading || busyId === a.id} onClick={() => changeStatus(a.id, 'rejected')}>
                    {busyId === a.id ? 'Saving…' : 'Reject'}
                  </button>
                  <button type="button" disabled={loading || busyId === a.id} onClick={() => changeStatus(a.id, 'completed')}>
                    {busyId === a.id ? 'Saving…' : 'Complete'}
                  </button>
                  {a.status === 'accepted' && a.freelancer?.id ? (
                    <Link className="pill strong" to={`/messages?with=${a.freelancer.id}`}>
                      Message about project
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="row" style={{ justifyContent: 'flex-start' }}>
            <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>
              Apply history
            </span>
            <div className="pillRow">
              <button
                type="button"
                className={`btn secondary ${sentFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSentFilter('all')}
                disabled={loading}
              >
                All
              </button>
              <button
                type="button"
                className={`btn secondary ${sentFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setSentFilter('pending')}
                disabled={loading}
              >
                Pending
              </button>
              <button
                type="button"
                className={`btn secondary ${sentFilter === 'accepted' ? 'active' : ''}`}
                onClick={() => setSentFilter('accepted')}
                disabled={loading}
              >
                Accepted
              </button>
              <button
                type="button"
                className={`btn secondary ${sentFilter === 'rejected' ? 'active' : ''}`}
                onClick={() => setSentFilter('rejected')}
                disabled={loading}
              >
                Rejected
              </button>
            </div>
          </div>

          {(() => {
            const filtered =
              sentFilter === 'all'
                ? sentItems
                : sentItems.filter((a) => String(a.status).toLowerCase() === sentFilter)

            if (sentItems.length === 0) {
              return <div className="card muted">You haven’t applied to any jobs yet.</div>
            }

            if (filtered.length === 0) {
              return (
                <div className="card muted">
                  No applications match filter: <strong>{sentFilter}</strong>.
                </div>
              )
            }

            return (
              <div className="grid">
                {filtered.map((a) => (
                  <div key={a.id} className="card left">
                    <div className="pillRow">
                      <Link className="pill" to={`/jobs/${a.job?.id ?? a.job_id ?? 0}`}>
                        Job: {a.job?.title ?? `#${a.job_id ?? '—'}`}
                      </Link>
                      {a.client ? (
                        <span className="pill">Client: {a.client.name}</span>
                      ) : a.job?.user_id ? (
                        <span className="pill">Client #{a.job.user_id}</span>
                      ) : null}
                      <span className={`pill ${a.status === 'accepted' ? 'strong' : ''}`}>{a.status}</span>
                    </div>
                    <h2 className="cardTitle" style={{ marginTop: 6 }}>
                      Your proposal
                    </h2>
                    <p className="muted">{a.proposal}</p>
                    <div className="row" style={{ justifyContent: 'flex-start', gap: 10 }}>
                      <span className="pill strong">R{a.expected_price}</span>
                      <span className="pill">{a.estimated_time}</span>
                    </div>
                    <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
                      Submitted: {new Date(a.created_at).toLocaleString()}
                    </div>
                    {a.status === 'accepted' && (a.client?.id ?? a.job?.user_id) ? (
                      <div style={{ marginTop: 12 }}>
                        <Link
                          className="pill strong"
                          to={`/messages?with=${a.client?.id ?? a.job?.user_id}`}
                        >
                          Message client about project
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}

