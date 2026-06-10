/**
 * FinSight — BudgetPage.tsx
 * UI UX Pro Max: Vector icons, mobile-safe actions, custom confirm,
 * shimmer skeleton, accessible modal, desktop-safe layout
 */

import { useState, useEffect } from 'react'
import { useToast } from '../components/ui/Toast'
import { getAuthToken } from '../utils/getAuthToken'
import { useIsDesktop } from '../hooks/useIsDesktop'

const API_URL = import.meta.env.VITE_API_URL || ''

// ── Types ──────────────────────────────────────────────────────────
interface BudgetCategory {
  id: string; category: string; limit: number; spent: number
  month: number; year: number; alert_threshold: number
}
interface BudgetSummary {
  total_allocated: number; total_spent: number; percentage: number
}

// ── Category → Tabler icon + colour (NO emoji) ─────────────────────
const CAT_META: Record<string, { icon: string; color: string }> = {
  food:          { icon: 'ti-tools-kitchen-2',    color: '#ff9f43' },
  transport:     { icon: 'ti-car',                color: '#7c5cfc' },
  entertainment: { icon: 'ti-confetti',           color: '#0ea5e9' },
  shopping:      { icon: 'ti-shopping-bag',       color: '#f0b429' },
  subscriptions: { icon: 'ti-device-tv',          color: '#ff4f64' },
  health:        { icon: 'ti-heart-rate-monitor', color: '#34d399' },
  education:     { icon: 'ti-school',             color: '#a78bfa' },
  utilities:     { icon: 'ti-bulb',               color: '#38bdf8' },
  rent:          { icon: 'ti-home',               color: '#818cf8' },
  other:         { icon: 'ti-credit-card',        color: '#8b90a4' },
}
const getCat = (cat: string) => CAT_META[cat.toLowerCase()] ?? CAT_META.other

// ── Status helper ──────────────────────────────────────────────────
function getStatus(spent: number, limit: number) {
  const pct = limit > 0 ? (spent / limit) * 100 : 0
  if (pct >= 100) return { label: 'Over budget', color: 'var(--red)',    barColor: 'var(--red)',    bg: 'rgba(255,79,100,0.1)'  }
  if (pct >= 80)  return { label: 'Warning',     color: 'var(--orange)', barColor: 'var(--orange)', bg: 'rgba(255,159,67,0.1)' }
  return              { label: 'On track',     color: 'var(--green)',  barColor: 'var(--green)',  bg: 'rgba(34,200,122,0.1)' }
}


const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Subscriptions', 'Health', 'Education', 'Utilities', 'Rent', 'Other']

// ── Shimmer block ──────────────────────────────────────────────────
function Shimmer({ height = 88, radius = 14 }: { height?: number; radius?: number }) {
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
          }}>Remove</button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════
export default function BudgetPage() {
  const { showToast } = useToast()

  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [summary, setSummary]       = useState<BudgetSummary | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget]     = useState<BudgetCategory | null>(null)
  const [confirmId, setConfirmId]       = useState<string | null>(null)
  const isDesktop = useIsDesktop()

  useEffect(() => { fetchBudget() }, [])

  async function getToken() {
    return getAuthToken()
  }

  async function fetchBudget() {
    try {
      setLoading(true); setError(null)
      const token = await getToken()
      const res = await fetch(`${API_URL}/api/budgets`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      const budgets = data.budgets || []
      setCategories(budgets)
      if (budgets.length > 0) {
        const totalAllocated = budgets.reduce((s: number, b: BudgetCategory) => s + b.limit, 0)
        const totalSpent     = budgets.reduce((s: number, b: BudgetCategory) => s + b.spent, 0)
        setSummary({
          total_allocated: totalAllocated,
          total_spent:     totalSpent,
          percentage:      totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0,
        })
      } else {
        setSummary(null)
      }
      } catch {
      setCategories([])
      setSummary(null)
      setError('Could not load budgets. Please refresh.')
    }finally {
      setLoading(false)
    }
  }

  async function confirmDelete(id: string) {
    try {
      const token = await getToken()
      await fetch(`${API_URL}/api/budgets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setCategories(prev => prev.filter(c => c.id !== id))
      // Recalculate summary after delete
      setCategories(prev => {
        const updated = prev.filter(c => c.id !== id)
        const totalAllocated = updated.reduce((s, b) => s + b.limit, 0)
        const totalSpent     = updated.reduce((s, b) => s + b.spent, 0)
        setSummary({
          total_allocated: totalAllocated,
          total_spent: totalSpent,
          percentage: totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0,
        })
        return updated
      })
      showToast('Budget category removed', 'success')
    } catch {
      showToast('Something went wrong. Please try again.', 'error')
    } finally {
      setConfirmId(null)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────
  const overallPct    = summary ? Math.min(Math.round((summary.total_spent / summary.total_allocated) * 100), 100) : 0
  const overallStatus = summary ? getStatus(summary.total_spent, summary.total_allocated) : null
  const confirmItem   = categories.find(c => c.id === confirmId)

  return (
    <div style={{
  width: '100%',
  maxWidth: isDesktop ? '960px' : '100%',
  margin: '0 auto',
  padding: isDesktop ? '24px 32px 32px' : '0 0 32px',
}}>
      <style>{`
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
      `}</style>

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

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Shimmer height={210} radius={18} />
          {[1, 2, 3, 4].map(i => <Shimmer key={i} height={96} />)}
        </div>
      ) : (
        <>
          {/* ── Hero summary card ──────────────────────────────── */}
          {summary && (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 18, padding: 20, marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginBottom: 4 }}>
                <div>
                  <p style={{
                    fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
                    letterSpacing: '.06em', marginBottom: 4,
                    textTransform: 'uppercase',
                  }}>Total monthly budget</p>
                  <p style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, color: 'var(--text-primary)' }}>
                    £{summary.total_allocated.toLocaleString()}
                  </p>
                </div>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'var(--accent-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className="ti ti-shield-check"
                     style={{ fontSize: 20, color: 'var(--accent)' }} aria-hidden="true" />
                </div>
              </div>

              {/* Spent row */}
              <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', margin: '14px 0 6px' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  £{summary.total_spent.toLocaleString()} spent
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: overallStatus?.color }}>
                  {overallPct}%
                </span>
              </div>

              {/* Overall progress bar */}
              <div style={{
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 99, height: 8, overflow: 'hidden',
              }}>
                <div style={{
                  width: `${overallPct}%`, height: '100%',
                  background: overallStatus?.barColor,
                  borderRadius: 99, transition: 'width .6s ease',
                }} />
              </div>

              {/* Warning / over budget message */}
              {overallPct >= 80 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  marginTop: 10, fontSize: 12, color: overallStatus?.color,
                }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: 14 }} aria-hidden="true" />
                  {overallPct >= 100
                    ? 'You have exceeded your monthly budget.'
                    : 'Approaching your monthly limit.'}
                </div>
              )}

              {/* Mini stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 16 }}>
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
                  value={`${categories.filter(c => c.spent > c.limit).length}`}
                  color={categories.some(c => c.spent > c.limit) ? 'var(--red)' : 'var(--text-muted)'}
                />
              </div>
            </div>
          )}

          {/* ── Section header ─────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Categories
            </p>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {categories.length} active
            </span>
          </div>

          {/* ── Category list ───────────────────────────────────── */}
          {categories.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="ti ti-wallet-off"
                   style={{ fontSize: 24, color: 'var(--text-muted)' }} aria-hidden="true" />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                No budget categories yet
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 200, lineHeight: 1.5 }}>
                Add your first category to start tracking your spending.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {categories.map(cat => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  onEdit={() => setEditTarget(cat)}
                  onDelete={() => setConfirmId(cat.id)}
                />
              ))}
            </div>
          )}

          {/* ── Add category dashed button ──────────────────────── */}
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              width: '100%', background: 'transparent',
              border: '1.5px dashed var(--border)',
              borderRadius: 14, height: 52,
              color: 'var(--text-muted)', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', marginTop: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'border-color .2s, color .2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--accent)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <i className="ti ti-plus" style={{ fontSize: 16 }} aria-hidden="true" />
            Add budget category
          </button>
        </>
      )}

      {/* ── Modals ────────────────────────────────────────────── */}
      {showAddModal && (
        <BudgetModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchBudget(); showToast('Budget category added', 'success') }}
        />
      )}
      {editTarget && (
        <BudgetModal
          mode="edit"
          existing={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); fetchBudget(); showToast('Budget updated', 'success') }}
        />
      )}

      {/* ── Custom confirm dialog ─────────────────────────────── */}
      {confirmId && confirmItem && (
        <ConfirmDialog
          title="Remove budget category?"
          message={`"${confirmItem.category}" (£${confirmItem.limit.toLocaleString()} limit) will be permanently removed.`}
          onConfirm={() => confirmDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}

// ── Mini stat ──────────────────────────────────────────────────────
function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: 'var(--bg-card2)', borderRadius: 10,
      padding: '10px 12px', textAlign: 'center',
    }}>
      <p style={{ fontSize: 16, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
      <p style={{
        fontSize: 10, color: 'var(--text-muted)', marginTop: 4,
        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em',
      }}>{label}</p>
    </div>
  )
}

// ── Category card ──────────────────────────────────────────────────
function CategoryCard({ cat, onEdit, onDelete }: {
  cat: BudgetCategory; onEdit: () => void; onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const status = getStatus(cat.spent, cat.limit)
  const pct    = cat.limit > 0 ? Math.min(Math.round((cat.spent / cat.limit) * 100), 100) : 0
  const { icon, color } = getCat(cat.category)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 14, padding: 14,
        transition: 'border-color .2s',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* ✅ Vector icon badge */}
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: `${color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className={`ti ${icon}`} style={{ fontSize: 18, color }} aria-hidden="true" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {cat.category}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
              £{cat.spent.toLocaleString()} of £{cat.limit.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Right — actions always visible, styled subtly */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Status badge — hides on hover to make room */}
          {!hovered && (
            <span style={{
              padding: '3px 9px', borderRadius: 99,
              fontSize: 11, fontWeight: 600,
              background: status.bg, color: status.color,
            }}>
              {status.label}
            </span>
          )}
          {/* ✅ Action buttons — always rendered, opacity controlled */}
          <button
            onClick={onEdit}
            aria-label={`Edit ${cat.category} budget`}
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none',
              background: hovered ? 'var(--accent-light)' : 'transparent',
              color: hovered ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', transition: 'all .2s',
              opacity: hovered ? 1 : 0.4,
            }}
          >
            <i className="ti ti-edit" style={{ fontSize: 15 }} />
          </button>
          <button
            onClick={onDelete}
            aria-label={`Delete ${cat.category} budget`}
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none',
              background: hovered ? 'rgba(255,79,100,0.1)' : 'transparent',
              color: hovered ? 'var(--red)' : 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', transition: 'all .2s',
              opacity: hovered ? 1 : 0.4,
            }}
          >
            <i className="ti ti-trash" style={{ fontSize: 15 }} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 99, height: 6, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: status.barColor, borderRadius: 99,
          transition: 'width .5s ease',
        }} />
      </div>

      {/* Bottom label */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginTop: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {pct}% used
        </span>
        <span style={{ fontSize: 11, color: cat.spent > cat.limit ? 'var(--red)' : 'var(--text-muted)' }}>
          {cat.spent > cat.limit
            ? `£${(cat.spent - cat.limit).toFixed(0)} over`
            : `£${(cat.limit - cat.spent).toFixed(0)} remaining`}
        </span>
      </div>
    </div>
  )
}

// ── Budget modal (add / edit) ──────────────────────────────────────
function BudgetModal({ mode, existing, onClose, onSaved }: {
  mode: 'add' | 'edit'; existing?: BudgetCategory
  onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useToast()
  const [form, setForm]       = useState({
    category: existing?.category ?? 'Food',
    limit:    existing?.limit?.toString() ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]               = useState('')

  const update = (k: keyof typeof form, v: string) =>
    setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit() {
    if (!form.limit || isNaN(Number(form.limit))) return setErr('Enter a valid amount.')
    if (Number(form.limit) <= 0)                  return setErr('Limit must be greater than zero.')
    setErr(''); setSubmitting(true)
    try {
      const token  = await getAuthToken()
      const url    = mode === 'edit' && existing
        ? `${API_URL}/api/budgets/${existing.id}`
        : `${API_URL}/api/budgets`
      const method = mode === 'edit' ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
        category: form.category,
        limit:    parseFloat(form.limit),
        month:    new Date().getMonth() + 1,  // current month
        year:     new Date().getFullYear(),   // current year
      }),
      })
      if (!res.ok) throw new Error()
      onSaved()
    } catch {
      setErr('Could not save. Please try again.')
      showToast('Something went wrong. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

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
      }}>
        {/* Drag handle */}
        <div style={{
          width: 36, height: 4, background: 'rgba(255,255,255,0.15)',
          borderRadius: 99, margin: '0 auto 18px',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {mode === 'edit' ? 'Edit budget' : 'Add budget category'}
          </h2>
          <button onClick={onClose} aria-label="Close modal" style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        {/* Category */}
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="budget-category" style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
            letterSpacing: '.04em', display: 'block', marginBottom: 6,
            textTransform: 'uppercase',
          }}>Category</label>
          <select
            id="budget-category"
            value={form.category}
            onChange={e => update('category', e.target.value)}
            disabled={mode === 'edit'}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: mode === 'edit' ? 'var(--bg-card2)' : 'var(--bg-card)',
              border: '1px solid var(--border)', borderRadius: 12,
              padding: '12px 14px', fontSize: 14, height: 48,
              color: 'var(--text-primary)', outline: 'none', appearance: 'none',
              opacity: mode === 'edit' ? 0.6 : 1,
            }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {mode === 'edit' && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Category cannot be changed when editing.
            </p>
          )}
        </div>

        {/* Monthly limit */}
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="budget-limit" style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
            letterSpacing: '.04em', display: 'block', marginBottom: 6,
            textTransform: 'uppercase',
          }}>Monthly limit (£)</label>
          <input
            id="budget-limit"
            type="number"
            min="1"
            step="1"
            value={form.limit}
            onChange={e => update('limit', e.target.value)}
            placeholder="e.g. 300"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 14px', fontSize: 14, height: 48,
              color: 'var(--text-primary)', outline: 'none',
            }}
          />
        </div>

        {/* Error */}
        {err && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 14px', borderRadius: 10, marginBottom: 12,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <i className="ti ti-alert-circle"
               style={{ fontSize: 15, color: 'var(--red)', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: 'var(--red)' }}>{err}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%', height: 52, borderRadius: 14, border: 'none',
            background: submitting ? 'rgba(124,58,237,0.6)' : 'var(--accent)',
            color: '#ede0ff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: submitting ? 0.7 : 1, transition: 'background .2s',
          }}
        >
          {submitting ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Saving...
            </>
          ) : mode === 'edit' ? 'Update budget' : 'Add category'}
        </button>
      </div>
    </div>
  )
}