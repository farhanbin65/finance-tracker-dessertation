import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

// ── Types ──────────────────────────────────────────────
interface Transaction {
  _id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
}

interface GroupedTransactions {
  [dateLabel: string]: Transaction[]
}

// ── Category icon + colour map ─────────────────────────
const CATEGORY_STYLE: Record<string, { icon: string; bg: string }> = {
  income:        { icon: '💵', bg: 'rgba(34,200,122,0.12)'  },
  food:          { icon: '🛒', bg: 'rgba(255,159,67,0.12)'  },
  transport:     { icon: '🚗', bg: 'rgba(124,92,252,0.12)'  },
  subscriptions: { icon: '📺', bg: 'rgba(255,79,100,0.12)'  },
  shopping:      { icon: '📦', bg: 'rgba(255,159,67,0.12)'  },
  entertainment: { icon: '🎭', bg: 'rgba(99,179,237,0.12)'  },
  health:        { icon: '💊', bg: 'rgba(72,199,142,0.12)'  },
  default:       { icon: '💳', bg: 'rgba(139,144,164,0.12)' },
}

const getCatStyle = (cat: string) =>
  CATEGORY_STYLE[cat.toLowerCase()] ?? CATEGORY_STYLE.default

// ── Date grouping helper ───────────────────────────────
function groupByDate(transactions: Transaction[]): GroupedTransactions {
  const today     = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)

  return transactions.reduce((groups, tx) => {
    const txDate = new Date(tx.date); txDate.setHours(0,0,0,0)
    let label: string

    if (txDate.getTime() === today.getTime())          label = 'TODAY'
    else if (txDate.getTime() === yesterday.getTime()) label = 'YESTERDAY'
    else label = txDate.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).toUpperCase()

    return { ...groups, [label]: [...(groups[label] || []), tx] }
  }, {} as GroupedTransactions)
}

// ── Filter tabs ────────────────────────────────────────
const FILTERS = ['All', 'Income', 'Expenses', 'This Week', 'This Month'] as const
type Filter = typeof FILTERS[number]

function applyFilter(txs: Transaction[], filter: Filter): Transaction[] {
  const now = new Date()
  if (filter === 'Income')   return txs.filter(t => t.type === 'income')
  if (filter === 'Expenses') return txs.filter(t => t.type === 'expense')
  if (filter === 'This Week') {
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
    return txs.filter(t => new Date(t.date) >= weekAgo)
  }
  if (filter === 'This Month') {
    return txs.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
  }
  return txs
}

// ── Seed / demo data (used when API is empty) ──────────
const DEMO_TRANSACTIONS: Transaction[] = [
  { _id:'1', description:'Salary',       amount:2800, type:'income',  category:'Income',        date: new Date().toISOString() },
  { _id:'2', description:'Tesco',        amount:45.2, type:'expense', category:'Food',           date: new Date().toISOString() },
  { _id:'3', description:'Uber',         amount:12.5, type:'expense', category:'Transport',      date: new Date(Date.now()-86400000).toISOString() },
  { _id:'4', description:'Netflix',      amount:15.99,type:'expense', category:'Subscriptions',  date: new Date(Date.now()-86400000).toISOString() },
  { _id:'5', description:'Amazon',       amount:89,   type:'expense', category:'Shopping',       date: new Date(Date.now()-864000000).toISOString() },
  { _id:'6', description:'Costa Coffee', amount:6.4,  type:'expense', category:'Food',           date: new Date(Date.now()-864000000).toISOString() },
]

// ══════════════════════════════════════════════════════
export default function TransactionsPage() {
  const { getAccessTokenSilently } = useAuth0()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [filter, setFilter]             = useState<Filter>('All')
  const [search, setSearch]             = useState('')
  const [showSearch, setShowSearch]     = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // ── Fetch transactions from Flask API ───────────────
  useEffect(() => {
    fetchTransactions()
  }, [])

  async function fetchTransactions() {
    try {
      setLoading(true)
      setError(null)

      // Try JWT from localStorage first (your custom auth)
      // then fall back to Auth0 token
      let token = localStorage.getItem('fs_token')
      if (!token) {
        token = await getAccessTokenSilently()
      }

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/transactions`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()

      // Use demo data if API returns empty
      setTransactions(data.transactions?.length ? data.transactions : DEMO_TRANSACTIONS)
    } catch (err) {
      console.error('Transactions fetch failed:', err)
      // Graceful fallback — show demo data so UI always works
      setTransactions(DEMO_TRANSACTIONS)
      setError('Using demo data — connect your backend to see real transactions.')
    } finally {
      setLoading(false)
    }
  }

  // ── Delete transaction ───────────────────────────────
  async function deleteTransaction(id: string) {
    if (!confirm('Delete this transaction?')) return
    try {
      let token = localStorage.getItem('fs_token') || await getAccessTokenSilently()
      await fetch(`${import.meta.env.VITE_API_URL}/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setTransactions(prev => prev.filter(t => t._id !== id))
    } catch {
      alert('Failed to delete. Please try again.')
    }
  }

  // ── Derived data ─────────────────────────────────────
  const searched = search.trim()
    ? transactions.filter(t =>
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
      )
    : transactions

  const filtered = applyFilter(searched, filter)
  const grouped  = groupByDate(filtered)

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0)

  // ── Render ───────────────────────────────────────────
  return (
    <div style={{ paddingBottom: 8 }}>

      {/* ── Summary cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
        <SummaryCard label="Income" value={totalIncome}  color="var(--green)" icon="ti-trending-up" />
        <SummaryCard label="Spent"  value={totalExpense} color="var(--red)"   icon="ti-trending-down" />
      </div>

      {/* ── Search bar (slides in) ── */}
      {showSearch && (
        <div style={{ marginBottom:12, position:'relative' }}>
          <i className="ti ti-search" style={{
            position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
            color:'var(--text-muted)', fontSize:16,
          }} />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions..."
            style={{
              width:'100%', background:'var(--bg-card)',
              border:'1px solid var(--border)', borderRadius:14,
              padding:'12px 16px 12px 42px', fontSize:14,
              color:'var(--text-primary)', fontFamily:'var(--font-body)', outline:'none',
            }}
          />
          {search && (
            <i className="ti ti-x" onClick={() => setSearch('')} style={{
              position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
              color:'var(--text-muted)', fontSize:16, cursor:'pointer',
            }} />
          )}
        </div>
      )}

      {/* ── Filter pills ── */}
      <div style={{
        display:'flex', gap:8, overflowX:'auto', paddingBottom:4,
        scrollbarWidth:'none', marginBottom:16,
      }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'8px 16px', borderRadius:99,
            fontSize:13, fontWeight:500, fontFamily:'var(--font-main)',
            whiteSpace:'nowrap', cursor:'pointer', border:'1px solid',
            borderColor: filter===f ? 'var(--accent)' : 'var(--border)',
            background:  filter===f ? 'var(--accent)' : 'var(--bg-card)',
            color:       filter===f ? '#fff'           : 'var(--text-secondary)',
            transition:  'all .2s',
          }}>
            {f}
          </button>
        ))}
      </div>

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

      {/* ── Loading skeleton ── */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{
              height:72, borderRadius:14,
              background:'var(--bg-card)',
              border:'1px solid var(--border)',
              animation:'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        </div>
      ) : filtered.length === 0 ? (

        /* ── Empty state ── */
        <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--text-muted)' }}>
          <i className="ti ti-receipt-off" style={{ fontSize:48, display:'block', marginBottom:12 }} />
          <p style={{ fontFamily:'var(--font-main)', fontSize:15, fontWeight:600, marginBottom:6 }}>
            No transactions found
          </p>
          <p style={{ fontSize:13 }}>Try a different filter or add your first transaction.</p>
        </div>

      ) : (
        /* ── Grouped transaction list ── */
        Object.entries(grouped).map(([dateLabel, txs]) => (
          <div key={dateLabel}>
            <p style={{
              fontSize:11, fontWeight:700, letterSpacing:'.1em',
              textTransform:'uppercase', color:'var(--text-muted)',
              fontFamily:'var(--font-main)', margin:'16px 0 8px',
            }}>
              {dateLabel}
            </p>
            {txs.map(tx => (
              <TransactionItem
                key={tx._id}
                tx={tx}
                onDelete={deleteTransaction}
              />
            ))}
          </div>
        ))
      )}

      {/* ── FAB — Add transaction ── */}
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

      {/* ── Add Modal ── */}
      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); fetchTransactions() }}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════

function SummaryCard({ label, value, color, icon }: {
  label: string; value: number; color: string; icon: string
}) {
  return (
    <div style={{
      background:'var(--bg-card)', border:'1px solid var(--border)',
      borderRadius:14, padding:'14px 16px',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
        <i className={`ti ${icon}`} style={{ fontSize:14, color }} />
        <span style={{ fontSize:11, color:'var(--text-muted)',
          fontFamily:'var(--font-main)', fontWeight:600, letterSpacing:'.04em' }}>
          {label.toUpperCase()}
        </span>
      </div>
      <p style={{ fontFamily:'var(--font-main)', fontSize:20, fontWeight:700, color }}>
        £{value.toLocaleString('en-GB', { minimumFractionDigits:2, maximumFractionDigits:2 })}
      </p>
    </div>
  )
}

// ── Single transaction row ─────────────────────────────
function TransactionItem({ tx, onDelete }: {
  tx: Transaction
  onDelete: (id: string) => void
}) {
  const [pressed, setPressed] = useState(false)
  const { icon, bg } = getCatStyle(tx.category)
  const isIncome = tx.type === 'income'

  return (
    <div
      onMouseEnter={() => setPressed(true)}
      onMouseLeave={() => setPressed(false)}
      style={{
        display:'flex', alignItems:'center', gap:14,
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:14, padding:'14px', marginBottom:8, cursor:'pointer',
        transform: pressed ? 'translateX(3px)' : 'translateX(0)',
        transition:'all .2s',
        borderColor: pressed ? 'var(--accent)' : 'var(--border)',
      }}
    >
      {/* Icon */}
      <div style={{
        width:44, height:44, borderRadius:14,
        background:bg, display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:20, flexShrink:0,
      }}>
        {icon}
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:15, fontWeight:600, fontFamily:'var(--font-main)',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {tx.description}
        </p>
        <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
          {tx.category}
        </p>
      </div>

      {/* Amount + time */}
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <p style={{
          fontSize:15, fontWeight:700, fontFamily:'var(--font-main)',
          color: isIncome ? 'var(--green)' : 'var(--red)',
        }}>
          {isIncome ? '+' : '-'}£{tx.amount.toFixed(2)}
        </p>
        <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
          {new Date(tx.date).toLocaleTimeString('en-GB', {
            hour:'2-digit', minute:'2-digit'
          })}
        </p>
      </div>

      {/* Delete on hover */}
      {pressed && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(tx._id) }}
          style={{
            background:'rgba(255,79,100,0.1)', border:'none',
            borderRadius:10, padding:'6px 8px', cursor:'pointer',
            color:'var(--red)', fontSize:16, flexShrink:0,
          }}
        >
          <i className="ti ti-trash" />
        </button>
      )}
    </div>
  )
}

// ── Add Transaction Modal ──────────────────────────────
const CATEGORIES = ['Food','Transport','Shopping','Entertainment','Subscriptions','Health','Income','Other']

function AddTransactionModal({ onClose, onAdded }: {
  onClose: () => void
  onAdded: () => void
}) {
  const { getAccessTokenSilently } = useAuth0()

  const [form, setForm] = useState({
    description: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  const update = (k: keyof typeof form, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }))

  async function handleSubmit() {
    if (!form.description.trim()) return setErr('Description is required')
    if (!form.amount || isNaN(Number(form.amount))) return setErr('Enter a valid amount')
    setErr('')
    setSubmitting(true)

    try {
      let token = localStorage.getItem('fs_token') || await getAccessTokenSilently()
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      onAdded()
    } catch {
      setErr('Could not save transaction. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
        zIndex:200, display:'flex', alignItems:'flex-end',
      }}
    >
      {/* Sheet */}
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
            Add Transaction
          </h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            color:'var(--text-muted)', fontSize:20 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Type toggle */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
          {(['expense','income'] as const).map(t => (
            <button key={t} onClick={() => update('type', t)} style={{
              padding:'10px', borderRadius:12,
              border:`1.5px solid ${form.type===t ? 'var(--accent)' : 'var(--border)'}`,
              background: form.type===t ? 'var(--accent-light)' : 'var(--bg-card)',
              color: form.type===t ? 'var(--accent)' : 'var(--text-secondary)',
              fontFamily:'var(--font-main)', fontSize:13, fontWeight:600, cursor:'pointer',
              textTransform:'capitalize',
            }}>
              {t === 'expense' ? '📤 Expense' : '📥 Income'}
            </button>
          ))}
        </div>

        {/* Description */}
        <ModalInput
          label="Description"
          placeholder="e.g. Tesco, Salary..."
          value={form.description}
          onChange={v => update('description', v)}
        />

        {/* Amount */}
        <ModalInput
          label="Amount (£)"
          placeholder="0.00"
          value={form.amount}
          onChange={v => update('amount', v)}
          type="number"
        />

        {/* Category */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)',
            fontFamily:'var(--font-main)', letterSpacing:'.04em',
            display:'block', marginBottom:8 }}>
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

        {/* Date */}
        <ModalInput
          label="Date"
          placeholder=""
          value={form.date}
          onChange={v => update('date', v)}
          type="date"
        />

        {/* Error */}
        {err && (
          <p style={{ fontSize:13, color:'var(--red)', marginBottom:12, textAlign:'center' }}>
            {err}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-accent"
          style={{ opacity: submitting ? .6 : 1, marginTop:4 }}
        >
          {submitting ? 'Saving...' : 'Add Transaction'}
        </button>
      </div>
    </div>
  )
}

function ModalInput({ label, placeholder, value, onChange, type='text' }: {
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