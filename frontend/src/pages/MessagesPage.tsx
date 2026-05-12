import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getInbox,
  getThread,
  listMessagingPartners,
  sendMessage,
  type InboxItem,
  type Message,
  type MessagingPartner,
} from '../lib/api'

/* ─── Utilities ─── */

function formatTime(iso: string) {
  try {
    const date = new Date(iso)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isThisYear = date.getFullYear() === now.getFullYear()

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    if (isThisYear) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
             date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleString()
  } catch {
    return iso
  }
}

function formatRelativeTime(iso: string) {
  try {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatTime(iso)
  } catch {
    return iso
  }
}

/* ─── Types ─── */

type SidebarRow = {
  with_user_id: number
  name: string
  jobs: MessagingPartner['jobs']
  last_message: Message | null
  unread_count: number
}

/* ─── Component ─── */

export default function MessagesPage({ isAuthed }: { isAuthed: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [partners, setPartners] = useState<MessagingPartner[]>([])
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [activeUserId, setActiveUserId] = useState<number | null>(null)
  const [thread, setThread] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)

  // Auto-scroll ref
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /* ─── Derived State ─── */

  const sidebarRows = useMemo((): SidebarRow[] => {
    return partners.map((p) => {
      const hit = inbox.find((i) => i.with_user_id === p.user.id)
      return {
        with_user_id: p.user.id,
        name: p.user.name,
        jobs: p.jobs,
        last_message: hit?.last_message ?? null,
        unread_count: hit?.unread_count ?? 0,
      }
    }).sort((a, b) => {
      // Sort by most recent message first
      const aTime = a.last_message?.timestamp ? new Date(a.last_message.timestamp).getTime() : 0
      const bTime = b.last_message?.timestamp ? new Date(b.last_message.timestamp).getTime() : 0
      return bTime - aTime
    })
  }, [partners, inbox])

  const activeRow = useMemo(
    () => sidebarRows.find((r) => r.with_user_id === activeUserId) ?? null,
    [sidebarRows, activeUserId],
  )

  /* ─── Auto-scroll ─── */

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [thread, scrollToBottom])

  /* ─── Data Loading ─── */

  const loadAll = useCallback(async () => {
    if (!isAuthed) return
    setError(null)
    setLoading(true)
    try {
      const [p, box] = await Promise.all([listMessagingPartners(), getInbox()])
      setPartners(p)
      setInbox(box)
      setActiveUserId((cur) => (cur == null && p.length > 0 ? p[0].user.id : cur))
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [isAuthed])

  const refreshInboxOnly = useCallback(async () => {
    if (!isAuthed) return
    try {
      const box = await getInbox()
      setInbox(box)
    } catch {
      /* silent fail for background refresh */
    }
  }, [isAuthed])

  const refreshThread = useCallback(async (withUserId: number, opts?: { silent?: boolean }) => {
    const silent = opts?.silent
    if (!silent) {
      setError(null)
      setLoading(true)
    }
    try {
      const res = await getThread(withUserId)
      setThread(res)
    } catch (err: any) {
      if (!silent) {
        setError(err?.message ?? 'Failed to load conversation')
        setThread([])
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  /* ─── Effects ─── */

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Handle ?with= query param
  useEffect(() => {
    const w = searchParams.get('with')
    if (!w || partners.length === 0) return
    const id = Number(w)
    if (!Number.isFinite(id) || id <= 0) return

    const next = new URLSearchParams(searchParams)
    next.delete('with')

    if (!partners.some((x) => x.user.id === id)) {
      setSearchParams(next, { replace: true })
      return
    }
    setActiveUserId(id)
    setSearchParams(next, { replace: true })
  }, [searchParams, partners, setSearchParams])

  useEffect(() => {
    if (!isAuthed || activeUserId == null) return
    const allowed = partners.some((p) => p.user.id === activeUserId)
    if (!allowed) {
      setThread([])
      return
    }
    refreshThread(activeUserId)
  }, [activeUserId, isAuthed, partners, refreshThread])

  // Polling for new messages (every 10s when active; silent refresh avoids loading flashes)
  useEffect(() => {
    if (!isAuthed || activeUserId == null) return
    const interval = setInterval(() => {
      void refreshInboxOnly()
      void refreshThread(activeUserId, { silent: true })
    }, 10000)
    return () => clearInterval(interval)
  }, [isAuthed, activeUserId, refreshInboxOnly, refreshThread])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveUserId(null)
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  /* ─── Handlers ─── */

  const onSend = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!activeUserId || !messageText.trim() || sending) return

    const text = messageText.trim()
    setSending(true)
    setError(null)

    // Optimistic update
    const optimisticMessage: Message = {
      id: -Date.now(), // temporary negative id
      sender_id: 0, // current user
      receiver_id: activeUserId,
      message_text: text,
      timestamp: new Date().toISOString(),
    }
    setThread((prev) => [...prev, optimisticMessage])
    setMessageText('')

    try {
      await sendMessage({ receiver_id: activeUserId, message_text: text })
      await Promise.all([refreshThread(activeUserId, {}), refreshInboxOnly()])
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send message')
      // Revert optimistic update on error
      setThread((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
      setMessageText(text) // restore text
    } finally {
      setSending(false)
    }
  }, [activeUserId, messageText, sending, refreshThread, refreshInboxOnly])

  const handleSelectConversation = useCallback((userId: number) => {
    setActiveUserId(userId)
    setError(null)
  }, [])

  /* ─── Render ─── */

  if (!isAuthed) {
    return (
      <div className="card">
        <h1>Messages</h1>
        <p className="muted">Login to view your inbox.</p>
      </div>
    )
  }

  return (
    <div className="stack">
      {/* Header */}
      <div className="row">
        <div>
          <h1 style={{ margin: 0 }}>Messages</h1>
          <p className="muted" style={{ marginTop: 6, maxWidth: 560 }}>
            You can message someone only after your job proposal is <strong>accepted</strong>. Use Applications to open a chat with your client or freelancer.
          </p>
        </div>
        <button type="button" onClick={() => void loadAll()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error" role="alert">
          {error}
          <button 
            onClick={() => setError(null)} 
            style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Empty State */}
      {partners.length === 0 && !loading && (
        <div className="card muted">
          No conversations available yet. When a client accepts your proposal (or you accept an applicant), you can discuss the project here.
        </div>
      )}

      <div className="messagesLayout">
        {/* Sidebar */}
        <aside className="card left messagesSidebar">
          <div className="muted" style={{ fontSize: 13, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Accepted proposals</span>
            {loading && <span style={{ fontSize: 11 }}>⟳</span>}
          </div>

          {sidebarRows.length === 0 && loading ? (
            <div className="muted">Loading…</div>
          ) : sidebarRows.length === 0 ? (
            <div className="muted">—</div>
          ) : (
            <div className="list" role="list">
              {sidebarRows.map((r) => (
                <button
                  key={r.with_user_id}
                  type="button"
                  className={`listItem ${r.with_user_id === activeUserId ? 'active' : ''}`}
                  onClick={() => handleSelectConversation(r.with_user_id)}
                  role="listitem"
                  aria-selected={r.with_user_id === activeUserId}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 700 }}>{r.name}</span>
                    {r.unread_count > 0 && (
                      <span 
                        style={{ 
                          background: '#e74c3c', 
                          color: 'white', 
                          fontSize: 11, 
                          padding: '2px 6px', 
                          borderRadius: 10,
                          fontWeight: 600 
                        }}
                      >
                        {r.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                    {r.jobs.map((j) => j.job_title).join(' · ')}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="muted" style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      flex: 1,
                      fontStyle: r.last_message ? 'normal' : 'italic'
                    }}>
                      {r.last_message ? r.last_message.message_text : 'No messages yet — say hello'}
                    </span>
                    {r.last_message && (
                      <span className="muted" style={{ fontSize: 10, marginLeft: 8, flexShrink: 0 }}>
                        {formatRelativeTime(r.last_message.timestamp)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Main Chat Area */}
        <section className="card left messagesMain">
          {activeRow ? (
            <>
              {/* Chat Header */}
              <div className="row" style={{ justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{activeRow.name}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {activeRow.jobs.map((j) => j.job_title).join(' · ')}
                  </div>
                </div>
                {activeRow.last_message && (
                  <div className="muted" style={{ fontSize: 12, textAlign: 'right' }}>
                    <div>Last active</div>
                    <div>{formatTime(activeRow.last_message.timestamp)}</div>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="chat" role="log" aria-live="polite" aria-label="Message thread">
                {thread.length === 0 && !loading ? (
                  <div className="muted" style={{ textAlign: 'center', padding: 40 }}>
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  thread.map((m, index) => {
                    const isOutgoing = m.receiver_id === activeRow.with_user_id
                    const showTimestamp = index === 0 || 
                      new Date(m.timestamp).getTime() - new Date(thread[index - 1].timestamp).getTime() > 300000 // 5 min gap

                    return (
                      <div key={m.id}>
                        {showTimestamp && (
                          <div className="muted" style={{ textAlign: 'center', fontSize: 11, margin: '8px 0' }}>
                            {formatTime(m.timestamp)}
                          </div>
                        )}
                        <div
                          className={`bubble ${isOutgoing ? 'out' : 'in'} ${m.id < 0 ? 'pending' : ''}`}
                          title={formatTime(m.timestamp)}
                        >
                          {m.message_text}
                          {m.id < 0 && <span style={{ marginLeft: 6, opacity: 0.5 }}>⟳</span>}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <form className="row" onSubmit={onSend} style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
                <input
                  ref={inputRef}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Discuss project details… (Press / to focus)"
                  style={{ flex: 1 }}
                  disabled={sending}
                  maxLength={2000}
                  aria-label="Message text"
                />
                <button disabled={!messageText.trim() || sending} type="submit">
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </form>
            </>
          ) : activeUserId != null && !activeRow && partners.length > 0 ? (
            <div className="error">
              You can't open this conversation — messaging is only available with someone who has an accepted proposal with you.
            </div>
          ) : partners.length > 0 ? (
            <div className="muted" style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
              <div>Select a conversation to start messaging</div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}