/**
 * FinSight — GoalsPage.tsx
 * UI UX Pro Max: Vector icons, mobile-safe actions, custom confirm,
 * shimmer skeleton, emoji fallback, accessible modals
 */

import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

const API_URL = import.meta.env.VITE_API_URL || ''

// ── Types ──────────────────────────────────────────────────────────
interface SavingsGoal {
  id: string; name: string; target_amount: number; saved_amount: number
  remaining: number; target_date: string; emoji: string
  percentage: number; is_completed: boolean; days_remaining: number
}

// ── Demo fallback ──────────────────────────────────────────────────
const DEMO: SavingsGoal[] = [
  { id: '1', name: 'House Deposit', target_amount: 20000, saved_amount: 15000, remaining: 5000,  target_date: '2026-12-01', emoji: '🏠', percentage: 75, is_completed: false, days_remaining: 189 },
  { id: '2', name: 'Holiday Fund',  target_amount: 2000,  saved_amount: 800,   remaining: 1200,  target_date: '2026-07-01', emoji: '✈️', percentage: 40, is_completed: false, days_remaining: 36  },
  { id: '3', name: 'New Laptop',    target_amount: 1500,  saved_amount: 1500,  remaining: 0,     target_date: '2026-04-01', emoji: '💻', percentage: 100,is_completed: true,  days_remaining: 0   },
]

// ── Goal emoji options (user-chosen — emoji is intentional here) ───
const GOAL_EMOJIS = ['🏠', '✈️', '🚗', '💻', '📱', '🎓', '💍', '🏋️', '🎸', '🐕', '⛵', '🌍', '🎯', '💰', '🏖️', '🎮']

// ── Emoji validity check (backend ?? bug) ─────────────────────────
const isValidEmoji = (e: string) => e && e !== '??' && e.length <= 4

// ── Ring progress ──────────────────────────────────────────────────
function RingProgress({ pct, size = 64, stroke = 5, color = 'var(--accent)', label }: {
  pct: number; size?: number; stroke?: number; color?: string; label?: string
}) {
  const r            = (size - stroke * 2) / 2
  const circumference = 2 * Math.PI * r
  const offset       = circumference - (Math.min(pct, 100) / 100) * circumference
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
         role="img" aria-label={label ?? `${Math.round(pct)}% progress`}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size < 50 ? 10 : 12, fontWeight: 700, color: 'var(--text-primary)',
      }}>
        {Math.round(pct)}%
      </div>
    </div>
  )
}

// ── Shimmer block ──────────────────────────────────────────────────
function Shimmer({ height = 160, radius = 18 }: { height?: number; radius?: number }) {
  return (
    <div style={{ height, borderRadius: radius, background: 'var(--bg-card)',
      border: '1px solid var(--border)', overflow: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.04) 50%,transparent 100%)',
        animation: 'shimmer 1.6s infinite',
      }} />
    </div>
  )
}

// ── Custom confirm dialog ──────────────────────────────────────────
function ConfirmDialog({ title, message, onConfirm, onCancel }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 300, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '0 24px',
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '24px 20px', width: '100%', maxWidth: 320,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, margin: '0 auto 14px',
          background: 'rgba(255,79,100,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-trash" style={{ fontSize: 22, color: 'var(--red)' }} aria-hidden="true" />
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
          textAlign: 'center', marginBottom: 6 }}>{title}</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center',
          marginBottom: 20, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={onCancel} style={{
            height: 44, borderRadius: 12, border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: 'var(--text-secondary)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            height: 44, borderRadius: 12, border: 'none',
            background: 'var(--red)', color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

// ── Shared modal input ─────────────────────────────────────────────
function ModalInput({ id, label, placeholder, value, onChange, type = 'text' }: {
  id: string; label: string; placeholder: string; value: string
  onChange: (v: string) => void; type?: string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={{
        fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
        letterSpacing: '.04em', display: 'block', marginBottom: 6,
        textTransform: 'uppercase',
      }}>{label}</label>
      <input
        id={id} type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '12px 14px', fontSize: 14, height: 48,
          color: 'var(--text-primary)', outline: 'none',
        }}
      />
    </div>
  )
}

// ── Modal sheet wrapper ────────────────────────────────────────────
function ModalSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 520,
        background: 'var(--bg-secondary)',
        borderRadius: '24px 24px 0 0',
        padding: '20px 20px',
        paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
        border: '1px solid var(--border)',
        maxHeight: '92vh', overflowY: 'auto',
      }}>
        {/* Drag handle */}
        <div style={{
          width: 36, height: 4, background: 'rgba(255,255,255,0.15)',
          borderRadius: 99, margin: '0 auto 18px',
        }} />
        {children}
      </div>
    </div>
  )
}

// ── Modal header ───────────────────────────────────────────────────
function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: 18 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
      <button onClick={onClose} aria-label="Close modal" style={{
        width: 32, height: 32, borderRadius: 10,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        color: 'var(--text-muted)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className="ti ti-x" style={{ fontSize: 16 }} />
      </button>
    </div>
  )
}

// ── Submit button ──────────────────────────────────────────────────
function SubmitBtn({ label, loading, onClick }: {
  label: string; loading: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width: '100%', height: 52, borderRadius: 14, border: 'none',
      background: loading ? 'rgba(124,58,237,0.6)' : 'var(--accent)',
      color: '#ede0ff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      opacity: loading ? 0.7 : 1, transition: 'background .2s',
    }}>
      {loading ? (
        <>
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          Saving...
        </>
      ) : label}
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════
export default function GoalsPage() {
  const { getAccessTokenSilently } = useAuth0()

  const [goals, setGoals]               = useState<SavingsGoal[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [depositTarget, setDepositTarget] = useState<SavingsGoal | null>(null)
  const [editTarget, setEditTarget]     = useState<SavingsGoal | null>(null)
  const [confirmId, setConfirmId]       = useState<string | null>(null)

  useEffect(() => { fetchGoals() }, [])

  async function getToken() {
    try { return localStorage.getItem('fs_token') || await getAccessTokenSilently() }
    catch { return localStorage.getItem('fs_token') || '' }
  }

  async function fetchGoals() {
    try {
      setLoading(true); setError(null)
      const token = await getToken()
      const res = await fetch(`${API_URL}/api/goals`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setGoals(data.goals?.length ? data.goals : DEMO)
    } catch {
      setGoals(DEMO)
      setError('Using demo data — connect your backend to see real goals.')
    } finally {
      setLoading(false)
    }
  }

  async function confirmDelete(id: string) {
    try {
      const token = await getToken()
      await fetch(`${API_URL}/api/goals/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setGoals(prev => prev.filter(g => g.id !== id))
    } catch {
      setError('Failed to delete goal. Please try again.')
    } finally {
      setConfirmId(null)
    }
  }

  // ── Derived summary ────────────────────────────────────────────────
  const totalStashed   = goals.reduce((s, g) => s + g.saved_amount, 0)
  const totalTarget    = goals.reduce((s, g) => s + g.target_amount, 0)
  const completedCount = goals.filter(g => g.is_completed || g.saved_amount >= g.target_amount).length
  const overallPct     = totalTarget > 0 ? (totalStashed / totalTarget) * 100 : 0
  const confirmItem    = goals.find(g => g.id === confirmId)

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <Shimmer height={96} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[1, 2, 3].map(i => <Shimmer key={i} height={60} radius={12} />)}
      </div>
      {[1, 2, 3].map(i => <Shimmer key={i} height={180} />)}
    </div>
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 32 }}>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>

      {/* ── Error banner ──────────────────────────────────────── */}
      {error && (
        <div style={{
          background: 'rgba(255,159,67,0.08)', border: '1px solid rgba(255,159,67,0.25)',
          borderRadius: 12, padding: '10px 14px', marginBottom: 14,
          fontSize: 13, color: 'var(--orange)',
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true" />
          {error}
        </div>
      )}

      {/* ── Summary hero card ─────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 18, padding: 20, marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {/* ✅ Vector icon — no emoji */}
        <div style={{
          width: 52, height: 52, background: 'var(--accent-light)',
          borderRadius: 16, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-trophy" style={{ fontSize: 24, color: 'var(--accent)' }} aria-hidden="true" />
        </div>

        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
            letterSpacing: '.06em', marginBottom: 4, textTransform: 'uppercase',
          }}>Total stashed</p>
          <p style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: 'var(--text-primary)' }}>
            £{totalStashed.toLocaleString('en-GB')}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            across {goals.length} goal{goals.length !== 1 ? 's' : ''}
          </p>
        </div>

        <RingProgress
          pct={overallPct}
          size={56}
          stroke={5}
          label={`Overall savings progress: ${Math.round(overallPct)}%`}
        />
      </div>

      {/* ── Mini stats row ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        <MiniStat label="Goals"     value={`${goals.length}`}       color="var(--accent)"  />
        <MiniStat label="Completed" value={`${completedCount}`}     color="var(--green)"   />
        <MiniStat label="Target"    value={`£${(totalTarget / 1000).toFixed(0)}k`} color="var(--orange)" />
      </div>

      {/* ── Goals list ───────────────────────────────────────── */}
      {goals.length === 0 ? (
        <EmptyState onAdd={() => setShowAddModal(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onAddMoney={() => setDepositTarget(goal)}
              onEdit={() => setEditTarget(goal)}
              onDelete={() => setConfirmId(goal.id)}
            />
          ))}
        </div>
      )}

      {/* ── FAB ───────────────────────────────────────────────── */}
      <button
        onClick={() => setShowAddModal(true)}
        aria-label="Create new savings goal"
        style={{
          position: 'fixed',
          bottom: 'calc(72px + env(safe-area-inset-bottom, 0px) + 16px)',
          right: 20, width: 52, height: 52, borderRadius: '50%',
          background: 'var(--accent)', border: 'none',
          color: '#fff', cursor: 'pointer',
          boxShadow: '0 4px 20px var(--accent-glow)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 40, transition: 'transform .2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <i className="ti ti-plus" style={{ fontSize: 22 }} aria-hidden="true" />
      </button>

      {/* ── Modals ────────────────────────────────────────────── */}
      {showAddModal && (
        <GoalModal mode="add"
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchGoals() }} />
      )}
      {editTarget && (
        <GoalModal mode="edit" existing={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); fetchGoals() }} />
      )}
      {depositTarget && (
        <DepositModal
          goal={depositTarget}
          onClose={() => setDepositTarget(null)}
          onDeposited={() => { setDepositTarget(null); fetchGoals() }} />
      )}
      {confirmId && confirmItem && (
        <ConfirmDialog
          title="Delete savings goal?"
          message={`"${confirmItem.name}" and all its progress will be permanently removed.`}
          onConfirm={() => confirmDelete(confirmId)}
          onCancel={() => setConfirmId(null)} />
      )}
    </div>
  )
}

// ── Mini stat ──────────────────────────────────────────────────────
function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '12px', textAlign: 'center',
    }}>
      <p style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
      <p style={{
        fontSize: 10, color: 'var(--text-muted)', marginTop: 4,
        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em',
      }}>{label}</p>
    </div>
  )
}

// ── Goal card ──────────────────────────────────────────────────────
function GoalCard({ goal, onAddMoney, onEdit, onDelete }: {
  goal: SavingsGoal; onAddMoney: () => void; onEdit: () => void; onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const pct       = goal.target_amount > 0 ? (goal.saved_amount / goal.target_amount) * 100 : 0
  const remaining = Math.max(goal.target_amount - goal.saved_amount, 0)
  const completed = goal.is_completed || goal.saved_amount >= goal.target_amount
  const daysLeft  = Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000)
  const dateLabel = new Date(goal.target_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

  const ringColor = completed ? 'var(--green)'
    : pct >= 75 ? 'var(--accent)'
    : pct >= 40 ? 'var(--orange)'
    : 'var(--red)'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 18, padding: 18,
        transition: 'border-color .2s',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* Goal icon — emoji if valid, vector fallback */}
          <div style={{
            width: 44, height: 44, background: 'var(--bg-card2)',
            borderRadius: 14, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isValidEmoji(goal.emoji) ? (
              <span style={{ fontSize: 22 }} role="img" aria-hidden="true">{goal.emoji}</span>
            ) : (
              <i className="ti ti-target" style={{ fontSize: 20, color: 'var(--accent)' }} aria-hidden="true" />
            )}
          </div>

          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {goal.name}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
              <i className="ti ti-calendar" style={{ fontSize: 11, color: 'var(--text-muted)' }} aria-hidden="true" />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {dateLabel}
              </span>
              {/* Days left badge */}
              {daysLeft > 0 && !completed && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                  background: daysLeft < 30 ? 'rgba(255,79,100,0.1)' : 'var(--accent-light)',
                  color: daysLeft < 30 ? 'var(--red)' : 'var(--accent)',
                }}>
                  {daysLeft}d left
                </span>
              )}
              {/* Completed badge */}
              {completed && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                  background: 'rgba(34,200,122,0.12)', color: 'var(--green)',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <i className="ti ti-check" style={{ fontSize: 10 }} aria-hidden="true" />
                  Complete
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ring progress */}
        <RingProgress pct={pct} size={60} stroke={5} color={ringColor}
          label={`${goal.name}: ${Math.round(pct)}% saved`} />
      </div>

      {/* Amount display */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
          Current savings
        </p>
        <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
          £{goal.saved_amount.toLocaleString('en-GB')}
          <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
            / £{goal.target_amount.toLocaleString('en-GB')}
          </span>
        </p>
        {!completed && (
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginTop: 3 }}>
            £{remaining.toLocaleString('en-GB')} to go
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 99, height: 6, overflow: 'hidden', marginBottom: 14,
      }}>
        <div style={{
          width: `${Math.min(pct, 100)}%`, height: '100%',
          background: ringColor, borderRadius: 99,
          transition: 'width .6s ease',
        }} />
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Add money button — only if not completed */}
        {!completed && (
          <button onClick={onAddMoney} style={{
            flex: 1, height: 40, borderRadius: 10, border: 'none',
            background: 'var(--accent)', color: '#ede0ff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'opacity .2s',
          }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" />
            Add money
          </button>
        )}
        {completed && (
          <div style={{
            flex: 1, height: 40, borderRadius: 10,
            background: 'rgba(34,200,122,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <i className="ti ti-circle-check" style={{ fontSize: 16, color: 'var(--green)' }} aria-hidden="true" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Goal reached!</span>
          </div>
        )}

        {/* ✅ Edit/delete always rendered — opacity controlled */}
        <button onClick={onEdit} aria-label={`Edit ${goal.name}`} style={{
          width: 40, height: 40, borderRadius: 10, border: 'none',
          background: hovered ? 'var(--accent-light)' : 'transparent',
          color: hovered ? 'var(--accent)' : 'var(--text-muted)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s', opacity: hovered ? 1 : 0.35,
        }}>
          <i className="ti ti-edit" style={{ fontSize: 16 }} />
        </button>
        <button onClick={onDelete} aria-label={`Delete ${goal.name}`} style={{
          width: 40, height: 40, borderRadius: 10, border: 'none',
          background: hovered ? 'rgba(255,79,100,0.1)' : 'transparent',
          color: hovered ? 'var(--red)' : 'var(--text-muted)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s', opacity: hovered ? 1 : 0.35,
        }}>
          <i className="ti ti-trash" style={{ fontSize: 16 }} />
        </button>
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{
      textAlign: 'center', padding: '56px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    }}>
      {/* ✅ Vector icon — no emoji */}
      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className="ti ti-target" style={{ fontSize: 28, color: 'var(--text-muted)' }} aria-hidden="true" />
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
        No savings goals yet
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 220, lineHeight: 1.5 }}>
        Start saving towards something meaningful — a holiday, home, or dream.
      </p>
      <button onClick={onAdd} style={{
        height: 44, padding: '0 24px', borderRadius: 12, border: 'none',
        background: 'var(--accent)', color: '#ede0ff',
        fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 6,
      }}>
        Create first goal
      </button>
    </div>
  )
}

// ── Goal modal (add / edit) ────────────────────────────────────────
function GoalModal({ mode, existing, onClose, onSaved }: {
  mode: 'add' | 'edit'; existing?: SavingsGoal
  onClose: () => void; onSaved: () => void
}) {
  const { getAccessTokenSilently } = useAuth0()
  const [form, setForm] = useState({
    name:          existing?.name ?? '',
    target_amount: existing?.target_amount?.toString() ?? '',
    saved_amount:  existing?.saved_amount?.toString() ?? '0',
    target_date:   existing?.target_date?.split('T')[0] ?? '',
    emoji:         isValidEmoji(existing?.emoji ?? '') ? (existing?.emoji ?? '🎯') : '🎯',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]               = useState('')

  const update = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit() {
    if (!form.name.trim())    return setErr('Goal name is required.')
    if (!form.target_amount || isNaN(Number(form.target_amount)) || Number(form.target_amount) <= 0)
      return setErr('Enter a valid target amount greater than zero.')
    if (!form.target_date)    return setErr('Target date is required.')
    setErr(''); setSubmitting(true)
    try {
      const token  = localStorage.getItem('fs_token') || await getAccessTokenSilently()
      const url    = mode === 'edit' && existing
        ? `${API_URL}/api/goals/${existing.id}` : `${API_URL}/api/goals`
      const res = await fetch(url, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name:          form.name,
          target_amount: parseFloat(form.target_amount),
          saved_amount:  parseFloat(form.saved_amount || '0'),
          target_date:   form.target_date,
          emoji:         form.emoji,
        }),
      })
      if (!res.ok) throw new Error()
      onSaved()
    } catch {
      setErr('Could not save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalSheet onClose={onClose}>
      <ModalHeader title={mode === 'edit' ? 'Edit goal' : 'New savings goal'} onClose={onClose} />

      {/* Emoji picker — intentional user selection, kept as emoji */}
      <div style={{ marginBottom: 16 }}>
        <p style={{
          fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
          letterSpacing: '.04em', marginBottom: 8, textTransform: 'uppercase',
        }}>Icon</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {GOAL_EMOJIS.map(em => (
            <button key={em} onClick={() => update('emoji', em)} style={{
              width: 40, height: 40, borderRadius: 10, fontSize: 20,
              background: form.emoji === em ? 'var(--accent-light)' : 'var(--bg-card)',
              border: `1.5px solid ${form.emoji === em ? 'var(--accent)' : 'var(--border)'}`,
              cursor: 'pointer', transition: 'all .15s',
            }} aria-label={`Select ${em} as goal icon`}>
              {em}
            </button>
          ))}
        </div>
      </div>

      <ModalInput id="goal-name" label="Goal name"
        placeholder="e.g. House Deposit"
        value={form.name} onChange={v => update('name', v)} />
      <ModalInput id="goal-target" label="Target amount (£)"
        placeholder="e.g. 20000" type="number"
        value={form.target_amount} onChange={v => update('target_amount', v)} />
      <ModalInput id="goal-saved" label="Current savings (£)"
        placeholder="e.g. 5000" type="number"
        value={form.saved_amount} onChange={v => update('saved_amount', v)} />
      <ModalInput id="goal-date" label="Target date"
        placeholder="" type="date"
        value={form.target_date} onChange={v => update('target_date', v)} />

      {err && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 14px', borderRadius: 10, marginBottom: 12,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 15, color: 'var(--red)', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: 'var(--red)' }}>{err}</p>
        </div>
      )}

      <SubmitBtn
        label={mode === 'edit' ? 'Update goal' : 'Create goal'}
        loading={submitting}
        onClick={handleSubmit}
      />
    </ModalSheet>
  )
}

// ── Deposit modal ──────────────────────────────────────────────────
function DepositModal({ goal, onClose, onDeposited }: {
  goal: SavingsGoal; onClose: () => void; onDeposited: () => void
}) {
  const { getAccessTokenSilently } = useAuth0()
  const [amount, setAmount]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]               = useState('')

  const remaining = Math.max(goal.target_amount - goal.saved_amount, 0)
  const QUICK     = [10, 25, 50, 100, 250].filter(n => n <= remaining + 1)

  const currentPct = goal.target_amount > 0 ? (goal.saved_amount / goal.target_amount) * 100 : 0
  const previewPct = amount && !isNaN(Number(amount)) && Number(amount) > 0
    ? Math.min(((goal.saved_amount + Number(amount)) / goal.target_amount) * 100, 100)
    : currentPct

  async function handleDeposit() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      return setErr('Enter a valid amount greater than zero.')
    setErr(''); setSubmitting(true)
    try {
      const token = localStorage.getItem('fs_token') || await getAccessTokenSilently()
      const res = await fetch(`${API_URL}/api/goals/${goal.id}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      })
      if (!res.ok) throw new Error()
      onDeposited()
    } catch {
      setErr('Could not save deposit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalSheet onClose={onClose}>
      {/* ✅ Title uses vector icon — not goal.emoji directly */}
      <ModalHeader
        title={`Add money — ${goal.name}`}
        onClose={onClose}
      />

      {/* Goal info + live preview ring */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 14,
        padding: '14px 16px', marginBottom: 16,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            Remaining to goal
          </p>
          <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
            £{remaining.toLocaleString('en-GB')}
          </p>
          {amount && Number(amount) > 0 && (
            <p style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>
              After deposit: £{(goal.saved_amount + Number(amount)).toLocaleString('en-GB')}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <RingProgress
            pct={previewPct}
            size={56} stroke={5}
            color={previewPct >= 100 ? 'var(--green)' : 'var(--accent)'}
            label="Live deposit preview"
          />
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '.04em', fontWeight: 600 }}>
            {amount && Number(amount) > 0 ? 'After' : 'Current'}
          </p>
        </div>
      </div>

      {/* Quick amounts */}
      {QUICK.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {QUICK.map(q => (
            <button key={q} onClick={() => setAmount(q.toString())} style={{
              flex: 1, height: 40, borderRadius: 10,
              border: `1.5px solid ${amount === String(q) ? 'var(--accent)' : 'var(--border)'}`,
              background: amount === String(q) ? 'var(--accent-light)' : 'var(--bg-card)',
              color: amount === String(q) ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              £{q}
            </button>
          ))}
        </div>
      )}

      {/* Custom amount */}
      <ModalInput
        id="deposit-amount"
        label="Custom amount (£)"
        placeholder="Enter amount..."
        value={amount}
        onChange={v => { setAmount(v); if (err) setErr('') }}
        type="number"
      />

      {err && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 14px', borderRadius: 10, marginBottom: 12,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 15, color: 'var(--red)', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: 'var(--red)' }}>{err}</p>
        </div>
      )}

      <SubmitBtn
        label={`Deposit £${Number(amount) > 0 ? Number(amount).toFixed(2) : '0.00'}`}
        loading={submitting}
        onClick={handleDeposit}
      />
    </ModalSheet>
  )
}