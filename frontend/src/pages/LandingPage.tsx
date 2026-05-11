import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="landing">
      <div className="landingHero">
        <div className="heroBadge">
          <span className="pill strong">Campus Gigs</span>
          <span className="muted">Student freelance marketplace</span>
        </div>

        <h1 className="landingTitle">
          Find campus talent. <span className="accentText">Hire fast.</span>
        </h1>
        <p className="landingSubtitle">
          A university-only marketplace where students post gigs, request help, apply,
          message, and review each other.
        </p>

        <div className="landingCtas">
          <Link className="btn" to="/register">
            Create account
          </Link>
          <Link className="btn secondary" to="/login">
            Login
          </Link>
        </div>

        <div className="landingGrid">
          <div className="card left">
            <h2 style={{ margin: 0 }}>Post gigs</h2>
            <p className="muted">Offer services like design, tutoring, coding, writing.</p>
          </div>
          <div className="card left">
            <h2 style={{ margin: 0 }}>Request jobs</h2>
            <p className="muted">Create job requests, review applications, hire.</p>
          </div>
          <div className="card left">
            <h2 style={{ margin: 0 }}>Chat & review</h2>
            <p className="muted">Message directly and build reputation with ratings.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

