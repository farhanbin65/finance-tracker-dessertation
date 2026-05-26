import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

// ── Types ──────────────────────────────────────────────
interface SavingsGoal {
  id: string
  name: string
  target_amount: number
  saved_amount: number
  remaining: number
  target_date: string
  emoji: string
  percentage: number
  is_completed: boolean
  days_remaining: number
}

// ── Demo data ──────────────────────────────────────────
const DEMO_GOALS: SavingsGoal[] = [
  { id:'1', name:'House Deposit', target_amount:20000, saved_amount:15000, remaining:5000, target_date:'2026-12-01', emoji:'🏠', percentage:75, is_completed:false, days_remaining:189 },
  { id:'2', name:'Holiday Fund',  target_amount:2000,  saved_amount:800,   remaining:1200, target_date:'2025-07-01', emoji:'✈️', percentage:40, is_completed:false, days_remaining:36 },
  { id:'3', name:'New Car',       target_amount:15000, saved_amount:1500,  remaining:13500, target_date:'2027-03-01', emoji:'🚗', percentage:10, is_completed:false, days_remaining:279 },
]

const GOAL_EMOJIS = ['🏠','✈️','🚗','💻','📱','🎓','💍','🏋️','🎸','🐕','⛵','🌍']

// ── Ring progress component ────────────────────────────
function RingProgress({ pct, size = 64, stroke = 5, color = 'var(--accent)' }: {
  pct: number; size?: number; stroke?: number; color?: string
}) {
  const r          = (size - stroke * 2) / 2
  const circumference = 2 * Math.PI * r
  const offset     = circumference - (Math.min(pct, 100) / 100) * circumference

  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        {/* Fill */}
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition:'stroke-dashoffset .6s ease' }}
        />
      </svg>
      {/* Label */}
      <div style={{
        position:'absolute', inset:0,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:'var(--font-main)', fontSize:12, fontWeight:700,
        color:'var(--text-primary)',
      }}>
        {Math.round(pct)}%
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
export default function GoalsPage() {
  const { getAccessTokenSilently } = useAuth0()

  const [goals, setGoals]               = useState<SavingsGoal[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [depositTarget, setDepositTarget] = useState<SavingsGoal | null>(null)
  const [editTarget, setEditTarget]     = useState<SavingsGoal | null>(null)

  useEffect(() => { fetchGoals() }, [])

  // ── Fetch goals ──────────────────────────────────────
  async function fetchGoals() {
    try {
      setLoading(true)
      setError(null)
      let token = localStorage.getItem('fs_token') || await getAccessTokenSilently()

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/goals`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      setGoals(data.goals?.length ? data.goals : DEMO_GOALS)
    } catch {
      setGoals(DEMO_GOALS)
      setError('Using demo data — connect your backend to see real goals.')
    } finally {
      setLoading(false)
    }
  }

  // ── Delete goal ──────────────────────────────────────
  async function deleteGoal(id: string) {
    if (!confirm('Delete this savings goal?')) return
    try {
      let token = localStorage.getItem('fs_token') || await getAccessTokenSilently()
      await fetch(`${import.meta.env.VITE_API_URL}/api/goals/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setGoals(prev => prev.filter(g => g.id !== id))
    } catch {
      alert('Failed to delete goal.')
    }
  }

  // ── Derived summary ──────────────────────────────────
  const totalStashed   = goals.reduce((s, g) => s + g.saved_amount, 0)
  const totalTarget    = goals.reduce((s, g) => s + g.target_amount, 0)
  const completedCount = goals.filter(g => g.is_completed || g.saved_amount >= g.target_amount).length

  if (loading) return <LoadingSkeleton />

  return (
    <div style={{ paddingBottom: 8 }}>

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          background:'rgba(255,159,67,0.1)', border:'1px solid rgba(255,159,67,0.3)',
          borderRadius:12, padding:'10px 14px', marginBottom:14,
          fontSize:12, color:'var(--orange)', display:'flex', gap:8, alignItems:'center',
        }}>
          <i className="ti ti-info-circle" />
          {error}
        </div>
      )}

      {/* ── Summary hero card ── */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:18, padding:20, marginBottom:16,
        display:'flex', alignItems:'center', gap:16,
      }}>
        <div style={{
          width:56, height:56, background:'var(--accent-light)',
          borderRadius:18, display:'flex', alignItems:'center',
          justifyContent:'center', fontSize:26, flexShrink:0,
        }}>
          🏆
        </div>
        <div style={{ flex:1 }}>
          <p style={{
            fontSize:11, color:'var(--text-muted)', letterSpacing:'.06em',
            fontFamily:'var(--font-main)', fontWeight:600, marginBottom:4,
          }}>
            TOTAL STASHED
          </p>
          <p style={{ fontFamily:'var(--font-main)', fontSize:28, fontWeight:700, lineHeight:1 }}>
            £{totalStashed.toLocaleString('en-GB')}
            <span style={{ fontSize:14, fontWeight:400, color:'var(--text-muted)', marginLeft:6 }}>
              across {goals.length} goals
            </span>
          </p>
        </div>
        {/* Overall ring */}
        <RingProgress
          pct={totalTarget > 0 ? (totalStashed / totalTarget) * 100 : 0}
          size={56}
          stroke={5}
        />
      </div>

      {/* ── Mini stats row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
        <MiniStat label="Goals"     value={`${goals.length}`}      color="var(--accent)"  />
        <MiniStat label="Completed" value={`${completedCount}`}    color="var(--green)"   />
        <MiniStat label="Target"    value={`£${(totalTarget/1000).toFixed(0)}k`} color="var(--orange)" />
      </div>

      {/* ── Goals list ── */}
      {goals.length === 0 ? (
        <EmptyState onAdd={() => setShowAddModal(true)} />
      ) : (
        goals.map(goal => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onAddMoney={() => setDepositTarget(goal)}
            onEdit={() => setEditTarget(goal)}
            onDelete={() => deleteGoal(goal.id)}
          />
        ))
      )}

      {/* ── Add goal FAB ── */}
      <button
        onClick={() => setShowAddModal(true)}
        style={{
          position:'fixed', bottom:88, right:20,
          width:52, height:52, borderRadius:'50%',
          background:'var(--accent)', border:'none',
          color:'#fff', fontSize:24, cursor:'pointer',
          boxShadow:'0 4px 20px var(--accent-glow)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:40,
        }}
      >
        <i className="ti ti-plus" />
      </button>

      {/* ── Modals ── */}
      {showAddModal && (
        <GoalModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchGoals() }}
        />
      )}
      {editTarget && (
        <GoalModal
          mode="edit"
          existing={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); fetchGoals() }}
        />
      )}
      {depositTarget && (
        <DepositModal
          goal={depositTarget}
          onClose={() => setDepositTarget(null)}
          onDeposited={() => { setDepositTarget(null); fetchGoals() }}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background:'var(--bg-card)', border:'1px solid var(--border)',
      borderRadius:12, padding:'12px', textAlign:'center',
    }}>
      <p style={{ fontFamily:'var(--font-main)', fontSize:18, fontWeight:700, color }}>
        {value}
      </p>
      <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:2,
        fontFamily:'var(--font-main)', fontWeight:500, letterSpacing:'.04em' }}>
        {label.toUpperCase()}
      </p>
    </div>
  )
}

// ── Single goal card ───────────────────────────────────
function GoalCard({ goal, onAddMoney, onEdit, onDelete }: {
  goal: SavingsGoal
  onAddMoney: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const pct       = goal.target_amount > 0
    ? (goal.saved_amount / goal.target_amount) * 100
    : 0
  const remaining = Math.max(goal.target_amount - goal.saved_amount, 0)
  const completed = goal.saved_amount >= goal.target_amount

  // Days remaining
  const daysLeft  = Math.ceil(
    (new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  const dateLabel = new Date(goal.target_date).toLocaleDateString('en-GB', {
    month:'short', year:'numeric',
  })

  // Ring colour based on progress
  const ringColor = completed
    ? 'var(--green)'
    : pct >= 75 ? 'var(--accent)'
    : pct >= 40 ? 'var(--orange)'
    : 'var(--red)'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:18, padding:18, marginBottom:12,
        borderColor: hovered ? 'var(--accent)' : 'var(--border)',
        transition:'all .2s',
      }}
    >
      {/* Top row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
          <div style={{
            width:42, height:42, background:'var(--bg-card2)',
            borderRadius:14, display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:20, flexShrink:0,
          }}>
            {goal.emoji}
          </div>
          <div>
            <p style={{ fontFamily:'var(--font-main)', fontSize:16, fontWeight:700 }}>
              {goal.name}
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
              <i className="ti ti-calendar" style={{ fontSize:12, color:'var(--text-muted)' }} />
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                Target: {dateLabel}
              </span>
              {/* Show days left badge */}
              {daysLeft > 0 && !completed && (
                <span style={{
                  fontSize:10, fontWeight:600,
                  background:'var(--accent-light)', color:'var(--accent)',
                  padding:'2px 7px', borderRadius:99,
                  fontFamily:'var(--font-main)',
                }}>
                  {daysLeft}d left
                </span>
              )}
              {completed && (
                <span style={{
                  fontSize:10, fontWeight:600,
                  background:'rgba(34,200,122,0.15)', color:'var(--green)',
                  padding:'2px 7px', borderRadius:99,
                  fontFamily:'var(--font-main)',
                }}>
                  ✓ Complete
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ring */}
        <RingProgress pct={pct} size={64} stroke={5} color={ringColor} />
      </div>

      {/* Amounts */}
      <div style={{ marginBottom:14 }}>
        <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>
          Current Savings
        </p>
        <p style={{ fontFamily:'var(--font-main)', fontSize:22, fontWeight:700 }}>
          £{goal.saved_amount.toLocaleString('en-GB')}
          <span style={{ fontSize:14, color:'var(--text-muted)', fontWeight:400, marginLeft:4 }}>
            / £{goal.target_amount.toLocaleString('en-GB')}
          </span>
        </p>
        {!completed && (
          <p style={{ fontSize:13, fontWeight:600, color:'var(--accent)', marginTop:4 }}>
            £{remaining.toLocaleString('en-GB')} to go
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div style={{
        background:'rgba(255,255,255,0.06)',
        borderRadius:99, height:6, overflow:'hidden', marginBottom:14,
      }}>
        <div style={{
          width:`${Math.min(pct, 100)}%`, height:'100%',
          background: ringColor, borderRadius:99,
          transition:'width .6s ease',
        }} />
      </div>

      {/* Action buttons */}
      <div style={{ display:'flex', gap:8 }}>
        {!completed && (
          <button onClick={onAddMoney} className="btn-accent" style={{ flex:1, padding:'10px' }}>
            Add Money
          </button>
        )}
        {hovered && (
          <>
            <button onClick={onEdit} style={{
              width:40, height:40, borderRadius:10,
              background:'var(--accent-light)', border:'none',
              cursor:'pointer', color:'var(--accent)', fontSize:16,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <i className="ti ti-edit" />
            </button>
            <button onClick={onDelete} style={{
              width:40, height:40, borderRadius:10,
              background:'rgba(255,79,100,0.1)', border:'none',
              cursor:'pointer', color:'var(--red)', fontSize:16,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <i className="ti ti-trash" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ textAlign:'center', padding:'48px 24px' }}>
      <div style={{ fontSize:56, marginBottom:16 }}>🎯</div>
      <p style={{ fontFamily:'var(--font-main)', fontSize:16, fontWeight:700, marginBottom:8 }}>
        No savings goals yet
      </p>
      <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:24 }}>
        Start saving towards something meaningful.
      </p>
      <button onClick={onAdd} className="btn-accent" style={{ maxWidth:200, margin:'0 auto' }}>
        Create First Goal
      </button>
    </div>
  )
}

// ── Add / Edit Goal Modal ──────────────────────────────
function GoalModal({ mode, existing, onClose, onSaved }: {
  mode: 'add' | 'edit'
  existing?: SavingsGoal
  onClose: () => void
  onSaved: () => void
}) {
  const { getAccessTokenSilently } = useAuth0()

  const [form, setForm] = useState({
    name:          existing?.name ?? '',
    target_amount: existing?.target_amount?.toString() ?? '',
    saved_amount:  existing?.saved_amount?.toString() ?? '0',
    target_date:   existing?.target_date?.split('T')[0] ?? '',
    emoji:         existing?.emoji ?? '🎯',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]               = useState('')

  const update = (k: keyof typeof form, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }))

  async function handleSubmit() {
    if (!form.name.trim())     return setErr('Goal name is required')
    if (!form.target_amount || isNaN(Number(form.target_amount)))
      return setErr('Enter a valid target amount')
    if (!form.target_date)     return setErr('Target date is required')
    setErr('')
    setSubmitting(true)

    try {
      let token  = localStorage.getItem('fs_token') || await getAccessTokenSilently()
      const url  = mode === 'edit' && existing
        ? `${import.meta.env.VITE_API_URL}/api/goals/${existing.id}`
        : `${import.meta.env.VITE_API_URL}/api/goals`
      const method = mode === 'edit' ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name:           form.name,
          target_amount:  parseFloat(form.target_amount),
          saved_amount:   parseFloat(form.saved_amount || '0'),
          target_date:    form.target_date,
          emoji:          form.emoji,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      onSaved()
    } catch {
      setErr('Could not save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
      zIndex:200, display:'flex', alignItems:'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'100%', maxWidth:430, margin:'0 auto',
        background:'var(--bg-secondary)',
        borderRadius:'24px 24px 0 0',
        padding:'24px 20px 36px',
        border:'1px solid var(--border)',
        maxHeight:'90vh', overflowY:'auto',
      }}>
        {/* Handle */}
        <div style={{
          width:40, height:4, background:'var(--border)',
          borderRadius:99, margin:'0 auto 20px',
        }} />

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontFamily:'var(--font-main)', fontSize:18, fontWeight:700 }}>
            {mode === 'edit' ? 'Edit Goal' : 'New Savings Goal'}
          </h2>
          <button onClick={onClose} style={{ background:'none', border:'none',
            cursor:'pointer', color:'var(--text-muted)', fontSize:20 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Emoji picker */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)',
            fontFamily:'var(--font-main)', letterSpacing:'.04em',
            display:'block', marginBottom:8 }}>
            ICON
          </label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {GOAL_EMOJIS.map(em => (
              <button key={em} onClick={() => update('emoji', em)} style={{
                width:40, height:40, borderRadius:10, fontSize:20,
                background: form.emoji === em ? 'var(--accent-light)' : 'var(--bg-card)',
                border:`1.5px solid ${form.emoji === em ? 'var(--accent)' : 'var(--border)'}`,
                cursor:'pointer', transition:'all .15s',
              }}>
                {em}
              </button>
            ))}
          </div>
        </div>

        {/* Fields */}
        <ModalInput label="Goal Name" placeholder="e.g. House Deposit"
          value={form.name} onChange={v => update('name', v)} />
        <ModalInput label="Target Amount (£)" placeholder="e.g. 20000" type="number"
          value={form.target_amount} onChange={v => update('target_amount', v)} />
        <ModalInput label="Current Savings (£)" placeholder="e.g. 5000" type="number"
          value={form.saved_amount} onChange={v => update('saved_amount', v)} />
        <ModalInput label="Target Date" placeholder="" type="date"
          value={form.target_date} onChange={v => update('target_date', v)} />

        {err && (
          <p style={{ fontSize:13, color:'var(--red)', marginBottom:12, textAlign:'center' }}>{err}</p>
        )}

        <button onClick={handleSubmit} disabled={submitting}
          className="btn-accent" style={{ opacity: submitting ? .6 : 1, marginTop:4 }}>
          {submitting ? 'Saving...' : mode === 'edit' ? 'Update Goal' : 'Create Goal'}
        </button>
      </div>
    </div>
  )
}

// ── Deposit Modal ──────────────────────────────────────
function DepositModal({ goal, onClose, onDeposited }: {
  goal: SavingsGoal
  onClose: () => void
  onDeposited: () => void
}) {
  const { getAccessTokenSilently } = useAuth0()
  const [amount, setAmount]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]               = useState('')

  const remaining = Math.max(goal.target_amount - goal.saved_amount, 0)

  // Quick amounts
  const QUICK = [10, 25, 50, 100, 250].filter(n => n <= remaining + 1)

  async function handleDeposit() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      return setErr('Enter a valid amount')
    setErr('')
    setSubmitting(true)

    try {
      let token = localStorage.getItem('fs_token') || await getAccessTokenSilently()
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/goals/${goal.id}/deposit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount: parseFloat(amount) }),
        }
      )
      if (!res.ok) throw new Error('Failed')
      onDeposited()
    } catch {
      setErr('Could not save deposit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const pct = goal.target_amount > 0
    ? (goal.saved_amount / goal.target_amount) * 100 : 0
  const newPct = amount && !isNaN(Number(amount))
    ? Math.min(((goal.saved_amount + Number(amount)) / goal.target_amount) * 100, 100)
    : pct

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
      zIndex:200, display:'flex', alignItems:'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'100%', maxWidth:430, margin:'0 auto',
        background:'var(--bg-secondary)',
        borderRadius:'24px 24px 0 0',
        padding:'24px 20px 36px',
        border:'1px solid var(--border)',
      }}>
        {/* Handle */}
        <div style={{ width:40, height:4, background:'var(--border)',
          borderRadius:99, margin:'0 auto 20px' }} />

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontFamily:'var(--font-main)', fontSize:18, fontWeight:700 }}>
            {goal.emoji} Add Money
          </h2>
          <button onClick={onClose} style={{ background:'none', border:'none',
            cursor:'pointer', color:'var(--text-muted)', fontSize:20 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Goal info */}
        <div style={{
          background:'var(--bg-card)', borderRadius:14,
          padding:'14px 16px', marginBottom:16,
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:13, color:'var(--text-muted)' }}>Remaining</p>
            <p style={{ fontFamily:'var(--font-main)', fontSize:20, fontWeight:700,
              color:'var(--accent)' }}>
              £{remaining.toLocaleString('en-GB')}
            </p>
          </div>
          {/* Live preview ring */}
          <RingProgress pct={newPct} size={56} stroke={5} />
        </div>

        {/* Quick amounts */}
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {QUICK.map(q => (
            <button key={q} onClick={() => setAmount(q.toString())} style={{
              flex:1, padding:'8px 4px', borderRadius:10,
              border:`1.5px solid ${amount===String(q) ? 'var(--accent)' : 'var(--border)'}`,
              background: amount===String(q) ? 'var(--accent-light)' : 'var(--bg-card)',
              color: amount===String(q) ? 'var(--accent)' : 'var(--text-secondary)',
              fontFamily:'var(--font-main)', fontSize:13, fontWeight:600, cursor:'pointer',
            }}>
              £{q}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)',
            fontFamily:'var(--font-main)', letterSpacing:'.04em',
            display:'block', marginBottom:8 }}>
            CUSTOM AMOUNT (£)
          </label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Enter amount..."
            style={{
              width:'100%', background:'var(--bg-card)',
              border:'1px solid var(--border)', borderRadius:14,
              padding:'13px 16px', fontSize:14,
              color:'var(--text-primary)', fontFamily:'var(--font-body)',
              outline:'none',
            }}
          />
        </div>

        {err && (
          <p style={{ fontSize:13, color:'var(--red)', marginBottom:12, textAlign:'center' }}>{err}</p>
        )}

        <button onClick={handleDeposit} disabled={submitting}
          className="btn-accent" style={{ opacity: submitting ? .6 : 1 }}>
          {submitting ? 'Saving...' : `Deposit £${amount || '0'}`}
        </button>
      </div>
    </div>
  )
}

// ── Shared modal input ─────────────────────────────────
function ModalInput({ label, placeholder, value, onChange, type = 'text' }: {
  label: string; placeholder: string; value: string
  onChange: (v: string) => void; type?: string
}) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)',
        fontFamily:'var(--font-main)', letterSpacing:'.04em',
        display:'block', marginBottom:8 }}>
        {label.toUpperCase()}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width:'100%', background:'var(--bg-card)',
          border:'1px solid var(--border)', borderRadius:14,
          padding:'13px 16px', fontSize:14,
          color:'var(--text-primary)', fontFamily:'var(--font-body)',
          outline:'none',
        }}
      />
    </div>
  )
}

// ── Loading skeleton ───────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ height:96, borderRadius:18, background:'var(--bg-card)',
        border:'1px solid var(--border)', animation:'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ height:60, borderRadius:12, background:'var(--bg-card)',
            border:'1px solid var(--border)', animation:'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
      {[1,2,3].map(i => (
        <div key={i} style={{ height:160, borderRadius:18, background:'var(--bg-card)',
          border:'1px solid var(--border)', animation:'pulse 1.5s ease-in-out infinite' }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}