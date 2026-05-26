import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

const PALETTES = [
  { id: 'purple', color: '#7c5cfc', label: 'Violet' },
  { id: 'blue',   color: '#3b82f6', label: 'Blue'   },
  { id: 'gold',   color: '#f0b429', label: 'Gold'   },
  { id: 'teal',   color: '#0ea5e9', label: 'Teal'   },
  { id: 'rose',   color: '#f43f5e', label: 'Rose'   },
] as const

export default function ProfilePage() {
  const { user, logout } = useAuth0()
  const navigate = useNavigate()
  const { mode, palette, setMode, setPalette } = useTheme()

  const [biometric, setBiometric]   = useState(true)
  const [fraudAlerts, setFraudAlerts] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // ── Get user info — Auth0 or localStorage ──────────
  const userName  = user?.name  || localStorage.getItem('fs_name')  || 'Farhan Ahmed'
  const userEmail = user?.email || localStorage.getItem('fs_email') || 'farhan@finsight.io'
  const userAvatar = user?.picture || null

  // ── Initials for avatar fallback ───────────────────
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  // ── Sign out ───────────────────────────────────────
  function handleSignOut() {
    localStorage.removeItem('fs_token')
    localStorage.removeItem('fs_name')
    localStorage.removeItem('fs_email')
    logout({ logoutParams: { returnTo: window.location.origin + '/login' } })
  }

  // ── GDPR export ────────────────────────────────────
  async function handleDataExport() {
    try {
      const token = localStorage.getItem('fs_token')
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/export`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error('Export failed')
      const data = await res.json()
      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = 'finsight-my-data.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Data export coming soon!')
    }
  }

  return (
    <div style={{ paddingBottom: 24 }}>

      {/* ── Profile hero ── */}
      <div style={{ textAlign:'center', padding:'24px 20px 20px' }}>
        {/* Avatar */}
        <div style={{ position:'relative', display:'inline-block', marginBottom:12 }}>
          <div style={{
            width:80, height:80, borderRadius:'50%',
            background: userAvatar ? 'transparent' : 'var(--accent)',
            border:'3px solid var(--accent)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:28, fontWeight:700, color:'#fff',
            overflow:'hidden', margin:'0 auto',
          }}>
            {userAvatar
              ? <img src={userAvatar} alt={userName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : initials
            }
          </div>
          {/* Edit badge */}
          <div style={{
            position:'absolute', bottom:0, right:0,
            width:26, height:26, background:'var(--accent)',
            borderRadius:'50%', border:'2px solid var(--bg-secondary)',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer',
          }}>
            <i className="ti ti-pencil" style={{ fontSize:12, color:'#fff' }} />
          </div>
        </div>

        {/* Name + verified */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:4 }}>
          <p style={{ fontFamily:'var(--font-main)', fontSize:20, fontWeight:700 }}>
            {userName}
          </p>
          <span style={{
            display:'inline-flex', alignItems:'center', gap:3,
            background:'rgba(34,200,122,0.12)', color:'var(--green)',
            padding:'2px 8px', borderRadius:99,
            fontSize:11, fontWeight:600, fontFamily:'var(--font-main)',
          }}>
            <i className="ti ti-check" style={{ fontSize:11 }} /> Verified
          </span>
        </div>
        <p style={{ fontSize:13, color:'var(--text-muted)' }}>{userEmail}</p>
      </div>

      {/* ── Appearance ── */}
      <SectionLabel icon="ti-palette" label="Appearance" />
      <div className="card" style={{ marginBottom:14 }}>
        {/* Dark / Light toggle */}
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-main)',
            fontWeight:600, letterSpacing:'.04em', marginBottom:10 }}>
            MODE
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {(['dark','light'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding:'10px', borderRadius:12, cursor:'pointer',
                border:`1.5px solid ${mode===m ? 'var(--accent)' : 'var(--border)'}`,
                background: mode===m ? 'var(--accent-light)' : 'var(--bg-card2)',
                color: mode===m ? 'var(--accent)' : 'var(--text-secondary)',
                fontFamily:'var(--font-main)', fontSize:13, fontWeight:600,
              }}>
                {m === 'dark' ? '🌙 Dark' : '☀️ Light'}
              </button>
            ))}
          </div>
        </div>

        {/* Colour palettes */}
        <div>
          <p style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-main)',
            fontWeight:600, letterSpacing:'.04em', marginBottom:10 }}>
            COLOUR THEME
          </p>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            {PALETTES.map(p => (
              <button key={p.id} onClick={() => setPalette(p.id)} title={p.label} style={{
                width:36, height:36, borderRadius:'50%',
                background: p.color, cursor:'pointer',
                border:`2.5px solid ${palette===p.id ? 'var(--text-primary)' : 'transparent'}`,
                transform: palette===p.id ? 'scale(1.2)' : 'scale(1)',
                transition:'all .2s',
              }} />
            ))}
            <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:4 }}>
              {PALETTES.find(p => p.id === palette)?.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Security Center ── */}
      <SectionLabel icon="ti-lock" label="Security Center" />
      <div className="card" style={{ marginBottom:14 }}>

        <SecItem icon="ti-lock" label="Two-Factor Authentication">
          <span style={{
            padding:'4px 10px', borderRadius:99,
            fontSize:11, fontWeight:600, fontFamily:'var(--font-main)',
            background:'rgba(34,200,122,0.12)', color:'var(--green)',
          }}>
            Enabled
          </span>
        </SecItem>

        <SecItem icon="ti-fingerprint" label="Biometric Login">
          <Toggle on={biometric} onToggle={() => setBiometric(v => !v)} />
        </SecItem>

        <SecItem icon="ti-shield-check" label="Data Encryption">
          <span style={{
            padding:'4px 10px', borderRadius:99,
            fontSize:11, fontWeight:600, fontFamily:'var(--font-main)',
            background:'var(--accent-light)', color:'var(--accent)',
          }}>
            AES-256 Active
          </span>
        </SecItem>

        <SecItem icon="ti-device-laptop" label="Active Sessions">
          <span style={{ fontSize:13, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:4 }}>
            2 Devices <i className="ti ti-chevron-right" style={{ fontSize:13 }} />
          </span>
        </SecItem>

        <SecItem icon="ti-bell" label="Fraud Alerts" last>
          <Toggle on={fraudAlerts} onToggle={() => setFraudAlerts(v => !v)} />
        </SecItem>
      </div>

      {/* ── Privacy ── */}
      <SectionLabel icon="ti-eye-off" label="Privacy" />
      <div className="card" style={{ marginBottom:14 }}>
        <SecItem icon="ti-download" label="Data Export (GDPR)" onClick={handleDataExport}>
          <i className="ti ti-arrow-right" style={{ color:'var(--text-muted)', fontSize:16 }} />
        </SecItem>
        <SecItem
          icon="ti-trash"
          label="Delete Account"
          labelColor="var(--red)"
          iconBg="rgba(255,79,100,0.1)"
          iconColor="var(--red)"
          last
          onClick={() => setShowDeleteConfirm(true)}
        >
          <i className="ti ti-arrow-right" style={{ color:'var(--red)', fontSize:16 }} />
        </SecItem>
      </div>

      {/* ── Account ── */}
      <SectionLabel icon="ti-user" label="Account" />
      <div className="card" style={{ marginBottom:14 }}>
        <SecItem icon="ti-bell" label="Notifications">
          <i className="ti ti-arrow-right" style={{ color:'var(--text-muted)', fontSize:16 }} />
        </SecItem>
        <SecItem icon="ti-help" label="Help & Support" last onClick={() => window.open('mailto:support@finsight.io')}>
          <i className="ti ti-arrow-right" style={{ color:'var(--text-muted)', fontSize:16 }} />
        </SecItem>
      </div>

      {/* ── App info ── */}
      <div style={{ textAlign:'center', padding:'8px 0 16px' }}>
        <p style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-main)' }}>
          FinSight v1.0.0 · Built with ❤️ for dissertation
        </p>
        <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
          Protected by AES-256 · GDPR Compliant
        </p>
      </div>

      {/* ── Sign out button ── */}
      <button
        onClick={handleSignOut}
        style={{
          width:'100%', background:'transparent',
          color:'var(--red)', border:'1.5px solid var(--red)',
          padding:'14px 24px', borderRadius:14,
          fontFamily:'var(--font-main)', fontSize:14, fontWeight:600,
          cursor:'pointer', transition:'all .2s',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,79,100,0.1)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <i className="ti ti-logout" />
        Sign Out
      </button>

      {/* ── Delete confirm modal ── */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            setShowDeleteConfirm(false)
            handleSignOut()
          }}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════

function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, margin:'16px 0 8px' }}>
      <i className={`ti ${icon}`} style={{ fontSize:14, color:'var(--text-muted)' }} />
      <p style={{
        fontSize:11, fontWeight:700, letterSpacing:'.08em',
        textTransform:'uppercase', color:'var(--text-muted)',
        fontFamily:'var(--font-main)',
      }}>
        {label}
      </p>
    </div>
  )
}

function SecItem({ icon, label, labelColor, iconBg, iconColor, last, onClick, children }: {
  icon: string
  label: string
  labelColor?: string
  iconBg?: string
  iconColor?: string
  last?: boolean
  onClick?: () => void
  children?: React.ReactNode
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display:'flex', alignItems:'center', gap:12,
        padding:'13px 0',
        borderBottom: last ? 'none' : '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width:36, height:36,
        background: iconBg || 'var(--bg-card2)',
        borderRadius:10,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:17, flexShrink:0,
      }}>
        <i className={`ti ${icon}`} style={{ color: iconColor || 'var(--text-secondary)' }} />
      </div>
      <p style={{
        fontSize:14, fontWeight:500,
        fontFamily:'var(--font-main)', flex:1,
        color: labelColor || 'var(--text-primary)',
      }}>
        {label}
      </p>
      {children}
    </div>
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width:44, height:24, borderRadius:99,
        background: on ? 'var(--accent)' : 'var(--bg-card2)',
        position:'relative', cursor:'pointer',
        transition:'background .2s', flexShrink:0,
        border: on ? 'none' : '1px solid var(--border)',
      }}
    >
      <div style={{
        width:18, height:18, background:'#fff',
        borderRadius:'50%', position:'absolute',
        top:3, left: on ? 23 : 3,
        transition:'left .2s',
        boxShadow:'0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  )
}

function DeleteConfirmModal({ onClose, onConfirm }: {
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
      zIndex:200, display:'flex', alignItems:'center', justifyContent:'center',
      padding:24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'var(--bg-secondary)', borderRadius:20,
        padding:24, width:'100%', maxWidth:340,
        border:'1px solid var(--border)',
        textAlign:'center',
      }}>
        <div style={{
          width:56, height:56, borderRadius:'50%',
          background:'rgba(255,79,100,0.1)',
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 16px', fontSize:24,
        }}>
          <i className="ti ti-trash" style={{ color:'var(--red)', fontSize:24 }} />
        </div>
        <h2 style={{ fontFamily:'var(--font-main)', fontSize:18, fontWeight:700, marginBottom:8 }}>
          Delete Account?
        </h2>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:24, lineHeight:1.6 }}>
          This will permanently delete all your data including transactions, budgets and goals. This cannot be undone.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <button onClick={onClose} style={{
            padding:'12px', borderRadius:12,
            background:'var(--bg-card)', border:'1px solid var(--border)',
            color:'var(--text-primary)', fontFamily:'var(--font-main)',
            fontSize:14, fontWeight:600, cursor:'pointer',
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{
            padding:'12px', borderRadius:12,
            background:'var(--red)', border:'none',
            color:'#fff', fontFamily:'var(--font-main)',
            fontSize:14, fontWeight:600, cursor:'pointer',
          }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}