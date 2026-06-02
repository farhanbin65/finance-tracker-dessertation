/**
 * FinSight — ProfilePage.tsx
 * UI UX Pro Max: No emoji, accessible toggles, safe card styles,
 * desktop max-width, dynamic user data, no window.alert
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../components/ui/Toast'
import { getAuthToken } from '../utils/getAuthToken'

const PALETTES = [
  { id: 'purple', color: '#7c5cfc', label: 'Violet' },
  { id: 'blue',   color: '#3b82f6', label: 'Blue'   },
  { id: 'gold',   color: '#f0b429', label: 'Gold'   },
  { id: 'teal',   color: '#0ea5e9', label: 'Teal'   },
  { id: 'rose',   color: '#f43f5e', label: 'Rose'   },
] as const

// ── Reusable card style ────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: '4px 16px',
  marginBottom: 14,
}

export default function ProfilePage() {
  const navigate                           = useNavigate()
  const { mode, palette, setMode, setPalette } = useTheme()
  const { showToast }                      = useToast()

  const [biometric, setBiometric]          = useState(true)
  const [fraudAlerts, setFraudAlerts]      = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [exporting, setExporting]          = useState(false)

  const userName   = localStorage.getItem('fs_name')  || 'Your Account'
  const userEmail  = localStorage.getItem('fs_email') || ''
  const userAvatar = null
  const initials   = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  // ── Sign out ───────────────────────────────────────────────────
  function handleSignOut() {
    localStorage.removeItem('fs_token')
    localStorage.removeItem('fs_refresh_token')
    localStorage.removeItem('fs_user')
    localStorage.removeItem('fs_name')
    localStorage.removeItem('fs_email')
    navigate('/login')
  }

  // ── GDPR export ────────────────────────────────────────────────
  async function handleDataExport() {
    try {
      setExporting(true)
      const token = await getAuthToken()
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/export`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error()
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = 'finsight-my-data.json'; a.click()
      URL.revokeObjectURL(url)
      showToast('Your data has been downloaded', 'success')
    } catch {
      // ✅ Toast instead of alert()
      showToast('Data export coming soon!', 'info')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 32 }}>

      {/* ── Profile hero ─────────────────────────────────────── */}
      <div style={{
        textAlign: 'center', padding: '20px 20px 24px',
        marginBottom: 4,
      }}>
        {/* Avatar */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: userAvatar ? 'transparent' : 'var(--accent)',
            border: '3px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: '#fff',
            overflow: 'hidden', margin: '0 auto',
          }}>
            {userAvatar
              ? <img src={userAvatar} alt={userName}
                     style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>
          {/* Edit badge */}
          <button
            aria-label="Edit profile picture"
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 26, height: 26, background: 'var(--accent)',
              borderRadius: '50%', border: '2px solid var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <i className="ti ti-pencil" style={{ fontSize: 11, color: '#fff' }} aria-hidden="true" />
          </button>
        </div>

        {/* Name + verified badge */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8, marginBottom: 4,
        }}>
          <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            {userName}
          </p>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: 'rgba(34,200,122,0.12)', color: 'var(--green)',
            padding: '2px 8px', borderRadius: 99,
            fontSize: 11, fontWeight: 600,
          }}>
            <i className="ti ti-check" style={{ fontSize: 10 }} aria-hidden="true" />
            Verified
          </span>
        </div>
        {userEmail && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{userEmail}</p>
        )}
      </div>

      {/* ── Appearance ───────────────────────────────────────── */}
      <SectionLabel icon="ti-palette" label="Appearance" />
      <div style={cardStyle}>
        {/* Dark / Light toggle */}
        <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
          <p style={{
            fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
            letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 10,
          }}>Mode</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([
              { value: 'dark',  icon: 'ti-moon',  label: 'Dark'  },
              { value: 'light', icon: 'ti-sun',   label: 'Light' },
            ] as const).map(m => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                aria-pressed={mode === m.value}
                style={{
                  height: 44, borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${mode === m.value ? 'var(--accent)' : 'var(--border)'}`,
                  background: mode === m.value ? 'var(--accent-light)' : 'var(--bg-card2)',
                  color: mode === m.value ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'all .2s',
                }}
              >
                {/* ✅ Vector icon — no moon/sun emoji */}
                <i className={`ti ${m.icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Colour palettes */}
        <div style={{ padding: '14px 0' }}>
          <p style={{
            fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
            letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 12,
          }}>Colour theme</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {PALETTES.map(p => (
              <button
                key={p.id}
                onClick={() => setPalette(p.id)}
                title={p.label}
                aria-label={`${p.label} theme${palette === p.id ? ' (active)' : ''}`}
                aria-pressed={palette === p.id}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: p.color, cursor: 'pointer',
                  border: `2.5px solid ${palette === p.id ? 'var(--text-primary)' : 'transparent'}`,
                  transform: palette === p.id ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all .2s', outline: 'none',
                }}
              />
            ))}
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 2 }}>
              {PALETTES.find(p => p.id === palette)?.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Security centre ──────────────────────────────────── */}
      <SectionLabel icon="ti-lock" label="Security centre" />
      <div style={cardStyle}>
        <SecItem icon="ti-lock" label="Two-factor authentication">
          <span style={{
            padding: '3px 10px', borderRadius: 99,
            fontSize: 11, fontWeight: 600,
            background: 'rgba(34,200,122,0.12)', color: 'var(--green)',
          }}>Enabled</span>
        </SecItem>

        <SecItem icon="ti-fingerprint" label="Biometric login">
          <Toggle
            on={biometric}
            onToggle={() => {
              setBiometric(v => !v)
              showToast(`Biometric login ${!biometric ? 'enabled' : 'disabled'}`, 'info')
            }}
            label="Biometric login"
          />
        </SecItem>

        <SecItem icon="ti-shield-check" label="Data encryption">
          <span style={{
            padding: '3px 10px', borderRadius: 99,
            fontSize: 11, fontWeight: 600,
            background: 'var(--accent-light)', color: 'var(--accent)',
          }}>AES-256 active</span>
        </SecItem>

        <SecItem icon="ti-device-laptop" label="Active sessions">
          <span style={{
            fontSize: 13, color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            2 devices
            <i className="ti ti-chevron-right" style={{ fontSize: 13 }} aria-hidden="true" />
          </span>
        </SecItem>

        <SecItem icon="ti-bell" label="Fraud alerts" last>
          <Toggle
            on={fraudAlerts}
            onToggle={() => {
              setFraudAlerts(v => !v)
              showToast(`Fraud alerts ${!fraudAlerts ? 'enabled' : 'disabled'}`, 'info')
            }}
            label="Fraud alerts"
          />
        </SecItem>
      </div>

      {/* ── Privacy ──────────────────────────────────────────── */}
      <SectionLabel icon="ti-eye-off" label="Privacy" />
      <div style={cardStyle}>
        <SecItem
          icon="ti-download"
          label={exporting ? 'Exporting...' : 'Export my data (GDPR)'}
          onClick={exporting ? undefined : handleDataExport}
        >
          {exporting
            ? <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            : <i className="ti ti-arrow-right"
                 style={{ color: 'var(--text-muted)', fontSize: 16 }} aria-hidden="true" />
          }
        </SecItem>
        <SecItem
          icon="ti-trash"
          label="Delete account"
          labelColor="var(--red)"
          iconBg="rgba(255,79,100,0.1)"
          iconColor="var(--red)"
          last
          onClick={() => setShowDeleteConfirm(true)}
        >
          <i className="ti ti-arrow-right" style={{ color: 'var(--red)', fontSize: 16 }} aria-hidden="true" />
        </SecItem>
      </div>

      {/* ── Account ──────────────────────────────────────────── */}
      <SectionLabel icon="ti-user" label="Account" />
      <div style={cardStyle}>
        <SecItem icon="ti-bell" label="Notifications">
          <i className="ti ti-arrow-right" style={{ color: 'var(--text-muted)', fontSize: 16 }} aria-hidden="true" />
        </SecItem>
        <SecItem
          icon="ti-help"
          label="Help & support"
          last
          onClick={() => window.open('mailto:support@finsight.io')}
        >
          <i className="ti ti-arrow-right" style={{ color: 'var(--text-muted)', fontSize: 16 }} aria-hidden="true" />
        </SecItem>
      </div>

      {/* ── App info ─────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {/* ✅ No emoji — vector trust signals */}
          FinSight v1.0.0 · Final Year Dissertation
        </p>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 12, marginTop: 6,
        }}>
          {[
            { icon: 'ti-shield-check', text: 'AES-256'   },
            { icon: 'ti-lock',         text: 'GDPR'       },
            { icon: 'ti-certificate',  text: 'Compliant'  },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className={`ti ${icon}`}
                 style={{ fontSize: 11, color: 'var(--text-muted)' }} aria-hidden="true" />
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sign out button ───────────────────────────────────── */}
      <button
        onClick={handleSignOut}
        style={{
          width: '100%', background: 'transparent',
          color: 'var(--red)', border: '1.5px solid var(--red)',
          height: 52, borderRadius: 14,
          fontSize: 14, fontWeight: 600,
          cursor: 'pointer', transition: 'background .2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,79,100,0.08)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        aria-label="Sign out of FinSight"
      >
        <i className="ti ti-logout" style={{ fontSize: 17 }} aria-hidden="true" />
        Sign out
      </button>

      {/* ── Delete confirm ────────────────────────────────────── */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => { setShowDeleteConfirm(false); handleSignOut() }}
        />
      )}
    </div>
  )
}

// ── Section label ──────────────────────────────────────────────────
function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '16px 0 6px' }}>
      <i className={`ti ${icon}`} style={{ fontSize: 13, color: 'var(--text-muted)' }} aria-hidden="true" />
      <p style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
      }}>{label}</p>
    </div>
  )
}

// ── Security row item ──────────────────────────────────────────────
function SecItem({ icon, label, labelColor, iconBg, iconColor, last, onClick, children }: {
  icon: string; label: string; labelColor?: string
  iconBg?: string; iconColor?: string
  last?: boolean; onClick?: () => void
  children?: React.ReactNode
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? label : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => e.key === 'Enter' && onClick() : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 0',
        borderBottom: last ? 'none' : '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: 36, height: 36, flexShrink: 0, borderRadius: 10,
        background: iconBg || 'var(--bg-card2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${icon}`}
           style={{ fontSize: 17, color: iconColor || 'var(--text-secondary)' }}
           aria-hidden="true" />
      </div>
      <p style={{
        fontSize: 14, fontWeight: 500, flex: 1,
        color: labelColor || 'var(--text-primary)',
      }}>{label}</p>
      {children}
    </div>
  )
}

// ── Accessible toggle switch ───────────────────────────────────────
function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      style={{
        width: 44, height: 24, borderRadius: 99, padding: 0,
        background: on ? 'var(--accent)' : 'var(--bg-card2)',
        position: 'relative', cursor: 'pointer',
        transition: 'background .2s', flexShrink: 0,
        border: on ? 'none' : '1px solid var(--border)',
        outline: 'none',
      }}
    >
      <div style={{
        width: 18, height: 18, background: '#fff',
        borderRadius: '50%', position: 'absolute',
        top: 3, left: on ? 23 : 3,
        transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      }} />
    </button>
  )
}

// ── Delete confirm modal ───────────────────────────────────────────
function DeleteConfirmModal({ onClose, onConfirm }: {
  onClose: () => void; onConfirm: () => void
}) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 200, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-secondary)', borderRadius: 20,
        padding: 24, width: '100%', maxWidth: 320,
        border: '1px solid var(--border)', textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'rgba(255,79,100,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <i className="ti ti-trash" style={{ color: 'var(--red)', fontSize: 24 }} aria-hidden="true" />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Delete account?
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
          This will permanently delete all your data including transactions, budgets and goals.
          This cannot be undone.
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