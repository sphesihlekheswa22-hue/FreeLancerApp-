import { FormEvent, useEffect, useRef, useState } from 'react'
import { login, setToken } from '../lib/api'
import { Link, useNavigate } from 'react-router-dom'

// ─── Floating Particle Background ────────────────────────────────

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = canvas.width = canvas.offsetWidth
    let h = canvas.height = canvas.offsetHeight
    let particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number }[] = []
    let mouse = { x: -1000, y: -1000 }
    let raf: number

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
      })
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const onLeave = () => { mouse.x = -1000; mouse.y = -1000 }
    const onResize = () => {
      w = canvas.width = canvas.offsetWidth
      h = canvas.height = canvas.offsetHeight
    }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    window.addEventListener('resize', onResize)

    function draw() {
      ctx.clearRect(0, 0, w, h)

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(124, 58, 237, ${0.15 * (1 - dist / 150)})`
            ctx.lineWidth = 1
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw particles
      particles.forEach((p) => {
        // Mouse repulsion
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 100) {
          const force = (100 - dist) / 100
          p.vx += (dx / dist) * force * 0.5
          p.vy += (dy / dist) * force * 0.5
        }

        p.x += p.vx
        p.y += p.vy

        // Damping
        p.vx *= 0.99
        p.vy *= 0.99

        // Bounce
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
        p.x = Math.max(0, Math.min(w, p.x))
        p.y = Math.max(0, Math.min(h, p.y))

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(167, 139, 250, ${p.alpha})`
        ctx.fill()
      })

      raf = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
      }}
    />
  )
}

// ─── Animated Gradient Orbs ──────────────────────────────────────

function GradientOrbs() {
  return (
    <div className="gradient-orbs">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
    </div>
  )
}

// ─── Feature Card for Left Panel ─────────────────────────────────

function FeatureCard({ icon, title, desc, delay }: { icon: string; title: string; desc: string; delay: number }) {
  return (
    <div className="feature-card" style={{ animationDelay: `${delay}s` }}>
      <div className="feature-icon">{icon}</div>
      <div className="feature-content">
        <h4>{title}</h4>
        <p>{desc}</p>
      </div>
    </div>
  )
}

// ─── Password Strength Indicator ─────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => {
    let score = 0
    if (password.length >= 6) score++
    if (password.length >= 10) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  }, [password])

  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent']
  const colors = ['#ef4444', '#f59e0b', '#10b981', '#10b981', '#7c3aed']

  if (!password) return null

  return (
    <div className="password-strength">
      <div className="strength-bars">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="strength-bar"
            style={{
              background: i < strength ? colors[strength - 1] : 'var(--border)',
            }}
          />
        ))}
      </div>
      <span className="strength-label" style={{ color: colors[strength - 1] }}>
        {labels[strength - 1] || 'Too short'}
      </span>
    </div>
  )
}

// ─── Social Login Button ─────────────────────────────────────────

function SocialButton({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <button type="button" className="social-btn" onClick={onClick}>
      <span className="social-icon">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

// ─── Main Login Component ────────────────────────────────────────

export default function LoginPage({ onAuthed }: { onAuthed: () => void | Promise<void> }) {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await login({ email, password })
      setToken(res.access_token)
      await onAuthed()
      nav('/dashboard')
    } catch (err: any) {
      setError(err?.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* ─── Left Panel: Branding & Visuals ────────────────────── */}
      <div className="login-left">
        <GradientOrbs />
        <ParticleBackground />

        <div className="login-left-content">
          {/* Logo */}
          <div className="login-brand animate-fade-in">
            <div className="brand-icon-large">🎓</div>
            <span className="brand-name">Campus Gigs</span>
          </div>

          {/* Headline */}
          <div className="login-headline animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h1>
              Unlock Your
              <br />
              <span className="gradient-text">Campus Potential</span>
            </h1>
            <p>
              Connect with talented students, find gigs, and build your portfolio 
              — all in one place.
            </p>
          </div>

          {/* Features */}
          <div className="login-features">
            <FeatureCard
              icon="⚡"
              title="Instant Matching"
              desc="AI-powered recommendations based on your skills"
              delay={0.4}
            />
            <FeatureCard
              icon="🛡️"
              title="Secure Payments"
              desc="Escrow-protected transactions for peace of mind"
              delay={0.5}
            />
            <FeatureCard
              icon="🌟"
              title="Build Reputation"
              desc="Earn ratings and grow your freelance career"
              delay={0.6}
            />
          </div>

          {/* Stats */}
          <div className="login-stats animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
            <div className="login-stat">
              <span className="login-stat-value">2.5K+</span>
              <span className="login-stat-label">Students</span>
            </div>
            <div className="login-stat-divider" />
            <div className="login-stat">
              <span className="login-stat-value">1.2K+</span>
              <span className="login-stat-label">Gigs Done</span>
            </div>
            <div className="login-stat-divider" />
            <div className="login-stat">
              <span className="login-stat-value">R500K+</span>
              <span className="login-stat-label">Earned</span>
            </div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="login-left-fade" />
      </div>

      {/* ─── Right Panel: Login Form ───────────────────────────── */}
      <div className="login-right">
        <div className="login-form-wrapper animate-scale-in">
          {/* Mobile-only brand */}
          <div className="login-mobile-brand">
            <div className="brand-icon-large">🎓</div>
            <span className="brand-name">Campus Gigs</span>
          </div>

          {/* Header */}
          <div className="login-form-header">
            <h2>Welcome Back</h2>
            <p>Sign in to continue your journey</p>
          </div>

          {/* Social Login */}
          <div className="social-login">
            <SocialButton icon="🔍" label="Google" />
            <SocialButton icon="🍎" label="Apple" />
          </div>

          {/* Divider */}
          <div className="divider">
            <span>or continue with email</span>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="login-form">
            {/* Email */}
            <div className={classNames('form-field', focusedField === 'email' && 'focused')}>
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon-left">📧</span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@university.edu"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className={classNames('form-field', focusedField === 'password' && 'focused')}>
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon-left">🔒</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            {/* Remember + Forgot */}
            <div className="form-options">
              <label className="remember-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkmark" />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
            </div>

            {/* Error */}
            {error && (
              <div className="error animate-shake">
                <span>⚠️</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-submit"
            >
              {loading ? (
                <>
                  <span className="spinner-white" />
                  Signing in...
                </>
              ) : (
                <>
                  <span>🔐</span>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="login-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="register-link">
                Create one
                <span>→</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Utility ─────────────────────────────────────────────────────

function useMemo<T>(factory: () => T, deps: React.DependencyList): T {
  const [value, setValue] = useState<T>(factory())
  const prevDeps = useRef(deps)
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    const changed = deps.some((d, i) => d !== prevDeps.current[i])
    if (changed) {
      setValue(factory())
      prevDeps.current = deps
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return value
}

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
