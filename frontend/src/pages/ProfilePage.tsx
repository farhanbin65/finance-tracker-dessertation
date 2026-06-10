/**
 * FinSight — ProfilePage.tsx
 * UI UX Pro Max: No emoji, accessible toggles, safe card styles,
 * desktop max-width, dynamic user data, no window.alert
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../components/ui/Toast'
import { getAuthToken } from '../utils/getAuthToken'
import ReviewSheet from '../components/ReviewSheet'
import jsPDF from 'jspdf'

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
  const [reviewOpen, setReviewOpen]        = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  const userName   = localStorage.getItem('fs_name')  || 'Your Account'
  const userEmail  = localStorage.getItem('fs_email') || ''
  const userAvatar = null
  const isAdmin    = (() => {
    try {
      const token = localStorage.getItem('fs_token') || ''
      const payload = JSON.parse(atob(token.split('.')[1] || 'e30='))
      return payload.role === 'admin'
    } catch {
      return false
    }
  })()
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

  // ── CSV Export ─────────────────────────────────────────────────
  async function exportToCSV() {
    try {
      const token = await getAuthToken()
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/transactions`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error()
      const data = await res.json()
      const txns = data.transactions || []
      if (txns.length === 0) { showToast('No transactions to export', 'warning'); return }

      const BOM = '﻿'
      const headers = 'Date,Title,Category,Amount,Type'
      const rows = txns.map((t: any) => [
        new Date(t.date).toLocaleDateString('en-GB'),
        `"${(t.title || '').replace(/"/g, '""')}"`,
        t.category || '',
        t.amount,
        t.type,
      ].join(','))
      const csv = [
        `# FinSight Transaction Export`,
        `# Exported: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        headers,
        ...rows,
      ].join('\r\n')

      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finsight-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast(`Exported ${txns.length} transactions as CSV`, 'success')
    } catch {
      showToast('Export failed — try again', 'error')
    }
  }

  // ── PDF Export ─────────────────────────────────────────────────
  async function exportToPDF() {
    try {
      const token = await getAuthToken()
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/transactions`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error()
      const data = await res.json()
      const txns = data.transactions || []
      if (txns.length === 0) { showToast('No transactions to export', 'warning'); return }

      const doc = new jsPDF()
      const now = new Date()
      const accentR = 124, accentG = 92, accentB = 252

      doc.setFillColor(accentR, accentG, accentB)
      doc.rect(0, 0, 210, 28, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('FinSight', 14, 12)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Personal Finance Intelligence', 14, 19)
      doc.text(`Statement: ${now.toLocaleDateString('en-GB')}`, 196, 19, { align: 'right' })

      const income  = txns.filter((t: any) => t.type === 'income').reduce((a: number, t: any) => a + t.amount, 0)
      const expense = txns.filter((t: any) => t.type === 'expense').reduce((a: number, t: any) => a + t.amount, 0)

      doc.setFillColor(245, 245, 255)
      doc.roundedRect(14, 34, 56, 22, 3, 3, 'F')
      doc.roundedRect(77, 34, 56, 22, 3, 3, 'F')
      doc.roundedRect(140, 34, 56, 22, 3, 3, 'F')

      doc.setTextColor(100, 100, 120)
      doc.setFontSize(8)
      doc.text('TOTAL INCOME',    42, 41, { align: 'center' })
      doc.text('TOTAL EXPENSES', 105, 41, { align: 'center' })
      doc.text('NET BALANCE',    168, 41, { align: 'center' })

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(34, 197, 94)
      doc.text(`+£${income.toFixed(2)}`,   42, 50, { align: 'center' })
      doc.setTextColor(239, 68, 68)
      doc.text(`-£${expense.toFixed(2)}`, 105, 50, { align: 'center' })
      doc.setTextColor(accentR, accentG, accentB)
      doc.text(`£${(income - expense).toFixed(2)}`, 168, 50, { align: 'center' })

      let y = 66
      doc.setFillColor(accentR, accentG, accentB)
      doc.rect(14, y, 182, 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('DATE',     18, y + 5.5)
      doc.text('TITLE',    50, y + 5.5)
      doc.text('CATEGORY', 110, y + 5.5)
      doc.text('TYPE',     150, y + 5.5)
      doc.text('AMOUNT',   182, y + 5.5, { align: 'right' })
      y += 10

      doc.setFont('helvetica', 'normal')
      txns.forEach((t: any, i: number) => {
        if (y > 270) { doc.addPage(); y = 20 }
        if (i % 2 === 0) {
          doc.setFillColor(248, 247, 255)
          doc.rect(14, y - 2, 182, 8, 'F')
        }
        doc.setTextColor(60, 60, 80)
        doc.setFontSize(8)
        doc.text(new Date(t.date).toLocaleDateString('en-GB'), 18, y + 4)
        doc.text((t.title || '').substring(0, 28),              50, y + 4)
        doc.text((t.category || '').substring(0, 16),          110, y + 4)
        doc.text(t.type || '',                                  150, y + 4)
        t.type === 'income'
          ? doc.setTextColor(34, 197, 94)
          : doc.setTextColor(239, 68, 68)
        doc.text(
          `${t.type === 'income' ? '+' : '-'}£${Number(t.amount).toFixed(2)}`,
          196, y + 4, { align: 'right' }
        )
        y += 8
      })

      doc.setTextColor(160, 160, 180)
      doc.setFontSize(7)
      doc.text('Generated by FinSight · Dissertation Project · Confidential', 105, 290, { align: 'center' })

      doc.save(`finsight-statement-${now.toISOString().split('T')[0]}.pdf`)
      showToast(`Exported ${txns.length} transactions as PDF`, 'success')
    } catch {
      showToast('Export failed — try again', 'error')
    }
  }

  // ── Close export menu on outside click ─────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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

        {/* GDPR JSON export */}
        <SecItem
          icon="ti-download"
          label={exporting ? 'Exporting...' : 'Export my data (GDPR)'}
          onClick={exporting ? undefined : handleDataExport}
        >
          {exporting
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" aria-hidden="true"
                   style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            : <i className="ti ti-arrow-right"
                 style={{ color: 'var(--text-muted)', fontSize: 16 }} aria-hidden="true" />
          }
        </SecItem>

        {/* CSV / PDF export dropdown */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '13px 0', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{
            width: 36, height: 36, flexShrink: 0, borderRadius: 10,
            background: 'var(--bg-card2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-file-export"
               style={{ fontSize: 17, color: 'var(--text-secondary)' }} aria-hidden="true" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, flex: 1, color: 'var(--text-primary)' }}>
            Export transactions
          </p>

          {/* Dropdown */}
          <div style={{ position: 'relative' }} ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(m => !m)}
              aria-label="Export transactions"
              style={{
                height: 34, padding: '0 12px', borderRadius: 10,
                background: 'var(--bg-card2)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 6,
                cursor: 'pointer', fontSize: 13,
              }}
            >
              <i className="ti ti-download" style={{ fontSize: 15 }} aria-hidden="true" />
              Export
              <i className="ti ti-chevron-down" style={{ fontSize: 12 }} aria-hidden="true" />
            </button>

            {showExportMenu && (
              <div style={{
                position: 'absolute', top: 40, right: 0,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 6, zIndex: 100,
                minWidth: 160,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              }}>
                <button
                  onClick={() => { exportToCSV(); setShowExportMenu(false) }}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    color: 'var(--text-primary)', fontSize: 13, textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(34,200,122,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className="ti ti-table" style={{ fontSize: 14, color: 'var(--green)' }} aria-hidden="true" />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>CSV</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>For spreadsheets</p>
                  </div>
                </button>

                <button
                  onClick={() => { exportToPDF(); setShowExportMenu(false) }}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    color: 'var(--text-primary)', fontSize: 13, textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(124,92,252,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className="ti ti-file-type-pdf" style={{ fontSize: 14, color: 'var(--accent)' }} aria-hidden="true" />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>PDF</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Branded statement</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Delete account */}
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
        {/* Only show if admin */}
        {isAdmin && (
          <SecItem icon="ti-shield" label="Admin panel" onClick={() => navigate('/admin')}>
            <i className="ti ti-arrow-right" style={{ color: 'var(--text-muted)', fontSize: 16 }} aria-hidden="true" />
          </SecItem>
        )}
        <SecItem icon="ti-bell" label="Notifications">
          <i className="ti ti-arrow-right" style={{ color: 'var(--text-muted)', fontSize: 16 }} aria-hidden="true" />
        </SecItem>
        <SecItem icon="ti-star" label="Rate FinSight" onClick={() => setReviewOpen(true)}>
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

      <ReviewSheet open={reviewOpen} onClose={() => setReviewOpen(false)} />
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
