import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    // Demo-only: no email service wired up yet.
    setSent(true)
  }

  return (
    <div className="card left" style={{ maxWidth: 520, margin: '0 auto' }}>
      <h1>Reset password</h1>
      <p className="muted">
        Demo mode: this will simulate a reset request (no email is sent).
      </p>

      <form className="form" onSubmit={onSubmit} style={{ marginTop: 12 }}>
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
          />
        </label>
        <button type="submit">Request reset link</button>
      </form>

      {sent ? (
        <div className="success" style={{ marginTop: 12 }}>
          If an account exists for <b>{email}</b>, a reset link would be sent.
        </div>
      ) : null}

      <p style={{ marginTop: 12 }}>
        <Link className="btn secondary" to="/login">
          Back to login
        </Link>
      </p>
    </div>
  )
}

