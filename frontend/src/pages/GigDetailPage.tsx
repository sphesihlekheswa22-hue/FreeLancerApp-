import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getGig, type Gig } from '../lib/api'

export default function GigDetailPage() {
  const { gigId } = useParams()
  const [gig, setGig] = useState<Gig | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setError(null)
      try {
        const id = Number(gigId)
        const res = await getGig(id)
        setGig(res)
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load gig')
      }
    })()
  }, [gigId])

  if (error) return <div className="error">{error}</div>
  if (!gig) return <div className="card muted">Loading…</div>

  return (
    <div className="stack">
      <div className="row">
        <div>
          <h1 style={{ margin: 0 }}>{gig.title}</h1>
          <div className="pillRow" style={{ marginTop: 10 }}>
            <span className="pill category">{gig.category}</span>
            <span className="pill strong">R{gig.price}</span>
            <Link className="pill" to={`/users/${gig.user_id}`}>
              Seller #{gig.user_id}
            </Link>
          </div>
        </div>
        <Link className="btn secondary" to="/gigs">
          Back to gigs
        </Link>
      </div>

      <div className="card left">
        <h2>Description</h2>
        <p className="muted">{gig.description}</p>
      </div>
    </div>
  )
}

