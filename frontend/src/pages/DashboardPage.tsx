
import { useEffect, useMemo, useState } from 'react'
import { getProfile, listGigs, listJobs, type Gig, type Job } from '../lib/api'
import { Link } from 'react-router-dom'

// ─── Utility helpers ─────────────────────────────────────────────

function topCountsBy<T>(items: T[], keyFn: (t: T) => string) {
  const map = new Map<string, number>()
  for (const it of items) {
    const k = keyFn(it) || 'Other'
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
}

function normalizeSkills(skills: string): string[] {
  return skills
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function formatCurrency(n: number) {
  return 'R' + n.toLocaleString()
}

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

// ─── Mini Sparkline (SVG) ────────────────────────────────────────

function Sparkline({ data, color = 'var(--accent)' }: { data: number[]; color?: string }) {
  if (data.length < 2) return <div style={{ height: 40 }} />
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 120
  const h = 40
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  })
  const pathD = `M ${points.join(' L ')}`
  const areaD = `${pathD} L ${w},${h} L 0,${h} Z`

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkGrad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Animated Counter ────────────────────────────────────────────

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const duration = 800
    const start = performance.now()
    const from = display
    const to = value
    let raf: number
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return <>{prefix}{display.toLocaleString()}{suffix}</>
}

// ─── Trend Badge ─────────────────────────────────────────────────

function TrendBadge({ value }: { value: number }) {
  const isUp = value >= 0
  return (
    <span
      className="trend-badge"
      style={{
        background: isUp ? 'var(--success-bg)' : 'var(--error-bg)',
        color: isUp ? 'var(--success)' : 'var(--error)',
      }}
    >
      {isUp ? '▲' : '▼'} {Math.abs(value)}%
    </span>
  )
}

// ─── Progress Bar ────────────────────────────────────────────────

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="progress-row">
      <div className="progress-label">
        <span>{label}</span>
        <span className="progress-value">{value}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Main Dashboard Component ────────────────────────────────────

export default function DashboardPage({ isAuthed }: { isAuthed: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gigs, setGigs] = useState<Gig[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'gigs' | 'jobs'>('all')

  async function refresh() {
    setError(null)
    setLoading(true)
    try {
      const [g, j] = await Promise.all([listGigs(), listJobs()])
      setGigs(g)
      setJobs(j)
      if (isAuthed) {
        const p = await getProfile()
        setSkills(normalizeSkills(p.profile.skills || ''))
      } else {
        setSkills([])
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed])

  // ─── Derived data ──────────────────────────────────────────────

  const gigCategories = useMemo(() => topCountsBy(gigs, (g) => g.category), [gigs])
  const jobCategories = useMemo(() => topCountsBy(jobs, (j) => j.title.split(' ')[0]), [jobs])

  const totalGigValue = useMemo(() => gigs.reduce((sum, g) => sum + (g.price || 0), 0), [gigs])
  const totalJobBudget = useMemo(() => jobs.reduce((sum, j) => sum + (j.budget || 0), 0), [jobs])
  const avgGigPrice = useMemo(() => (gigs.length ? Math.round(totalGigValue / gigs.length) : 0), [gigs, totalGigValue])
  const avgJobBudget = useMemo(() => (jobs.length ? Math.round(totalJobBudget / jobs.length) : 0), [jobs, totalJobBudget])

  const urgentJobs = useMemo(() => jobs.filter((j) => j.deadline).length, [jobs])

  // Sparkline data (mock trend based on item count)
  const gigSpark = useMemo(() => {
    const base = gigs.length
    return [base * 0.6, base * 0.75, base * 0.5, base * 0.9, base * 0.8, base]
  }, [gigs.length])

  const jobSpark = useMemo(() => {
    const base = jobs.length
    return [base * 0.4, base * 0.6, base * 0.55, base * 0.8, base * 0.7, base]
  }, [jobs.length])

  // Recommendations
  const recommendedGigs = useMemo(() => {
    if (skills.length === 0) return gigs.slice(0, 6)
    const scored = gigs
      .map((g) => {
        const hay = `${g.title} ${g.description} ${g.category}`.toLowerCase()
        const score = skills.reduce((s, k) => s + (hay.includes(k) ? 1 : 0), 0)
        return { g, score }
      })
      .sort((a, b) => b.score - a.score)
    return scored.slice(0, 6).map((x) => x.g)
  }, [gigs, skills])

  const recommendedJobs = useMemo(() => {
    if (skills.length === 0) return jobs.slice(0, 6)
    const scored = jobs
      .map((j) => {
        const hay = `${j.title} ${j.description}`.toLowerCase()
        const score = skills.reduce((s, k) => s + (hay.includes(k) ? 1 : 0), 0)
        return { j, score }
      })
      .sort((a, b) => b.score - a.score)
    return scored.slice(0, 6).map((x) => x.j)
  }, [jobs, skills])

  const displayedGigs = activeTab === 'jobs' ? [] : recommendedGigs
  const displayedJobs = activeTab === 'gigs' ? [] : recommendedJobs

  return (
    <div className="dashboard-container">
      {/* ─── Hero Header ───────────────────────────────────────── */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Live Dashboard
          </div>
          <h1 className="hero-title">
            {isAuthed ? 'Welcome back!' : 'Campus Marketplace'}
          </h1>
          <p className="hero-subtitle">
            {isAuthed
              ? 'Here is your personalized overview of the campus marketplace.'
              : 'Explore gigs and jobs from the campus community.'}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="btn btn-refresh"
        >
          {loading ? (
            <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
          ) : (
            <span>↻</span>
          )}
          {loading ? 'Syncing...' : 'Refresh'}
        </button>
      </div>

      {/* ─── Error ─────────────────────────────────────────────── */}
      {error && (
        <div className="error animate-fade-in">
          <span>⚠️</span>
          {error}
        </div>
      )}

      {/* ─── KPI Cards ─────────────────────────────────────────── */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-gigs animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
          <div className="kpi-header">
            <div className="kpi-icon">💼</div>
            <TrendBadge value={12} />
          </div>
          <div className="kpi-value">
            <AnimatedNumber value={gigs.length} />
          </div>
          <div className="kpi-label">Active Gigs</div>
          <div className="kpi-spark">
            <Sparkline data={gigSpark} />
          </div>
        </div>

        <div className="kpi-card kpi-jobs animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="kpi-header">
            <div className="kpi-icon">📋</div>
            <TrendBadge value={8} />
          </div>
          <div className="kpi-value">
            <AnimatedNumber value={jobs.length} />
          </div>
          <div className="kpi-label">Open Jobs</div>
          <div className="kpi-spark">
            <Sparkline data={jobSpark} />
          </div>
        </div>

        <div className="kpi-card kpi-value-card animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <div className="kpi-header">
            <div className="kpi-icon">💰</div>
            <TrendBadge value={24} />
          </div>
          <div className="kpi-value">
            <AnimatedNumber value={totalGigValue} prefix="R" />
          </div>
          <div className="kpi-label">Total Gig Value</div>
          <div className="kpi-meta">Avg {formatCurrency(avgGigPrice)} per gig</div>
        </div>

        <div className="kpi-card kpi-budget animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="kpi-header">
            <div className="kpi-icon">🎯</div>
            <TrendBadge value={-5} />
          </div>
          <div className="kpi-value">
            <AnimatedNumber value={totalJobBudget} prefix="R" />
          </div>
          <div className="kpi-label">Total Job Budget</div>
          <div className="kpi-meta">Avg {formatCurrency(avgJobBudget)} per job</div>
        </div>
      </div>

      {/* ─── Middle Section: Categories + Activity ─────────────── */}
      <div className="dashboard-mid">
        {/* Gig Categories */}
        <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
          <div className="glass-header">
            <h3>🎨 Gig Categories</h3>
            <span className="glass-count">{gigCategories.length}</span>
          </div>
          {gigCategories.length === 0 ? (
            <div className="empty-mini">
              <span>📊</span>
              <p>No category data yet</p>
            </div>
          ) : (
            <div className="category-list">
              {gigCategories.map(([cat, count]) => (
                <ProgressBar
                  key={cat}
                  value={count}
                  max={gigCategories[0][1]}
                  label={cat}
                />
              ))}
            </div>
          )}
        </div>

        {/* Job Distribution */}
        <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="glass-header">
            <h3>📋 Job Types</h3>
            <span className="glass-count">{jobCategories.length}</span>
          </div>
          {jobCategories.length === 0 ? (
            <div className="empty-mini">
              <span>📊</span>
              <p>No job data yet</p>
            </div>
          ) : (
            <div className="category-list">
              {jobCategories.map(([cat, count]) => (
                <ProgressBar
                  key={cat}
                  value={count}
                  max={jobCategories[0][1]}
                  label={cat}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
          <div className="glass-header">
            <h3>⚡ Quick Stats</h3>
          </div>
          <div className="quick-stats">
            <div className="quick-stat">
              <div className="quick-stat-value">{urgentJobs}</div>
              <div className="quick-stat-label">Urgent Jobs</div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-value">{gigs.filter(g => g.price && g.price > 500).length}</div>
              <div className="quick-stat-label">Premium Gigs</div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-value">{new Set([...gigs.map(g => g.category), ...jobs.map(j => j.title)]).size}</div>
              <div className="quick-stat-label">Categories</div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-value">{jobs.filter(j => !j.deadline).length}</div>
              <div className="quick-stat-label">Flexible Jobs</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Recommendations Section ───────────────────────────── */}
      <div className="rec-section animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <div className="rec-header">
          <div className="rec-title-group">
            <h2>✨ Recommended for You</h2>
            <p className="rec-subtitle">
              {isAuthed
                ? skills.length > 0
                  ? `Matched based on your skills: ${skills.slice(0, 3).join(', ')}${skills.length > 3 ? '...' : ''}`
                  : 'Update your profile skills for personalized matches'
                : 'Sign in to get personalized recommendations'}
            </p>
          </div>
          <div className="rec-tabs">
            <button
              className={classNames('rec-tab', activeTab === 'all' && 'active')}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button
              className={classNames('rec-tab', activeTab === 'gigs' && 'active')}
              onClick={() => setActiveTab('gigs')}
            >
              Gigs
            </button>
            <button
              className={classNames('rec-tab', activeTab === 'jobs' && 'active')}
              onClick={() => setActiveTab('jobs')}
            >
              Jobs
            </button>
          </div>
        </div>

        {/* Gigs */}
        {(activeTab === 'all' || activeTab === 'gigs') && displayedGigs.length > 0 && (
          <div className="rec-group">
            <div className="rec-group-header">
              <span className="rec-group-icon">💼</span>
              <h3>Recommended Gigs</h3>
              <span className="rec-group-count">{displayedGigs.length}</span>
            </div>
            <div className="rec-grid">
              {displayedGigs.map((g, i) => (
                <div
                  key={g.id}
                  className="rec-card gig-rec-card animate-fade-in-up"
                  style={{ animationDelay: `${0.05 * i}s` }}
                >
                  <div className="rec-card-accent" />
                  <div className="rec-card-header">
                    <span className="pill category">{g.category || 'General'}</span>
                    <span className="pill strong">{formatCurrency(g.price || 0)}</span>
                  </div>
                  <h4 className="rec-card-title">{g.title}</h4>
                  <p className="rec-card-desc">{g.description}</p>
                  <div className="rec-card-footer">
                    <span className="rec-card-meta">🕐 Recently posted</span>
                    <Link className="btn-sm" to={`/gigs/${g.id}`}>
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Jobs */}
        {(activeTab === 'all' || activeTab === 'jobs') && displayedJobs.length > 0 && (
          <div className="rec-group">
            <div className="rec-group-header">
              <span className="rec-group-icon">📋</span>
              <h3>Recommended Jobs</h3>
              <span className="rec-group-count">{displayedJobs.length}</span>
            </div>
            <div className="rec-grid">
              {displayedJobs.map((j, i) => (
                <div
                  key={j.id}
                  className="rec-card job-rec-card animate-fade-in-up"
                  style={{ animationDelay: `${0.05 * i}s` }}
                >
                  <div className="rec-card-accent" style={{ background: 'linear-gradient(180deg, var(--warning), transparent)' }} />
                  <div className="rec-card-header">
                    <span className="pill strong">{formatCurrency(j.budget || 0)}</span>
                    {j.deadline ? (
                      <span className="pill" style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}>
                        ⏰ {j.deadline}
                      </span>
                    ) : (
                      <span className="pill">Flexible</span>
                    )}
                  </div>
                  <h4 className="rec-card-title">{j.title}</h4>
                  <p className="rec-card-desc">{j.description}</p>
                  <div className="rec-card-footer">
                    <span className="rec-card-meta">🕐 Recently posted</span>
                    <Link className="btn-sm" to={`/jobs/${j.id}`}>
                      Apply
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {displayedGigs.length === 0 && displayedJobs.length === 0 && (
          <div className="empty-state animate-fade-in">
            <div className="empty-state-icon">🔍</div>
            <h3>No recommendations yet</h3>
            <p>{isAuthed ? 'Check back soon for new matches.' : 'Sign in to see personalized recommendations.'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

