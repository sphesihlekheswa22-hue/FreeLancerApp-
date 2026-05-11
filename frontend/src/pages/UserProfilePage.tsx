import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getUser } from '../lib/api'

type UserProfileResponse = {
  user: { id: number; name: string; email: string }
  profile: {
    bio: string
    skills: string
    rating: number
    completed_jobs: number
    profile_picture_url: string | null
  }
  reviews: Array<{
    id: number
    reviewer_id: number
    reviewed_user_id: number
    rating: number
    comment: string | null
    created_at: string
  }>
}

export default function UserProfilePage() {
  const { userId } = useParams()
  const [data, setData] = useState<UserProfileResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setError(null)
      try {
        const id = Number(userId)
        const res = await getUser(id)
        setData(res as any)
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load user')
      }
    })()
  }, [userId])

  if (error) return <div className="error">{error}</div>
  if (!data) return <div className="card muted">Loading…</div>

  const skills = (data.profile.skills || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <div className="stack">
      <div className="row">
        <h1 style={{ margin: 0 }}>{data.user.name}</h1>
        <Link className="btn secondary" to="/dashboard">
          Back
        </Link>
      </div>

      <div className="grid2">
        <div className="card left">
          <div className="pillRow">
            <span className="pill strong">Rating {data.profile.rating}</span>
            <span className="pill">Completed {data.profile.completed_jobs}</span>
          </div>
          <h2>Bio</h2>
          <p className="muted">{data.profile.bio || '—'}</p>
          <h2 style={{ marginTop: 14 }}>Skills</h2>
          <div className="chips">
            {skills.length ? skills.map((s) => <span className="pill" key={s}>{s}</span>) : <span className="muted">—</span>}
          </div>
        </div>

        <div className="card left">
          <h2>Recent reviews</h2>
          {data.reviews.length === 0 ? (
            <p className="muted">No reviews yet.</p>
          ) : (
            <div className="stack" style={{ gap: 10, marginTop: 10 }}>
              {data.reviews.map((r) => (
                <div key={r.id} className="card left" style={{ boxShadow: 'none' }}>
                  <div className="pillRow">
                    <span className="pill strong">★ {r.rating}</span>
                    <span className="pill">From #{r.reviewer_id}</span>
                  </div>
                  <p className="muted">{r.comment || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

