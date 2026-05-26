import { useState, useEffect, useRef } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

// ── Types ──────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isTip?: boolean
}

interface FinancialContext {
  total_budget:  number
  total_spent:   number
  remaining:     number
  top_category:  string
  goals_count:   number
  total_saved:   number
}

// ── Suggested prompts ──────────────────────────────────
const SUGGESTIONS = [
  { icon: '📊', text: 'Analyse my spending this month' },
  { icon: '💡', text: 'How can I save more money?'     },
  { icon: '🎯', text: 'Am I on track with my goals?'   },
  { icon: '⚠️', text: 'Any unusual spending detected?' },
]

// ── Greeting based on time of day ─────────────────────
function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── Format timestamp ───────────────────────────────────
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// ── Typing indicator ───────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'12px 16px' }}>
      <div style={{
        width:32, height:32, borderRadius:50,
        background:'var(--accent-light)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:14, flexShrink:0,
      }}>
        🤖
      </div>
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:'4px 18px 18px 18px',
        padding:'12px 16px',
        display:'flex', gap:4, alignItems:'center',
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width:7, height:7, borderRadius:'50%',
            background:'var(--text-muted)',
            animation:`bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes bounce {
          0%,60%,100% { transform: translateY(0) }
          30%          { transform: translateY(-6px) }
        }
      `}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════════
export default function ChatPage() {
  const { getAccessTokenSilently } = useAuth0()

  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [context, setContext]     = useState<FinancialContext | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  // ── Fetch user's financial context on mount ──────────
  useEffect(() => {
    fetchContext()
    // Welcome message
    setMessages([{
      role:      'assistant',
      content:   `${getGreeting()}, Farhan! 👋 I'm FinSight AI. I have access to your financial data and I'm here to help you make smarter money decisions. What would you like to know?`,
      timestamp: new Date(),
    }])
  }, [])

  // ── Auto-scroll to bottom ────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Fetch financial context from backend ─────────────
  async function fetchContext() {
    try {
      let token = localStorage.getItem('fs_token') || await getAccessTokenSilently()
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/budgetsss`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) return
      const data = await res.json()

      // Build context object from budget data
      const budgets    = data.budgets || []
      const totalBudget = budgets.reduce((s: number, b: any) => s + b.allocated, 0)
      const totalSpent  = budgets.reduce((s: number, b: any) => s + b.spent, 0)
      const topCat      = budgets.sort((a: any, b: any) => b.spent - a.spent)[0]?.category || 'N/A'

      setContext({
        total_budget: totalBudget,
        total_spent:  totalSpent,
        remaining:    totalBudget - totalSpent,
        top_category: topCat,
        goals_count:  0,
        total_saved:  0,
      })
    } catch {
      // Context is optional — chat still works without it
    }
  }

  // ── Send message ─────────────────────────────────────
  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return

    setInput('')
    setShowSuggestions(false)

    // Add user message
    const userMsg: Message = { role:'user', content, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      let token = localStorage.getItem('fs_token') || await getAccessTokenSilently()

      // Build history for API — only role + content (no timestamps)
      const history = [...messages, userMsg].map(m => ({
        role:    m.role,
        content: m.content,
      }))

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: history,
          context:  context ?? {},
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      // Add AI reply
      setMessages(prev => [...prev, {
        role:      'assistant',
        content:   data.reply,
        timestamp: new Date(),
      }])

      // Randomly add a tip after every 3rd message
      if (messages.length > 0 && messages.length % 3 === 0) {
        const tips = [
          'Tip: Setting up a standing order on payday ensures you save before you spend. 💰',
          'Tip: The 50/30/20 rule — 50% needs, 30% wants, 20% savings. 📐',
          'Tip: Cancelling unused subscriptions could save you £200+ per year. 📺',
          'Tip: An emergency fund of 3-6 months expenses gives you financial security. 🛡',
        ]
        const tip = tips[Math.floor(Math.random() * tips.length)]
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role:      'assistant',
            content:   tip,
            timestamp: new Date(),
            isTip:     true,
          }])
        }, 800)
      }

    } catch {
      setMessages(prev => [...prev, {
        role:      'assistant',
        content:   'Sorry, I had trouble connecting. Please check your internet and try again.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  // ── Clear chat ────────────────────────────────────────
  function clearChat() {
    if (!confirm('Clear chat history?')) return
    setMessages([{
      role:      'assistant',
      content:   `${getGreeting()}! Chat cleared. How can I help you?`,
      timestamp: new Date(),
    }])
    setShowSuggestions(true)
  }

  // ── Render ─────────────────────────────────────────
  return (
    <div style={{
      display:'flex', flexDirection:'column',
      height:'calc(100dvh - 130px)',
      margin: '-16px',
    }}>

      {/* ── Context banner — shows user's financial summary ── */}
      {context && (
        <div style={{
          display:'flex', gap:8, overflowX:'auto',
          padding:'12px 16px 0', scrollbarWidth:'none',
        }}>
          <ContextPill icon="💷" label="Budget" value={`£${context.total_budget.toLocaleString()}`} />
          <ContextPill icon="📤" label="Spent"  value={`£${context.total_spent.toLocaleString()}`}  />
          <ContextPill icon="✅" label="Left"   value={`£${context.remaining.toLocaleString()}`}    />
        </div>
      )}

      {/* ── Messages area ── */}
      <div style={{
        flex:1, overflowY:'auto', padding:'12px 16px',
        scrollbarWidth:'none', display:'flex', flexDirection:'column', gap:8,
      }}>

        {/* Date separator */}
        <div style={{ textAlign:'center', margin:'4px 0' }}>
          <span style={{
            fontSize:12, color:'var(--text-muted)',
            background:'var(--bg-card)', padding:'4px 14px',
            borderRadius:99, fontFamily:'var(--font-main)', fontWeight:500,
          }}>
            Today
          </span>
        </div>

        {/* Messages */}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {/* Typing indicator */}
        {loading && <TypingIndicator />}

        {/* Suggestion chips — shown at start */}
        {showSuggestions && !loading && messages.length <= 1 && (
          <div style={{ marginTop:8 }}>
            <p style={{ fontSize:12, color:'var(--text-muted)',
              fontFamily:'var(--font-main)', marginBottom:10, textAlign:'center' }}>
              Try asking...
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s.text)} style={{
                  background:'var(--bg-card)', border:'1px solid var(--border)',
                  borderRadius:14, padding:'12px 16px',
                  display:'flex', alignItems:'center', gap:10,
                  cursor:'pointer', textAlign:'left', width:'100%',
                  transition:'all .2s',
                  fontFamily:'var(--font-body)', fontSize:14,
                  color:'var(--text-primary)',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <span style={{ fontSize:18 }}>{s.icon}</span>
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Privacy note ── */}
      <div style={{
        textAlign:'center', fontSize:11, color:'var(--text-muted)',
        padding:'4px 0', display:'flex', alignItems:'center',
        justifyContent:'center', gap:5,
      }}>
        <i className="ti ti-lock" style={{ fontSize:12 }} />
        Sensitive data is never sent to AI
      </div>

      {/* ── Input row ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:10,
        padding:'10px 16px 16px',
        background:'var(--bg-secondary)',
        borderTop:'1px solid var(--border)',
      }}>
        {/* Clear button */}
        <button onClick={clearChat} style={{
          width:38, height:38, borderRadius:10,
          background:'var(--bg-card)', border:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', color:'var(--text-muted)', fontSize:16, flexShrink:0,
        }}>
          <i className="ti ti-trash" />
        </button>

        {/* Text input */}
        <div style={{ flex:1, position:'relative' }}>
          <i className="ti ti-microphone" style={{
            position:'absolute', left:14, top:'50%',
            transform:'translateY(-50%)',
            color:'var(--text-muted)', fontSize:16,
          }} />
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask FinSight anything..."
            disabled={loading}
            style={{
              width:'100%', background:'var(--bg-card)',
              border:'1px solid var(--border)', borderRadius:24,
              padding:'12px 16px 12px 44px', fontSize:14,
              color:'var(--text-primary)', fontFamily:'var(--font-body)',
              outline:'none',
              opacity: loading ? .6 : 1,
            }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          style={{
            width:44, height:44, borderRadius:'50%',
            background: input.trim() && !loading ? 'var(--accent)' : 'var(--bg-card)',
            border:'none', cursor: input.trim() ? 'pointer' : 'default',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:18, color: input.trim() && !loading ? '#fff' : 'var(--text-muted)',
            transition:'all .2s', flexShrink:0,
          }}
        >
          <i className="ti ti-send" />
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════

function ContextPill({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{
      background:'var(--bg-card)', border:'1px solid var(--border)',
      borderRadius:10, padding:'6px 12px',
      display:'flex', alignItems:'center', gap:6,
      flexShrink:0,
    }}>
      <span style={{ fontSize:13 }}>{icon}</span>
      <div>
        <p style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-main)',
          fontWeight:600, letterSpacing:'.04em' }}>
          {label.toUpperCase()}
        </p>
        <p style={{ fontSize:13, fontWeight:700, fontFamily:'var(--font-main)',
          color:'var(--text-primary)' }}>
          {value}
        </p>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const isTip  = message.isTip

  if (isTip) {
    return (
      <div style={{ alignSelf:'flex-start', maxWidth:'88%' }}>
        <div style={{
          background:'var(--bg-card)',
          border:'1px solid var(--border)',
          borderLeft:'3px solid var(--orange)',
          borderRadius:'4px 18px 18px 18px',
          padding:'12px 16px',
          display:'flex', gap:10,
        }}>
          <i className="ti ti-bulb" style={{
            fontSize:17, color:'var(--orange)', flexShrink:0, marginTop:2,
          }} />
          <p style={{ fontSize:13, lineHeight:1.6, color:'var(--text-secondary)' }}>
            {message.content}
          </p>
        </div>
        <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    )
  }

  if (isUser) {
    return (
      <div style={{ alignSelf:'flex-end', maxWidth:'80%' }}>
        <div style={{
          background:'var(--accent)', color:'#fff',
          borderRadius:'18px 4px 18px 18px',
          padding:'12px 16px', fontSize:14, lineHeight:1.6,
        }}>
          {message.content}
        </div>
        <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:3, textAlign:'right' }}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    )
  }

  // AI message
  return (
    <div style={{ alignSelf:'flex-start', maxWidth:'88%' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
        {/* AI avatar */}
        <div style={{
          width:28, height:28, borderRadius:'50%',
          background:'var(--accent-light)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:13, flexShrink:0, marginTop:2,
        }}>
          🤖
        </div>
        <div>
          <div style={{
            background:'var(--bg-card)', border:'1px solid var(--border)',
            borderRadius:'4px 18px 18px 18px',
            padding:'12px 16px', fontSize:14, lineHeight:1.7,
            color:'var(--text-primary)',
          }}>
            {/* Render newlines properly */}
            {message.content.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                {i < message.content.split('\n').length - 1 && <br />}
              </span>
            ))}
          </div>
          <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    </div>
  )
}