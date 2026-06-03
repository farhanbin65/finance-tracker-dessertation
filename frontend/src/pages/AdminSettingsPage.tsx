/**
 * FinSight — AdminSettingsPage.tsx
 * Settings for admin users — theme, appearance, profile.
 * Profile customisation (avatar, name) scaffolded for future.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../components/ui/Toast'

const PALETTES = [
  { id: 'purple', color: '#7c5cfc', label: 'Violet' },
  { id: 'blue',   color: '#3b82f6', label: 'Blue'   },
  { id: 'gold',   color: '#f0b429', label: 'Gold'   },
  { id: 'teal',   color: '#0ea5e9', label: 'Teal'   },
  { id: 'rose',   color: '#f43f5e', label: 'Rose'   },
] as const

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: '4px 16px',
  marginBottom: 14,
}

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

function SettingRow({ icon, label, iconBg, iconColor, last, onClick, children }: {
  icon: string; label: string; iconBg?: string; iconColor?: string
  last?: boolean; onClick?: () => void; children?: React.ReactNode
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
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
      <p style={{ fontSize: 14, fontWeight: 500, flex: 1, color: 'var(--text-primary)' }}>
        {label}
      </p>
      {children}
    </div>
  )
}

export default function AdminSettingsPage() {
  const navigate                           = useNavigate()
  const { mode, palette, setMode, setPalette } = useTheme()
  const { showToast }                      = useToast()

  const userName = localStorage.getItem('fs_name')  || 'FinSight Admin'
  const userEmail = localStorage.getItem('fs_email') || 'admin@finsight.com'
  const initials  = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  // Future — profile edit state (scaffolded)
  const [editingName, setEditingName]   = useState(false)
  const [nameInput, setNameInput]       = useState(userName)

  function saveDisplayName() {
    if (!nameInput.trim()) return
    localStorage.setItem('fs_name', nameInput.trim())
    setEditingName(false)
    showToast('Display name updated', 'success')
  }

  function handleSignOut() {
    localStorage.clear()
    window.location.href = '/login'
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 40 }}>

      {/* ── Back button ───────────────────────────────────── */}
      <button onClick={() => navigate('/admin')} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, padding: 0,
      }}>
        <i className="ti ti-arrow-left" style={{ fontSize: 15 }} aria-hidden="true" />
        Back to admin
      </button>

      {/* ── Profile hero ──────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '0 20px 24px' }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(255,79,100,0.12)',
            border: '3px solid var(--red)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: 'var(--red)',
            margin: '0 auto',
          }}>
            {initials}
          </div>
          {/* Future — avatar upload badge */}
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 26, height: 26,
            background: 'var(--bg-card2)',
            border: '2px solid var(--border)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'not-allowed', opacity: 0.5,
          }} title="Avatar upload coming soon">
            <i className="ti ti-camera" style={{ fontSize: 11, color: 'var(--text-muted)' }} aria-hidden="true" />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
          <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            {userName}
          </p>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            background: 'rgba(255,79,100,0.12)', color: 'var(--red)',
            letterSpacing: '.06em', textTransform: 'uppercase',
          }}>Admin</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{userEmail}</p>
      </div>

      {/* ── Profile ───────────────────────────────────────── */}
      <SectionLabel icon="ti-user" label="Profile" />
      <div style={cardStyle}>
        <SettingRow icon="ti-pencil" label="Display name"
          iconBg="var(--accent-light)" iconColor="var(--accent)">
          {editingName ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveDisplayName()}
                autoFocus
                style={{
                  height: 34, padding: '0 10px',
                  background: 'var(--bg-card2)',
                  border: '1px solid var(--accent)',
                  borderRadius: 8, color: 'var(--text-primary)',
                  fontSize: 13, outline: 'none', width: 140,
                }}
              />
              <button onClick={saveDisplayName} style={{
                height: 34, padding: '0 12px', borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>Save</button>
              <button onClick={() => { setEditingName(false); setNameInput(userName) }} style={{
                height: 34, padding: '0 10px', borderRadius: 8,
                background: 'var(--bg-card2)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
              }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setEditingName(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--accent)', fontSize: 13,
            }}>
              Edit
              <i className="ti ti-chevron-right" style={{ fontSize: 13 }} aria-hidden="true" />
            </button>
          )}
        </SettingRow>

        <SettingRow icon="ti-camera" label="Profile avatar"
          iconBg="var(--bg-card2)" iconColor="var(--text-muted)" last>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 99,
            background: 'var(--bg-card2)', color: 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}>Coming soon</span>
        </SettingRow>
      </div>

      {/* ── Appearance ────────────────────────────────────── */}
      <SectionLabel icon="ti-palette" label="Appearance" />
      <div style={cardStyle}>

        {/* Mode toggle */}
        <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
          <p style={{
            fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
            letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 10,
          }}>Mode</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([
              { value: 'dark',  icon: 'ti-moon', label: 'Dark'  },
              { value: 'light', icon: 'ti-sun',  label: 'Light' },
            ] as const).map(m => (
              <button
                key={m.value}
                onClick={() => {
                  setMode(m.value)
                  showToast(`${m.label} mode enabled`, 'success')
                }}
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
                <i className={`ti ${m.icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Colour palette */}
        <div style={{ padding: '14px 0' }}>
          <p style={{
            fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
            letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 12,
          }}>Colour theme</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {PALETTES.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setPalette(p.id)
                  showToast(`${p.label} theme applied`, 'success')
                }}
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

      {/* ── System ────────────────────────────────────────── */}
      <SectionLabel icon="ti-settings" label="System" />
      <div style={cardStyle}>
        <SettingRow icon="ti-users" label="Manage users"
          iconBg="var(--accent-light)" iconColor="var(--accent)"
          onClick={() => navigate('/admin')}>
          <i className="ti ti-arrow-right" style={{ color: 'var(--text-muted)', fontSize: 16 }} aria-hidden="true" />
        </SettingRow>
        <SettingRow icon="ti-help" label="Help & support"
          iconBg="var(--bg-card2)" iconColor="var(--text-muted)"
          last
          onClick={() => window.open('mailto:support@finsight.io')}>
          <i className="ti ti-arrow-right" style={{ color: 'var(--text-muted)', fontSize: 16 }} aria-hidden="true" />
        </SettingRow>
      </div>

      {/* ── App info ──────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          FinSight v1.0.0 · Admin Panel · Final Year Dissertation
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 6 }}>
          {[
            { icon: 'ti-shield-check', text: 'AES-256'  },
            { icon: 'ti-lock',         text: 'GDPR'      },
            { icon: 'ti-certificate',  text: 'Compliant' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className={`ti ${icon}`} style={{ fontSize: 11, color: 'var(--text-muted)' }} aria-hidden="true" />
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sign out ──────────────────────────────────────── */}
      <button
        onClick={handleSignOut}
        style={{
          width: '100%', background: 'transparent',
          color: 'var(--red)', border: '1.5px solid var(--red)',
          height: 52, borderRadius: 14,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,79,100,0.08)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <i className="ti ti-logout" style={{ fontSize: 17 }} aria-hidden="true" />
        Sign out
      </button>
    </div>
  )
}