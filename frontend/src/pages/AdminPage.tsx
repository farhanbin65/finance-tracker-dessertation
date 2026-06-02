/**
 * FinSight — AdminPage.tsx
 * Full admin dashboard — users, transactions, platform stats.
 * Only accessible to users with role='admin' in their JWT.
 * Dissertation value: demonstrates RBAC, audit visibility, platform governance.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthToken } from '../utils/getAuthToken'

const API_URL = import.meta.env.VITE_API_URL || ''

// ── Types ──────────────────────────────────────────────────────────
interface PlatformStats {
  total_users: number
  total_transactions: number
  total_budgets: number
  total_goals: number
  new_users_30d: number
  total_income: number
  total_expenses: number
}

interface AdminUser {
  id: string
  full_name: string
  email: string
  role: string
  currency: string
  created_at: string
  tx_count: number
  budget_count: number
  goal_count: number
}

interface AdminTransaction {
  id: string
  user_email: string
  title: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
}

// ── Shimmer ────────────────────────────────────────────────────────
function Shimmer({ height = 60, radius = 12 }: { height?: number; radius?: number }) {
  return (
    <div style={{
      height, borderRadius: radius,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      overflow: 'hidden', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.04) 50%,transparent 100%)',
        animation: 'shimmer 1.6s infinite',
      }} />
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }: {
  label: string; value: string | number; icon: string; color: string; sub?: string
}) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 15, color }} aria-hidden="true" />
        <span style={{
          fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
          letterSpacing: '.05em', textTransform: 'uppercase',
        }}>{label}</span>
      </div>
      <p style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

// ── Delete confirm modal ───────────────────────────────────────────
function DeleteModal({ user, onClose, onConfirm }: {
  user: AdminUser; onClose: () => void; onConfirm: () => void
}) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 200, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-secondary)', borderRadius: 20,
        padding: 24, width: '100%', maxWidth: 340,
        border: '1px solid var(--border)', textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'rgba(255,79,100,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <i className="ti ti-user-x" style={{ color: 'var(--red)', fontSize: 24 }} aria-hidden="true" />
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Delete user?
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-primary)' }}>{user.full_name}</strong>
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
          This will permanently delete this account and all their transactions, budgets and goals. This cannot be undone.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={onClose} style={{
            height: 44, borderRadius: 12,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
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

// ── Main AdminPage ─────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate()

  const [stats, setStats]               = useState<PlatformStats | null>(null)
  const [users, setUsers]               = useState<AdminUser[]>([])
  const [transactions, setTransactions] = useState<AdminTransaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [activeTab, setActiveTab]       = useState<'overview' | 'users' | 'transactions'>('overview')
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [search, setSearch]             = useState('')

  // ── Check admin role on mount ──────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('fs_token')
    if (!token) { navigate('/login'); return }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.role !== 'admin') {
        navigate('/dashboard')
        return
      }
    } catch {
      navigate('/dashboard')
      return
    }
    fetchAll()
  }, [])

  async function fetchAll() {
    try {
      setLoading(true)
      const token = await getAuthToken()
      const h = { Authorization: `Bearer ${token}` }

      const [statsRes, usersRes, txRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`,        { headers: h }),
        fetch(`${API_URL}/api/admin/users`,        { headers: h }),
        fetch(`${API_URL}/api/admin/transactions`, { headers: h }),
      ])

      const [statsData, usersData, txData] = await Promise.all([
        statsRes.json(), usersRes.json(), txRes.json(),
      ])

      setStats(statsData)
      setUsers(usersData.users || [])
      setTransactions(txData.transactions || [])
    } catch (e) {
      console.error('Admin fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      const token = await getAuthToken()
      const res = await fetch(`${API_URL}/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
        setDeleteTarget(null)
      }
    } catch (e) {
      console.error('Delete error:', e)
    } finally {
      setDeleting(false)
    }
  }

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const filteredTx = transactions.filter(tx =>
    tx.title.toLowerCase().includes(search.toLowerCase()) ||
    tx.user_email.toLowerCase().includes(search.toLowerCase()) ||
    tx.category.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1200, margin: '0 auto' }}>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <Shimmer height={40} radius={8} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[1,2,3,4].map(i => <Shimmer key={i} height={90} />)}
      </div>
      <Shimmer height={400} />
    </div>
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,79,100,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-shield-lock" style={{ fontSize: 18, color: 'var(--red)' }} aria-hidden="true" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              Admin Panel
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              FinSight platform management
            </p>
          </div>
          <span style={{
            marginLeft: 'auto', fontSize: 10, fontWeight: 700,
            padding: '4px 10px', borderRadius: 99,
            background: 'rgba(255,79,100,0.12)', color: 'var(--red)',
            letterSpacing: '.05em', textTransform: 'uppercase',
          }}>Admin Access</span>
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────── */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12, marginBottom: 24,
        }}>
          <StatCard label="Total users"   value={stats.total_users}        icon="ti-users"        color="var(--accent)"  sub={`+${stats.new_users_30d} this month`} />
          <StatCard label="Transactions"  value={stats.total_transactions} icon="ti-arrows-exchange" color="var(--green)"  />
          <StatCard label="Budgets"       value={stats.total_budgets}      icon="ti-wallet"       color="var(--orange)" />
          <StatCard label="Goals"         value={stats.total_goals}        icon="ti-target"       color="#a78bfa"       />
          <StatCard label="Total income"  value={`£${(stats.total_income  || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`} icon="ti-trending-up"   color="var(--green)" />
          <StatCard label="Total spent"   value={`£${(stats.total_expenses|| 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`} icon="ti-trending-down" color="var(--red)"   />
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          { id: 'overview',     label: 'Overview',     icon: 'ti-layout-dashboard' },
          { id: 'users',        label: `Users (${users.length})`, icon: 'ti-users' },
          { id: 'transactions', label: `Transactions (${transactions.length})`, icon: 'ti-arrows-exchange' },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 99,
            border: activeTab === tab.id ? 'none' : '1px solid var(--border)',
            background: activeTab === tab.id ? 'var(--accent)' : 'var(--bg-card)',
            color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            transition: 'all .15s',
          }}>
            <i className={`ti ${tab.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
            {tab.label}
          </button>
        ))}

        {/* Search */}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <i className="ti ti-search" style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 14, color: 'var(--text-muted)', pointerEvents: 'none',
          }} aria-hidden="true" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              height: 36, paddingLeft: 32, paddingRight: 12,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 99, color: 'var(--text-primary)',
              fontSize: 13, outline: 'none', width: 200,
            }}
          />
        </div>
      </div>

      {/* ── Overview tab ─────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Recent users */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 18,
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
              Recent users
            </p>
            {users.slice(0, 5).map(u => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: 'var(--accent-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: 'var(--accent)',
                }}>
                  {u.full_name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.full_name}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</p>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.tx_count} txns</span>
              </div>
            ))}
          </div>

          {/* Recent transactions */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 18,
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
              Recent transactions
            </p>
            {transactions.slice(0, 5).map(tx => (
              <div key={tx.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: tx.type === 'income' ? 'rgba(34,200,122,0.12)' : 'rgba(255,79,100,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`ti ${tx.type === 'income' ? 'ti-trending-up' : 'ti-trending-down'}`}
                     style={{ fontSize: 15, color: tx.type === 'income' ? 'var(--green)' : 'var(--red)' }}
                     aria-hidden="true" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tx.title}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.user_email}</p>
                </div>
                <p style={{
                  fontSize: 13, fontWeight: 700, flexShrink: 0,
                  color: tx.type === 'income' ? 'var(--green)' : 'var(--red)',
                }}>
                  {tx.type === 'income' ? '+' : '-'}£{tx.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Users tab ─────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 2fr 80px 80px 80px 80px 60px',
            gap: 12, padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-card2)',
          }}>
            {['Name', 'Email', 'Role', 'Txns', 'Budgets', 'Goals', ''].map(h => (
              <span key={h} style={{
                fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
                letterSpacing: '.05em', textTransform: 'uppercase',
              }}>{h}</span>
            ))}
          </div>

          {filteredUsers.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No users found</p>
            </div>
          ) : (
            filteredUsers.map((u, idx) => (
              <div key={u.id} style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 80px 80px 80px 80px 60px',
                gap: 12, padding: '12px 16px', alignItems: 'center',
                borderBottom: idx < filteredUsers.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: 'var(--accent-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'var(--accent)',
                  }}>
                    {u.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.full_name}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {u.email}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px',
                  borderRadius: 99, textAlign: 'center',
                  background: u.role === 'admin' ? 'rgba(255,79,100,0.12)' : 'var(--accent-light)',
                  color: u.role === 'admin' ? 'var(--red)' : 'var(--accent)',
                }}>
                  {u.role}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>{u.tx_count}</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>{u.budget_count}</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>{u.goal_count}</span>
                <button
                  onClick={() => u.role !== 'admin' && setDeleteTarget(u)}
                  disabled={u.role === 'admin'}
                  aria-label={`Delete ${u.full_name}`}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: u.role === 'admin' ? 'transparent' : 'rgba(255,79,100,0.1)',
                    border: 'none', cursor: u.role === 'admin' ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: u.role === 'admin' ? 0.3 : 1,
                  }}
                >
                  <i className="ti ti-trash" style={{ fontSize: 14, color: 'var(--red)' }} aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Transactions tab ──────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr',
            gap: 12, padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-card2)',
          }}>
            {['Title', 'User', 'Category', 'Amount', 'Date'].map(h => (
              <span key={h} style={{
                fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
                letterSpacing: '.05em', textTransform: 'uppercase',
              }}>{h}</span>
            ))}
          </div>

          {filteredTx.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No transactions found</p>
            </div>
          ) : (
            filteredTx.slice(0, 100).map((tx, idx) => (
              <div key={tx.id} style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr',
                gap: 12, padding: '10px 16px', alignItems: 'center',
                borderBottom: idx < Math.min(filteredTx.length, 100) - 1
                  ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tx.title}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tx.user_email}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tx.category}</span>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: tx.type === 'income' ? 'var(--green)' : 'var(--red)',
                }}>
                  {tx.type === 'income' ? '+' : '-'}£{tx.amount.toFixed(2)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Delete modal ──────────────────────────────────────── */}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteUser}
        />
      )}
    </div>
  )
}