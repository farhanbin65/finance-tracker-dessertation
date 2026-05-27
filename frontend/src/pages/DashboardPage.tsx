import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'

// ── Types ──────────────────────────────────────────────
interface MonthlySummary {
  total_income: number
  total_expenses: number
  net: number
  by_category: { category: string; total: number; percentage: number; count: number }[]
  month: number
  year: number
}

interface Budget {
  id: string
  category: string
  limit: number
  spent: number
  remaining: number
  percentage_used: number
  status: 'on_track' | 'warning' | 'over_budget'
}

interface Goal {
  id: string
  name: string
  target_amount: number
  saved_amount: number
  percentage: number
  days_remaining: number
  emoji: string
}

interface Transaction {
  id: string
  title: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
}

// ── Category colours for donut chart ──────────────────
const CAT_COLORS: Record<string, string> = {
  Rent:          '#7c5cfc',
  Food:          '#ff9f43',
  Shopping:      '#0ea5e9',
  Transport:     '#22c87a',
  Subscriptions: '#ff4f64',
  Entertainment: '#f0b429',
  Utilities:     '#a78bfa',
  Health:        '#34d399',
  Other:         '#8b90a4',
}

const CAT_ICONS: Record<string, string> = {
  Rent:          '🏠',
  Food:          '🍽',
  Shopping:      '🛍',
  Transport:     '🚗',
  Subscriptions: '📺',
  Entertainment: '🎭',
  Utilities:     '💡',
  Health:        '💊',
  Salary:        '💵',
  Other:         '💳',
}

// ── Donut chart ────────────────────────────────────────
function DonutChart({ data, total }: {
  data: { category: string; total: number; percentage: number }[]
  total: number
}) {
  const size   = 180
  const cx     = size / 2
  const cy     = size / 2
  const r      = 70
  const stroke = 28
  const circumference = 2 * Math.PI * r

  let cumulativePct = 0
  const slices = data.slice(0, 6).map(d => {
    const offset = circumference - (cumulativePct / 100) * circumference
    const dash   = (d.percentage / 100) * circumference
    cumulativePct += d.percentage
    return { ...d, offset, dash }
  })

  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {/* Slices */}
        {slices.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none"
            stroke={CAT_COLORS[s.category] || CAT_COLORS.Other}
            strokeWidth={stroke}
            strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={s.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      {/* Centre label */}
      <div style={{
        position:'absolute', inset:0,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
      }}>
        <p style={{ fontSize:10, color:'var(--text-muted)',
          fontFamily:'var(--font-main)', fontWeight:600,
          letterSpacing:'.04em', marginBottom:2 }}>
          SPENT
        </p>
        <p style={{ fontFamily:'var(--font-main)', fontSize:18, fontWeight:700 }}>
          £{total.toLocaleString('en-GB', { maximumFractionDigits:0 })}
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
export default function DashboardPage() {
  const { getAccessTokenSilently, user } = useAuth0()
  const navigate = useNavigate()

  const [summary, setSummary]           = useState<MonthlySummary | null>(null)
  const [budgets, setBudgets]           = useState<Budget[]>([])
  const [goals, setGoals]               = useState<Goal[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [aiTip, setAiTip]               = useState<string>('')

  const userName = user?.name || localStorage.getItem('fs_name') || 'Farhan'
  const firstName = userName.split(' ')[0]

  const now = new Date()
  const monthName = now.toLocaleDateString('en-GB', { month:'long' })

  // ── Fetch all dashboard data in parallel ─────────────
  useEffect(() => { fetchDashboard() }, [])

  async function getToken() {
    return localStorage.getItem('fs_token') || await getAccessTokenSilently()
  }

  async function fetchDashboard() {
    try {
      setLoading(true)
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }
      const base = import.meta.env.VITE_API_URL

      // Fetch all 4 endpoints in parallel
      const [summaryRes, budgetsRes, goalsRes, txRes] = await Promise.all([
        fetch(`${base}/api/transactions/summary/monthly?year=${now.getFullYear()}&month=${now.getMonth()+1}`, { headers }),
        fetch(`${base}/api/budgets`, { headers }),
        fetch(`${base}/api/goals`, { headers }),
        fetch(`${base}/api/transactions?limit=5`, { headers }),
      ])

      const [summaryData, budgetsData, goalsData, txData] = await Promise.all([
        summaryRes.json(),
        budgetsRes.json(),
        goalsRes.json(),
        txRes.json(),
      ])

      setSummary(summaryData)
      setBudgets(budgetsData.budgets || [])
      setGoals(goalsData.goals?.slice(0, 3) || [])
      setTransactions(txData.transactions || [])

      // Fetch AI tip after data loads
      fetchAiTip(token, summaryData, budgetsData)
    } catch (err) {
      console.error('Dashboard fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAiTip(token: string, summaryData: any, budgetsData: any) {
    try {
      const context = {
        total_budget:  budgetsData.summary?.total_budgeted || 0,
        total_spent:   summaryData.total_expenses || 0,
        remaining:     budgetsData.summary?.total_remaining || 0,
        top_category:  summaryData.by_category?.[0]?.category || 'N/A',
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({
          messages: [{ role:'user', content:'Give me one short financial tip based on my spending this month. Maximum 2 sentences.' }],
          context,
        }),
      })
      const data = await res.json()
      setAiTip(data.reply || '')
    } catch {
      setAiTip('Tip: Try to save at least 20% of your income each month for long-term financial security.')
    }
  }

  // ── Greeting ─────────────────────────────────────────
  function getGreeting() {
    const h = now.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) return <LoadingSkeleton />

  const savingsRate = summary && summary.total_income > 0
    ? Math.round((summary.net / summary.total_income) * 100)
    : 0

  return (
    <div style={{ paddingBottom: 24 }}>

      {/* ── Greeting header ── */}
      <div style={{ marginBottom:20 }}>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:2 }}>
          {getGreeting()},
        </p>
        <h1 style={{ fontFamily:'var(--font-main)', fontSize:24, fontWeight:700, lineHeight:1.2 }}>
          {firstName} 👋
        </h1>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
          Here is your financial overview for {monthName}.
        </p>
      </div>

      {/* ── Balance hero card ── */}
      {summary && (
        <div style={{
          background:'var(--accent)', borderRadius:20,
          padding:20, marginBottom:14, position:'relative', overflow:'hidden',
        }}>
          {/* Background decoration */}
          <div style={{
            position:'absolute', top:-30, right:-30,
            width:140, height:140, borderRadius:'50%',
            background:'rgba(255,255,255,0.08)',
          }} />
          <div style={{
            position:'absolute', bottom:-20, right:40,
            width:80, height:80, borderRadius:'50%',
            background:'rgba(255,255,255,0.05)',
          }} />

          <p style={{ fontSize:11, color:'rgba(255,255,255,0.7)',
            fontFamily:'var(--font-main)', fontWeight:600,
            letterSpacing:'.06em', marginBottom:6 }}>
            NET BALANCE — {monthName.toUpperCase()}
          </p>
          <p style={{ fontFamily:'var(--font-main)', fontSize:38,
            fontWeight:700, color:'#fff', lineHeight:1, marginBottom:16 }}>
            £{summary.net.toLocaleString('en-GB', { minimumFractionDigits:2, maximumFractionDigits:2 })}
          </p>

          {/* Income vs Expenses row */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{
              background:'rgba(255,255,255,0.12)',
              borderRadius:12, padding:'10px 14px',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                <i className="ti ti-trending-up" style={{ fontSize:14, color:'rgba(255,255,255,0.8)' }} />
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)',
                  fontFamily:'var(--font-main)', fontWeight:600 }}>
                  INCOME
                </span>
              </div>
              <p style={{ fontFamily:'var(--font-main)', fontSize:16,
                fontWeight:700, color:'#fff' }}>
                £{summary.total_income.toLocaleString('en-GB')}
              </p>
            </div>
            <div style={{
              background:'rgba(255,255,255,0.12)',
              borderRadius:12, padding:'10px 14px',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                <i className="ti ti-trending-down" style={{ fontSize:14, color:'rgba(255,255,255,0.8)' }} />
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)',
                  fontFamily:'var(--font-main)', fontWeight:600 }}>
                  SPENT
                </span>
              </div>
              <p style={{ fontFamily:'var(--font-main)', fontSize:16,
                fontWeight:700, color:'#fff' }}>
                £{summary.total_expenses.toLocaleString('en-GB')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick stats row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <StatCard
          label="Savings Rate"
          value={`${savingsRate}%`}
          icon="ti-piggy-bank"
          color={savingsRate >= 20 ? 'var(--green)' : savingsRate >= 10 ? 'var(--orange)' : 'var(--red)'}
          sub={savingsRate >= 20 ? 'Excellent' : savingsRate >= 10 ? 'Good' : 'Needs work'}
        />
        <StatCard
          label="Budget Used"
          value={`${Math.round(budgets.reduce((s,b) => s + b.percentage_used, 0) / (budgets.length || 1))}%`}
          icon="ti-chart-pie"
          color="var(--accent)"
          sub={`${budgets.filter(b => b.status === 'warning').length} warnings`}
        />
      </div>

      {/* ── Spending breakdown ── */}
      {summary && summary.by_category.length > 0 && (
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:18, padding:18, marginBottom:14,
        }}>
          <SectionRow title="Spending Breakdown" onSeeAll={() => navigate('/transactions')} />

          <div style={{ display:'flex', gap:16, alignItems:'center' }}>
            {/* Donut */}
            <DonutChart
              data={summary.by_category}
              total={summary.total_expenses}
            />

            {/* Legend */}
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
              {summary.by_category.slice(0, 5).map(cat => (
                <div key={cat.category} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{
                    width:10, height:10, borderRadius:'50%', flexShrink:0,
                    background: CAT_COLORS[cat.category] || CAT_COLORS.Other,
                  }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:12, fontFamily:'var(--font-main)',
                        fontWeight:500, color:'var(--text-primary)' }}>
                        {cat.category}
                      </span>
                      <span style={{ fontSize:12, fontWeight:600,
                        fontFamily:'var(--font-main)', color:'var(--text-secondary)' }}>
                        {Math.round(cat.percentage)}%
                      </span>
                    </div>
                    {/* Mini bar */}
                    <div style={{ background:'rgba(255,255,255,0.06)',
                      borderRadius:99, height:3, marginTop:3 }}>
                      <div style={{
                        width:`${cat.percentage}%`, height:'100%',
                        background: CAT_COLORS[cat.category] || CAT_COLORS.Other,
                        borderRadius:99,
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── AI insight card ── */}
      {aiTip && (
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderLeft:'3px solid var(--accent)',
          borderRadius:14, padding:16, marginBottom:14,
          display:'flex', gap:12, alignItems:'flex-start',
        }}>
          <div style={{
            width:36, height:36, background:'var(--accent-light)',
            borderRadius:10, display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:18, flexShrink:0,
          }}>
            🤖
          </div>
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--accent)',
              fontFamily:'var(--font-main)', letterSpacing:'.04em', marginBottom:4 }}>
              FINSIGHT AI
            </p>
            <p style={{ fontSize:13, lineHeight:1.6, color:'var(--text-secondary)' }}>
              {aiTip}
            </p>
          </div>
        </div>
      )}

      {/* ── Budget overview ── */}
      {budgets.length > 0 && (
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:18, padding:18, marginBottom:14,
        }}>
          <SectionRow title="Budget Overview" onSeeAll={() => navigate('/budget')} />

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {budgets.slice(0, 4).map(b => {
              const pct   = Math.min(b.percentage_used, 100)
              const color = b.status === 'on_track' ? 'var(--green)'
                : b.status === 'warning' ? 'var(--orange)' : 'var(--red)'
              return (
                <div key={b.id}>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'center', marginBottom:5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <span style={{ fontSize:15 }}>{CAT_ICONS[b.category] || '💳'}</span>
                      <span style={{ fontSize:13, fontWeight:500,
                        fontFamily:'var(--font-main)' }}>
                        {b.category}
                      </span>
                    </div>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                      £{b.spent} / £{b.limit}
                    </span>
                  </div>
                  <div style={{ background:'rgba(255,255,255,0.06)',
                    borderRadius:99, height:5, overflow:'hidden' }}>
                    <div style={{
                      width:`${pct}%`, height:'100%',
                      background: color, borderRadius:99,
                      transition:'width .5s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Recent transactions ── */}
      {transactions.length > 0 && (
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:18, padding:18, marginBottom:14,
        }}>
          <SectionRow title="Recent Transactions" onSeeAll={() => navigate('/transactions')} />

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {transactions.map(tx => (
              <div key={tx.id} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 0',
                borderBottom:'1px solid var(--border)',
              }}>
                {/* Icon */}
                <div style={{
                  width:38, height:38, borderRadius:12,
                  background: tx.type === 'income'
                    ? 'rgba(34,200,122,0.12)' : 'rgba(255,159,67,0.12)',
                  display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:17, flexShrink:0,
                }}>
                  {CAT_ICONS[tx.category] || '💳'}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:14, fontWeight:600,
                    fontFamily:'var(--font-main)',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {tx.title}
                  </p>
                  <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                    {tx.category} · {new Date(tx.date).toLocaleDateString('en-GB', {
                      day:'numeric', month:'short'
                    })}
                  </p>
                </div>

                {/* Amount */}
                <p style={{
                  fontSize:14, fontWeight:700,
                  fontFamily:'var(--font-main)',
                  color: tx.type === 'income' ? 'var(--green)' : 'var(--red)',
                  flexShrink:0,
                }}>
                  {tx.type === 'income' ? '+' : '-'}£{tx.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Savings goals snapshot ── */}
      {goals.length > 0 && (
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:18, padding:18, marginBottom:14,
        }}>
          <SectionRow title="Savings Goals" onSeeAll={() => navigate('/goals')} />

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {goals.map(g => {
              const pct = g.percentage || 0
              return (
                <div key={g.id} style={{
                  display:'flex', alignItems:'center', gap:12,
                }}>
                  {/* Emoji */}
                  <div style={{
                    width:40, height:40, background:'var(--bg-card2)',
                    borderRadius:12, display:'flex', alignItems:'center',
                    justifyContent:'center', fontSize:19, flexShrink:0,
                  }}>
                    {g.emoji && g.emoji !== '??' ? g.emoji : '🎯'}
                  </div>

                  {/* Info + bar */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between',
                      alignItems:'center', marginBottom:4 }}>
                      <p style={{ fontSize:13, fontWeight:600,
                        fontFamily:'var(--font-main)' }}>
                        {g.name}
                      </p>
                      <span style={{ fontSize:12, fontWeight:700,
                        fontFamily:'var(--font-main)', color:'var(--accent)' }}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <div style={{ background:'rgba(255,255,255,0.06)',
                      borderRadius:99, height:5, overflow:'hidden' }}>
                      <div style={{
                        width:`${Math.min(pct, 100)}%`, height:'100%',
                        background:'var(--accent)', borderRadius:99,
                      }} />
                    </div>
                    <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>
                      £{g.saved_amount.toLocaleString()} / £{g.target_amount.toLocaleString()} · {g.days_remaining}d left
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}

// ══════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════

function SectionRow({ title, onSeeAll }: { title: string; onSeeAll: () => void }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between',
      alignItems:'center', marginBottom:14 }}>
      <p style={{ fontFamily:'var(--font-main)', fontSize:15, fontWeight:700 }}>
        {title}
      </p>
      <span onClick={onSeeAll} style={{ fontSize:12, color:'var(--accent)',
        cursor:'pointer', fontWeight:500 }}>
        See all
      </span>
    </div>
  )
}

function StatCard({ label, value, icon, color, sub }: {
  label: string; value: string; icon: string; color: string; sub: string
}) {
  return (
    <div style={{
      background:'var(--bg-card)', border:'1px solid var(--border)',
      borderRadius:14, padding:'14px 16px',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
        <i className={`ti ${icon}`} style={{ fontSize:14, color }} />
        <span style={{ fontSize:10, color:'var(--text-muted)',
          fontFamily:'var(--font-main)', fontWeight:600, letterSpacing:'.04em' }}>
          {label.toUpperCase()}
        </span>
      </div>
      <p style={{ fontFamily:'var(--font-main)', fontSize:22, fontWeight:700, color }}>
        {value}
      </p>
      <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
        {sub}
      </p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>
      {[180, 100, 220, 160, 200].map((h, i) => (
        <div key={i} style={{
          height:h, borderRadius:18,
          background:'var(--bg-card)', border:'1px solid var(--border)',
          animation:'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}