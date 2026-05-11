import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { applyToJob, createJob, Job, listJobsAdvanced } from '../lib/api'

export default function JobsPage({ isAuthed }: { isAuthed: boolean }) {
  const [items, setItems] = useState<Job[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState<number>(300)
  const [deadline, setDeadline] = useState('')
  const [category, setCategory] = useState('General')

  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [applyJobId, setApplyJobId] = useState<number | null>(null)
  const [proposal, setProposal] = useState('')
  const [expectedPrice, setExpectedPrice] = useState<number>(0)
  const [estimatedTime, setEstimatedTime] = useState('')

  async function refresh() {
    setError(null)
    setLoading(true)
    try {
      const res = await listJobsAdvanced({
        q: q || undefined,
        category: filterCategory || undefined,
        status: filterStatus || undefined,
      })
      setItems(res)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createJob({
        title,
        description,
        budget,
        deadline: deadline || undefined,
        category: category || 'General',
      })
      setTitle('')
      setDescription('')
      setBudget(300)
      setDeadline('')
      setCategory('General')
      setShowForm(false)
      await refresh()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create job')
    }
  }

  async function onApply(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!applyJobId) return
    const p = proposal.trim()
    const t = estimatedTime.trim()
    if (!p || !t || !Number.isFinite(expectedPrice) || expectedPrice <= 0) {
      setError('Please fill proposal, expected price, and estimated time.')
      return
    }
    try {
      await applyToJob({
        job_id: applyJobId,
        proposal: p,
        expected_price: expectedPrice,
        estimated_time: t,
      })
      setApplyJobId(null)
      setProposal('')
      setExpectedPrice(0)
      setEstimatedTime('')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to apply')
    }
  }

  return (
    <div className="stack">
      {/* Hero Section */}
      <div className="hero-section" style={{ padding: '48px 24px', marginBottom: 32 }}>
        <div className="hero-badge">
          <span>💼</span>
          <span>Opportunities Board</span>
        </div>
        <h1 className="hero-title">
          Find Your Next <span>Job</span>
        </h1>
        <p className="hero-subtitle">
          Browse job requests from students and faculty. Apply with your proposal 
          and start earning while you learn.
        </p>
        
        {/* Stats */}
        <div className="stats-bar" style={{ maxWidth: 600, margin: '32px auto 0' }}>
          <div className="stat-card">
            <div className="stat-value">{items.length}+</div>
            <div className="stat-label">Open Jobs</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">R{items.reduce((sum, j) => sum + (j.budget || 0), 0).toLocaleString()}</div>
            <div className="stat-label">Total Budget</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{items.filter(j => j.deadline).length}</div>
            <div className="stat-label">Urgent</div>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="section-header">
        <div className="section-title">
          <h1>All Jobs</h1>
          <span className="section-count">{items.length}</span>
        </div>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              refresh()
            }}
            className="search-bar"
          >
            <input
              placeholder="Search jobs..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit" disabled={loading} className="btn-sm">
              {loading ? (
                <span className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              ) : (
                'Search'
              )}
            </button>
          </form>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            aria-label="Filter by category"
            style={{ maxWidth: 220 }}
          >
            <option value="">All categories</option>
            <option value="Graphic Design">Graphic Design</option>
            <option value="Tutoring">Tutoring</option>
            <option value="Web Development">Web Development</option>
            <option value="Writing">Writing</option>
            <option value="Development">Development</option>
            <option value="General">General</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter by status"
            style={{ maxWidth: 180 }}
          >
            <option value="">All status</option>
            <option value="open">open</option>
            <option value="in_progress">in_progress</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </select>
          <button type="button" className="btn-secondary btn-sm" onClick={() => refresh()}>
            Apply filters
          </button>
          
          {isAuthed && (
            <button 
              onClick={() => setShowForm(!showForm)}
              className={showForm ? 'btn-secondary btn-sm' : 'btn btn-sm'}
            >
              {showForm ? 'Cancel' : '+ Post Job'}
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="error">
          <span>⚠️</span>
          {error}
        </div>
      ) : null}

      {/* Create Form */}
      {isAuthed && showForm && (
        <div className="card animate-scale-in" style={{ maxWidth: 640 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 12, 
              background: 'var(--accent-gradient)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.25rem'
            }}>
              📝
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Post a Job Request</h2>
              <p className="muted" style={{ fontSize: '0.875rem', marginTop: 2 }}>Describe what you need and set your budget</p>
            </div>
          </div>
          
          <form className="form" onSubmit={onCreate}>
            <label>
              Job Title
              <input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g., Need a Website for My Project"
                required
              />
            </label>
            <label>
              Category
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Web Development"
              />
            </label>
            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the project requirements in detail..."
                required
              />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                Budget (R)
                <input
                  value={budget}
                  type="number"
                  min={1}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  required
                />
              </label>
              <label>
                Deadline
                <span className="label-hint">Optional</span>
                <input
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  placeholder="e.g., 2 weeks"
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button type="submit" className="btn-lg" style={{ flex: 1 }}>
                Post Job
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!isAuthed && (
        <div className="card muted animate-fade-in">
          <div className="empty-state-icon">🔒</div>
          <h3>Login to Post a Job</h3>
          <p>Join our community to hire talented students.</p>
        </div>
      )}

      {/* Jobs Grid */}
      {loading && items.length === 0 ? (
        <div className="grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="job-card">
              <div className="loading-skeleton" style={{ height: 24, width: '60%', marginBottom: 12 }} />
              <div className="loading-skeleton" style={{ height: 16, width: '40%', marginBottom: 16 }} />
              <div className="loading-skeleton" style={{ height: 60, width: '100%' }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state animate-fade-in">
          <div className="empty-state-icon">📭</div>
          <h3>No jobs found</h3>
          <p>{q ? 'Try adjusting your search terms.' : 'Be the first to post a job!'}</p>
        </div>
      ) : (
        <div className="grid stagger-children">
          {items.map((j) => (
            <div key={j.id} className="job-card">
              <div className="card-header">
                <div className="pillRow">
                  <span className="pill strong">R{j.budget?.toLocaleString()}</span>
                  {j.category ? <span className="pill">🏷️ {j.category}</span> : null}
                  {j.status ? <span className="pill">{j.status}</span> : null}
                  {j.deadline ? (
                    <span className="pill" style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}>
                      ⏰ {j.deadline}
                    </span>
                  ) : null}
                </div>
              </div>
              <h3 className="card-title">{j.title}</h3>
              <p className="card-description">{j.description}</p>

              {isAuthed && (
                <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                  {applyJobId === j.id ? (
                    <div className="apply-form">
                      <h4 style={{ margin: '0 0 16px', fontSize: '1rem', color: 'var(--text-h)' }}>
                        Apply for "{j.title}"
                      </h4>
                      <form className="form" onSubmit={onApply}>
                        <label>
                          Your Proposal
                          <textarea
                            value={proposal}
                            onChange={(e) => setProposal(e.target.value)}
                            placeholder="Explain why you're the best fit..."
                            required
                          />
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          <label>
                            Expected Price (R)
                            <input
                              value={expectedPrice}
                              type="number"
                              min={1}
                              onChange={(e) => setExpectedPrice(Number(e.target.value))}
                              required
                            />
                          </label>
                          <label>
                            Estimated Time
                            <input
                              value={estimatedTime}
                              onChange={(e) => setEstimatedTime(e.target.value)}
                              placeholder="e.g. 3 days"
                              required
                            />
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                          <button type="submit" style={{ flex: 1 }}>
                            Submit Application
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              setApplyJobId(null)
                              setProposal('')
                              setExpectedPrice(0)
                              setEstimatedTime('')
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid var(--border)',
                      paddingTop: 12
                    }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        Posted recently
                      </span>
                      <Link className="btn-sm" to={`/jobs/${j.id}`}>
                        Apply Now
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
