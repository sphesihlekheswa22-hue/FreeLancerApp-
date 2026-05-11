import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  getToken,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  me,
  setToken,
  type NotificationItem,
} from './lib/api'
import { useDropdown } from './lib/useDropdown'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import GigsPage from './pages/GigsPage'
import JobsPage from './pages/JobsPage'
import ProfilePage from './pages/ProfilePage'
import ApplicationsPage from './pages/ApplicationsPage'
import MessagesPage from './pages/MessagesPage'
import DashboardPage from './pages/DashboardPage'
import LandingPage from './pages/LandingPage'
import NotFoundPage from './pages/NotFoundPage'
import GigDetailPage from './pages/GigDetailPage'
import JobDetailPage from './pages/JobDetailPage'
import UserProfilePage from './pages/UserProfilePage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import TopFreelancersPage from './pages/TopFreelancersPage'
import AdminDashboardPage from './pages/AdminDashboardPage'

function RequireAuth({ isAuthed, children }: { isAuthed: boolean; children: React.ReactNode }) {
  if (!isAuthed) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ isAuthed, role, children }: { isAuthed: boolean; role: string | null; children: React.ReactNode }) {
  if (!isAuthed) return <Navigate to="/login" replace />
  if (role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function NavLink({ to, children, icon }: { to: string; children: React.ReactNode; icon?: string }) {
  const location = useLocation()
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/')

  return (
    <Link to={to} className={`nav-link ${isActive ? 'active' : ''}`}>
      {icon && <span className="nav-link-icon">{icon}</span>}
      <span className="nav-link-text">{children}</span>
      {isActive && <span className="nav-link-indicator" />}
    </Link>
  )
}

type CurrentUser = {
  id: number
  name: string
  email: string
  role: string
}

export default function App() {
  const [isReady, setIsReady] = useState(false)
  const [isAuthed, setIsAuthed] = useState(Boolean(getToken()))
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const notif = useDropdown()
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  const refreshNotifications = useCallback(async () => {
    if (!isAuthed) return
    try {
      const res = await listNotifications()
      setNotifications(res)
    } catch {
      // ignore
    }
  }, [isAuthed])

  useEffect(() => {
    ;(async () => {
      if (!getToken()) {
        setIsReady(true)
        return
      }
      try {
        const u = await me()
        setCurrentUser(u)
        setIsAuthed(true)
      } catch {
        setToken(null)
        setIsAuthed(false)
        setCurrentUser(null)
      } finally {
        setIsReady(true)
      }
    })()
  }, [])

  useEffect(() => {
    refreshNotifications()
  }, [refreshNotifications])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [mobileMenuOpen])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (!isReady) {
    return (
      <div className="app-loader">
        <div className="app-loader-spinner" />
        <p className="app-loader-text">Loading Campus Gigs...</p>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="app-background" />

      {/* ─── Header ────────────────────────────────────────────── */}
      <header className={`app-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-inner">
          <Link className="brand" to="/" onClick={() => setMobileMenuOpen(false)}>
            <div className="brand-icon">🎓</div>
            <span className="brand-text">Campus Gigs</span>
          </Link>

          {/* Desktop Navigation */}
          {!isAuthed ? (
            <nav className="desktop-nav">
              <NavLink to="/gigs" icon="💼">Gigs</NavLink>
              <NavLink to="/jobs" icon="💻">Jobs</NavLink>
              <NavLink to="/login" icon="🔑">Login</NavLink>
              <Link to="/register" className="nav-cta-btn">
                Get Started
              </Link>
            </nav>
          ) : (
            <div className="header-actions">
              {/* Notification Dropdown */}
              <div className="dropdown-root" ref={notif.rootRef} data-open={notif.open}>
                <button
                  type="button"
                  className="notif-btn"
                  {...notif.buttonProps}
                  onClick={async () => {
                    const next = !notif.open
                    notif.setOpen(next)
                    if (next) await refreshNotifications()
                  }}
                  title="Notifications"
                >
                  <span className="notif-icon">🔔</span>
                  {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </button>

                <div className={`notif-menu dropdown-menu ${notif.open ? 'open' : ''}`} {...notif.menuProps} tabIndex={-1}>
                  <div className="notif-header">
                    <span className="notif-title">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="mark-all-btn"
                        onClick={async () => {
                          await markAllNotificationsRead()
                          await refreshNotifications()
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">
                        <span className="notif-empty-icon">📭</span>
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.slice(0, 12).map((n) => (
                        <div key={n.id} className={`notif-item ${n.is_read ? '' : 'unread'}`}>
                          <div className="notif-content">
                            <p className="notif-message">{n.message}</p>
                            {n.link && (
                              <Link to={n.link} onClick={() => notif.close()} className="notif-link">
                                View details →
                              </Link>
                            )}
                          </div>
                          {!n.is_read && (
                            <button
                              type="button"
                              className="notif-mark-btn"
                              title="Mark as read"
                              onClick={async () => {
                                await markNotificationRead(n.id)
                                await refreshNotifications()
                              }}
                            >
                              ✓
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <button
                className="logout-btn"
                onClick={() => {
                  setToken(null)
                  setIsAuthed(false)
                  setCurrentUser(null)
                  setMobileMenuOpen(false)
                }}
              >
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className={`mobile-toggle ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {/* Mobile Navigation */}
        <div ref={mobileMenuRef} className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
          {!isAuthed ? (
            <>
              <NavLink to="/gigs" icon="💼">Gigs</NavLink>
              <NavLink to="/jobs" icon="💻">Jobs</NavLink>
              <NavLink to="/login" icon="🔑">Login</NavLink>
              <Link to="/register" className="mobile-cta" onClick={() => setMobileMenuOpen(false)}>
                Get Started
              </Link>
            </>
          ) : (
            <>
              <NavLink to="/dashboard" icon="📊">Dashboard</NavLink>
              <NavLink to="/gigs" icon="💼">Gigs</NavLink>
              <NavLink to="/jobs" icon="💻">Jobs</NavLink>
              <NavLink to="/applications" icon="📋">Applications</NavLink>
              <NavLink to="/top-freelancers" icon="🏆">Top Rated</NavLink>
              <NavLink to="/messages" icon="💬">Messages</NavLink>
              <NavLink to="/profile" icon="👤">Profile</NavLink>
              {currentUser?.role === 'admin' && (
                <NavLink to="/admin" icon="⚡">Admin</NavLink>
              )}
              <button
                className="mobile-logout"
                onClick={() => {
                  setToken(null)
                  setIsAuthed(false)
                  setCurrentUser(null)
                  setMobileMenuOpen(false)
                }}
              >
                <span>🚪</span> Logout
              </button>
            </>
          )}
        </div>
      </header>

      {/* ─── App Shell (Sidebar + Content) ─────────────────────── */}
      <div className="app-shell">
        {isAuthed ? (
          <aside className="app-sidebar">
            <div className="sidebar-title">Navigation</div>
            <div className="sidebar-links">
              <NavLink to="/dashboard" icon="📊">Dashboard</NavLink>
              <NavLink to="/gigs" icon="💼">Gigs</NavLink>
              <NavLink to="/jobs" icon="💻">Jobs</NavLink>
              <NavLink to="/applications" icon="📋">Applications</NavLink>
              <NavLink to="/top-freelancers" icon="🏆">Top Rated</NavLink>
              <NavLink to="/messages" icon="💬">Messages</NavLink>
              <NavLink to="/profile" icon="👤">Profile</NavLink>
              {currentUser?.role === 'admin' ? <NavLink to="/admin" icon="⚡">Admin</NavLink> : null}
            </div>
            <div className="sidebar-footer">
              <div className="sidebar-user">
                <div className="sidebar-user-name">{currentUser?.name ?? 'Account'}</div>
                <div className="sidebar-user-email">{currentUser?.email ?? ''}</div>
              </div>
              <button
                className="sidebar-logout"
                onClick={() => {
                  setToken(null)
                  setIsAuthed(false)
                  setCurrentUser(null)
                  setMobileMenuOpen(false)
                }}
              >
                🚪 Logout
              </button>
            </div>
          </aside>
        ) : null}

        {/* ─── Main Content ──────────────────────────────────────── */}
        <main className="app-main">
          <Routes>
          <Route path="/" element={isAuthed ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
          <Route path="/dashboard" element={<RequireAuth isAuthed={isAuthed}><DashboardPage isAuthed={isAuthed} /></RequireAuth>} />
          <Route path="/login" element={<LoginPage onAuthed={async () => { setIsAuthed(true); try { setCurrentUser(await me()) } catch {} }} />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/register" element={<RegisterPage onAuthed={async () => { setIsAuthed(true); try { setCurrentUser(await me()) } catch {} }} />} />
          <Route path="/gigs" element={<GigsPage isAuthed={isAuthed} />} />
          <Route path="/gigs/:gigId" element={<GigDetailPage />} />
          <Route path="/jobs" element={<JobsPage isAuthed={isAuthed} />} />
          <Route path="/jobs/:jobId" element={<JobDetailPage isAuthed={isAuthed} />} />
          <Route path="/applications" element={<RequireAuth isAuthed={isAuthed}><ApplicationsPage isAuthed={isAuthed} /></RequireAuth>} />
          <Route path="/top-freelancers" element={<RequireAuth isAuthed={isAuthed}><TopFreelancersPage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAdmin isAuthed={isAuthed} role={currentUser?.role ?? null}><AdminDashboardPage /></RequireAdmin>} />
          <Route path="/messages" element={<RequireAuth isAuthed={isAuthed}><MessagesPage isAuthed={isAuthed} /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth isAuthed={isAuthed}><ProfilePage isAuthed={isAuthed} /></RequireAuth>} />
          <Route path="/users/:userId" element={<UserProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-brand-icon">🎓</div>
            <span>Campus Gigs</span>
          </div>
          <p className="footer-tagline">Connecting students with opportunities. Built for the campus community.</p>
          <div className="footer-links">
            <a href="#">About</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>
          <p className="footer-copyright">© 2026 Campus Gigs. All rights reserved.</p>
        </div>
      </footer>

      {/* ─── Global Styles (App-specific) ──────────────────────── */}
      <style>{`
        /* ===== App Loader ===== */
        .app-loader {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: var(--bg);
        }

        .app-loader-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .app-loader-text {
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.9375rem;
        }

        /* ===== App Container ===== */
        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        /* ===== Shell Layout (Sidebar) ===== */
        .app-shell {
          flex: 1;
          display: flex;
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
        }

        .app-sidebar {
          width: 270px;
          flex: 0 0 270px;
          padding: 18px 14px;
          border-right: 1px solid var(--border-light);
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(16px) saturate(160%);
          -webkit-backdrop-filter: blur(16px) saturate(160%);
          position: sticky;
          top: 74px;
          height: calc(100vh - 74px);
          overflow: auto;
        }

        .sidebar-title {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-secondary);
          padding: 8px 10px;
        }

        .sidebar-links {
          display: grid;
          gap: 6px;
          padding: 6px;
        }

        .sidebar-footer {
          margin-top: 14px;
          padding: 12px;
          border-top: 1px solid var(--border-light);
          display: grid;
          gap: 10px;
        }

        .sidebar-user-name {
          font-weight: 900;
          color: var(--text-h);
          line-height: 1.1;
        }

        .sidebar-user-email {
          margin-top: 4px;
          font-size: 12px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sidebar-logout {
          width: 100%;
          justify-content: center;
          background: var(--bg-secondary);
          color: var(--text-h);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 10px 12px;
          font-weight: 800;
        }

        .sidebar-logout:hover {
          background: var(--accent-bg);
          border-color: var(--accent-border);
          color: var(--accent);
          box-shadow: var(--shadow-sm);
          transform: translateY(-1px);
        }

        .app-background {
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          overflow: hidden;
        }

        .app-background::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background:
            radial-gradient(ellipse 80% 50% at 20% 40%, rgba(124, 58, 237, 0.05) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 60%, rgba(168, 85, 247, 0.03) 0%, transparent 50%);
          animation: bgShift 25s ease-in-out infinite;
        }

        @keyframes bgShift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(2%, 1%); }
        }

        /* ===== Header ===== */
        .app-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid var(--border-light);
          transition: all var(--transition-base);
        }

        .app-header.scrolled {
          box-shadow: var(--shadow-md);
          border-bottom-color: transparent;
          background: rgba(255, 255, 255, 0.95);
        }

        .header-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-3) var(--space-6);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--text-h);
          letter-spacing: -0.03em;
          transition: transform var(--transition-fast);
        }

        .brand:hover {
          transform: scale(1.02);
        }

        .brand-icon {
          width: 40px;
          height: 40px;
          background: var(--accent-gradient);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.25rem;
          box-shadow: var(--shadow-accent);
          transition: box-shadow 0.3s ease;
        }

        .brand:hover .brand-icon {
          box-shadow: 0 10px 40px -8px rgba(37, 99, 235, 0.5);
        }

        /* ===== Desktop Nav ===== */
        .desktop-nav {
          display: flex;
          align-items: center;
          gap: var(--space-1);
        }

        .nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-secondary);
          text-decoration: none;
          transition: all var(--transition-fast);
          overflow: hidden;
        }

        .nav-link::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--accent-bg);
          border-radius: inherit;
          opacity: 0;
          transform: scale(0.85);
          transition: all var(--transition-fast);
        }

        .nav-link:hover {
          color: var(--accent);
        }

        .nav-link:hover::before {
          opacity: 1;
          transform: scale(1);
        }

        .nav-link.active {
          color: var(--accent);
        }

        .nav-link.active::before {
          opacity: 1;
          transform: scale(1);
        }

        .nav-link-icon {
          position: relative;
          z-index: 1;
          font-size: 1rem;
        }

        .nav-link-text {
          position: relative;
          z-index: 1;
        }

        .nav-link-indicator {
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 3px;
          background: var(--accent-gradient);
          border-radius: 2px;
          z-index: 1;
        }

        .nav-cta-btn {
          display: inline-flex;
          align-items: center;
          padding: var(--space-2) var(--space-5);
          background: var(--accent-gradient);
          color: white;
          border-radius: var(--radius-lg);
          font-weight: 700;
          font-size: 0.875rem;
          text-decoration: none;
          margin-left: var(--space-2);
          box-shadow: var(--shadow-accent);
          transition: all var(--transition-fast);
        }

        .nav-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px -10px rgba(37, 99, 235, 0.5);
        }

        /* ===== Notification Dropdown ===== */
        .dropdown-root {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .notif-btn {
          position: relative;
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          background: var(--bg-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notif-btn:hover {
          border-color: var(--accent-border);
          background: var(--accent-bg);
        }

        .notif-icon {
          font-size: 1.1rem;
        }

        .notif-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 9px;
          background: var(--error);
          color: white;
          font-size: 0.6875rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--surface);
          animation: badgePulse 2s ease-in-out infinite;
        }

        @keyframes badgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .notif-menu {
          position: absolute;
          right: 0;
          top: calc(100% + 12px);
          width: min(380px, calc(100vw - 32px));
          border: 1px solid var(--border);
          background: var(--surface);
          border-radius: var(--radius-2xl);
          padding: var(--space-4);
          box-shadow: var(--shadow-xl);
          z-index: 200;
        }

        .dropdown-menu {
          opacity: 0;
          transform: translateY(-8px) scale(0.97);
          transform-origin: top right;
          pointer-events: none;
          transition: all var(--transition-fast);
        }

        .dropdown-menu.open {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }

        .notif-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-3);
          padding-bottom: var(--space-3);
          border-bottom: 1px solid var(--border-light);
        }

        .notif-title {
          font-weight: 800;
          font-size: 1rem;
          color: var(--text-h);
        }

        .mark-all-btn {
          padding: 6px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          background: var(--bg-secondary);
          color: var(--accent);
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .mark-all-btn:hover {
          background: var(--accent-bg);
          border-color: var(--accent-border);
        }

        .notif-list {
          display: grid;
          gap: 8px;
          max-height: 50vh;
          overflow: auto;
        }

        .notif-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 12px;
          background: var(--bg-secondary);
          transition: all var(--transition-fast);
        }

        .notif-item.unread {
          border-color: var(--accent-border);
          background: var(--accent-bg);
        }

        .notif-item:hover {
          border-color: var(--accent-border);
          transform: translateX(2px);
        }

        .notif-content {
          flex: 1;
          min-width: 0;
        }

        .notif-message {
          font-size: 0.875rem;
          color: var(--text-h);
          font-weight: 600;
          line-height: 1.5;
          margin: 0;
        }

        .notif-link {
          display: inline-block;
          margin-top: 6px;
          font-size: 0.8125rem;
          color: var(--accent);
          font-weight: 600;
          text-decoration: none;
        }

        .notif-link:hover {
          text-decoration: underline;
        }

        .notif-mark-btn {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--success);
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
        }

        .notif-mark-btn:hover {
          background: var(--success-bg);
          border-color: var(--success);
        }

        .notif-empty {
          text-align: center;
          padding: var(--space-8) var(--space-4);
          color: var(--text-secondary);
        }

        .notif-empty-icon {
          font-size: 2.5rem;
          display: block;
          margin-bottom: var(--space-3);
          opacity: 0.5;
        }

        .notif-empty p {
          font-size: 0.9375rem;
          font-weight: 500;
        }

        /* ===== Logout ===== */
        .logout-btn {
          appearance: none;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          background: transparent;
          font: inherit;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all var(--transition-fast);
          position: relative;
          overflow: hidden;
        }

        .logout-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--error-bg);
          border-radius: inherit;
          opacity: 0;
          transform: scale(0.85);
          transition: all var(--transition-fast);
        }

        .logout-btn:hover {
          color: var(--error);
        }

        .logout-btn:hover::before {
          opacity: 1;
          transform: scale(1);
        }

        .logout-btn span {
          position: relative;
          z-index: 1;
        }

        /* ===== Mobile Toggle ===== */
        .mobile-toggle {
          display: none;
          flex-direction: column;
          gap: 5px;
          padding: 8px;
          background: none;
          border: none;
          cursor: pointer;
          z-index: 101;
        }

        .mobile-toggle span {
          display: block;
          width: 24px;
          height: 2.5px;
          background: var(--text-h);
          border-radius: 2px;
          transition: all 0.3s ease;
          transform-origin: center;
        }

        .mobile-toggle.open span:nth-child(1) {
          transform: translateY(7.5px) rotate(45deg);
        }

        .mobile-toggle.open span:nth-child(2) {
          opacity: 0;
          transform: scaleX(0);
        }

        .mobile-toggle.open span:nth-child(3) {
          transform: translateY(-7.5px) rotate(-45deg);
        }

        /* ===== Mobile Nav ===== */
        .mobile-nav {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          padding: var(--space-4);
          flex-direction: column;
          gap: var(--space-2);
          box-shadow: var(--shadow-lg);
          transform: translateY(-10px);
          opacity: 0;
          pointer-events: none;
          transition: all 0.3s ease;
        }

        .mobile-nav.open {
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }

        .mobile-nav .nav-link {
          padding: var(--space-3) var(--space-4);
          font-size: 1rem;
        }

        .mobile-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-3) var(--space-4);
          background: var(--accent-gradient);
          color: white;
          border-radius: var(--radius-lg);
          font-weight: 700;
          text-decoration: none;
          margin-top: var(--space-2);
        }

        .mobile-logout {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          background: var(--bg-secondary);
          color: var(--error);
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          margin-top: var(--space-2);
        }

        /* ===== Main ===== */
        .app-main {
          flex: 1;
          padding: var(--space-8) var(--space-6);
          width: 100%;
        }

        /* ===== Footer ===== */
        .app-footer {
          margin-top: auto;
          padding: var(--space-10) var(--space-6);
          border-top: 1px solid var(--border);
          background: var(--bg-secondary);
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }

        .footer-brand {
          display: inline-flex;
          align-items: center;
          gap: var(--space-3);
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-h);
          margin-bottom: var(--space-3);
        }

        .footer-brand-icon {
          width: 36px;
          height: 36px;
          background: var(--accent-gradient);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.1rem;
        }

        .footer-tagline {
          color: var(--text-secondary);
          font-size: 0.9375rem;
          margin-bottom: var(--space-5);
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: var(--space-6);
          margin-bottom: var(--space-6);
        }

        .footer-links a {
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          transition: color var(--transition-fast);
        }

        .footer-links a:hover {
          color: var(--accent);
        }

        .footer-copyright {
          color: var(--text-secondary);
          font-size: 0.8125rem;
          opacity: 0.7;
        }

        /* ===== Responsive ===== */
        @media (max-width: 1024px) {
          .app-shell {
            display: block;
            max-width: 1400px;
            margin: 0 auto;
            width: 100%;
          }

          .app-sidebar {
            display: none;
          }

          .desktop-nav {
            display: none;
          }

          .mobile-toggle {
            display: flex;
          }

          .mobile-nav {
            display: flex;
          }

          .header-inner {
            padding: var(--space-3) var(--space-4);
          }
        }

        @media (max-width: 768px) {
          .app-main {
            padding: var(--space-5) var(--space-4);
          }

          .brand-text {
            display: none;
          }

          .footer-links {
            gap: var(--space-4);
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  )
}