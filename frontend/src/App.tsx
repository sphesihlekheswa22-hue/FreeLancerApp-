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

/* ─── SVG Icons (inline for zero dependencies) ─────────────────── */
const Icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  gigs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7h-9" /><path d="M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
    </svg>
  ),
  jobs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  applications: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  messages: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  top: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  login: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  ),
  register: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  chevronLeft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  logo: (
    <svg viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
      <path d="M10 22V12l6-4 6 4v10l-6 4-6-4z" fill="white" fillOpacity="0.95" />
      <path d="M16 8v12" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" /><stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  ),
}

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
  icon: React.ReactNode
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
    } catch { /* ignore */ }
  }, [isAuthed])

  useEffect(() => {
    ;(async () => {
      if (!getToken()) { setIsReady(true); return }
      try {
        const u = await me()
        setCurrentUser(u)
        setIsAuthed(true)
      } catch {
        setToken(null)
        setIsAuthed(false)
        setCurrentUser(null)
      } finally { setIsReady(true) }
    })()
  }, [])

  useEffect(() => { refreshNotifications() }, [refreshNotifications])
  useEffect(() => { setMobileSidebarOpen(false) }, [location.pathname])

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
    { to: '/gigs', label: 'Explore Gigs', icon: Icons.gigs },
    { to: '/jobs', label: 'Browse Jobs', icon: Icons.jobs },
  ]

  const authedNav: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: Icons.dashboard, auth: true },
    { to: '/gigs', label: 'Gigs', icon: Icons.gigs },
    { to: '/jobs', label: 'Jobs', icon: Icons.jobs },
    { to: '/applications', label: 'Applications', icon: Icons.applications, auth: true },
    { to: '/messages', label: 'Messages', icon: Icons.messages, auth: true },
    { to: '/top-freelancers', label: 'Top Rated', icon: Icons.top, auth: true },
    { to: '/profile', label: 'Profile', icon: Icons.profile, auth: true },
  ]

  const adminNav: NavItem[] = currentUser?.role === 'admin'
    ? [{ to: '/admin', label: 'Admin', icon: Icons.admin, admin: true }]
    : []

  const activeNav = isAuthed ? [...authedNav, ...adminNav] : publicNav

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const pageTitle = activeNav.find(n => isActive(n.to))?.label || 'Campus Gigs'

  if (!isReady) {
    return (
      <div className="app-loader">
        <div className="loader-ring"><div /><div /><div /><div /></div>
        <p>Loading Campus Gigs</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div className="mobile-backdrop" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* ═══════════════════════════════════════════════════════
          SIDEBAR
      ═══════════════════════════════════════════════════════ */}
      <aside
        ref={sidebarRef}
        className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'mobile-open' : ''}`}
      >
        {/* ── Brand ── */}
        <div className="sidebar-brand">
          <Link to={isAuthed ? '/dashboard' : '/'} className="brand-link" onClick={() => setMobileSidebarOpen(false)}>
            <span className="brand-logo">{Icons.logo}</span>
            <span className="brand-name">Campus Gigs</span>
          </Link>
          <button
            className="collapse-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? Icons.chevronLeft : Icons.chevronLeft}
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="sidebar-nav">
          {activeNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-item ${isActive(item.to) ? 'active' : ''}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {isActive(item.to) && <span className="nav-glow" />}
            </Link>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="sidebar-footer">
          {isAuthed ? (
            <>
              {/* Notifications */}
              <div className="notif-wrapper" ref={notif.rootRef}>
                <button
                  className={`nav-item notif-trigger ${notif.open ? 'active' : ''}`}
                  {...notif.buttonProps}
                  onClick={async () => {
                    const next = !notif.open
                    notif.setOpen(next)
                    if (next) await refreshNotifications()
                  }}
                >
                  <span className="nav-icon">{Icons.bell}</span>
                  <span className="nav-label">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </button>

                <div className={`notif-panel ${notif.open ? 'open' : ''}`} {...notif.menuProps} tabIndex={-1}>
                  <div className="notif-panel-header">
                    <h4>Notifications</h4>
                    {unreadCount > 0 && (
                      <button className="mark-all" onClick={async () => {
                        await markAllNotificationsRead()
                        await refreshNotifications()
                      }}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="notif-panel-body">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">
                        <div className="notif-empty-icon">📭</div>
                        <p>You're all caught up</p>
                        <span>No new notifications</span>
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div key={n.id} className={`notif-row ${n.is_read ? '' : 'unread'}`}>
                          <div className="notif-row-content">
                            <p>{n.message}</p>
                            {n.link && (
                              <Link to={n.link} onClick={() => notif.close()} className="notif-row-link">
                                View details
                              </Link>
                            )}
                          </div>
                          {!n.is_read && (
                            <button
                              className="notif-row-check"
                              onClick={async () => {
                                await markNotificationRead(n.id)
                                await refreshNotifications()
                              }}
                              title="Mark as read"
                            >
                              {Icons.check}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* User Card */}
              <div className="user-card">
                <div className="user-avatar">
                  {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="user-meta">
                  <p className="user-name">{currentUser?.name}</p>
                  <p className="user-role">{currentUser?.role}</p>
                </div>
              </div>

              {/* Logout */}
              <button
                className="nav-item logout"
                onClick={() => {
                  setToken(null)
                  setIsAuthed(false)
                  setCurrentUser(null)
                  setMobileSidebarOpen(false)
                }}
              >
                <span className="nav-icon">{Icons.logout}</span>
                <span className="nav-label">Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={`nav-item ${isActive('/login') ? 'active' : ''}`}>
                <span className="nav-icon">{Icons.login}</span>
                <span className="nav-label">Sign In</span>
              </Link>
              <Link to="/register" className="nav-item cta">
                <span className="nav-icon">{Icons.register}</span>
                <span className="nav-label">Get Started</span>
              </Link>
            </>
          )}
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════
          CONTENT AREA
      ═══════════════════════════════════════════════════════ */}
      <div className="content-area">
        {/* Top Bar */}
        <header className="topbar">
          <button
            className="mobile-hamburger"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            aria-label="Toggle menu"
          >
            {mobileSidebarOpen ? Icons.close : Icons.menu}
          </button>

          <div className="topbar-breadcrumb">
            <span className="breadcrumb-label">Page</span>
            <span className="breadcrumb-sep">/</span>
            <h1 className="breadcrumb-title">{pageTitle}</h1>
          </div>

          <div className="topbar-actions">
            {isAuthed && currentUser && (
              <div className="topbar-user">
                <span className="topbar-greeting">Hello, {currentUser.name.split(' ')[0]}</span>
                <div className="topbar-avatar-sm">{currentUser.name.charAt(0).toUpperCase()}</div>
              </div>
            )}
          </div>
        </header>

        {/* Main */}
        <main className="main-stage">
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

        {/* Footer */}
        <footer className="app-footer">
          <div className="footer-inner">
            <div className="footer-left">
              <span className="footer-logo">{Icons.logo}</span>
              <span className="footer-name">Campus Gigs</span>
            </div>
            <div className="footer-links">
              <a href="#">About</a>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Contact</a>
            </div>
            <p className="footer-copy">© 2026 Campus Gigs. Crafted with care.</p>
          </div>
        </footer>
      </div>

      {/* ═══════════════════════════════════════════════════════
          STYLES
      ═══════════════════════════════════════════════════════ */}
      <style>{`
        /* ─── Design Tokens ─────────────────────────────────── */
        :root {
          --sidebar-w: 280px;
          --sidebar-collapsed-w: 76px;
          --topbar-h: 72px;
          
          /* Dark sidebar palette */
          --sidebar-bg: #0f1117;
          --sidebar-bg-elevated: #161922;
          --sidebar-border: rgba(255,255,255,0.06);
          --sidebar-text: #8b92a8;
          --sidebar-text-hover: #c4c9d8;
          --sidebar-text-active: #ffffff;
          --sidebar-item-bg: transparent;
          --sidebar-item-hover: rgba(255,255,255,0.04);
          --sidebar-item-active: rgba(99,102,241,0.12);
          
          /* Accent */
          --accent: #6366f1;
          --accent-light: #818cf8;
          --accent-glow: rgba(99,102,241,0.35);
          
          /* Content */
          --content-bg: #f8f9fc;
          --content-bg-dark: #0f1117;
          --surface: #ffffff;
          --surface-elevated: #ffffff;
          --text-primary: #0f172a;
          --text-secondary: #64748b;
          --text-muted: #94a3b8;
          --border: #e2e8f0;
          --border-light: #f1f5f9;
          
          /* Misc */
          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
          --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
          --shadow-sidebar: 4px 0 24px rgba(0,0,0,0.15);
          
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-xl: 20px;
          
          --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
          --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
          --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ─── App Shell ─────────────────────────────────────── */
        .app-shell {
          display: flex;
          min-height: 100vh;
          background: var(--content-bg);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* ─── Loader ──────────────────────────────────────────── */
        .app-loader {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          background: var(--sidebar-bg);
          z-index: 9999;
        }
        .app-loader p {
          color: var(--sidebar-text);
          font-size: 0.9375rem;
          font-weight: 500;
          letter-spacing: 0.02em;
        }
        .loader-ring {
          display: inline-block;
          position: relative;
          width: 48px;
          height: 48px;
        }
        .loader-ring div {
          box-sizing: border-box;
          display: block;
          position: absolute;
          width: 36px;
          height: 36px;
          margin: 6px;
          border: 3px solid var(--accent);
          border-radius: 50%;
          animation: loader-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
          border-color: var(--accent) transparent transparent transparent;
        }
        .loader-ring div:nth-child(1) { animation-delay: -0.45s; }
        .loader-ring div:nth-child(2) { animation-delay: -0.3s; }
        .loader-ring div:nth-child(3) { animation-delay: -0.15s; }
        @keyframes loader-ring {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* ─── Mobile Backdrop ───────────────────────────────── */
        .mobile-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 90;
          animation: fadeIn 200ms ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* ═══════════════════════════════════════════════════════
           SIDEBAR
        ═══════════════════════════════════════════════════════ */
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: var(--sidebar-w);
          background: var(--sidebar-bg);
          border-right: 1px solid var(--sidebar-border);
          display: flex;
          flex-direction: column;
          z-index: 100;
          transition: width var(--transition-slow), transform var(--transition-slow);
          overflow: hidden;
          box-shadow: var(--shadow-sidebar);
        }

        /* ── Brand ── */
        .sidebar-brand {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 20px 16px;
          flex-shrink: 0;
        }
        .brand-link {
          display: flex;
          align-items: center;
          gap: 14px;
          text-decoration: none;
          color: var(--sidebar-text-active);
          transition: opacity var(--transition-fast);
        }
        .brand-link:hover { opacity: 0.9; }
        .brand-logo {
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          filter: drop-shadow(0 4px 12px rgba(99,102,241,0.3));
        }
        .brand-name {
          font-size: 1.15rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          white-space: nowrap;
          transition: opacity var(--transition-fast), width var(--transition-fast);
        }
        .collapse-toggle {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--sidebar-border);
          background: var(--sidebar-item-hover);
          color: var(--sidebar-text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }
        .collapse-toggle:hover {
          background: var(--sidebar-item-active);
          color: var(--accent-light);
          border-color: var(--accent);
        }
        .collapse-toggle svg {
          width: 14px;
          height: 14px;
          transition: transform var(--transition-slow);
        }

        /* ── Navigation ── */
        .sidebar-nav {
          flex: 1;
          padding: 8px 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .sidebar-nav::-webkit-scrollbar { width: 4px; }
        .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
        .sidebar-nav::-webkit-scrollbar-thumb { background: var(--sidebar-border); border-radius: 4px; }

        .nav-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 14px;
          border-radius: var(--radius-md);
          color: var(--sidebar-text);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          letter-spacing: 0.01em;
          transition: all var(--transition-fast);
          white-space: nowrap;
          overflow: hidden;
          border: none;
          background: transparent;
          cursor: pointer;
          width: 100%;
          font-family: inherit;
        }
        .nav-item::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: var(--sidebar-item-hover);
          opacity: 0;
          transition: opacity var(--transition-fast);
        }
        .nav-item:hover {
          color: var(--sidebar-text-hover);
        }
        .nav-item:hover::before {
          opacity: 1;
        }
        .nav-item.active {
          color: var(--sidebar-text-active);
          background: var(--sidebar-item-active);
          box-shadow: 0 0 20px var(--accent-glow);
        }
        .nav-item.active::before {
          opacity: 0;
        }

        .nav-icon {
          position: relative;
          z-index: 1;
          width: 22px;
          height: 22px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .nav-icon svg {
          width: 100%;
          height: 100%;
        }
        .nav-label {
          position: relative;
          z-index: 1;
          transition: opacity var(--transition-fast);
        }

        .nav-glow {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: linear-gradient(180deg, var(--accent), var(--accent-light));
          border-radius: 0 3px 3px 0;
          box-shadow: 0 0 12px var(--accent-glow);
        }

        /* CTA Button */
        .nav-item.cta {
          background: linear-gradient(135deg, var(--accent), #7c3aed);
          color: white;
          margin-top: 8px;
          box-shadow: 0 4px 14px rgba(99,102,241,0.35);
        }
        .nav-item.cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99,102,241,0.45);
        }
        .nav-item.cta::before { display: none; }

        /* Logout */
        .nav-item.logout {
          color: #ef4444;
        }
        .nav-item.logout:hover {
          color: #f87171;
          background: rgba(239,68,68,0.08);
        }

        /* ── Footer ── */
        .sidebar-footer {
          padding: 12px 14px 20px;
          border-top: 1px solid var(--sidebar-border);
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex-shrink: 0;
        }

        /* User Card */
        .user-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          margin: 8px 0;
          border-radius: var(--radius-md);
          background: var(--sidebar-bg-elevated);
          border: 1px solid var(--sidebar-border);
          transition: all var(--transition-fast);
        }
        .user-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), #7c3aed);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(99,102,241,0.3);
        }
        .user-meta {
          min-width: 0;
          transition: opacity var(--transition-fast);
        }
        .user-name {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--sidebar-text-active);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-role {
          font-size: 0.75rem;
          color: var(--sidebar-text);
          text-transform: capitalize;
          margin: 4px 0 0;
        }

        /* Notification Badge */
        .notif-badge {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 9px;
          background: linear-gradient(135deg, #ef4444, #f97316);
          color: white;
          font-size: 0.65rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(239,68,68,0.4);
          animation: badgePulse 2.5s ease-in-out infinite;
          z-index: 2;
        }
        @keyframes badgePulse {
          0%, 100% { transform: translateY(-50%) scale(1); }
          50% { transform: translateY(-50%) scale(1.15); }
        }

        /* Notification Panel */
        .notif-wrapper {
          position: relative;
        }
        .notif-trigger {
          position: relative;
        }
        .notif-panel {
          position: absolute;
          left: calc(100% + 14px);
          bottom: -60px;
          width: 380px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          z-index: 200;
          opacity: 0;
          transform: translateX(-10px) scale(0.97);
          transform-origin: top left;
          pointer-events: none;
          transition: all var(--transition-base);
          overflow: hidden;
        }
        .notif-panel.open {
          opacity: 1;
          transform: translateX(0) scale(1);
          pointer-events: auto;
        }
        .notif-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid var(--border-light);
        }
        .notif-panel-header h4 {
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .mark-all {
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--content-bg);
          color: var(--accent);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .mark-all:hover {
          background: var(--sidebar-item-active);
          border-color: var(--accent);
        }
        .notif-panel-body {
          max-height: 420px;
          overflow-y: auto;
        }
        .notif-panel-body::-webkit-scrollbar { width: 5px; }
        .notif-panel-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        .notif-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 18px;
          border-bottom: 1px solid var(--border-light);
          transition: background var(--transition-fast);
        }
        .notif-row:hover { background: var(--content-bg); }
        .notif-row.unread {
          background: linear-gradient(90deg, rgba(99,102,241,0.04), transparent);
          border-left: 3px solid var(--accent);
          padding-left: 15px;
        }
        .notif-row-content {
          flex: 1;
          min-width: 0;
        }
        .notif-row-content p {
          margin: 0 0 6px;
          font-size: 0.875rem;
          color: var(--text-primary);
          font-weight: 500;
          line-height: 1.5;
        }
        .notif-row-link {
          font-size: 0.8125rem;
          color: var(--accent);
          font-weight: 600;
          text-decoration: none;
        }
        .notif-row-link:hover { text-decoration: underline; }
        .notif-row-check {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 1.5px solid var(--border);
          background: var(--surface);
          color: var(--accent);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all var(--transition-fast);
          padding: 0;
        }
        .notif-row-check:hover {
          background: var(--sidebar-item-active);
          border-color: var(--accent);
        }
        .notif-row-check svg { width: 14px; height: 14px; }

        .notif-empty {
          text-align: center;
          padding: 48px 24px;
          color: var(--text-muted);
        }
        .notif-empty-icon {
          font-size: 2.5rem;
          margin-bottom: 12px;
          opacity: 0.4;
        }
        .notif-empty p {
          margin: 0 0 4px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .notif-empty span {
          font-size: 0.875rem;
        }

        /* ═══════════════════════════════════════════════════════
           COLLAPSED STATE
        ═══════════════════════════════════════════════════════ */
        .sidebar.collapsed {
          width: var(--sidebar-collapsed-w);
        }
        .sidebar.collapsed .brand-name,
        .sidebar.collapsed .nav-label,
        .sidebar.collapsed .user-meta {
          opacity: 0;
          width: 0;
          pointer-events: none;
        }
        .sidebar.collapsed .collapse-toggle svg {
          transform: rotate(180deg);
        }
        .sidebar.collapsed .nav-item {
          justify-content: center;
          padding: 12px;
        }
        .sidebar.collapsed .nav-icon {
          width: 24px;
          height: 24px;
        }
        .sidebar.collapsed .notif-badge {
          right: 6px;
          top: 6px;
          transform: none;
          animation: badgePulseCollapsed 2.5s ease-in-out infinite;
        }
        @keyframes badgePulseCollapsed {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .sidebar.collapsed .user-card {
          justify-content: center;
          padding: 10px;
        }
        .sidebar.collapsed .notif-panel {
          left: calc(var(--sidebar-collapsed-w) + 14px);
          bottom: auto;
          top: -100px;
        }

        /* ═══════════════════════════════════════════════════════
           CONTENT AREA
        ═══════════════════════════════════════════════════════ */
        .content-area {
          flex: 1;
          margin-left: var(--sidebar-w);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          transition: margin-left var(--transition-slow);
        }
        .sidebar.collapsed ~ .content-area {
          margin-left: var(--sidebar-collapsed-w);
        }

        /* ── Top Bar ── */
        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          height: var(--topbar-h);
          display: flex;
          align-items: center;
          padding: 0 32px;
          background: rgba(248,249,252,0.85);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid var(--border-light);
          gap: 20px;
        }
        .mobile-hamburger {
          display: none;
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-primary);
          cursor: pointer;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: all var(--transition-fast);
        }
        .mobile-hamburger:hover {
          background: var(--content-bg);
          border-color: var(--accent);
          color: var(--accent);
        }
        .mobile-hamburger svg {
          width: 20px;
          height: 20px;
        }

        .topbar-breadcrumb {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .breadcrumb-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .breadcrumb-sep {
          color: var(--border);
          font-weight: 300;
        }
        .breadcrumb-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          margin: 0;
        }

        .topbar-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .topbar-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .topbar-greeting {
          font-size: 0.875rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .topbar-avatar-sm {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), #7c3aed);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          box-shadow: 0 2px 8px rgba(99,102,241,0.25);
        }

        /* ── Main Stage ── */
        .main-stage {
          flex: 1;
          padding: 32px;
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
        }

        /* ── Footer ── */
        .app-footer {
          margin-top: auto;
          padding: 28px 32px;
          border-top: 1px solid var(--border-light);
          background: var(--surface);
        }
        .footer-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .footer-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .footer-logo {
          width: 24px;
          height: 24px;
        }
        .footer-name {
          font-weight: 700;
          font-size: 0.9375rem;
          color: var(--text-primary);
        }
        .footer-links {
          display: flex;
          gap: 28px;
        }
        .footer-links a {
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          transition: color var(--transition-fast);
        }
        .footer-links a:hover {
          color: var(--accent);
        }
        .footer-copy {
          color: var(--text-muted);
          font-size: 0.8125rem;
          margin: 0;
        }

        /* ═══════════════════════════════════════════════════════
           RESPONSIVE
        ═══════════════════════════════════════════════════════ */
        @media (max-width: 1024px) {
          .sidebar {
            transform: translateX(-100%);
            width: var(--sidebar-w) !important;
          }
          .sidebar.mobile-open {
            transform: translateX(0);
          }
          .sidebar.collapsed .brand-name,
          .sidebar.collapsed .nav-label,
          .sidebar.collapsed .user-meta {
            opacity: 1;
            width: auto;
          }
          .sidebar.collapsed .nav-item {
            justify-content: flex-start;
            padding: 12px 14px;
          }
          .sidebar.collapsed .nav-icon {
            width: 22px;
            height: 22px;
          }
          .sidebar.collapsed .user-card {
            justify-content: flex-start;
            padding: 12px;
          }
          .sidebar.collapsed .notif-badge {
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            animation: badgePulse 2.5s ease-in-out infinite;
          }
          .sidebar.collapsed .notif-panel {
            left: calc(100% + 14px);
            bottom: -60px;
            top: auto;
          }
          .collapse-toggle {
            display: none;
          }

          .content-area {
            margin-left: 0 !important;
          }

          .mobile-hamburger {
            display: flex;
          }

          .topbar {
            padding: 0 20px;
          }
          .breadcrumb-label,
          .breadcrumb-sep {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .main-stage {
            padding: 20px 16px;
          }
          .topbar {
            height: 64px;
          }
          .breadcrumb-title {
            font-size: 1.1rem;
          }
          .topbar-greeting {
            display: none;
          }
          .footer-inner {
            flex-direction: column;
            text-align: center;
            gap: 16px;
          }
          .notif-panel {
            width: calc(100vw - 100px);
            left: calc(100% + 10px) !important;
          }
        }

        @media (max-width: 480px) {
          .notif-panel {
            position: fixed !important;
            left: 16px !important;
            right: 16px !important;
            top: 80px !important;
            bottom: auto !important;
            width: auto !important;
          }
        }
      `}</style>
    </div>
  )
}