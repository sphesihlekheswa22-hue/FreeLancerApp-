import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="card">
      <h1>Page not found</h1>
      <p className="muted">The page you’re looking for doesn’t exist.</p>
      <p style={{ marginTop: 12 }}>
        <Link className="btn secondary" to="/">
          Go home
        </Link>
      </p>
    </div>
  )
}

