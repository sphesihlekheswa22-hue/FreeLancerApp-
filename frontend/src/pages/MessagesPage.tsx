import { FormEvent, useEffect, useMemo, useState } from 'react'
import { getInbox, getThread, sendMessage, type InboxItem, type Message } from '../lib/api'

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function MessagesPage({ isAuthed }: { isAuthed: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [activeUserId, setActiveUserId] = useState<number | null>(null)
  const [thread, setThread] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')

  async function refreshInbox() {
    if (!isAuthed) return
    setError(null)
    setLoading(true)
    try {
      const res = await getInbox()
      setInbox(res)
      if (activeUserId == null && res.length > 0) {
        setActiveUserId(res[0].with_user_id)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load inbox')
    } finally {
      setLoading(false)
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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshInbox()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed])

  useEffect(() => {
    if (!isAuthed || activeUserId == null) return
    refreshThread(activeUserId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId, isAuthed])

  const active = useMemo(
    () => inbox.find((i) => i.with_user_id === activeUserId) ?? null,
    [activeUserId, inbox],
  )

  async function onSend(e: FormEvent) {
    e.preventDefault()
    if (!activeUserId) return
    setError(null)
    try {
      await sendMessage({ receiver_id: activeUserId, message_text: messageText })
      setMessageText('')
      await refreshThread(activeUserId)
      await refreshInbox()
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
        <h1>Messages</h1>
        <button onClick={refreshInbox} disabled={loading}>
          Refresh
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="messagesLayout">
        <aside className="card left messagesSidebar">
          <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
            Inbox
          </div>
          {inbox.length === 0 ? (
            <div className="muted">No conversations yet.</div>
          ) : (
            <div className="list">
              {inbox.map((i) => (
                <button
                  key={i.with_user_id}
                  type="button"
                  className={`listItem ${i.with_user_id === activeUserId ? 'active' : ''}`}
                  onClick={() => setActiveUserId(i.with_user_id)}
                >
                  <div style={{ fontWeight: 700 }}>User #{i.with_user_id}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {i.last_message.message_text}
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="card left messagesMain">
          {active ? (
            <>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 800 }}>Chat with User #{active.with_user_id}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Last: {formatTime(active.last_message.timestamp)}
                </div>
              </div>

              <div className="chat">
                {thread.map((m) => (
                  <div
                    key={m.id}
                    className={`bubble ${m.receiver_id === active.with_user_id ? 'out' : 'in'}`}
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
                  placeholder="Type a message…"
                  style={{ flex: 1 }}
                />
                <button disabled={!messageText.trim()} type="submit">
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="muted">Select a conversation.</div>
          )}
        </section>
      </div>
    </div>
  )
}

