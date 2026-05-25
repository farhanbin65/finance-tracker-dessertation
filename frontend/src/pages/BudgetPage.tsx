import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

// ── Types ──────────────────────────────────────────────
interface BudgetCategory {
  _id: string
  category: string
  allocated: number
  spent: number
}

interface BudgetSummary {
  total_allocated: number
  total_spent: number
  percentage: number
}

// ── Category icon map ──────────────────────────────────
const CAT_ICONS: Record<string, string> = {
  food:          '🍽',
  transport:     '🚌',
  entertainment: '🎭',
  shopping:      '🛍',
  subscriptions: '📺',
  health:        '💊',
  education:     '📚',
  other:         '💳',
}
const getCatIcon = (cat: string) =>
  CAT_ICONS[cat.toLowerCase()] ?? CAT_ICONS.other

// ── Status logic ───────────────────────────────────────
function getStatus(spent: number, allocated: number) {
  const pct = allocated > 0 ? (spent / allocated) * 100 : 0
  if (pct >= 100) return { label: 'Over budget', color: 'var(--red)',    bg: 'rgba(255,79,100,0.12)',    barColor: 'var(--red)'    }
  if (pct >= 80)  return { label: 'Warning',     color: 'var(--orange)', bg: 'rgba(255,159,67,0.12)',   barColor: 'var(--orange)' }
  return              { label: 'On track',     color: 'var(--green)',  bg: 'rgba(34,200,122,0.12)',   barColor: 'var(--green)'  }
}

// ── Demo data ──────────────────────────────────────────
const DEMO_CATEGORIES: BudgetCategory[] = [
  { _id:'1', category:'Food',          allocated:450,  spent:320  },
  { _id:'2', category:'Transport',     allocated:200,  spent:180  },
  { _id:'3', category:'Entertainment', allocated:200,  spent:215  },
  { _id:'4', category:'Shopping',      allocated:500,  spent:420  },
  { _id:'5', category:'Subscriptions', allocated:150,  spent:150  },
]

const CATEGORIES = ['Food','Transport','Shopping','Entertainment','Subscriptions','Health','Education','Other']

// ══════════════════════════════════════════════════════
export default function BudgetPage() {
  const { getAccessTokenSilently } = useAuth0()

  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [summary, setSummary]       = useState<BudgetSummary | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState<BudgetCategory | null>(null)

  useEffect(() => { fetchBudget() }, [])

  // ── Fetch budget from Flask ────────────────────────
  async function fetchBudget() {
    try {
      setLoading(true)
      setError(null)
      let token = localStorage.getItem('fs_token') || await getAccessTokenSilently()

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/budget`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()

      if (data.budgets?.length) {
        setCategories(data.budgets)
        // Build summary from response or calculate locally
        const totalAllocated = data.budgets.reduce((s: number, b: BudgetCategory) => s + b.allocated, 0)
        const totalSpent     = data.budgets.reduce((s: number, b: BudgetCategory) => s + b.spent, 0)
        setSummary({
          total_allocated: totalAllocated,
          total_spent:     totalSpent,
          percentage:      totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0,
        })
      } else {
        setCategories(DEMO_CATEGORIES)
        setSummary({ total_allocated:1500, total_spent:1340, percentage:89 })
      }
    } catch {
      setCategories(DEMO_CATEGORIES)
      setSummary({ total_allocated:1500, total_spent:1340, percentage:89 })
      setError('Using demo data — connect your backend to see real budgets.')
    } finally {
      setLoading(false)
    }
  }

  // ── Delete category ────────────────────────────────
  async function deleteCategory(id: string) {
    if (!confirm('Remove this budget category?')) return
    try {
      let token = localStorage.getItem('fs_token') || await getAccessTokenSilently()
      await fetch(`${import.meta.env.VITE_API_URL}/api/budget/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setCategories(prev => prev.filter(c => c._id !== id))
    } catch {
      alert('Failed to delete.')
    }
  }

  // ── Derived ────────────────────────────────────────
  const overallPct = summary
    ? Math.min(Math.round((summary.total_spent / summary.total_allocated) * 100), 100)
    : 0

  const overallStatus = summary ? getStatus(summary.total_spent, summary.total_allocated) : null

  // ── Render ─────────────────────────────────────────
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

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* ── Hero summary card ── */}
          {summary && (
            <div style={{
              background:'var(--bg-card)', border:'1px solid var(--border)',
              borderRadius:18, padding:20, marginBottom:16,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                <div>
                  <p style={{
                    fontSize:11, color:'var(--text-muted)',
                    fontFamily:'var(--font-main)', fontWeight:600,
                    letterSpacing:'.06em', marginBottom:4,
                  }}>
                    TOTAL MONTHLY BUDGET
                  </p>
                  <p style={{ fontFamily:'var(--font-main)', fontSize:36, fontWeight:700, lineHeight:1 }}>
                    £{summary.total_allocated.toLocaleString()}
                  </p>
                </div>
                <i className="ti ti-shield-check" style={{ fontSize:22, color:'var(--accent)' }} />
              </div>

              {/* Spent row */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin:'14px 0 6px' }}>
                <span style={{ fontSize:14, color:'var(--text-secondary)' }}>
                  £{summary.total_spent.toLocaleString()} spent
                </span>
                <span style={{
                  fontSize:16, fontWeight:700,
                  fontFamily:'var(--font-main)',
                  color: overallStatus?.color,
                }}>
                  {overallPct}%
                </span>
              </div>

              {/* Progress bar */}
              <div style={{
                background:'rgba(255,255,255,0.06)',
                borderRadius:99, height:8, overflow:'hidden',
              }}>
                <div style={{
                  width:`${overallPct}%`, height:'100%',
                  background: overallStatus?.barColor,
                  borderRadius:99,
                  transition:'width .6s ease',
                }} />
              </div>

              {/* Warning message */}
              {overallPct >= 80 && (
                <div style={{
                  display:'flex', alignItems:'center', gap:6,
                  marginTop:10, fontSize:12,
                  color: overallStatus?.color,
                }}>
                  <i className="ti ti-info-circle" style={{ fontSize:14 }} />
                  {overallPct >= 100
                    ? 'You have exceeded your monthly budget!'
                    : 'Approaching your monthly limit.'}
                </div>
              )}

              {/* Mini stats */}
              <div style={{
                display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
                gap:10, marginTop:16,
              }}>
                <MiniStat
                  label="Remaining"
                  value={`£${Math.max(summary.total_allocated - summary.total_spent, 0).toLocaleString()}`}
                  color="var(--green)"
                />
                <MiniStat
                  label="Categories"
                  value={`${categories.length}`}
                  color="var(--accent)"
                />
                <MiniStat
                  label="Over limit"
                  value={`${categories.filter(c => c.spent > c.allocated).length}`}
                  color="var(--red)"
                />
              </div>
            </div>
          )}

          {/* ── Categories header ── */}
          <div style={{
            display:'flex', justifyContent:'space-between',
            alignItems:'center', marginBottom:12,
          }}>
            <p style={{ fontFamily:'var(--font-main)', fontSize:16, fontWeight:700 }}>
              Categories
            </p>
            <span style={{ fontSize:12, color:'var(--accent)', cursor:'pointer', fontWeight:500 }}>
              View All
            </span>
          </div>

          {/* ── Category list ── */}
          {categories.map(cat => (
            <CategoryCard
              key={cat._id}
              cat={cat}
              onEdit={() => setEditTarget(cat)}
              onDelete={() => deleteCategory(cat._id)}
            />
          ))}

          {/* ── Add category button ── */}
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              width:'100%', background:'transparent',
              border:'1.5px dashed var(--border)',
              borderRadius:14, padding:16,
              color:'var(--text-muted)', fontSize:14,
              fontFamily:'var(--font-main)', fontWeight:500,
              cursor:'pointer', marginTop:4,
              transition:'all .2s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.borderColor = 'var(--accent)'
              ;(e.target as HTMLElement).style.color = 'var(--accent)'
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.borderColor = 'var(--border)'
              ;(e.target as HTMLElement).style.color = 'var(--text-muted)'
            }}
          >
            <i className="ti ti-plus" style={{ marginRight:8 }} />
            Add Budget Category
          </button>
        </>
      )}

      {/* ── Modals ── */}
      {showAddModal && (
        <BudgetModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchBudget() }}
        />
      )}
      {editTarget && (
        <BudgetModal
          mode="edit"
          existing={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); fetchBudget() }}
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
      background:'var(--bg-card2)', borderRadius:10,
      padding:'10px 12px', textAlign:'center',
    }}>
      <p style={{ fontSize:16, fontWeight:700, fontFamily:'var(--font-main)', color }}>
        {value}
      </p>
      <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:2, fontFamily:'var(--font-main)', fontWeight:500 }}>
        {label.toUpperCase()}
      </p>
    </div>
  )
}

function CategoryCard({ cat, onEdit, onDelete }: {
  cat: BudgetCategory
  onEdit: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const status = getStatus(cat.spent, cat.allocated)
  const pct    = cat.allocated > 0
    ? Math.min(Math.round((cat.spent / cat.allocated) * 100), 100)
    : 0

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:14, padding:14, marginBottom:10,
        borderColor: hovered ? 'var(--accent)' : 'var(--border)',
        transition:'all .2s',
      }}
    >
      {/* Top row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* Icon */}
          <div style={{
            width:40, height:40, borderRadius:12,
            background:'var(--bg-card2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:18,
          }}>
            {getCatIcon(cat.category)}
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:600, fontFamily:'var(--font-main)' }}>
              {cat.category}
            </p>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              £{cat.spent.toLocaleString()} of £{cat.allocated.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Right side — status badge or action buttons */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {hovered ? (
            <>
              <ActionBtn icon="ti-edit"  color="var(--accent)" onClick={onEdit}   />
              <ActionBtn icon="ti-trash" color="var(--red)"    onClick={onDelete} />
            </>
          ) : (
            <span style={{
              padding:'4px 10px', borderRadius:99,
              fontSize:11, fontWeight:600, fontFamily:'var(--font-main)',
              background: status.bg, color: status.color,
            }}>
              {status.label}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        background:'rgba(255,255,255,0.06)',
        borderRadius:99, height:6, overflow:'hidden',
      }}>
        <div style={{
          width:`${pct}%`, height:'100%',
          background: status.barColor,
          borderRadius:99,
          transition:'width .5s ease',
        }} />
      </div>

      {/* Remaining */}
      <p style={{
        fontSize:11, color:'var(--text-muted)',
        marginTop:6, textAlign:'right',
      }}>
        {cat.spent > cat.allocated
          ? `£${(cat.spent - cat.allocated).toFixed(0)} over`
          : `£${(cat.allocated - cat.spent).toFixed(0)} remaining`
        }
      </p>
    </div>
  )
}

function ActionBtn({ icon, color, onClick }: { icon: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width:32, height:32, borderRadius:8,
      background: color === 'var(--red)' ? 'rgba(255,79,100,0.1)' : 'var(--accent-light)',
      border:'none', cursor:'pointer',
      display:'flex', alignItems:'center', justifyContent:'center',
      color, fontSize:15,
    }}>
      <i className={`ti ${icon}`} />
    </button>
  )
}

// ── Add / Edit Modal ───────────────────────────────────
function BudgetModal({ mode, existing, onClose, onSaved }: {
  mode: 'add' | 'edit'
  existing?: BudgetCategory
  onClose: () => void
  onSaved: () => void
}) {
  const { getAccessTokenSilently } = useAuth0()

  const [form, setForm] = useState({
    category:  existing?.category  ?? 'Food',
    allocated: existing?.allocated?.toString() ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]               = useState('')

  const update = (k: keyof typeof form, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }))

  async function handleSubmit() {
    if (!form.allocated || isNaN(Number(form.allocated))) return setErr('Enter a valid amount')
    setErr('')
    setSubmitting(true)

    try {
      let token = localStorage.getItem('fs_token') || await getAccessTokenSilently()
      const url    = mode === 'edit' && existing
        ? `${import.meta.env.VITE_API_URL}/api/budget/${existing._id}`
        : `${import.meta.env.VITE_API_URL}/api/budget`
      const method = mode === 'edit' ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category:  form.category,
          allocated: parseFloat(form.allocated),
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      onSaved()
    } catch {
      setErr('Could not save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
        zIndex:200, display:'flex', alignItems:'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:'100%', maxWidth:430, margin:'0 auto',
          background:'var(--bg-secondary)',
          borderRadius:'24px 24px 0 0',
          padding:'24px 20px 36px',
          border:'1px solid var(--border)',
        }}
      >
        {/* Handle */}
        <div style={{
          width:40, height:4, background:'var(--border)',
          borderRadius:99, margin:'0 auto 20px',
        }} />

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontFamily:'var(--font-main)', fontSize:18, fontWeight:700 }}>
            {mode === 'edit' ? 'Edit Budget' : 'Add Budget Category'}
          </h2>
          <button onClick={onClose} style={{ background:'none', border:'none',
            cursor:'pointer', color:'var(--text-muted)', fontSize:20 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Category select */}
        <div style={{ marginBottom:14 }}>
          <label style={{
            fontSize:12, fontWeight:600, color:'var(--text-secondary)',
            fontFamily:'var(--font-main)', letterSpacing:'.04em',
            display:'block', marginBottom:8,
          }}>
            CATEGORY
          </label>
          <select
            value={form.category}
            onChange={e => update('category', e.target.value)}
            style={{
              width:'100%', background:'var(--bg-card)',
              border:'1px solid var(--border)', borderRadius:14,
              padding:'13px 16px', fontSize:14,
              color:'var(--text-primary)', fontFamily:'var(--font-body)',
              outline:'none', appearance:'none',
            }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Monthly limit */}
        <div style={{ marginBottom:14 }}>
          <label style={{
            fontSize:12, fontWeight:600, color:'var(--text-secondary)',
            fontFamily:'var(--font-main)', letterSpacing:'.04em',
            display:'block', marginBottom:8,
          }}>
            MONTHLY LIMIT (£)
          </label>
          <input
            type="number"
            value={form.allocated}
            onChange={e => update('allocated', e.target.value)}
            placeholder="e.g. 300"
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
          <p style={{ fontSize:13, color:'var(--red)', marginBottom:12, textAlign:'center' }}>
            {err}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-accent"
          style={{ opacity: submitting ? .6 : 1, marginTop:4 }}
        >
          {submitting ? 'Saving...' : mode === 'edit' ? 'Update Budget' : 'Add Category'}
        </button>
      </div>
    </div>
  )
}

// ── Loading skeleton ───────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ height:200, borderRadius:18, background:'var(--bg-card)',
        border:'1px solid var(--border)', animation:'pulse 1.5s ease-in-out infinite' }} />
      {[1,2,3,4].map(i => (
        <div key={i} style={{ height:88, borderRadius:14, background:'var(--bg-card)',
          border:'1px solid var(--border)', animation:'pulse 1.5s ease-in-out infinite' }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}