import { FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  addJobUpdate,
  applyToJob,
  getJob,
  listJobUpdates,
  me,
  proposalAssistant,
  updateJob,
  type Job,
  type JobUpdate,
} from '../lib/api'

export default function JobDetailPage({ isAuthed }: { isAuthed: boolean }) {
  const { jobId } = useParams()
  const [job, setJob] = useState<Job | null>(null)
  const [updates, setUpdates] = useState<JobUpdate[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [myId, setMyId] = useState<number | null>(null)
  const [applySaving, setApplySaving] = useState(false)
  const [applySuccess, setApplySuccess] = useState<string | null>(null)

  const [proposal, setProposal] = useState('')
  const [expectedPrice, setExpectedPrice] = useState<number>(0)
  const [estimatedTime, setEstimatedTime] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const [note, setNote] = useState('')
  const [progress, setProgress] = useState<number>(0)
  const [status, setStatus] = useState<'open' | 'in_progress' | 'completed' | 'cancelled'>('open')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    ;(async () => {
      setError(null)
      try {
        const id = Number(jobId)
        const res = await getJob(id)
        setJob(res)
        setExpectedPrice(res.budget)
        setProgress(res.progress ?? 0)
        setStatus((res.status as any) ?? 'open')
        setNotes(res.in_progress_notes ?? '')
        setUpdates(await listJobUpdates(id))
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load job')
      }
    })()
  }, [jobId])

  useEffect(() => {
    if (!isAuthed) return
    ;(async () => {
      try {
        const m = await me()
        setMyId(m?.id ?? null)
      } catch {
        setMyId(null)
      }
    })()
  }, [isAuthed])

  async function onApply(e: FormEvent) {
    e.preventDefault()
    if (!job) return
    setError(null)
    setApplySuccess(null)
    const p = proposal.trim()
    const t = estimatedTime.trim()
    if (!p || !t || !Number.isFinite(expectedPrice) || expectedPrice <= 0) {
      setError('Please fill proposal, expected price, and estimated time.')
      return
    }
    try {
      setApplySaving(true)
      await applyToJob({
        job_id: job.id,
        proposal: p,
        expected_price: expectedPrice,
        estimated_time: t,
      })
      setProposal('')
      setEstimatedTime('')
      setApplySuccess('Application submitted! The job owner will be notified.')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to apply')
    } finally {
      setApplySaving(false)
    }
  }

  // Keep the page visible even when an error happens (so user sees context + can retry).
  if (!job) return <div className="card muted">Loading…</div>

  const isOwner = isAuthed && myId != null && Number(job.user_id) === Number(myId)

  return (
    <div className="stack">
      <div className="row">
        <div>
          <h1 style={{ margin: 0 }}>{job.title}</h1>
          <div className="pillRow" style={{ marginTop: 10 }}>
            <span className="pill strong">R{job.budget}</span>
            {job.deadline ? <span className="pill">⏰ {job.deadline}</span> : null}
            {job.category ? <span className="pill">🏷️ {job.category}</span> : null}
            {job.status ? <span className="pill">{job.status}</span> : null}
            <Link className="pill" to={`/users/${job.user_id}`}>
              Client #{job.user_id}
            </Link>
          </div>
        </div>
        <Link className="btn secondary" to="/jobs">
          Back to jobs
        </Link>
      </div>

      <div className="card left">
        <h2>Description</h2>
        <p className="muted">{job.description}</p>
      </div>

      <div className="card left">
        <h2>Progress</h2>
        <div className="progress-row" style={{ marginTop: 10 }}>
          <div className="progress-label">
            <span>Completion</span>
            <span className="progress-value">{job.progress ?? 0}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${job.progress ?? 0}%` }} />
          </div>
          {job.in_progress_notes ? <div className="muted">{job.in_progress_notes}</div> : null}
        </div>
      </div>

      <div className="card left">
        <h2>Updates</h2>
        {updates.length === 0 ? (
          <div className="muted">No updates yet.</div>
        ) : (
          <div className="list" style={{ marginTop: 10 }}>
            {updates.slice(0, 12).map((u) => (
              <div key={u.id} className="listItem">
                <div style={{ fontWeight: 800 }}>{u.note}</div>
                <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                  Progress: {u.progress}% • {new Date(u.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isOwner ? (
        <div className="card left">
          <h2>Owner controls</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Update status/progress and add milestones (this reflects the backend job lifecycle + updates).
          </p>

          <div className="grid2" style={{ marginTop: 12 }}>
            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="open">open</option>
                <option value="in_progress">in_progress</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </label>
            <label>
              Progress (%)
              <input
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
              />
            </label>
          </div>

          <label style={{ marginTop: 12 }}>
            In-progress notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <div className="row" style={{ marginTop: 12, justifyContent: 'flex-start' }}>
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                if (!job) return
                setSaving(true)
                setError(null)
                try {
                  await updateJob(job.id, { status, progress, in_progress_notes: notes })
                  const refreshed = await getJob(job.id)
                  setJob(refreshed)
                } catch (err: any) {
                  setError(err?.message ?? 'Failed to update job')
                } finally {
                  setSaving(false)
                }
              }}
            >
              Save status/progress
            </button>
          </div>

          <h3 style={{ marginTop: 18 }}>Add milestone update</h3>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!job) return
              const n = note.trim()
              if (!n) return
              setSaving(true)
              setError(null)
              try {
                await addJobUpdate(job.id, { note: n, progress })
                setNote('')
                setUpdates(await listJobUpdates(job.id))
                const refreshed = await getJob(job.id)
                setJob(refreshed)
              } catch (err: any) {
                setError(err?.message ?? 'Failed to add update')
              } finally {
                setSaving(false)
              }
            }}
          >
            <label>
              Note
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Wireframes approved" />
            </label>
            <button type="submit" disabled={saving}>
              Add update
            </button>
          </form>
        </div>
      ) : null}

      <div className="card left">
        <h2>Apply</h2>
        {!isAuthed ? (
          <p className="muted">
            Please <Link to="/login">login</Link> to apply.
          </p>
        ) : (
          <form className="form" onSubmit={onApply}>
            {error ? <div className="error">{error}</div> : null}
            {applySuccess ? <div className="success">{applySuccess}</div> : null}
            <label>
              Proposal
              <textarea required value={proposal} onChange={(e) => setProposal(e.target.value)} />
            </label>
            <div className="row" style={{ justifyContent: 'flex-start', marginTop: -6 }}>
              <button
                type="button"
                className="btn secondary"
                disabled={aiLoading || !job}
                onClick={async () => {
                  if (!job) return
                  setAiLoading(true)
                  setError(null)
                  setApplySuccess(null)
                  try {
                    const res = await proposalAssistant({ job_id: job.id })
                    if (res?.proposal) setProposal(res.proposal)
                    if (typeof res?.expected_price === 'number') setExpectedPrice(res.expected_price)
                    if (res?.estimated_time) setEstimatedTime(res.estimated_time)
                  } catch (err: any) {
                    setError(err?.message ?? 'Failed to generate proposal')
                  } finally {
                    setAiLoading(false)
                  }
                }}
              >
                {aiLoading ? 'Generating…' : 'Proposal assistant'}
              </button>
              <span className="muted" style={{ fontSize: 13 }}>
                Auto-fills proposal, price, and timeline.
              </span>
            </div>
            <label>
              Expected price (R)
              <input
                type="number"
                min={1}
                required
                value={expectedPrice}
                onChange={(e) => setExpectedPrice(Number(e.target.value))}
              />
            </label>
            <label>
              Estimated completion time
              <input
                required
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
                placeholder="e.g. 3 days"
              />
            </label>
            <button type="submit" disabled={applySaving || aiLoading}>
              {applySaving ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

