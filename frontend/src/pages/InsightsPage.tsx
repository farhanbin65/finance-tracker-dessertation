/**
 * FinSight — InsightsPage.tsx
 * Explainable AI spending predictions using SHAP + Groq.
 *
 * Layout:
 *   Top: ML prediction panel (SHAP waterfall + budget risk)
 *   Bottom: AI chat assistant (existing)
 *
 * Dissertation value:
 *   Demonstrates XAI — transparent ML predictions with
 *   feature attribution via SHAP values.
 */

import { useState, useEffect, useRef } from 'react'
import { getAuthToken } from '../utils/getAuthToken'

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
interface ShapDriver {
  category: string
  shap_value: number
  direction: 'increases' | 'decreases'
  current_spend: number
}

interface Prediction {
  predicted_total: number
  confidence: number
  top_drivers: ShapDriver[]
  category_shap: Record<string, number>
  current_by_category: Record<string, number>
  nl_explanation: string
  budget_risk: 'on_track' | 'warning' | 'at_risk' | 'unknown'
  months_of_data: number
  model_type: string
  currency: string
  fallback?: boolean
  error?: string
  message?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const CAT_COLORS: Record<string, string> = {
  Food: '#ff9f43', Transport: '#0ea5e9', Shopping: '#7c5cfc',
  Rent: '#a78bfa', Subscriptions: '#ff4f64', Entertainment: '#f0b429',
  Utilities: '#34d399', Health: '#22c87a', Other: '#8b90a4',
}

function Shimmer({ height = 60, radius = 12 }: { height?: number; radius?: number }) {
  return (
    <div style={{
      height, borderRadius: radius,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      overflow: 'hidden', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)',
        animation: 'shimmer 1.6s infinite',
      }} />
    </div>
  )
}

// ── SHAP Waterfall Bar ─────────────────────────────────────────────
function ShapBar({ category, shap, current, maxAbs, currency }: {
  category: string; shap: number; current: number
  maxAbs: number; currency: string
}) {
  const symbol  = currency === 'GBP' ? '£' : '$'
  const pct     = maxAbs > 0 ? Math.abs(shap) / maxAbs * 100 : 0
  const color   = CAT_COLORS[category] || '#8b90a4'
  const isPos   = shap >= 0

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: color, flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            {category}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            ({symbol}{current.toFixed(0)} this month)
          </span>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 700,
          color: isPos ? 'var(--red)' : 'var(--green)',
        }}>
          {isPos ? '+' : ''}{symbol}{Math.abs(shap).toFixed(0)} impact
        </span>
      </div>
      {/* Bar */}
      <div style={{
        height: 8, borderRadius: 99,
        background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 99,
          width: `${pct}%`,
          background: color,
          transition: 'width 0.8s ease',
          opacity: isPos ? 1 : 0.6,
        }} />
      </div>
    </div>
  )
}

// ── Risk badge ─────────────────────────────────────────────────────
function RiskBadge({ risk }: { risk: string }) {
  const config = {
    on_track: { color: 'var(--green)',  bg: 'rgba(34,200,122,0.12)',  icon: 'ti-circle-check', label: 'On track'  },
    warning:  { color: 'var(--orange)', bg: 'rgba(255,159,67,0.12)',  icon: 'ti-alert-triangle', label: 'Warning' },
    at_risk:  { color: 'var(--red)',    bg: 'rgba(255,79,100,0.12)',  icon: 'ti-alert-circle', label: 'At risk'   },
    unknown:  { color: 'var(--text-muted)', bg: 'var(--bg-card2)',   icon: 'ti-help-circle', label: 'Unknown'    },
  }[risk] || { color: 'var(--text-muted)', bg: 'var(--bg-card2)', icon: 'ti-help-circle', label: risk }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 99,
      background: config.bg, color: config.color,
      fontSize: 12, fontWeight: 600,
    }}>
      <i className={`ti ${config.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
      {config.label}
    </span>
  )
}

// ══════════════════════════════════════════════════════════════════
export default function InsightsPage() {
  const [prediction, setPrediction]   = useState<Prediction | null>(null)
  const [predLoading, setPredLoading] = useState(true)
  const [predError, setPredError]     = useState('')
  const isDesktop = useIsDesktop()

  // Chat state
  const [messages, setMessages]     = useState<ChatMessage[]>([])
  const [input, setInput]           = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const userName = localStorage.getItem('fs_name') || 'there'

  useEffect(() => { fetchPrediction() }, [])
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchPrediction() {
    try {
      setPredLoading(true)
      const token = await getAuthToken()
      const res   = await fetch(`${API_URL}/api/insights/predict`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.error === 'insufficient_data') {
        setPredError(data.message)
      } else {
        setPrediction(data)
      }
    } catch {
      setPredError('Could not load prediction. Please try again.')
    } finally {
      setPredLoading(false)
    }
  }

  async function sendMessage() {
    if (!input.trim() || chatLoading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setChatLoading(true)

    try {
      const token = await getAuthToken()

      // Build context from prediction for the chat
      const context = prediction ? {
        predicted_total:     prediction.predicted_total,
        budget_risk:         prediction.budget_risk,
        top_category:        prediction.top_drivers[0]?.category || 'N/A',
        nl_explanation:      prediction.nl_explanation,
        current_by_category: prediction.current_by_category,
      } : {}

      const res = await fetch(`${API_URL}/api/chat`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMsg },
          ],
          context,
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: data.reply || 'Sorry, I could not process that.',
      }])
    } catch {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: 'Network error. Please try again.',
      }])
    } finally {
      setChatLoading(false)
    }
  }

  const symbol   = prediction?.currency === 'GBP' ? '£' : '$'
  const maxAbs   = prediction
    ? Math.max(...Object.values(prediction.category_shap).map(Math.abs), 1)
    : 1
  const shapEntries = prediction
    ? Object.entries(prediction.category_shap)
        .filter(([, v]) => Math.abs(v) > 0.5)
        .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
        .slice(0, 6)
    : []

  return (
    <div style={{
      maxWidth: isDesktop ? 1100 : '100%',
      margin: '0 auto',
      padding: isDesktop ? '32px 24px 24px' : '0 0 24px',
      boxSizing: 'border-box',
    }}>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>

      {/* ── Page header ───────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, marginBottom: 4 }}>
          AI Insights
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Explainable spending predictions powered by machine learning
        </p>
      </div>

      {/* ── Desktop 2-col grid ───────────────────────────────── */}
      <div style={{
        display: isDesktop ? 'grid' : 'flex',
        gridTemplateColumns: isDesktop ? '1fr 400px' : undefined,
        flexDirection: isDesktop ? undefined : 'column',
        gap: isDesktop ? 24 : 0,
        alignItems: 'start',
      }}>
      <div> {/* left column */}
      {/* ── PREDICTION PANEL ──────────────────────────────────── */}
      {predLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <Shimmer height={120} />
          <Shimmer height={200} />
        </div>
      ) : predError ? (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 18, padding: 24, marginBottom: 20, textAlign: 'center',
        }}>
          <i className="ti ti-brain" style={{ fontSize: 36, color: 'var(--text-muted)', opacity: 0.4 }} aria-hidden="true" />
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>
            Not enough data yet
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6 }}>
            {predError}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            Keep adding transactions and predictions will unlock automatically.
          </p>
        </div>
      ) : prediction && (
        <>
          {/* ── Hero prediction card ─────────────────────────── */}
          <div style={{
            background: 'var(--accent)', borderRadius: 20,
            padding: 22, marginBottom: 14, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -30, right: -30, width: 140, height: 140,
              borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
            }} aria-hidden="true" />

            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 600,
              letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              Next month prediction
            </p>
            <p style={{ fontSize: 38, fontWeight: 700, color: '#fff', lineHeight: 1, marginBottom: 14 }}>
              {symbol}{prediction.predicted_total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <RiskBadge risk={prediction.budget_risk} />
              <span style={{
                fontSize: 11, color: 'rgba(255,255,255,0.65)',
                background: 'rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: 99,
              }}>
                {prediction.confidence}% confidence
              </span>
              <span style={{
                fontSize: 11, color: 'rgba(255,255,255,0.65)',
                background: 'rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: 99,
              }}>
                {prediction.model_type}
              </span>
              <span style={{
                fontSize: 11, color: 'rgba(255,255,255,0.65)',
                background: 'rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: 99,
              }}>
                {prediction.months_of_data} months of data
              </span>
            </div>
          </div>

          {/* ── NL Explanation ───────────────────────────────── */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderLeft: '3px solid var(--accent)',
            borderRadius: 16, padding: 18, marginBottom: 14,
            display: 'flex', gap: 14, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: 'var(--accent-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-brain" style={{ fontSize: 18, color: 'var(--accent)' }} aria-hidden="true" />
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)',
                letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                FinSight AI Explanation
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {prediction.nl_explanation}
              </p>
            </div>
          </div>

          {/* ── SHAP Waterfall ───────────────────────────────── */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 18, padding: 18, marginBottom: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <i className="ti ti-chart-bar" style={{ fontSize: 16, color: 'var(--accent)' }} aria-hidden="true" />
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                SHAP Feature Attribution
              </p>
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 99,
                background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 600,
              }}>Explainable AI</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
              SHAP (SHapley Additive exPlanations) shows how much each spending category
              contributes to the prediction. Positive values push the prediction higher,
              negative values pull it lower.
            </p>

            {shapEntries.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                Not enough variation in spending data for SHAP analysis.
              </p>
            ) : (
              shapEntries.map(([cat, shap]) => (
                <ShapBar
                  key={cat}
                  category={cat}
                  shap={shap}
                  current={prediction.current_by_category[cat] || 0}
                  maxAbs={maxAbs}
                  currency={prediction.currency}
                />
              ))
            )}

            {/* Legend */}
            <div style={{
              display: 'flex', gap: 16, marginTop: 16,
              paddingTop: 14, borderTop: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 4, borderRadius: 99, background: 'var(--red)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Increases predicted spend</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 4, borderRadius: 99, background: 'var(--green)', opacity: 0.6 }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Decreases predicted spend</span>
              </div>
            </div>
          </div>

          {/* ── Top drivers ──────────────────────────────────── */}
          {prediction.top_drivers.length > 0 && (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 18, padding: 18, marginBottom: 14,
            }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                Top spending drivers
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {prediction.top_drivers.map((d, i) => (
                  <div key={d.category} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 12,
                    background: 'var(--bg-card2)',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: `${CAT_COLORS[d.category] || '#8b90a4'}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: 'var(--text-muted)',
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {d.category}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Currently {symbol}{d.current_spend.toFixed(0)} this month
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{
                        fontSize: 14, fontWeight: 700,
                        color: d.direction === 'increases' ? 'var(--red)' : 'var(--green)',
                      }}>
                        {d.direction === 'increases' ? '+' : '-'}{symbol}{Math.abs(d.shap_value).toFixed(0)}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>SHAP impact</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refresh button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
            <button onClick={fetchPrediction} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
            }}>
              <i className="ti ti-refresh" style={{ fontSize: 14 }} aria-hidden="true" />
              Refresh prediction
            </button>
          </div>
        </>
      )}

      </div> {/* end left column */}
      <div style={{ position: isDesktop ? 'sticky' : 'static', top: 24 }}>
      {/* ── AI CHAT ───────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 18, overflow: 'hidden',
      }}>
        {/* Chat header */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'var(--accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-robot" style={{ fontSize: 17, color: 'var(--accent)' }} aria-hidden="true" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              FinSight Assistant
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Ask about your spending, budgets or goals
            </p>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          height: 320, overflowY: 'auto', padding: '16px 18px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <i className="ti ti-messages" style={{
                fontSize: 32, color: 'var(--text-muted)', opacity: 0.4,
              }} aria-hidden="true" />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>
                Hi {userName.split(' ')[0]}! Ask me anything about your finances.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                {[
                  'How can I reduce my spending?',
                  'Am I on track this month?',
                  'How do I save more?',
                ].map(q => (
                  <button key={q} onClick={() => setInput(q)} style={{
                    padding: '6px 12px', borderRadius: 99, fontSize: 11,
                    background: 'var(--bg-card2)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', cursor: 'pointer',
                  }}>{q}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px', borderRadius: 14,
                background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-card2)',
                color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                fontSize: 13, lineHeight: 1.6,
              }}>
                {m.content}
              </div>
            </div>
          ))}

          {chatLoading && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--text-muted)',
                  animation: `bounce 1s ${i * 0.2}s infinite`,
                }} />
              ))}
              <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '12px 18px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10,
        }}>
          <input
            type="text"
            placeholder="Ask about your finances..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            style={{
              flex: 1, height: 44, padding: '0 14px',
              background: 'var(--bg-card2)', border: '1px solid var(--border)',
              borderRadius: 12, color: 'var(--text-primary)',
              fontSize: 14, outline: 'none',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || chatLoading}
            style={{
              width: 44, height: 44, borderRadius: 12, border: 'none',
              background: input.trim() ? 'var(--accent)' : 'var(--bg-card2)',
              color: input.trim() ? '#fff' : 'var(--text-muted)',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s',
            }}
          >
            <i className="ti ti-send" style={{ fontSize: 17 }} aria-hidden="true" />
          </button>
        </div>
      </div>
      </div> {/* end right column */}
      </div> {/* end desktop grid */}
    </div>
  )
}
