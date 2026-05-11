import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createGig, Gig, listGigs } from '../lib/api'

export default function GigsPage({ isAuthed }: { isAuthed: boolean }) {
  const [items, setItems] = useState<Gig[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState<number>(100)

  async function refresh() {
    setError(null)
    setLoading(true)
    try {
      const res = await listGigs({ q: q || undefined })
      setItems(res)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load gigs')
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
      await createGig({ title, description, category, price })
      setTitle('')
      setDescription('')
      setCategory('')
      setPrice(100)
      setShowForm(false)
      await refresh()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create gig')
    }
  }

  const categories = ['Design', 'Development', 'Writing', 'Marketing', 'Tutoring', 'Other']

  return (
    <div className="stack">
      {/* Hero Section */}
      <div className="hero-section" style={{ padding: '48px 24px', marginBottom: 32 }}>
        <div className="hero-badge">
          <span>✨</span>
          <span>Student Marketplace</span>
        </div>
        <h1 className="hero-title">
          Find & Offer <span>Gigs</span>
        </h1>
        <p className="hero-subtitle">
          Discover freelance opportunities or offer your skills to fellow students. 
          From design to tutoring, find your next gig here.
        </p>
        
        {/* Stats */}
        <div className="stats-bar" style={{ maxWidth: 600, margin: '32px auto 0' }}>
          <div className="stat-card">
            <div className="stat-value">{items.length}+</div>
            <div className="stat-label">Active Gigs</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">R{items.reduce((sum, g) => sum + (g.price || 0), 0).toLocaleString()}</div>
            <div className="stat-label">Total Value</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{new Set(items.map(g => g.category)).size}</div>
            <div className="stat-label">Categories</div>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="section-header">
        <div className="section-title">
          <h1>All Gigs</h1>
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
              placeholder="Search gigs..."
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
          
          {isAuthed && (
            <button 
              onClick={() => setShowForm(!showForm)}
              className={showForm ? 'btn-secondary btn-sm' : 'btn btn-sm'}
            >
              {showForm ? 'Cancel' : '+ Post Gig'}
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
              ✨
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Create a Gig</h2>
              <p className="muted" style={{ fontSize: '0.875rem', marginTop: 2 }}>Share your skills with the campus community</p>
            </div>
          </div>
          
          <form className="form" onSubmit={onCreate}>
            <label>
              Title
              <input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g., Logo Design for Student Club"
                required
              />
            </label>
            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you're offering in detail..."
                required
              />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                Category
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </label>
              <label>
                Price (R)
                <input
                  value={price}
                  type="number"
                  min={1}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  required
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button type="submit" className="btn-lg" style={{ flex: 1 }}>
                Post Gig
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
          <h3>Login to Post a Gig</h3>
          <p>Join our community to offer your skills and earn.</p>
        </div>
      )}

      {/* Gigs Grid */}
      {loading && items.length === 0 ? (
        <div className="grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="gig-card">
              <div className="loading-skeleton" style={{ height: 24, width: '60%', marginBottom: 12 }} />
              <div className="loading-skeleton" style={{ height: 16, width: '40%', marginBottom: 16 }} />
              <div className="loading-skeleton" style={{ height: 60, width: '100%' }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state animate-fade-in">
          <div className="empty-state-icon">📭</div>
          <h3>No gigs found</h3>
          <p>{q ? 'Try adjusting your search terms.' : 'Be the first to post a gig!'}</p>
        </div>
      ) : (
        <div className="grid stagger-children">
          {items.map((g) => (
            <div key={g.id} className="gig-card">
              <div className="card-header">
                <div className="pillRow">
                  <span className="pill category">{g.category || 'General'}</span>
                  <span className="pill strong">R{g.price?.toLocaleString()}</span>
                </div>
              </div>
              <h3 className="card-title">{g.title}</h3>
              <p className="card-description">{g.description}</p>
              <div style={{ 
                marginTop: 'auto', 
                paddingTop: 12, 
                borderTop: '1px solid var(--border)', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Posted recently
                </span>
                <Link className="btn-sm" to={`/gigs/${g.id}`}>
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
