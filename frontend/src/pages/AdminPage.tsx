/**
 * FinSight — AdminPage.tsx
 * Platform overview: stats + all users table with search.
 * Matches the Angular admin users list pattern.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthToken } from '../utils/getAuthToken'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'

const API_URL = import.meta.env.VITE_API_URL || ''

const CAT_COLORS: Record<string, string> = {
  Food: '#ff9f43', Transport: '#0ea5e9', Shopping: '#7c5cfc',
  Rent: '#a78bfa', Subscriptions: '#ff4f64', Entertainment: '#f0b429',
  Utilities: '#34d399', Health: '#22c87a', Other: '#8b90a4',
}
const CHART_COLORS = ['#7c5cfc','#ff9f43','#0ea5e9','#22c87a','#ff4f64','#f0b429','#a78bfa','#34d399']

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
  is_banned?: boolean
}

interface ChartData {
  by_category: { name: string; value: number }[]
  monthly:     { month: string; income: number; expenses: number }[]
}

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
        background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)',
        animation: 'shimmer 1.6s infinite',
      }} />
    </div>
  )
}

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
      <p style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

export default function AdminPage() {
  const navigate = useNavigate()
  const [stats, setStats]   = useState<PlatformStats | null>(null)
  const [users, setUsers]   = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [charts, setCharts] = useState<ChartData | null>(null)

  // Guard — admin only
  useEffect(() => {
    const token = localStorage.getItem('fs_token')
    if (!token) { navigate('/login'); return }
    try {
      const p = JSON.parse(atob(token.split('.')[1]))
      if (p.role !== 'admin') { navigate('/dashboard'); return }
    } catch { navigate('/dashboard'); return }
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const token = await getAuthToken()
      const h = { Authorization: `Bearer ${token}` }
      const [sRes, uRes, cRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`,  { headers: h }),
        fetch(`${API_URL}/api/admin/users`,  { headers: h }),
        fetch(`${API_URL}/api/admin/charts`, { headers: h }),
      ])
      const [sData, uData, cData] = await Promise.all([
        sRes.json(), uRes.json(), cRes.json(),
      ])
      setStats(sData)
      setUsers(uData.users || [])
      setCharts(cData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1100, margin: '0 auto' }}>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <Shimmer height={36} radius={8} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[1,2,3,4].map(i => <Shimmer key={i} height={88} />)}
      </div>
      <Shimmer height={400} />
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 40 }}>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'rgba(255,79,100,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <i className="ti ti-shield-lock" style={{ fontSize: 20, color: 'var(--red)' }} aria-hidden="true" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
            Admin Dashboard
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            {users.length} total users in the system
          </p>
        </div>
        <span style={{
          marginLeft: 'auto', fontSize: 10, fontWeight: 700,
          padding: '4px 12px', borderRadius: 99,
          background: 'rgba(255,79,100,0.12)', color: 'var(--red)',
          letterSpacing: '.06em', textTransform: 'uppercase',
        }}>Admin Only</span>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12, marginBottom: 28,
        }}>
          <StatCard label="Total users"    value={stats.total_users}        icon="ti-users"           color="var(--accent)"  sub={`+${stats.new_users_30d} this month`} />
          <StatCard label="Transactions"   value={stats.total_transactions} icon="ti-arrows-exchange" color="var(--green)"   />
          <StatCard label="Budgets"        value={stats.total_budgets}      icon="ti-wallet"          color="var(--orange)"  />
          <StatCard label="Goals"          value={stats.total_goals}        icon="ti-target"          color="#a78bfa"        />
          <StatCard label="Platform income"  value={`£${(stats.total_income   || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`} icon="ti-trending-up"   color="var(--green)" />
          <StatCard label="Platform spent"   value={`£${(stats.total_expenses || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`} icon="ti-trending-down" color="var(--red)"   />
        </div>
      )}

      {/* ── Platform charts ───────────────────────────────── */}
      {charts && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 16, marginBottom: 28,
        }}>

          {/* Donut — spending by category */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 18, padding: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <i className="ti ti-chart-donut" style={{ fontSize: 16, color: 'var(--accent)' }} aria-hidden="true" />
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                Platform spending by category
              </p>
            </div>

            {charts.by_category.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>
                No data yet
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={charts.by_category}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      dataKey="value" paddingAngle={2}
                    >
                      {charts.by_category.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={CAT_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [`£${v.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, '']}
                      contentStyle={{
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 8, fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {charts.by_category.slice(0, 5).map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: CAT_COLORS[d.name] || CHART_COLORS[i % CHART_COLORS.length],
                      }} />
                      <span style={{ fontSize: 12, flex: 1, color: 'var(--text-secondary)' }}>
                        {d.name}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        £{d.value.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <i className="ti ti-chart-bar" style={{ fontSize: 16, color: 'var(--accent)' }} aria-hidden="true" />
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                Platform monthly income vs expenses
              </p>
            </div>

            {charts.monthly.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>
                No data yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={charts.monthly} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    tickFormatter={v => `£${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number) => [`£${v.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, '']}
                    contentStyle={{
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 8, fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income"   fill="#22c87a" radius={[4,4,0,0]} name="Income"   />
                  <Bar dataKey="expenses" fill="#ff4f64" radius={[4,4,0,0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Users table */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 18, overflow: 'hidden',
      }}>
        {/* Search bar */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
            <i className="ti ti-search" style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 14, color: 'var(--text-muted)', pointerEvents: 'none',
            }} aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', height: 38, paddingLeft: 32, paddingRight: 12,
                background: 'var(--bg-card2)', border: '1px solid var(--border)',
                borderRadius: 10, color: 'var(--text-primary)',
                fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {filtered.length} of {users.length} users
          </span>
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '40px 2fr 2fr 80px 80px 80px 120px 80px',
          gap: 12, padding: '10px 18px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card2)',
        }}>
          {['', 'Name', 'Email', 'Txns', 'Budgets', 'Goals', 'Joined', ''].map((h, i) => (
            <span key={i} style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
              letterSpacing: '.05em', textTransform: 'uppercase',
            }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 18px', textAlign: 'center' }}>
            <i className="ti ti-users-off" style={{ fontSize: 32, color: 'var(--text-muted)', opacity: 0.4 }} aria-hidden="true" />
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>No users found</p>
          </div>
        ) : (
          filtered.map((u, idx) => (
            <div key={u.id} style={{
              display: 'grid',
              gridTemplateColumns: '40px 2fr 2fr 80px 80px 80px 120px 80px',
              gap: 12, padding: '12px 18px', alignItems: 'center',
              borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              transition: 'background .15s',
              cursor: 'pointer',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => navigate(`/admin/users/${u.id}`)}
            >
              {/* Avatar */}
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: u.is_banned ? 'rgba(255,79,100,0.12)' : 'var(--accent-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                color: u.is_banned ? 'var(--red)' : 'var(--accent)',
              }}>
                {u.full_name.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{u.full_name}</span>
                  {u.role === 'admin' && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 6px',
                      borderRadius: 99, background: 'rgba(255,79,100,0.12)', color: 'var(--red)',
                    }}>ADMIN</span>
                  )}
                  {u.is_banned && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 6px',
                      borderRadius: 99, background: 'rgba(255,159,67,0.15)', color: 'var(--orange)',
                    }}>BANNED</span>
                  )}
                </div>
              </div>

              {/* Email */}
              <span style={{
                fontSize: 12, color: 'var(--text-muted)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{u.email}</span>

              {/* Counts */}
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>{u.tx_count}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>{u.budget_count}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>{u.goal_count}</span>

              {/* Joined */}
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric'
                }) : '—'}
              </span>

              {/* Arrow */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <i className="ti ti-chevron-right" style={{ fontSize: 16, color: 'var(--text-muted)' }} aria-hidden="true" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}