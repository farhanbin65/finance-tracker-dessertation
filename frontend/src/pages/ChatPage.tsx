/**
 * FinSight — ChatPage.tsx
 * UI UX Pro Max: Vector icons, fixed API typo, dynamic name,
 * accessible inputs, clean layout
 */

import { useState, useEffect, useRef } from 'react'
import { getAuthToken } from '../utils/getAuthToken'
import { useToast } from '../components/ui/Toast'

const API_URL = import.meta.env.VITE_API_URL || ''

function useIsDesktop() {
  const [is, setIs] = useState(window.innerWidth >= 1024)
  useEffect(() => {
    const fn = () => setIs(window.innerWidth >= 1024)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return is
}

// ── Types ──────────────────────────────────────────────────────────
interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isTip?: boolean
}
interface FinancialContext {
  total_budget: number; total_spent: number
  remaining: number; top_category: string
  goals_count: number; total_saved: number
}

// ── Suggestions — Tabler icons, no emoji ──────────────────────────
const SUGGESTIONS = [
  { icon: 'ti-chart-bar',      text: 'Analyse my spending this month'  },
  { icon: 'ti-bulb',           text: 'How can I save more money?'      },
  { icon: 'ti-target',         text: 'Am I on track with my goals?'    },
  { icon: 'ti-alert-triangle', text: 'Any unusual spending detected?'  },
]

const TIPS = [
  'Setting up a standing order on payday ensures you save before you spend.',
  'The 50/30/20 rule — 50% needs, 30% wants, 20% savings.',
  'Cancelling unused subscriptions could save you £200+ per year.',
  'An emergency fund of 3–6 months expenses gives you financial security.',
]

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// ── Typing indicator — vector dots, no emoji ───────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}`}</style>
      {/* ✅ Vector avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: 'var(--accent-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className="ti ti-brain" style={{ fontSize: 14, color: 'var(--accent)' }} aria-hidden="true" />
      </div>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '4px 18px 18px 18px',
        padding: '14px 18px',
        display: 'flex', gap: 5, alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--accent)',
            opacity: 0.6,
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

// ── Confirm dialog (replaces window.confirm) ───────────────────────
function ClearConfirmDialog({ onConfirm, onCancel }: {
  onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 300, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '0 24px',
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '24px 20px', width: '100%', maxWidth: 300,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, margin: '0 auto 14px',
          background: 'rgba(255,79,100,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-trash" style={{ fontSize: 20, color: 'var(--red)' }} />
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
          textAlign: 'center', marginBottom: 6 }}>Clear chat?</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center',
          marginBottom: 20, lineHeight: 1.5 }}>
          All messages will be removed. This cannot be undone.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={onCancel} style={{
            height: 42, borderRadius: 10, border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: 'var(--text-secondary)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            height: 42, borderRadius: 10, border: 'none',
            background: 'var(--red)', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Clear</button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
export default function ChatPage() {
  const isDesktop = useIsDesktop()
  const { showToast } = useToast()
  // ✅ Read name from localStorage — not hardcoded
  const userName  = localStorage.getItem('fs_name') || 'there'
  const firstName = userName.split(' ')[0]

  const [messages, setMessages]         = useState<Message[]>([])
  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [context, setContext]           = useState<FinancialContext | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchContext()
    loadHistory().then(() => {
      setMessages(prev => {
        if (prev.length === 0) {
          return [{
            role: 'assistant' as const,
            // ✅ Dynamic name from localStorage
            content: `${getGreeting()}, ${firstName}! I'm FinSight AI — I have access to your financial data and I'm here to help you make smarter money decisions. What would you like to know?`,
            timestamp: new Date(),
          }]
        }
        return prev
      })
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function getToken() {
    return getAuthToken()
  }

  async function fetchContext() {
    try {
      const token = await getToken()
      // ✅ Fixed typo: /api/budgetsss → /api/budgets
      const res = await fetch(`${API_URL}/api/budgets`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const budgets      = data.budgets || []
      const totalBudget  = budgets.reduce((s: number, b: any) => s + (b.limit  || 0), 0)
      const totalSpent   = budgets.reduce((s: number, b: any) => s + (b.spent  || 0), 0)
      const topCat       = [...budgets].sort((a: any, b: any) => b.spent - a.spent)[0]?.category || 'N/A'
      setContext({
        total_budget: totalBudget,
        total_spent:  totalSpent,
        remaining:    totalBudget - totalSpent,
        top_category: topCat,
        goals_count:  0,
        total_saved:  0,
      })
    } catch {
      // Context optional — chat works without it
    }
  }

  async function loadHistory() {
    try {
      const token = await getAuthToken()
      const res = await fetch(`${API_URL}/api/chat/history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()

      if (data.messages?.length > 0) {
        const loaded: Message[] = data.messages.map((m: any) => ({
          id:        m.id,
          role:      m.role,
          content:   m.content,
          timestamp: new Date(m.timestamp),
        }))
        setMessages(loaded)
        setShowSuggestions(false)
      }
    } catch {
      // History load failure is non-critical - chat still works
    }
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return

    setInput('')
    setShowSuggestions(false)

    const userMsg: Message = { role: 'user', content, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const token = await getToken()
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))

      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: history, context: context ?? {} }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 && m.role === 'user'
          ? { ...m, id: data.message_id }
          : m
      ))
      // Add assistant response
      setMessages(prev => [...prev, {
        role: 'assistant', content: data.reply, timestamp: new Date(),
      }])

      // Random tip every 3rd message
      if (messages.length > 0 && messages.length % 3 === 0) {
        const tip = TIPS[Math.floor(Math.random() * TIPS.length)]
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'assistant', content: tip,
            timestamp: new Date(), isTip: true,
          }])
        }, 800)
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble connecting. Please check your internet and try again.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  async function handleDeleteMessage(msgId: string, index: number) {
    try {
      const token = await getAuthToken()
      await fetch(`${import.meta.env.VITE_API_URL}/api/chat/message/${msgId}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      // Remove user message + next assistant message from UI
      setMessages(prev => prev.filter((_, i) => i !== index && i !== index + 1))
    } catch {
      showToast('Could not delete message', 'error')
    }
  }

  async function handleClearConfirmed() {
    try {
      const token = await getAuthToken()
      await fetch(`${API_URL}/api/chat/history`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // Non-critical - clear locally even if server fails
    }
    setMessages([{
      role:      'assistant',
      content:   `${getGreeting()}, ${firstName}! Chat cleared. How can I help you?`,
      timestamp: new Date(),
    }])
    setShowSuggestions(true)
    setShowClearConfirm(false)
  }

  return (
      <>
        <style>{`
          @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
        `}</style>

        {/* ── Desktop 2-column wrapper ─────────────────────── */}
        <div style={{
          display: 'flex',
          flexDirection: isDesktop ? 'row' : 'column',
          gap: isDesktop ? 24 : 0,
          maxWidth: isDesktop ? 1200 : '100%',
          margin: isDesktop ? '-20px auto 0' : '-20px -24px 0',
          padding: isDesktop ? '32px 24px 0' : 0,
          height: isDesktop ? 'calc(100dvh - 96px)' : 'calc(100dvh - 132px)',
          boxSizing: 'border-box',
        }}>
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            minWidth: 0,
            width: '100%', maxWidth: isDesktop ? 'none' : 800,
            marginLeft: 'auto', marginRight: 'auto',
            background: isDesktop ? 'var(--bg-secondary)' : 'transparent',
            border: isDesktop ? '1px solid var(--border)' : 'none',
            borderRadius: isDesktop ? 16 : 0,
            overflow: 'hidden',
          }}>

            {/* ── Context pills ────────────────────────────── */}
            {context && (
              <div style={{
                display: 'flex', gap: 8, overflowX: 'auto',
                padding: '12px 16px 8px', scrollbarWidth: 'none', flexShrink: 0,
              }}>
                <ContextPill icon="ti-wallet"      label="Budget" value={`£${context.total_budget.toLocaleString()}`} color="var(--accent)"  />
                <ContextPill icon="ti-trending-up" label="Spent"  value={`£${context.total_spent.toLocaleString()}`}  color="var(--red)"     />
                <ContextPill icon="ti-piggy-bank"  label="Left"   value={`£${context.remaining.toLocaleString()}`}    color="var(--green)"   />
                {context.top_category !== 'N/A' && (
                  <ContextPill icon="ti-chart-bar" label="Top"    value={context.top_category}                        color="var(--orange)"  />
                )}
              </div>
            )}

            {/* ── Messages ────────────────────────────────── */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '8px 16px 8px',
              scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ textAlign: 'center', margin: '4px 0 8px' }}>
                <span style={{
                  fontSize: 11, color: 'var(--text-muted)',
                  background: 'var(--bg-card)',
                  padding: '4px 14px', borderRadius: 99, fontWeight: 500,
                }}>Today</span>
              </div>

              {messages.map((msg, i) => (
                <MessageBubble
                  message={msg}
                  index={i}
                  onDelete={handleDeleteMessage}
                />
              ))}

              {loading && <TypingIndicator />}

              {showSuggestions && !loading && messages.length <= 1 && (
                <div style={{ marginTop: 12 }}>
                  <p style={{
                    fontSize: 12, color: 'var(--text-muted)',
                    marginBottom: 10, textAlign: 'center', fontWeight: 500,
                  }}>Try asking...</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {SUGGESTIONS.map((s, i) => (
                      <button key={i} onClick={() => sendMessage(s.text)} style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 14, padding: '12px 16px',
                        display: 'flex', alignItems: 'center', gap: 12,
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        fontSize: 14, color: 'var(--text-primary)',
                        transition: 'border-color .2s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      >
                        <div style={{
                          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                          background: 'var(--accent-light)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <i className={`ti ${s.icon}`} style={{ fontSize: 16, color: 'var(--accent)' }} aria-hidden="true" />
                        </div>
                        {s.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* ── Privacy note ───────────────────────────── */}
            <div style={{
              textAlign: 'center', fontSize: 11, color: 'var(--text-muted)',
              padding: '6px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              flexShrink: 0,
            }}>
              <i className="ti ti-lock" style={{ fontSize: 12 }} aria-hidden="true" />
              Sensitive data is never sent to AI
            </div>

            {/* ── Input row ──────────────────────────────── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px 16px',
              background: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border)',
              flexShrink: 0,
              paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            }}>
              <button
                onClick={() => setShowClearConfirm(true)}
                aria-label="Clear chat history"
                style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-muted)',
                  transition: 'color .2s, border-color .2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--red)'
                  e.currentTarget.style.borderColor = 'rgba(255,79,100,0.3)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--text-muted)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                <i className="ti ti-trash" style={{ fontSize: 17 }} aria-hidden="true" />
              </button>

              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                  }}
                  placeholder="Ask FinSight anything..."
                  disabled={loading}
                  aria-label="Message input"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 24,
                    padding: '12px 16px',
                    fontSize: 14, color: 'var(--text-primary)',
                    outline: 'none', opacity: loading ? 0.6 : 1,
                    transition: 'border-color .2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>

              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                aria-label="Send message"
                style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: input.trim() && !loading ? 'var(--accent)' : 'var(--bg-card)',
                  border: input.trim() && !loading ? 'none' : '1px solid var(--border)',
                  cursor: input.trim() && !loading ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: input.trim() && !loading ? '#fff' : 'var(--text-muted)',
                  transition: 'all .2s',
                }}
              >
                <i className="ti ti-send" style={{ fontSize: 18 }} aria-hidden="true" />
              </button>
            </div>

          </div>

          {isDesktop && (
            <aside style={{
              flex: '0 0 300px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              minHeight: 0,
            }}>
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 20,
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
              }}>
                <h3 style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: 16,
                  textTransform: 'uppercase',
                  letterSpacing: '.05em',
                }}>
                  Recent conversation
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {messages.slice(-6).map((msg, i) => (
                    <button
                      key={`${msg.timestamp.getTime()}-${i}`}
                      onClick={() => setInput(msg.content)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                        fontSize: 12,
                        lineHeight: 1.5,
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{
                        display: 'block',
                        color: msg.role === 'user' ? 'var(--accent)' : 'var(--text-muted)',
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '.05em',
                        marginBottom: 4,
                      }}>
                        {msg.role === 'user' ? 'You' : 'FinSight'}
                      </span>
                      {msg.content.length > 88 ? `${msg.content.slice(0, 88)}...` : msg.content}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 20,
              }}>
                <h3 style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '.05em',
                }}>
                  Try asking
                </h3>
                {SUGGESTIONS.slice(0, 3).map(prompt => (
                  <button
                    key={prompt.text}
                    onClick={() => setInput(prompt.text)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      marginBottom: 8,
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      lineHeight: 1.4,
                      cursor: 'pointer',
                    }}
                  >
                    {prompt.text}
                  </button>
                ))}
              </div>
            </aside>
          )}
        </div>

        {showClearConfirm && (
          <ClearConfirmDialog
            onConfirm={handleClearConfirmed}
            onCancel={() => setShowClearConfirm(false)}
          />
        )}
      </>
    )
}

// ── Context pill ───────────────────────────────────────────────────
function ContextPill({ icon, label, value, color }: {
  icon: string; label: string; value: string; color: string
}) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '8px 12px',
      display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
    }}>
      {/* ✅ Vector icon with colour badge */}
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 14, color }} aria-hidden="true" />
      </div>
      <div>
        <p style={{
          fontSize: 9, color: 'var(--text-muted)', fontWeight: 600,
          letterSpacing: '.05em', textTransform: 'uppercase',
        }}>{label}</p>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          {value}
        </p>
      </div>
    </div>
  )
}

// ── Message bubble ─────────────────────────────────────────────────
function MessageBubble({
  message, index, onDelete,
}: {
  message:  Message
  index:    number
  onDelete: (id: string, index: number) => void
}) {
  const [hovered, setHovered] = useState(false)
  const isUser = message.role === 'user'
  const isTip  = message.isTip

  // ── Tip card ───────────────────────────────────────────────────
  if (isTip) {
    return (
      <div style={{ alignSelf: 'flex-start', maxWidth: '88%' }}>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderLeft: '3px solid var(--orange)',
          borderRadius: '4px 18px 18px 18px',
          padding: '12px 16px',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <i className="ti ti-bulb"
             style={{ fontSize: 17, color: 'var(--orange)', flexShrink: 0, marginTop: 2 }}
             aria-hidden="true" />
          <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-secondary)' }}>
            {message.content}
          </p>
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    )
  }

  // ── User bubble ────────────────────────────────────────────────
  if (isUser) {
    return (
      <div
        style={{ alignSelf: 'flex-end', maxWidth: '80%' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
          {/* Delete button — only shows on hover if message has an ID */}
          {hovered && message.id && (
            <button
              onClick={() => onDelete(message.id!, index)}
              aria-label="Delete message"
              title="Delete this message and its reply"
              style={{
                width:      28,
                height:     28,
                borderRadius: '50%',
                background: 'rgba(255,79,100,0.1)',
                border:     '1px solid rgba(255,79,100,0.2)',
                cursor:     'pointer',
                display:    'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,79,100,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,79,100,0.1)'}
            >
              {/* SVG trash icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                   stroke="#ff4f64" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                   aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          )}
          <div style={{
            background:   'var(--accent)',
            color:        '#fff',
            borderRadius: '18px 4px 18px 18px',
            padding:      '12px 16px',
            fontSize:     14,
            lineHeight:   1.6,
            wordBreak:    'break-word',
          }}>
            {message.content}
          </div>
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textAlign: 'right' }}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    )
  }

  // ── AI bubble ──────────────────────────────────────────────────
  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: '88%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
          background: 'var(--accent-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-brain"
             style={{ fontSize: 13, color: 'var(--accent)' }} aria-hidden="true" />
        </div>
        <div>
          <div style={{
            background:   'var(--bg-card)',
            border:       '1px solid var(--border)',
            borderRadius: '4px 18px 18px 18px',
            padding:      '12px 16px',
            fontSize:     14,
            lineHeight:   1.7,
            color:        'var(--text-primary)',
            wordBreak:    'break-word',
          }}>
            {message.content.split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    </div>
  )
}