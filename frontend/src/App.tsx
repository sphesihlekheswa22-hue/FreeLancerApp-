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

type NavItem = {
  to: string
  label: string
  icon: string
  auth?: boolean
  admin?: boolean
}

export default function App() {
  const [isReady, setIsReady] = useState(false)
  const [isAuthed, setIsAuthed] = useState(Boolean(getToken()))
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string; email: string; role: string } | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const notif = useDropdown()
  const location = useLocation()
  const sidebarRef = useRef<HTMLDivElement>(null)

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

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [location.pathname])

  // Close mobile sidebar on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setMobileSidebarOpen(false)
      }
    }
    if (mobileSidebarOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [mobileSidebarOpen])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const publicNav: NavItem[] = [
    { to: '/gigs', label: 'Gigs', icon: '💼' },
    { to: '/jobs', label: 'Jobs', icon: '💻' },
  ]

  const authedNav: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊', auth: true },
    { to: '/gigs', label: 'Gigs', icon: '💼' },
    { to: '/jobs', label: 'Jobs', icon: '💻' },
    { to: '/applications', label: 'Applications', icon: '📋', auth: true },
    { to: '/messages', label: 'Messages', icon: '💬', auth: true },
    { to: '/top-freelancers', label: 'Top Rated', icon: '🏆', auth: true },
    { to: '/profile', label: 'Profile', icon: '👤', auth: true },
  ]

  const adminNav: NavItem[] = currentUser?.role === 'admin'
    ? [{ to: '/admin', label: 'Admin', icon: '⚡', admin: true }]
    : []

  const activeNav = isAuthed ? [...authedNav, ...adminNav] : publicNav

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

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
      {/* Mobile Overlay */}
      {mobileSidebarOpen && <div className="mobile-overlay" onClick={() => setMobileSidebarOpen(false)} />}

      {/* ─── Sidebar ─────────────────────────────────────────── */}
      <aside
        ref={sidebarRef}
        className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'mobile-open' : ''}`}
      >
        <div className="sidebar-header">
          <Link className="sidebar-brand" to={isAuthed ? '/dashboard' : '/'} onClick={() => setMobileSidebarOpen(false)}>
            <div className="sidebar-brand-icon">🎓</div>
            <span className="sidebar-brand-text">Campus Gigs</span>
          </Link>
          <button
            className="sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {activeNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`sidebar-link ${isActive(item.to) ? 'active' : ''}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span className="sidebar-link-text">{item.label}</span>
              {isActive(item.to) && <span className="sidebar-link-indicator" />}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          {isAuthed ? (
            <>
              {/* Notification Button in Sidebar */}
              <div className="dropdown-root sidebar-notif-root" ref={notif.rootRef} data-open={notif.open}>
                <button
                  type="button"
                  className={`sidebar-link sidebar-notif-btn ${notif.open ? 'active' : ''}`}
                  {...notif.buttonProps}
                  onClick={async () => {
                    const next = !notif.open
                    notif.setOpen(next)
                    if (next) await refreshNotifications()
                  }}
                  title={sidebarCollapsed ? 'Notifications' : undefined}
                >
                  <span className="sidebar-link-icon">🔔</span>
                  <span className="sidebar-link-text">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="sidebar-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
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

              <div className="sidebar-user">
                <div className="sidebar-avatar">
                  {currentUser?.name?.charAt(0).toUpperCase() || '👤'}
                </div>
                <div className="sidebar-user-info">
                  <p className="sidebar-user-name">{currentUser?.name}</p>
                  <p className="sidebar-user-role">{currentUser?.role}</p>
                </div>
              </div>

              <button
                className="sidebar-link sidebar-logout"
                onClick={() => {
                  setToken(null)
                  setIsAuthed(false)
                  setCurrentUser(null)
                  setMobileSidebarOpen(false)
                }}
                title={sidebarCollapsed ? 'Logout' : undefined}
              >
                <span className="sidebar-link-icon">🚪</span>
                <span className="sidebar-link-text">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={`sidebar-link ${isActive('/login') ? 'active' : ''}`}>
                <span className="sidebar-link-icon">🔑</span>
                <span className="sidebar-link-text">Login</span>
              </Link>
              <Link to="/register" className="sidebar-cta">
                <span className="sidebar-link-icon">✨</span>
                <span className="sidebar-link-text">Get Started</span>
              </Link>
            </>
          )}
        </div>
      </aside>

      {/* ─── Main Content Area ───────────────────────────────── */}
      <div className="content-area">
        {/* Top Bar (minimal - just mobile toggle + page title) */}
        <header className="content-header">
          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
          <div className="content-header-title">
            {activeNav.find(n => isActive(n.to))?.label || 'Campus Gigs'}
          </div>
          <div className="content-header-spacer" />
        </header>

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
      </div>

      {/* ─── Global Styles ─────────────────────────────────────── */}
      <style>{`
        /* ===== CSS Variables ===== */
        :root {
          --sidebar-width: 260px;
          --sidebar-collapsed: 72px;
          --header-height: 64px;
        }

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
          background: var(--bg);
        }

        /* ===== Mobile Overlay ===== */
        .mobile-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 90;
          backdrop-filter: blur(4px);
        }

        /* ===== Sidebar ===== */
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: var(--sidebar-width);
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          z-index: 100;
          transition: width 0.3s ease, transform 0.3s ease;
          overflow: hidden;
        }

        .sidebar.collapsed {
          width: var(--sidebar-collapsed);
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4) var(--space-4) var(--space-2);
          border-bottom: 1px solid var(--border-light);
          min-height: var(--header-height);
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          text-decoration: none;
          color: var(--text-h);
          font-family: var(--font-heading);
          font-weight: 800;
          font-size: 1.2rem;
          letter-spacing: -0.02em;
          white-space: nowrap;
          overflow: hidden;
        }

        .sidebar-brand-icon {
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
          flex-shrink: 0;
        }

        .sidebar-brand-text {
          transition: opacity 0.2s ease;
        }

        .sidebar.collapsed .sidebar-brand-text {
          opacity: 0;
          width: 0;
        }

        .sidebar-collapse-btn {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          background: var(--bg-secondary);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .sidebar-collapse-btn:hover {
          background: var(--accent-bg);
          border-color: var(--accent-border);
          color: var(--accent);
        }

        .sidebar.collapsed .sidebar-collapse-btn {
          transform: rotate(180deg);
        }

        /* ===== Sidebar Navigation ===== */
        .sidebar-nav {
          flex: 1;
          padding: var(--space-3) var(--space-3);
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
        }

        .sidebar-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-3);
          border-radius: var(--radius-lg);
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9375rem;
          transition: all var(--transition-fast);
          white-space: nowrap;
          overflow: hidden;
        }

        .sidebar-link::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--accent-bg);
          border-radius: inherit;
          opacity: 0;
          transform: scale(0.9);
          transition: all var(--transition-fast);
        }

        .sidebar-link:hover {
          color: var(--accent);
        }

        .sidebar-link:hover::before {
          opacity: 1;
          transform: scale(1);
        }

        .sidebar-link.active {
          color: var(--accent);
          background: var(--accent-bg);
        }

        .sidebar-link.active::before {
          opacity: 1;
          transform: scale(1);
        }

        .sidebar-link-icon {
          position: relative;
          z-index: 1;
          font-size: 1.25rem;
          width: 24px;
          text-align: center;
          flex-shrink: 0;
        }

        .sidebar-link-text {
          position: relative;
          z-index: 1;
          transition: opacity 0.2s ease;
        }

        .sidebar.collapsed .sidebar-link-text {
          opacity: 0;
          width: 0;
        }

        .sidebar-link-indicator {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: var(--accent-gradient);
          border-radius: 0 2px 2px 0;
        }

        /* ===== Sidebar Footer ===== */
        .sidebar-footer {
          padding: var(--space-3);
          border-top: 1px solid var(--border-light);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sidebar-cta {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-3);
          background: var(--accent-gradient);
          color: white;
          border-radius: var(--radius-lg);
          text-decoration: none;
          font-weight: 700;
          font-size: 0.9375rem;
          box-shadow: var(--shadow-accent);
          transition: all var(--transition-fast);
          white-space: nowrap;
        }

        .sidebar-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 40px -10px rgba(37, 99, 235, 0.5);
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          margin-bottom: var(--space-2);
          border-radius: var(--radius-lg);
          background: var(--bg-secondary);
          transition: all 0.3s ease;
        }

        .sidebar.collapsed .sidebar-user {
          justify-content: center;
        }

        .sidebar-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--accent-gradient);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .sidebar-user-info {
          transition: opacity 0.2s ease;
          overflow: hidden;
        }

        .sidebar.collapsed .sidebar-user-info {
          opacity: 0;
          width: 0;
        }

        .sidebar-user-name {
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--text-h);
          margin: 0;
          white-space: nowrap;
        }

        .sidebar-user-role {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: capitalize;
          margin: 0;
        }

        .sidebar-logout {
          cursor: pointer;
          border: none;
          background: transparent;
          font: inherit;
          width: 100%;
        }

        .sidebar-logout:hover {
          color: var(--error);
        }

        .sidebar-logout:hover::before {
          background: var(--error-bg);
        }

        /* ===== Sidebar Notifications ===== */
        .sidebar-notif-root {
          position: relative;
          display: block;
        }

        .sidebar-notif-btn {
          width: 100%;
          cursor: pointer;
          border: none;
          background: transparent;
          font: inherit;
        }

        .sidebar-notif-badge {
          position: absolute;
          right: var(--space-3);
          top: 50%;
          transform: translateY(-50%);
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
          z-index: 2;
        }

        .sidebar.collapsed .sidebar-notif-badge {
          right: 4px;
          top: 4px;
          transform: none;
        }

        .notif-menu {
          position: absolute;
          left: calc(100% + 12px);
          bottom: 0;
          width: 380px;
          max-width: calc(100vw - 100px);
          border: 1px solid var(--border);
          background: var(--surface);
          border-radius: var(--radius-2xl);
          padding: var(--space-4);
          box-shadow: var(--shadow-xl);
          z-index: 200;
        }

        .sidebar.collapsed .notif-menu {
          left: calc(var(--sidebar-collapsed) + 12px);
          bottom: auto;
          top: 0;
        }

        .dropdown-menu {
          opacity: 0;
          transform: translateX(-8px) scale(0.97);
          transform-origin: top left;
          pointer-events: none;
          transition: all var(--transition-fast);
        }

        .dropdown-menu.open {
          opacity: 1;
          transform: translateX(0) scale(1);
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

        /* ===== Content Area ===== */
        .content-area {
          flex: 1;
          margin-left: var(--sidebar-width);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          transition: margin-left 0.3s ease;
        }

        .sidebar.collapsed ~ .content-area {
          margin-left: var(--sidebar-collapsed);
        }

        /* ===== Content Header ===== */
        .content-header {
          position: sticky;
          top: 0;
          z-index: 50;
          height: var(--header-height);
          display: flex;
          align-items: center;
          padding: 0 var(--space-6);
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid var(--border-light);
          gap: var(--space-4);
        }

        .content-header-title {
          font-weight: 800;
          font-size: 1.125rem;
          color: var(--text-h);
          font-family: var(--font-heading);
        }

        .content-header-spacer {
          flex: 1;
        }

        /* ===== Mobile Menu Toggle ===== */
        .mobile-menu-toggle {
          display: none;
          flex-direction: column;
          gap: 5px;
          padding: 8px;
          background: none;
          border: none;
          cursor: pointer;
        }

        .mobile-menu-toggle span {
          display: block;
          width: 24px;
          height: 2.5px;
          background: var(--text-h);
          border-radius: 2px;
          transition: all 0.3s ease;
        }

        /* ===== Main ===== */
        .app-main {
          flex: 1;
          padding: var(--space-8) var(--space-6);
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
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
          .sidebar {
            transform: translateX(-100%);
            box-shadow: var(--shadow-xl);
          }

          .sidebar.mobile-open {
            transform: translateX(0);
          }

          .sidebar.collapsed {
            width: var(--sidebar-width);
          }

          .sidebar.collapsed .sidebar-brand-text,
          .sidebar.collapsed .sidebar-link-text,
          .sidebar.collapsed .sidebar-user-info {
            opacity: 1;
            width: auto;
          }

          .sidebar-collapse-btn {
            display: none;
          }

          .content-area {
            margin-left: 0;
          }

          .sidebar.collapsed ~ .content-area {
            margin-left: 0;
          }

          .mobile-menu-toggle {
            display: flex;
          }
        }

        @media (max-width: 768px) {
          .app-main {
            padding: var(--space-5) var(--space-4);
          }

          .content-header {
            padding: 0 var(--space-4);
          }

          .footer-links {
            gap: var(--space-4);
            flex-wrap: wrap;
          }

          .notif-menu {
            width: calc(100vw - 100px);
            left: calc(100% + 8px) !important;
          }
        }
      `}</style>
    </div>
  )
}