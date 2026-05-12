import { FormEvent, useEffect, useMemo, useState } from 'react'
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

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

type SidebarRow = {
  with_user_id: number
  name: string
  jobs: MessagingPartner['jobs']
  last_message: Message | null
}

export default function MessagesPage({ isAuthed }: { isAuthed: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [partners, setPartners] = useState<MessagingPartner[]>([])
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [activeUserId, setActiveUserId] = useState<number | null>(null)
  const [thread, setThread] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')

  const sidebarRows = useMemo((): SidebarRow[] => {
    return partners.map((p) => {
      const hit = inbox.find((i) => i.with_user_id === p.user.id)
      return {
        with_user_id: p.user.id,
        name: p.user.name,
        jobs: p.jobs,
        last_message: hit?.last_message ?? null,
      }
    })
  }, [partners, inbox])

  const activeRow = useMemo(
    () => sidebarRows.find((r) => r.with_user_id === activeUserId) ?? null,
    [sidebarRows, activeUserId],
  )

  async function loadAll() {
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
  }

  async function refreshInboxOnly() {
    if (!isAuthed) return
    try {
      const box = await getInbox()
      setInbox(box)
    } catch {
      /* ignore */
    }
  }

  async function refreshThread(withUserId: number) {
    setError(null)
    setLoading(true)
    try {
      const res = await getThread(withUserId)
      setThread(res)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load messages')
      setThread([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId, isAuthed, partners])

  async function onSend(e: FormEvent) {
    e.preventDefault()
    if (!activeUserId) return
    setError(null)
    try {
      await sendMessage({ receiver_id: activeUserId, message_text: messageText })
      setMessageText('')
      await refreshThread(activeUserId)
      await refreshInboxOnly()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send message')
    }
  }

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
      <div className="row">
        <div>
          <h1 style={{ margin: 0 }}>Messages</h1>
          <p className="muted" style={{ marginTop: 6, maxWidth: 560 }}>
            You can message someone only after your job proposal is <strong>accepted</strong>. Use Applications to open a chat with your client or freelancer.
          </p>
        </div>
        <button type="button" onClick={() => void loadAll()} disabled={loading}>
          Refresh
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}

      {partners.length === 0 && !loading ? (
        <div className="card muted">
          No conversations available yet. When a client accepts your proposal (or you accept an applicant), you can discuss the project here.
        </div>
      ) : null}

      <div className="messagesLayout">
        <aside className="card left messagesSidebar">
          <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
            Accepted proposals
          </div>
          {sidebarRows.length === 0 && loading ? (
            <div className="muted">Loading…</div>
          ) : sidebarRows.length === 0 ? (
            <div className="muted">—</div>
          ) : (
            <div className="list">
              {sidebarRows.map((r) => (
                <button
                  key={r.with_user_id}
                  type="button"
                  className={`listItem ${r.with_user_id === activeUserId ? 'active' : ''}`}
                  onClick={() => setActiveUserId(r.with_user_id)}
                >
                  <div style={{ fontWeight: 700 }}>{r.name}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                    {r.jobs.map((j) => j.job_title).join(' · ')}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {r.last_message ? r.last_message.message_text : 'No messages yet — say hello'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="card left messagesMain">
          {activeRow ? (
            <>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{activeRow.name}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {activeRow.jobs.map((j) => j.job_title).join(' · ')}
                  </div>
                </div>
                {activeRow.last_message ? (
                  <div className="muted" style={{ fontSize: 12 }}>
                    Last: {formatTime(activeRow.last_message.timestamp)}
                  </div>
                ) : null}
              </div>

              <div className="chat">
                {thread.map((m) => (
                  <div
                    key={m.id}
                    className={`bubble ${m.receiver_id === activeRow.with_user_id ? 'out' : 'in'}`}
                    title={formatTime(m.timestamp)}
                  >
                    {m.message_text}
                  </div>
                ))}
              </div>

              <form className="row" onSubmit={onSend}>
                <input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Discuss project details…"
                  style={{ flex: 1 }}
                />
                <button disabled={!messageText.trim()} type="submit">
                  Send
                </button>
              </form>
            </>
          ) : activeUserId != null && !activeRow && partners.length > 0 ? (
            <div className="error">
              You can’t open this conversation — messaging is only available with someone who has an accepted proposal with you.
            </div>
          ) : partners.length > 0 ? (
            <div className="muted">Select a conversation.</div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
