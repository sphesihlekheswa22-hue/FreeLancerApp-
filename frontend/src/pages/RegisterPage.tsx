import { FormEvent, useState, useEffect, useCallback } from 'react'
import { register, setToken } from '../lib/api'
import { Link, useNavigate } from 'react-router-dom'

// ─── Animated Background ─────────────────────────────────────────
function AnimatedBackground() {
  return (
    <div className="auth-bg">
      <div className="auth-bg-mesh" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="orb orb-4" />
      <div className="auth-bg-grid" />
    </div>
  )
}

// ─── Password Strength Meter ─────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const getStrength = useCallback((pwd: string) => {
    let score = 0
    if (pwd.length >= 6) score++
    if (pwd.length >= 10) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    return Math.min(score, 4)
  }, [])

  const score = getStrength(password)
  const levels = [
    { label: 'Weak', color: 'var(--error)' },
    { label: 'Fair', color: 'var(--warning)' },
    { label: 'Good', color: 'var(--warning)' },
    { label: 'Strong', color: 'var(--success)' },
    { label: 'Excellent', color: 'var(--success)' },
  ]

  if (!password) return null

  return (
    <div className="password-strength">
      <div className="strength-bars">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="strength-bar"
            style={{
              background: i < score ? levels[score].color : 'var(--border)',
              opacity: i < score ? 1 : 0.3,
            }}
          />
        ))}
      </div>
      <span className="strength-label" style={{ color: levels[score].color }}>
        {levels[score].label}
      </span>
    </div>
  )
}

// ─── Social Auth Button ──────────────────────────────────────────
function SocialButton({ icon, label, delay }: { icon: string; label: string; delay: number }) {
  return (
    <button
      type="button"
      className="social-btn"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="social-icon">{icon}</span>
      <span className="social-label">{label}</span>
    </button>
  )
}

// ─── Floating Input Component ────────────────────────────────────
function FloatingInput({
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon,
  required,
  minLength,
  autoComplete,
  children,
}: {
  id: string
  type?: string
  value: string
  onChange: (val: string) => void
  placeholder: string
  icon: string
  required?: boolean
  minLength?: number
  autoComplete?: string
  children?: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  const hasValue = value.length > 0

  return (
    <div className={`input-wrapper ${focused ? 'focused' : ''} ${hasValue ? 'has-value' : ''}`}>
      <div className="input-icon-left">{icon}</div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <label htmlFor={id} className="floating-label">
        {placeholder}
      </label>
      <div className="input-glow" />
      {children}
    </div>
  )
}

export default function RegisterPage({ onAuthed }: { onAuthed: () => void }) {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await register({ name, email, password })
      setToken(res.access_token)
      onAuthed()
      nav('/dashboard')
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      <AnimatedBackground />

      <div className="register-container">
        {/* ─── Left Panel: Brand Story ───────────────────────────── */}
        <div className={`brand-panel ${mounted ? 'animate-in-left' : ''}`}>
          <div className="brand-content">
            <div className="brand-logo-large">
              <div className="brand-icon-glow">🎓</div>
              <span className="brand-name-large">Campus Gigs</span>
            </div>

            <h1 className="brand-headline">
              Start Your<br />
              <span className="gradient-text">Campus Journey</span>
            </h1>

            <p className="brand-description">
              Join thousands of students turning their skills into real income.
              Connect with peers, find gigs, and build your portfolio today.
            </p>

            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-number">12K+</div>
                <div className="stat-label">Students</div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <div className="stat-number">8.5K</div>
                <div className="stat-label">Gigs Posted</div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <div className="stat-number">$2.4M</div>
                <div className="stat-label">Earned</div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-quote">
                "I earned my first $500 designing logos for campus clubs. Campus Gigs completely changed my college experience."
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">👩‍🎓</div>
                <div className="author-info">
                  <div className="author-name">Sarah Chen</div>
                  <div className="author-role">Design Major, Class of 2026</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right Panel: Registration Form ────────────────────── */}
        <div className={`form-panel ${mounted ? 'animate-in-right' : ''}`}>
          <div className="glass-card">
            <div className="form-header">
              <h2>Create your account</h2>
              <p className="form-subtitle">Join the community in seconds</p>
            </div>

            {/* Social Auth */}
            <div className="social-auth">
              <SocialButton icon="🔍" label="Continue with Google" delay={200} />
              <SocialButton icon="🐙" label="Continue with GitHub" delay={300} />
            </div>

            <div className="divider">
              <span>or sign up with email</span>
            </div>

            <form onSubmit={onSubmit} className="register-form">
              <FloatingInput
                id="name"
                value={name}
                onChange={setName}
                placeholder="Full Name"
                icon="👤"
                required
                autoComplete="name"
              />

              <FloatingInput
                id="email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="Email Address"
                icon="📧"
                required
                autoComplete="email"
              />

              <FloatingInput
                id="password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Password"
                icon="🔒"
                required
                minLength={6}
                autoComplete="new-password"
              >
                <PasswordStrength password={password} />
                <span className="hint-text">Minimum 6 characters with numbers & symbols</span>
              </FloatingInput>

              {/* Terms Checkbox */}
              <label className="terms-checkbox">
                <div className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                  />
                  <div className="checkbox-custom">
                    {agreedToTerms && <span>✓</span>}
                  </div>
                </div>
                <span className="terms-text">
                  I agree to the <a href="#" className="terms-link">Terms of Service</a> and{' '}
                  <a href="#" className="terms-link">Privacy Policy</a>
                </span>
              </label>

              {/* Error Toast */}
              {error && (
                <div className="error-toast" role="alert">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                disabled={loading || !agreedToTerms}
                type="submit"
                className="submit-btn"
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    <span>Creating your account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <span className="btn-arrow">→</span>
                  </>
                )}
              </button>
            </form>

            <div className="form-footer">
              <p className="login-prompt">
                Already have an account?{' '}
                <Link to="/login" className="login-link">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Styles ────────────────────────────────────────────── */}
      <style>{`
        /* ===== Page Layout ===== */
        .register-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          position: relative;
          overflow: hidden;
          font-family: var(--font-sans);
        }

        .register-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-width: 1200px;
          width: 100%;
          min-height: 700px;
          position: relative;
          z-index: 1;
          padding: 24px;
          gap: 48px;
        }

        /* ===== Animated Background ===== */
        .auth-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .auth-bg-mesh {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 50% at 20% 40%, rgba(124, 58, 237, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 60%, rgba(168, 85, 247, 0.04) 0%, transparent 50%),
            radial-gradient(ellipse 50% 50% at 50% 100%, rgba(139, 92, 246, 0.03) 0%, transparent 50%);
          animation: meshShift 20s ease-in-out infinite;
        }

        @keyframes meshShift {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(2%, 2%) rotate(1deg); }
          66% { transform: translate(-1%, 1%) rotate(-1deg); }
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
          animation: orbFloat 20s infinite ease-in-out;
        }

        .orb-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%);
          top: -150px;
          left: -100px;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, transparent 70%);
          bottom: -100px;
          right: -80px;
          animation-delay: -7s;
        }

        .orb-3 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%);
          top: 40%;
          left: 30%;
          animation-delay: -14s;
        }

        .orb-4 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%);
          bottom: 20%;
          left: 10%;
          animation-delay: -10s;
        }

        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }

        .auth-bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(124, 58, 237, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124, 58, 237, 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black, transparent);
          -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black, transparent);
        }

        /* ===== Brand Panel ===== */
        .brand-panel {
          display: flex;
          align-items: center;
          padding: 32px;
          opacity: 0;
          transform: translateX(-30px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .brand-panel.animate-in-left {
          opacity: 1;
          transform: translateX(0);
        }

        .brand-content {
          max-width: 440px;
        }

        .brand-logo-large {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 40px;
        }

        .brand-icon-glow {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: var(--accent-gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          box-shadow: var(--shadow-accent);
          animation: iconPulse 3s ease-in-out infinite;
        }

        @keyframes iconPulse {
          0%, 100% { box-shadow: var(--shadow-accent); }
          50% { box-shadow: 0 10px 50px -10px rgba(37, 99, 235, 0.6); }
        }

        .brand-name-large {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--text-h);
          letter-spacing: -0.02em;
        }

        .brand-headline {
          font-size: clamp(2.5rem, 5vw, 3.5rem);
          font-weight: 800;
          color: var(--text-h);
          line-height: 1.05;
          margin-bottom: 20px;
          letter-spacing: -0.03em;
        }

        .gradient-text {
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          background-size: 200% 200%;
          animation: gradientMove 6s ease infinite;
        }

        @keyframes gradientMove {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .brand-description {
          color: var(--text-secondary);
          font-size: 1.05rem;
          line-height: 1.7;
          margin-bottom: 36px;
          max-width: 380px;
        }

        .stats-row {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 36px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-number {
          font-family: var(--font-heading);
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-h);
          line-height: 1;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 6px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 600;
        }

        .stat-divider {
          width: 1px;
          height: 36px;
          background: var(--border);
        }

        .testimonial-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-2xl);
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        .testimonial-card::before {
          content: '"';
          position: absolute;
          top: -10px;
          right: 16px;
          font-size: 6rem;
          color: var(--accent);
          opacity: 0.08;
          font-family: Georgia, serif;
          line-height: 1;
        }

        .testimonial-quote {
          color: var(--text);
          font-style: italic;
          font-size: 0.9375rem;
          line-height: 1.7;
          margin-bottom: 16px;
          position: relative;
          z-index: 1;
        }

        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .author-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--accent-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          border: 2px solid var(--border);
        }

        .author-name {
          color: var(--text-h);
          font-weight: 700;
          font-size: 0.875rem;
        }

        .author-role {
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 500;
        }

        /* ===== Form Panel ===== */
        .form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          opacity: 0;
          transform: translateX(30px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          transition-delay: 0.15s;
        }

        .form-panel.animate-in-right {
          opacity: 1;
          transform: translateX(0);
        }

        /* ===== Glass Card ===== */
        .glass-card {
          width: 100%;
          max-width: 440px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-2xl);
          padding: 40px;
          box-shadow: var(--shadow-xl);
          position: relative;
          overflow: hidden;
          animation: cardFloat 6s ease-in-out infinite;
        }

        @keyframes cardFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .glass-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--accent-gradient);
          opacity: 0.8;
        }

        .form-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .form-header h2 {
          font-family: var(--font-heading);
          color: var(--text-h);
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }

        .form-subtitle {
          color: var(--text-secondary);
          font-size: 0.9375rem;
        }

        /* ===== Social Auth ===== */
        .social-auth {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 24px;
        }

        .social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 12px;
          border-radius: var(--radius-lg);
          border: 2px solid var(--border);
          background: var(--bg-secondary);
          color: var(--text-h);
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          opacity: 0;
          animation: fadeInUp 0.5s ease-out forwards;
        }

        .social-btn:hover {
          border-color: var(--accent-border);
          background: var(--accent-bg);
          color: var(--accent);
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }

        .social-icon {
          font-size: 1.125rem;
        }

        .social-label {
          font-weight: 600;
        }

        /* ===== Divider ===== */
        .divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          color: var(--text-secondary);
          font-size: 0.8125rem;
          font-weight: 500;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        /* ===== Floating Inputs ===== */
        .register-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-wrapper {
          position: relative;
        }

        .input-wrapper input {
          width: 100%;
          padding: 16px 16px 16px 44px;
          background: var(--bg-secondary);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          color: var(--text-h);
          font-size: 0.9375rem;
          font-family: var(--font-sans);
          outline: none;
          transition: all 0.25s ease;
        }

        .input-wrapper input::placeholder {
          color: transparent;
        }

        .input-wrapper input:focus {
          border-color: var(--accent);
          background: var(--surface);
          box-shadow: 0 0 0 4px var(--accent-bg);
        }

        .input-wrapper.focused .input-glow,
        .input-wrapper.has-value .input-glow {
          opacity: 1;
        }

        .input-icon-left {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.1rem;
          opacity: 0.5;
          transition: all 0.25s ease;
          pointer-events: none;
          z-index: 2;
        }

        .input-wrapper.focused .input-icon-left,
        .input-wrapper.has-value .input-icon-left {
          opacity: 0.8;
        }

        .input-wrapper.focused .input-icon-left {
          color: var(--accent);
        }

        .floating-label {
          position: absolute;
          left: 44px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
          font-size: 0.9375rem;
          font-weight: 500;
          pointer-events: none;
          transition: all 0.2s ease;
          background: transparent;
          padding: 0 4px;
          margin-left: -4px;
        }

        .input-wrapper.focused .floating-label,
        .input-wrapper.has-value .floating-label {
          top: 0;
          transform: translateY(-50%) scale(0.8);
          color: var(--accent);
          background: var(--surface);
          font-weight: 600;
        }

        .input-glow {
          position: absolute;
          inset: -2px;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(236, 72, 153, 0.1));
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: -1;
          filter: blur(8px);
          pointer-events: none;
        }

        .hint-text {
          display: block;
          margin-top: 6px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        /* ===== Password Strength ===== */
        .password-strength {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 10px;
        }

        .strength-bars {
          display: flex;
          gap: 4px;
          flex: 1;
        }

        .strength-bar {
          flex: 1;
          height: 4px;
          border-radius: 2px;
          transition: all 0.4s ease;
        }

        .strength-label {
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* ===== Terms Checkbox ===== */
        .terms-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
          margin-top: 4px;
        }

        .terms-checkbox input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .checkbox-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .checkbox-custom {
          width: 20px;
          height: 20px;
          border: 2px solid var(--border);
          border-radius: 6px;
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .terms-checkbox input:checked + .checkbox-custom {
          background: var(--accent-gradient);
          border-color: var(--accent);
          box-shadow: var(--shadow-accent);
        }

        .checkbox-custom span {
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .terms-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .terms-link {
          color: var(--accent);
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          position: relative;
        }

        .terms-link::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          width: 0;
          height: 2px;
          background: var(--accent);
          transition: width 0.3s ease;
        }

        .terms-link:hover::after {
          width: 100%;
        }

        /* ===== Error Toast ===== */
        .error-toast {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: var(--error-bg);
          border: 1px solid var(--error-border);
          border-radius: var(--radius-lg);
          color: var(--error);
          font-size: 0.875rem;
          font-weight: 600;
          animation: shake 0.5s ease;
        }

        .error-icon {
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }

        /* ===== Submit Button ===== */
        .submit-btn {
          width: 100%;
          padding: 14px;
          border-radius: var(--radius-xl);
          border: none;
          background: var(--accent-gradient);
          color: white;
          font-size: 1rem;
          font-weight: 700;
          font-family: var(--font-sans);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-accent);
          margin-top: 4px;
        }

        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s ease;
        }

        .submit-btn:hover:not(:disabled)::before {
          transform: translateX(100%);
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px -10px rgba(37, 99, 235, 0.5);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .btn-arrow {
          transition: transform 0.2s ease;
          font-size: 1.1rem;
        }

        .submit-btn:hover .btn-arrow {
          transform: translateX(4px);
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ===== Form Footer ===== */
        .form-footer {
          margin-top: 28px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
          text-align: center;
        }

        .login-prompt {
          color: var(--text-secondary);
          font-size: 0.9375rem;
          font-weight: 500;
        }

        .login-link {
          color: var(--accent);
          font-weight: 700;
          text-decoration: none;
          position: relative;
          transition: all 0.2s;
        }

        .login-link::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 2px;
          background: var(--accent);
          transition: width 0.3s ease;
        }

        .login-link:hover {
          color: var(--accent-light);
        }

        .login-link:hover::after {
          width: 100%;
        }

        /* ===== Animations ===== */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ===== Responsive ===== */
        @media (max-width: 968px) {
          .register-container {
            grid-template-columns: 1fr;
            max-width: 480px;
            gap: 0;
          }

          .brand-panel {
            display: none;
          }

          .form-panel {
            padding: 16px;
          }

          .glass-card {
            padding: 32px 24px;
          }
        }

        @media (max-width: 480px) {
          .glass-card {
            border-radius: var(--radius-xl);
            padding: 24px 20px;
          }

          .brand-headline {
            font-size: 2rem;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .orb, .auth-bg-mesh, .brand-icon-glow, .glass-card, .gradient-text {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}