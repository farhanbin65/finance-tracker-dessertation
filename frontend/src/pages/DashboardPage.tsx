/**
 * FinSight — DashboardPage.tsx
 * Desktop: 2-column layout. Mobile: single column stack.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthToken } from '../utils/getAuthToken'

const API_URL = import.meta.env.VITE_API_URL || ''

// ── Types ──────────────────────────────────────────────────────────
interface MonthlySummary {
  total_income: number; total_expenses: number; net: number
  by_category: { category: string; total: number; percentage: number; count: number }[]
  month: number; year: number
}
interface Budget {
  id: string; category: string; limit: number; spent: number
  remaining: number; percentage_used: number
  status: 'on_track' | 'warning' | 'over_budget'
}
interface Goal {
  id: string; name: string; target_amount: number; saved_amount: number
  percentage: number; days_remaining: number; emoji: string
}
interface Transaction {
  id: string; title: string; amount: number
  type: 'income' | 'expense'; category: string; date: string
}
interface Alert {
  type: 'overspending' | 'anomaly' | 'savings_risk'
  severity: 'high' | 'medium' | 'low'
  category: string
  message: string
  related_id: string
}

const CAT_COLORS: Record<string, string> = {
  Rent: '#7c5cfc', Food: '#ff9f43', Shopping: '#0ea5e9',
  Transport: '#22c87a', Subscriptions: '#ff4f64',
  Entertainment: '#f0b429', Utilities: '#a78bfa',
  Health: '#34d399', Other: '#8b90a4',
}
const CAT_ICON: Record<string, string> = {
  Rent: 'ti-home', Food: 'ti-tools-kitchen-2', Shopping: 'ti-shopping-bag',
  Transport: 'ti-car', Subscriptions: 'ti-device-tv',
  Entertainment: 'ti-confetti', Utilities: 'ti-bulb',
  Health: 'ti-heart-rate-monitor', Salary: 'ti-cash', Other: 'ti-credit-card',
}
const catIcon = (cat: string) => CAT_ICON[cat] || 'ti-credit-card'

// ── Responsive hook ────────────────────────────────────────────────
function useIsDesktop() {
  const [is, setIs] = useState(window.innerWidth >= 1024)
  useEffect(() => {
    const fn = () => setIs(window.innerWidth >= 1024)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return is
}

// ── Donut chart ────────────────────────────────────────────────────
function DonutChart({ data, total }: {
  data: { category: string; total: number; percentage: number }[]; total: number
}) {
  const size = 164; const cx = size / 2; const cy = size / 2
  const r = 62; const stroke = 24; const circumference = 2 * Math.PI * r
  let cum = 0
  const slices = data.slice(0, 6).map(d => {
    const offset = circumference - (cum / 100) * circumference
    const dash = (d.percentage / 100) * circumference
    cum += d.percentage
    return { ...d, offset, dash }
  })
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {slices.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={CAT_COLORS[s.category] || CAT_COLORS.Other}
            strokeWidth={stroke}
            strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={s.offset} strokeLinecap="butt" />
        ))}
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
          letterSpacing: '.05em', marginBottom: 2 }}>SPENT</p>
        <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
          £{total.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
        </p>
      </div>
    </div>
  )
}

// ── Shimmer ────────────────────────────────────────────────────────
function Shimmer({ height = 120, radius = 16 }: { height?: number; radius?: number }) {
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

// ── Section header ─────────────────────────────────────────────────
function SectionRow({ title, onSeeAll }: { title: string; onSeeAll: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: 14 }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</p>
      <button onClick={onSeeAll} style={{
        fontSize: 12, color: 'var(--accent)', fontWeight: 500,
        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
      }} aria-label={`See all ${title}`}>See all</button>
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }: {
  label: string; value: string; icon: string; color: string; sub: string
}) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 15, color }} aria-hidden="true" />
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
          letterSpacing: '.05em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <p style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</p>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────
function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 8, padding: '20px 0' }}>
      <i className={`ti ${icon}`} style={{ fontSize: 28, color: 'var(--text-muted)', opacity: 0.5 }} />
      <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>{message}</p>
    </div>
  )
}

// ── Card wrapper ───────────────────────────────────────────────────
function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 18, padding: 18, ...style,
    }}>
      {children}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const navigate   = useNavigate()
  const isDesktop  = useIsDesktop()

  const [summary, setSummary]           = useState<MonthlySummary | null>(null)
  const [budgets, setBudgets]           = useState<Budget[]>([])
  const [goals, setGoals]               = useState<Goal[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [aiTip, setAiTip]               = useState('')
  const [aiTipLoading, setAiTipLoading] = useState(true)
  const [alerts, setAlerts] = useState<Alert[]>([])

  const userName  = localStorage.getItem('fs_name') || 'there'
  const firstName = userName.split(' ')[0]
  const now       = new Date()
  const monthName = now.toLocaleDateString('en-GB', { month: 'long' })

  useEffect(() => { fetchDashboard() }, [])

  async function getToken() {
    return getAuthToken()
  }

  async function fetchDashboard() {
    try {
      setLoading(true)
      const token = await getToken()
      const h = { Authorization: `Bearer ${token}` }
      const [sRes, bRes, gRes, tRes, aRes] = await Promise.all([
        fetch(`${API_URL}/api/transactions/summary/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`, { headers: h }),
        fetch(`${API_URL}/api/budgets`, { headers: h }),
        fetch(`${API_URL}/api/goals`, { headers: h }),
        fetch(`${API_URL}/api/transactions?limit=5`, { headers: h }),
        fetch(`${API_URL}/api/alerts`, { headers: h }),
      ])
      const [sData, bData, gData, tData, aData] = await Promise.all([
        sRes.json(), bRes.json(), gRes.json(), tRes.json(), aRes.json(),
      ])
      setSummary(sData.total_income !== undefined ? sData : null)
      setBudgets(bData.budgets || [])
      setGoals((gData.goals || []).slice(0, 3))
      setTransactions(tData.transactions || [])
      setAlerts(aData.alerts || [])
      setLoading(false)
      fetchAiTip(token, sData, bData)
    } catch {
      setLoading(false)
      setAiTipLoading(false)
    }
  }

  async function fetchAiTip(token: string, sData: MonthlySummary, bData: any) {
    try {
      setAiTipLoading(true)
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Give me one short financial tip based on my spending this month. Maximum 2 sentences.' }],
          context: {
            total_budget: bData.summary?.total_budgeted || 0,
            total_spent:  sData.total_expenses || 0,
            remaining:    bData.summary?.total_remaining || 0,
            top_category: sData.by_category?.[0]?.category || 'N/A',
          },
        }),
      })
      const data = await res.json()
      setAiTip(data.reply || '')
    } catch {
      setAiTip('Try to save at least 20% of your income each month for long-term financial health.')
    } finally {
      setAiTipLoading(false)
    }
  }

  function getGreeting() {
    const h = now.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const savingsRate = summary && summary.total_income > 0
    ? Math.max(0, Math.round((summary.net / summary.total_income) * 100)) : 0
  const avgBudgetUsed = budgets.length > 0
    ? Math.round(budgets.reduce((s, b) => s + b.percentage_used, 0) / budgets.length) : 0
  const overCount    = budgets.filter(b => b.status === 'over_budget').length
  const warningCount = budgets.filter(b => b.status === 'warning').length

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <Shimmer height={40} radius={8} />
      <Shimmer height={160} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Shimmer height={90} /><Shimmer height={90} />
      </div>
      <Shimmer height={240} />
      <Shimmer height={80} />
    </div>
  )

  // ── Greeting block ─────────────────────────────────────────────
  const GreetingBlock = (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 3 }}>
        {getGreeting()},
      </p>
      <h1 style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2, color: 'var(--text-primary)' }}>
        {firstName}
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
        Your financial overview for {monthName}.
      </p>
    </div>
  )

  // ── Alerts banner ──────────────────────────────────────────────
  const severityStyle: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    high:   { bg: 'rgba(220, 38, 38, 0.08)',  border: 'rgba(220, 38, 38, 0.25)',  text: '#b91c1c', icon: '⚠' },
    medium: { bg: 'rgba(217, 119, 6, 0.08)',  border: 'rgba(217, 119, 6, 0.25)',  text: '#b45309', icon: '⚠' },
    low:    { bg: 'rgba(37, 99, 235, 0.08)',  border: 'rgba(37, 99, 235, 0.25)',  text: '#1d4ed8', icon: 'ⓘ' },
  }
  const AlertsBanner = alerts.length > 0 ? (
    <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {alerts.slice(0, 3).map((a, i) => {
        const s = severityStyle[a.severity] || severityStyle.medium
        return (
          <div key={i} style={{
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: 12, padding: '10px 14px',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span style={{ fontSize: 14, color: s.text, lineHeight: 1.4 }} aria-hidden="true">{s.icon}</span>
            <p style={{ fontSize: 13, color: s.text, lineHeight: 1.45, margin: 0 }}>
              {a.message}
            </p>
          </div>
        )
      })}
    </div>
  ) : null

  // ── Balance hero ───────────────────────────────────────────────
  const BalanceHero = summary ? (
    <div style={{
      background: 'var(--accent)', borderRadius: 20,
      padding: 22, marginBottom: 14,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140,
        borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} aria-hidden="true" />
      <div style={{ position: 'absolute', bottom: -20, right: 40, width: 80, height: 80,
        borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} aria-hidden="true" />
      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 600,
        letterSpacing: '.06em', marginBottom: 6, textTransform: 'uppercase' }}>
        Net balance — {monthName}
      </p>
      <p style={{ fontSize: 38, fontWeight: 700, color: '#fff', lineHeight: 1, marginBottom: 18 }}>
        £{summary.net.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { icon: 'ti-trending-up',   label: 'Income', val: summary.total_income },
          { icon: 'ti-trending-down', label: 'Spent',  val: summary.total_expenses },
        ].map(({ icon, label, val }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <i className={`ti ${icon}`} style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }} aria-hidden="true" />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 600,
                letterSpacing: '.05em', textTransform: 'uppercase' }}>{label}</span>
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
              £{val.toLocaleString('en-GB')}
            </p>
          </div>
        ))}
      </div>
    </div>
  ) : null

  // ── Quick stats ────────────────────────────────────────────────
  const QuickStats = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
      <StatCard label="Savings Rate" value={`${savingsRate}%`} icon="ti-piggy-bank"
        color={savingsRate >= 20 ? 'var(--green)' : savingsRate >= 10 ? 'var(--orange)' : 'var(--red)'}
        sub={savingsRate >= 20 ? 'Excellent' : savingsRate >= 10 ? 'Good' : 'Needs work'} />
      <StatCard label="Budget Used" value={`${avgBudgetUsed}%`} icon="ti-chart-pie"
        color="var(--accent)"
        sub={overCount > 0 ? `${overCount} over limit` : warningCount > 0 ? `${warningCount} warnings` : 'All on track'} />
    </div>
  )

  // ── AI tip ─────────────────────────────────────────────────────
  const AiTip = (aiTipLoading || aiTip) ? (
    <Card style={{ borderLeft: '3px solid var(--accent)', marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 36, height: 36, background: 'var(--accent-light)',
          borderRadius: 10, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <i className="ti ti-brain" style={{ fontSize: 18, color: 'var(--accent)' }} aria-hidden="true" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)',
            letterSpacing: '.05em', marginBottom: 5, textTransform: 'uppercase' }}>FinSight AI</p>
          {aiTipLoading ? (
            <>
              <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
              {[90, 70].map((w, i) => (
                <div key={i} style={{
                  height: 12, borderRadius: 6, marginBottom: 6,
                  background: 'var(--bg-card2)', overflow: 'hidden', position: 'relative', width: `${w}%`,
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)',
                    animation: 'shimmer 1.6s infinite',
                  }} />
                </div>
              ))}
            </>
          ) : (
            <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-secondary)' }}>{aiTip}</p>
          )}
        </div>
      </div>
    </Card>
  ) : null

  // ── Spending breakdown ─────────────────────────────────────────
  const SpendingBreakdown = summary ? (
    <Card style={{ marginBottom: 14 }}>
      <SectionRow title="Spending breakdown" onSeeAll={() => navigate('/transactions')} />
      {summary.by_category.length === 0 ? (
        <EmptyState icon="ti-chart-donut" message="No spending recorded this month yet." />
      ) : (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <DonutChart data={summary.by_category} total={summary.total_expenses} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {summary.by_category.slice(0, 5).map(cat => (
              <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: CAT_COLORS[cat.category] || CAT_COLORS.Other,
                }} aria-hidden="true" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {cat.category}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {Math.round(cat.percentage)}%
                    </span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 3, marginTop: 3 }}>
                    <div style={{
                      width: `${cat.percentage}%`, height: '100%',
                      background: CAT_COLORS[cat.category] || CAT_COLORS.Other, borderRadius: 99,
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  ) : null

  // ── Budget overview ────────────────────────────────────────────
  const BudgetOverview = (
    <Card style={{ marginBottom: 14 }}>
      <SectionRow title="Budget overview" onSeeAll={() => navigate('/budget')} />
      {budgets.length === 0 ? (
        <EmptyState icon="ti-wallet" message="No budgets set up yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {budgets.slice(0, isDesktop ? 5 : 4).map(b => {
            const pct   = Math.min(b.percentage_used, 100)
            const color = b.status === 'on_track' ? 'var(--green)'
              : b.status === 'warning' ? 'var(--orange)' : 'var(--red)'
            return (
              <div key={b.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: `${CAT_COLORS[b.category] || CAT_COLORS.Other}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className={`ti ${catIcon(b.category)}`}
                         style={{ fontSize: 15, color: CAT_COLORS[b.category] || CAT_COLORS.Other }}
                         aria-hidden="true" />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {b.category}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    £{b.spent.toLocaleString()} / £{b.limit.toLocaleString()}
                  </span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%', background: color,
                    borderRadius: 99, transition: 'width .5s ease',
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )

  // ── Recent transactions ────────────────────────────────────────
  const RecentTransactions = (
    <Card style={{ marginBottom: 14 }}>
      <SectionRow title="Recent transactions" onSeeAll={() => navigate('/transactions')} />
      {transactions.length === 0 ? (
        <EmptyState icon="ti-receipt" message="No transactions yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {transactions.map((tx, idx) => (
            <div key={tx.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
              borderBottom: idx < transactions.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: tx.type === 'income' ? 'rgba(34,200,122,0.12)' : 'rgba(255,159,67,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={`ti ${catIcon(tx.category)}`}
                   style={{ fontSize: 17, color: tx.type === 'income' ? 'var(--green)' : CAT_COLORS[tx.category] || 'var(--orange)' }}
                   aria-hidden="true" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.title}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {tx.category} · {new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, flexShrink: 0,
                color: tx.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                {tx.type === 'income' ? '+' : '-'}£{tx.amount.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )

  // ── Goals snapshot ─────────────────────────────────────────────
  const GoalsSnapshot = goals.length > 0 ? (
    <Card style={{ marginBottom: 14 }}>
      <SectionRow title="Savings goals" onSeeAll={() => navigate('/goals')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {goals.map(g => {
          const pct = Math.min(g.percentage || 0, 100)
          const hasEmoji = g.emoji && g.emoji !== '??' && g.emoji.length <= 4
          return (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, background: 'var(--bg-card2)', borderRadius: 12,
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {hasEmoji
                  ? <span style={{ fontSize: 20 }} role="img" aria-hidden="true">{g.emoji}</span>
                  : <i className="ti ti-target" style={{ fontSize: 18, color: 'var(--accent)' }} aria-hidden="true" />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 5 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</p>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{Math.round(pct)}%</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)',
                    borderRadius: 99, transition: 'width .6s ease' }} />
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  £{g.saved_amount.toLocaleString()} / £{g.target_amount.toLocaleString()}
                  {g.days_remaining > 0 && ` · ${g.days_remaining}d left`}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  ) : null

  // ── DESKTOP: 2-column layout ───────────────────────────────────
  if (isDesktop) {
    return (
      <div style={{ width: '100%', maxWidth: 1440, margin: '0 auto', paddingBottom: 32, paddingInline: 24, boxSizing: 'border-box' }}>
        <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>

        {GreetingBlock}
        {AlertsBanner}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
          {/* Left column */}
          <div>
            {BalanceHero}
            {QuickStats}
            {AiTip}
            {RecentTransactions}
          </div>
          {/* Right column */}
          <div>
            {SpendingBreakdown}
            {BudgetOverview}
            {GoalsSnapshot}
          </div>
        </div>
      </div>
    )
  }

  // ── MOBILE: single column ──────────────────────────────────────
  return (
    <div style={{ paddingBottom: 24 }}>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      {GreetingBlock}
      {AlertsBanner}
      {BalanceHero}
      {QuickStats}
      {SpendingBreakdown}
      {AiTip}
      {BudgetOverview}
      {RecentTransactions}
      {GoalsSnapshot}
    </div>
  )
}