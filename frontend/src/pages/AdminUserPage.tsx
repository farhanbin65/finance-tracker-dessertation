/**
 * FinSight — AdminUserPage.tsx
 * Full user detail for admin: stats, donut chart, bar chart,
 * transactions, budgets, goals, ban/delete actions.
 * Matches the Angular admin user detail pattern.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAuthToken } from '../utils/getAuthToken'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'

const API_URL = import.meta.env.VITE_API_URL || ''

const CAT_COLORS: Record<string, string> = {
  Rent: '#7c5cfc', Food: '#ff9f43', Shopping: '#0ea5e9',
  Transport: '#22c87a', Subscriptions: '#ff4f64',
  Entertainment: '#f0b429', Utilities: '#a78bfa',
  Health: '#34d399', Salary: '#22c87a', Other: '#8b90a4',
}
const CHART_COLORS = ['#7c5cfc','#ff9f43','#0ea5e9','#22c87a','#ff4f64','#f0b429','#a78bfa','#34d399']

interface UserDetail {
  id: string; full_name: string; email: string
  role: string; currency: string; created_at: string; is_banned?: boolean
}
interface Transaction {
  id: string; title: string; amount: number
  type: 'income' | 'expense'; category: string; date: string
}
interface Budget {
  id: string; category: string; limit: number; spent: number
  remaining: number; percentage_used: number
  status: 'on_track' | 'warning' | 'over_budget'; month: number; year: number
}
interface Goal {
  id: string; name: string; target_amount: number
  saved_amount: number; percentage: number; is_completed: boolean
}

// ── Type-to-confirm modal ──────────────────────────────────────────
function ConfirmTypeModal({ title, message, confirmWord, danger, onClose, onConfirm }: {
  title: string; message: string; confirmWord: string
  danger?: boolean; onClose: () => void; onConfirm: () => void
}) {
  const [input, setInput] = useState('')
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 200, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-secondary)', borderRadius: 20,
        padding: 24, width: '100%', maxWidth: 360,
        border: '1px solid var(--border)',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: danger ? 'rgba(255,79,100,0.1)' : 'rgba(255,159,67,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <i className={`ti ${danger ? 'ti-user-x' : 'ti-user-off'}`}
             style={{ fontSize: 22, color: danger ? 'var(--red)' : 'var(--orange)' }} aria-hidden="true" />
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textAlign: 'center' }}>
          {title}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6, textAlign: 'center' }}>
          {message}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          Type <strong style={{ color: 'var(--text-primary)' }}>{confirmWord}</strong> to confirm:
        </p>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={confirmWord}
          autoFocus
          style={{
            width: '100%', height: 44, padding: '0 12px',
            background: 'var(--bg-card)', border: '1.5px solid var(--border)',
            borderRadius: 10, color: 'var(--text-primary)',
            fontSize: 14, outline: 'none', boxSizing: 'border-box',
            marginBottom: 16,
          }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={onClose} style={{
            height: 44, borderRadius: 12,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={input !== confirmWord}
            style={{
              height: 44, borderRadius: 12, border: 'none',
              background: input === confirmWord
                ? (danger ? 'var(--red)' : 'var(--orange)')
                : 'var(--bg-card2)',
              color: input === confirmWord ? '#fff' : 'var(--text-muted)',
              fontSize: 14, fontWeight: 600,
              cursor: input === confirmWord ? 'pointer' : 'not-allowed',
              transition: 'all .15s',
            }}
          >Confirm</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminUserPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate   = useNavigate()

  const [user, setUser]               = useState<UserDetail | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets]         = useState<Budget[]>([])
  const [goals, setGoals]             = useState<Goal[]>([])
  const [loading, setLoading]         = useState(true)

  const [modal, setModal] = useState<'ban' | 'delete' | null>(null)
  const [actioning, setActioning] = useState(false)

  const [txSearch, setTxSearch]   = useState('')
  const [txFilter, setTxFilter]   = useState<'all' | 'income' | 'expense'>('all')
  const [txPage, setTxPage]       = useState(1)
  const TX_PER_PAGE = 10

  // Guard
  useEffect(() => {
    const token = localStorage.getItem('fs_token')
    if (!token) { navigate('/login'); return }
    try {
      const p = JSON.parse(atob(token.split('.')[1]))
      if (p.role !== 'admin') { navigate('/dashboard'); return }
    } catch { navigate('/dashboard'); return }
    fetchUser()
  }, [userId])

  async function fetchUser() {
    try {
      setLoading(true)
      const token = await getAuthToken()
      const res   = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { navigate('/admin'); return }
      const data = await res.json()
      setUser(data.user)
      setTransactions(data.transactions || [])
      setBudgets(data.budgets || [])
      setGoals(data.goals || [])
    } catch { navigate('/admin') }
    finally { setLoading(false) }
  }

  async function handleBan() {
    if (!user) return
    try {
      setActioning(true)
      const token = await getAuthToken()
      const res   = await fetch(`${API_URL}/api/admin/users/${user.id}/ban`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) setUser(prev => prev ? { ...prev, is_banned: data.is_banned } : prev)
    } finally { setActioning(false); setModal(null) }
  }

  async function handleDelete() {
    if (!user) return
    try {
      setActioning(true)
      const token = await getAuthToken()
      await fetch(`${API_URL}/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      navigate('/admin')
    } finally { setActioning(false); setModal(null) }
  }

  // ── Derived stats ──────────────────────────────────────────────
  const totalIncome   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance       = totalIncome - totalExpenses
  const avgExpense    = transactions.filter(t => t.type === 'expense').length > 0
    ? totalExpenses / transactions.filter(t => t.type === 'expense').length : 0

  const biggest = transactions
    .filter(t => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)[0]

  // Donut chart data — spending by category
  const catMap: Record<string, number> = {}
  transactions.filter(t => t.type === 'expense').forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount
  })
  const donutData = Object.entries(catMap)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value)

  // Bar chart data — monthly income vs expenses
  const monthMap: Record<string, { month: string; income: number; expenses: number }> = {}
  transactions.forEach(t => {
    const d     = new Date(t.date)
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    if (!monthMap[key]) monthMap[key] = { month: label, income: 0, expenses: 0 }
    if (t.type === 'income')  monthMap[key].income   += t.amount
    else                       monthMap[key].expenses += t.amount
  })
  const barData = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({
      month:    v.month,
      income:   parseFloat(v.income.toFixed(2)),
      expenses: parseFloat(v.expenses.toFixed(2)),
    }))

  // Filtered + paginated transactions
  const filteredTx = transactions
    .filter(t => {
      const matchSearch = t.title.toLowerCase().includes(txSearch.toLowerCase()) ||
                          t.category.toLowerCase().includes(txSearch.toLowerCase())
      const matchFilter = txFilter === 'all' || t.type === txFilter
      return matchSearch && matchFilter
    })
  const totalPages  = Math.ceil(filteredTx.length / TX_PER_PAGE)
  const pagedTx     = filteredTx.slice((txPage - 1) * TX_PER_PAGE, txPage * TX_PER_PAGE)

  if (loading) return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      {[80, 120, 300, 300, 300].map((h, i) => (
        <div key={i} style={{
          height: h, borderRadius: 14, background: 'var(--bg-card)',
          border: '1px solid var(--border)', overflow: 'hidden', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)',
            animation: 'shimmer 1.6s infinite',
          }} />
        </div>
      ))}
    </div>
  )

  if (!user) return null

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 40 }}>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>

      {/* ── Back + header ───────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => navigate('/admin')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, padding: 0,
        }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 15 }} aria-hidden="true" />
          Back to admin
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: user.is_banned ? 'rgba(255,79,100,0.12)' : 'var(--accent-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700,
              color: user.is_banned ? 'var(--red)' : 'var(--accent)',
            }}>
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {user.full_name}
                </h1>
                {user.is_banned && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: 'rgba(255,159,67,0.15)', color: 'var(--orange)',
                  }}>BANNED</span>
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {user.email} · Joined {user.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {user.role !== 'admin' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal('ban')} style={{
                height: 38, padding: '0 16px', borderRadius: 10,
                background: 'rgba(255,159,67,0.1)', border: '1px solid var(--orange)',
                color: 'var(--orange)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <i className="ti ti-user-off" style={{ fontSize: 15 }} aria-hidden="true" />
                {user.is_banned ? 'Unban' : 'Ban'}
              </button>
              <button onClick={() => setModal('delete')} style={{
                height: 38, padding: '0 16px', borderRadius: 10,
                background: 'rgba(255,79,100,0.1)', border: '1px solid var(--red)',
                color: 'var(--red)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <i className="ti ti-trash" style={{ fontSize: 15 }} aria-hidden="true" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary pills ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: `${transactions.length} Transactions`, icon: 'ti-arrows-exchange' },
          { label: `${budgets.length} Budgets`,           icon: 'ti-wallet'          },
          { label: `${goals.length} Goals`,               icon: 'ti-target'          },
        ].map(({ label, icon }) => (
          <div key={label} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 99,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            fontSize: 12, color: 'var(--text-secondary)',
          }}>
            <i className={`ti ${icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
            {label}
          </div>
        ))}
      </div>

      {/* ── Stats cards ───────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12, marginBottom: 20,
      }}>
        {[
          { label: 'Total income',   value: `£${totalIncome.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,   color: 'var(--green)',  icon: 'ti-trending-up'   },
          { label: 'Total spent',    value: `£${totalExpenses.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,  color: 'var(--red)',    icon: 'ti-trending-down' },
          { label: 'Balance',        value: `£${balance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,        color: balance >= 0 ? 'var(--green)' : 'var(--red)', icon: 'ti-scale' },
          { label: 'Avg expense',    value: `£${avgExpense.toFixed(2)}`,                                                 color: 'var(--orange)', icon: 'ti-calculator'   },
          { label: 'Top category',   value: donutData[0]?.name || '—',                                                   color: 'var(--accent)', icon: 'ti-chart-pie'    },
          { label: 'Biggest spend',  value: biggest ? `£${biggest.amount.toFixed(2)}` : '—',                            color: '#a78bfa',       icon: 'ti-flame'        },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: 13, color: s.color }} aria-hidden="true" />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
                letterSpacing: '.05em', textTransform: 'uppercase' }}>{s.label}</span>
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Biggest expense banner ─────────────────────────────── */}
      {biggest && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '10px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <i className="ti ti-flame" style={{ fontSize: 16, color: 'var(--orange)', flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Biggest single expense:</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>
            £{biggest.amount.toFixed(2)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>— {biggest.title}</span>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 99,
            background: 'var(--bg-card2)', color: 'var(--text-muted)',
          }}>{biggest.category}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {new Date(biggest.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      )}

      {/* ── Charts ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Donut — spending by category */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 18, padding: 18,
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
            Spending by category
          </p>
          {donutData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No expense data</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%"
                       innerRadius={50} outerRadius={80}
                       dataKey="value" paddingAngle={2}>
                    {donutData.map((entry, i) => (
                      <Cell key={i}
                            fill={CAT_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`£${v.toFixed(2)}`, '']}
                    contentStyle={{
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 8, fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {donutData.slice(0, 5).map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: CAT_COLORS[d.name] || CHART_COLORS[i % CHART_COLORS.length],
                    }} />
                    <span style={{ fontSize: 12, flex: 1, color: 'var(--text-secondary)' }}>{d.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                      £{d.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bar — monthly income vs expenses */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 18, padding: 18,
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
            Monthly income vs expenses
          </p>
          {barData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                       tickFormatter={v => `£${v}`} />
                <Tooltip
                  formatter={(v: number) => [`£${v.toFixed(2)}`, '']}
                  contentStyle={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 8, fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income"   fill="#22c87a" radius={[4,4,0,0]} name="Income"   />
                <Bar dataKey="expenses" fill="#ff4f64" radius={[4,4,0,0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Transactions ──────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 18, marginBottom: 16, overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Transactions
          </p>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {filteredTx.length} records
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Type filter */}
            <div style={{ display: 'flex', gap: 4 }}>
              {(['all', 'income', 'expense'] as const).map(f => (
                <button key={f} onClick={() => { setTxFilter(f); setTxPage(1) }} style={{
                  padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500,
                  border: txFilter === f ? 'none' : '1px solid var(--border)',
                  background: txFilter === f ? 'var(--accent)' : 'transparent',
                  color: txFilter === f ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
              ))}
            </div>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <i className="ti ti-search" style={{
                position: 'absolute', left: 8, top: '50%',
                transform: 'translateY(-50%)', fontSize: 12,
                color: 'var(--text-muted)', pointerEvents: 'none',
              }} aria-hidden="true" />
              <input
                type="text" placeholder="Search..." value={txSearch}
                onChange={e => { setTxSearch(e.target.value); setTxPage(1) }}
                style={{
                  height: 32, paddingLeft: 26, paddingRight: 10,
                  background: 'var(--bg-card2)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text-primary)',
                  fontSize: 12, outline: 'none', width: 160,
                }}
              />
            </div>
          </div>
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: 12, padding: '8px 18px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card2)',
        }}>
          {['Title', 'Category', 'Amount', 'Date'].map(h => (
            <span key={h} style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
              letterSpacing: '.05em', textTransform: 'uppercase',
            }}>{h}</span>
          ))}
        </div>

        {pagedTx.length === 0 ? (
          <div style={{ padding: '32px 18px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No transactions found</p>
          </div>
        ) : (
          pagedTx.map((tx, idx) => (
            <div key={tx.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
              gap: 12, padding: '10px 18px', alignItems: 'center',
              borderBottom: idx < pagedTx.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {tx.title}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx.category}</span>
              <span style={{ fontSize: 13, fontWeight: 700,
                color: tx.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                {tx.type === 'income' ? '+' : '-'}£{tx.amount.toFixed(2)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, padding: '12px 18px', borderTop: '1px solid var(--border)',
          }}>
            <button onClick={() => setTxPage(p => Math.max(1, p - 1))} disabled={txPage === 1}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-secondary)',
                cursor: txPage === 1 ? 'not-allowed' : 'pointer', opacity: txPage === 1 ? 0.4 : 1,
              }}>
              <i className="ti ti-chevron-left" style={{ fontSize: 14 }} aria-hidden="true" />
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Page {txPage} of {totalPages}
            </span>
            <button onClick={() => setTxPage(p => Math.min(totalPages, p + 1))} disabled={txPage === totalPages}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-secondary)',
                cursor: txPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: txPage === totalPages ? 0.4 : 1,
              }}>
              <i className="ti ti-chevron-right" style={{ fontSize: 14 }} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* ── Budgets ────────────────────────────────────────────── */}
      {budgets.length > 0 && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 18, padding: 18, marginBottom: 16,
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
            Budgets
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 12 }}>
            {budgets.map(b => {
              const pct   = Math.min(b.percentage_used, 100)
              const color = b.status === 'on_track' ? 'var(--green)'
                : b.status === 'warning' ? 'var(--orange)' : 'var(--red)'
              return (
                <div key={b.id} style={{
                  background: 'var(--bg-card2)', borderRadius: 12, padding: 14,
                  border: `1px solid ${b.status === 'over_budget' ? 'var(--red)' : 'var(--border)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {b.category}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px',
                      borderRadius: 99,
                      background: b.status === 'on_track' ? 'rgba(34,200,122,0.12)'
                        : b.status === 'warning' ? 'rgba(255,159,67,0.12)' : 'rgba(255,79,100,0.12)',
                      color,
                    }}>{Math.round(pct)}%</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 5, marginBottom: 8 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .5s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Spent: <strong style={{ color: 'var(--red)' }}>£{b.spent.toFixed(2)}</strong>
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Limit: <strong>£{b.limit.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Goals ──────────────────────────────────────────────── */}
      {goals.length > 0 && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 18, padding: 18,
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
            Savings goals
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {goals.map(g => {
              const pct = Math.min(g.percentage || 0, 100)
              return (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'var(--bg-card2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className="ti ti-target" style={{ fontSize: 16, color: 'var(--accent)' }} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{Math.round(pct)}%</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 5 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      £{g.saved_amount.toLocaleString()} / £{g.target_amount.toLocaleString()}
                      {g.is_completed && ' · Completed'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────── */}
      {modal === 'ban' && (
        <ConfirmTypeModal
          title={user.is_banned ? 'Unban this user?' : 'Ban this user?'}
          message={user.is_banned
            ? `${user.full_name} will be able to login again.`
            : `${user.full_name} will no longer be able to login. Their data is preserved.`}
          confirmWord={user.is_banned ? 'UNBAN' : 'BAN'}
          onClose={() => setModal(null)}
          onConfirm={handleBan}
        />
      )}
      {modal === 'delete' && (
        <ConfirmTypeModal
          title="Delete this user?"
          message={`This will permanently delete ${user.full_name} and all their transactions, budgets and goals. This cannot be undone.`}
          confirmWord="DELETE"
          danger
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}