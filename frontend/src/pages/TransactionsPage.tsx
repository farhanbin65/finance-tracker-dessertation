/**
 * FinSight — TransactionsPage.tsx
 * UI UX Pro Max: Vector icons, mobile swipe-delete, custom confirm,
 * shimmer skeleton, accessible search, desktop-safe modal
 */
import jsPDF from 'jspdf'
import { useState, useEffect, useRef } from 'react'
import { useToast } from '../components/ui/Toast'
import { getAuthToken } from '../utils/getAuthToken'
import { useIsDesktop } from '../hooks/useIsDesktop'

const API_URL = import.meta.env.VITE_API_URL || ''

// ── Types ──────────────────────────────────────────────────────────
interface Transaction {
  id: string; title: string; amount: number
  type: 'income' | 'expense'; category: string
  date: string; created_at: string; notes: string
}
interface GroupedTransactions { [dateLabel: string]: Transaction[] }

// ── Category → Tabler icon + colour (NO emoji) ─────────────────────
const CAT_META: Record<string, { icon: string; color: string }> = {
  income:        { icon: 'ti-cash',                color: '#22c87a' },
  food:          { icon: 'ti-tools-kitchen-2',     color: '#ff9f43' },
  transport:     { icon: 'ti-car',                 color: '#7c5cfc' },
  subscriptions: { icon: 'ti-device-tv',           color: '#ff4f64' },
  shopping:      { icon: 'ti-shopping-bag',        color: '#ff9f43' },
  entertainment: { icon: 'ti-confetti',            color: '#0ea5e9' },
  health:        { icon: 'ti-heart-rate-monitor',  color: '#34d399' },
  utilities:     { icon: 'ti-bulb',                color: '#a78bfa' },
  salary:        { icon: 'ti-cash',                color: '#22c87a' },
  rent:          { icon: 'ti-home',                color: '#7c5cfc' },
  default:       { icon: 'ti-credit-card',         color: '#8b90a4' },
}
const getCat = (cat: string) =>
  CAT_META[cat.toLowerCase()] ?? CAT_META.default

// ── Date grouping ──────────────────────────────────────────────────
function groupByDate(txs: Transaction[]): GroupedTransactions {
  const today     = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  return txs.reduce((acc, tx) => {
    const d = new Date(tx.date); d.setHours(0, 0, 0, 0)
    const label =
      d.getTime() === today.getTime()     ? 'Today' :
      d.getTime() === yesterday.getTime() ? 'Yesterday' :
      d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    return { ...acc, [label]: [...(acc[label] || []), tx] }
  }, {} as GroupedTransactions)
}

// ── Filters ────────────────────────────────────────────────────────
const FILTERS = ['All', 'Income', 'Expenses', 'This Week', 'This Month'] as const
type Filter = typeof FILTERS[number]

function applyFilter(txs: Transaction[], f: Filter): Transaction[] {
  const now = new Date()
  if (f === 'Income')   return txs.filter(t => t.type === 'income')
  if (f === 'Expenses') return txs.filter(t => t.type === 'expense')
  if (f === 'This Week') {
    const ago = new Date(now); ago.setDate(now.getDate() - 7)
    return txs.filter(t => new Date(t.date) >= ago)
  }
  if (f === 'This Month')
    return txs.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
  return txs
}

// ── Shimmer block ──────────────────────────────────────────────────
function Shimmer({ height = 72, radius = 14 }: { height?: number; radius?: number }) {
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

// ── Inline confirm dialog (replaces window.confirm) ────────────────
function ConfirmDialog({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 24px',
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '24px 20px', width: '100%', maxWidth: 320,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, margin: '0 auto 14px',
          background: 'rgba(255,79,100,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-trash" style={{ fontSize: 22, color: 'var(--red)' }} aria-hidden="true" />
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
          textAlign: 'center', marginBottom: 6 }}>Delete transaction?</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center',
          marginBottom: 20, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={onCancel} style={{
            height: 44, borderRadius: 12, border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: 'var(--text-secondary)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
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

// ══════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════
export default function TransactionsPage() {
  const { showToast } = useToast()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [filter, setFilter]             = useState<Filter>('All')
  const [search, setSearch]             = useState('')
  const [showSearch, setShowSearch]     = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget]     = useState<Transaction | null>(null)
  const [confirmId, setConfirmId]       = useState<string | null>(null)
  const searchRef                       = useRef<HTMLInputElement>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef                   = useRef<HTMLDivElement>(null)
  const isDesktop = useIsDesktop()

  // ── CSV Export ────────────────────────────────────────────────
  // ── Export utilities ──────────────────────────────────────────
  function exportToCSV() {
    if (filtered.length === 0) { showToast('No transactions to export', 'warning'); return }

    const headers = ['Date', 'Title', 'Type', 'Category', 'Amount', 'Notes']
    const rows = filtered.map(tx => {
      const d   = new Date(tx.date)
      const day = String(d.getDate()).padStart(2, '0')
      const mon = String(d.getMonth() + 1).padStart(2, '0')
      const yr  = d.getFullYear()
      const safe = (s: string) => `"${(s || '').replace(/"/g, '""')}"`
      return [
        `${day}/${mon}/${yr}`,
        safe(tx.title),
        tx.type,
        tx.category,
        tx.type === 'income' ? tx.amount.toFixed(2) : `-${tx.amount.toFixed(2)}`,
        safe(tx.notes || ''),
      ].join(',')
    })

    const csv = [
      `# FinSight Transaction Export`,
      `# Exported: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      `# Filter: ${filter} | Records: ${filtered.length}`,
      `# Income: ${totalIncome.toFixed(2)} | Spent: ${totalExpense.toFixed(2)}`,
      ``,
      headers.join(','),
      ...rows,
    ].join('\r\n')

    const BOM  = '\uFEFF'
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `finsight-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`Exported ${filtered.length} transactions as CSV`, 'success')
  }

  function exportToPDF() {
    if (filtered.length === 0) { showToast('No transactions to export', 'warning'); return }

    const doc      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW    = 210
    const pageH    = 297
    const margin   = 16
    const colW     = pageW - margin * 2
    const userName = localStorage.getItem('fs_name') || 'FinSight User'
    const now      = new Date()
    const dateStr  = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    // ── Brand colours ──
    const PURPLE  = [124, 92, 252] as [number, number, number]
    const DARK    = [21,  18,  27] as [number, number, number]
    const MUTED   = [120, 115, 140] as [number, number, number]
    const GREEN   = [34, 200, 122] as [number, number, number]
    const RED     = [255,  79, 100] as [number, number, number]
    const WHITE   = [255, 255, 255] as [number, number, number]
    const BORDER  = [220, 215, 235] as [number, number, number]
    const HEADER_BG = [245, 242, 255] as [number, number, number]

    let y = 0

    // ── Header banner ──
    doc.setFillColor(...DARK)
    doc.rect(0, 0, pageW, 38, 'F')

    // Logo circle
    doc.setFillColor(...PURPLE)
    doc.circle(margin + 6, 19, 6, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('F', margin + 6, 21, { align: 'center' })

    // App name
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('FinSight', margin + 16, 16)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(180, 170, 200)
    doc.text('Personal Finance Intelligence', margin + 16, 22)

    // Statement label (right side)
    doc.setTextColor(...WHITE)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Transaction Statement', pageW - margin, 15, { align: 'right' })
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(180, 170, 200)
    doc.text(`Generated: ${dateStr}`, pageW - margin, 21, { align: 'right' })

    y = 46

    // ── Meta info row ──
    doc.setFillColor(...HEADER_BG)
    doc.roundedRect(margin, y, colW, 20, 2, 2, 'F')

    doc.setTextColor(...MUTED)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('ACCOUNT HOLDER', margin + 6, y + 6)
    doc.text('EXPORT DATE', margin + 70, y + 6)
    doc.text('FILTER', margin + 130, y + 6)
    doc.text('TOTAL RECORDS', margin + 160, y + 6)

    doc.setTextColor(...DARK)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(userName, margin + 6, y + 14)
    doc.text(dateStr, margin + 70, y + 14)
    doc.text(filter, margin + 130, y + 14)
    doc.text(String(filtered.length), margin + 160, y + 14)

    y += 26

    // ── Summary cards ──
    const cardW = (colW - 8) / 2
    // Income card
    doc.setFillColor(220, 250, 235)
    doc.roundedRect(margin, y, cardW, 18, 2, 2, 'F')
    doc.setTextColor(20, 120, 80)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL INCOME', margin + 6, y + 6)
    doc.setFontSize(13)
    doc.text(`+£${totalIncome.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, margin + 6, y + 14)

    // Expenses card
    doc.setFillColor(255, 235, 238)
    doc.roundedRect(margin + cardW + 8, y, cardW, 18, 2, 2, 'F')
    doc.setTextColor(180, 30, 60)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL SPENT', margin + cardW + 14, y + 6)
    doc.setFontSize(13)
    doc.text(`-£${totalExpense.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, margin + cardW + 14, y + 14)

    y += 24

    // ── Table header ──
    doc.setFillColor(...PURPLE)
    doc.rect(margin, y, colW, 9, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')

    // Column positions
    const cols = {
      date:     margin + 2,
      title:    margin + 28,
      type:     margin + 88,
      category: margin + 108,
      amount:   pageW - margin - 2,
    }

    doc.text('DATE',     cols.date,     y + 6)
    doc.text('TITLE',    cols.title,    y + 6)
    doc.text('TYPE',     cols.type,     y + 6)
    doc.text('CATEGORY', cols.category, y + 6)
    doc.text('AMOUNT',   cols.amount,   y + 6, { align: 'right' })

    y += 10

    // ── Transaction rows ──
    const ROW_H = 8
    let rowNum  = 0

    for (const tx of filtered) {
      // New page if needed
      if (y + ROW_H > pageH - 20) {
        doc.addPage()
        y = 16

        // Repeat header on new page
        doc.setFillColor(...PURPLE)
        doc.rect(margin, y, colW, 9, 'F')
        doc.setTextColor(...WHITE)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        doc.text('DATE',     cols.date,     y + 6)
        doc.text('TITLE',    cols.title,    y + 6)
        doc.text('TYPE',     cols.type,     y + 6)
        doc.text('CATEGORY', cols.category, y + 6)
        doc.text('AMOUNT',   cols.amount,   y + 6, { align: 'right' })
        y += 10
        rowNum = 0
      }

      // Alternating row background
      if (rowNum % 2 === 0) {
        doc.setFillColor(250, 248, 255)
        doc.rect(margin, y, colW, ROW_H, 'F')
      }

      // Date
      const d   = new Date(tx.date)
      const day = String(d.getDate()).padStart(2, '0')
      const mon = String(d.getMonth() + 1).padStart(2, '0')
      const yr  = String(d.getFullYear())
      doc.setTextColor(...MUTED)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text(`${day}/${mon}/${yr}`, cols.date, y + 5.5)

      // Title — truncate if long
      const title = tx.title.length > 30 ? tx.title.slice(0, 28) + '…' : tx.title
      doc.setTextColor(...DARK)
      doc.setFont('helvetica', 'bold')
      doc.text(title, cols.title, y + 5.5)

      // Type badge
      if (tx.type === 'income') {
        doc.setFillColor(...GREEN)
      } else {
        doc.setFillColor(...RED)
      }
      doc.roundedRect(cols.type - 1, y + 1.5, 16, 5, 1, 1, 'F')
      doc.setTextColor(...WHITE)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.text(tx.type === 'income' ? 'INCOME' : 'EXPENSE', cols.type + 7, y + 5.5, { align: 'center' })

      // Category
      doc.setTextColor(...MUTED)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text(tx.category, cols.category, y + 5.5)

      // Amount
      const isIncome = tx.type === 'income'
      doc.setTextColor(...(isIncome ? GREEN : RED))
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      const amtStr = `${isIncome ? '+' : '-'}£${tx.amount.toFixed(2)}`
      doc.text(amtStr, cols.amount, y + 5.5, { align: 'right' })

      // Bottom border
      doc.setDrawColor(...BORDER)
      doc.setLineWidth(0.2)
      doc.line(margin, y + ROW_H, margin + colW, y + ROW_H)

      y += ROW_H
      rowNum++
    }

    // ── Footer on last page ──
    y += 8
    if (y + 20 > pageH) { doc.addPage(); y = 16 }

    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.3)
    doc.line(margin, y, margin + colW, y)
    y += 6

    doc.setTextColor(...MUTED)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `FinSight · Personal Finance Intelligence · ${dateStr} · ${filtered.length} transactions`,
      pageW / 2, y, { align: 'center' }
    )
    doc.setFontSize(6)
    doc.text(
      'This document was generated automatically. For queries contact support@finsight.io',
      pageW / 2, y + 5, { align: 'center' }
    )

    // Page numbers
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setTextColor(...MUTED)
      doc.setFontSize(7)
      doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 8, { align: 'right' })
    }

    // Save
    doc.save(`finsight-statement-${now.toISOString().split('T')[0]}.pdf`)
    showToast(`Exported ${filtered.length} transactions as PDF`, 'success')
  }

  useEffect(() => { fetchTransactions() }, [])

  // Auto-focus search when shown
  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 50)
  }, [showSearch])

  // Close export menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function getToken() {
    return getAuthToken()
  }

  async function fetchTransactions() {
    try {
      setLoading(true); setError(null)
      const token = await getToken()
      const res = await fetch(`${API_URL}/api/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setTransactions(data.transactions || [])
    } catch {
      setTransactions([])
      setError('Could not load transactions. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  async function confirmDelete(id: string) {
    try {
      const token = await getToken()
      await fetch(`${API_URL}/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setTransactions(prev => prev.filter(t => t.id !== id))
      showToast('Transaction deleted', 'success')
    } catch {
      showToast('Failed to delete. Please try again.', 'error')
    } finally {
      setConfirmId(null)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────
  const searched = search.trim()
    ? transactions.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase()))
    : transactions

  const filtered       = applyFilter(searched, filter)
  const grouped        = groupByDate(filtered)
  const totalIncome    = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense   = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const confirmingItem = transactions.find(t => t.id === confirmId)

  return (
    <div style={{
  width: '100%',
  maxWidth: isDesktop ? '960px' : '100%',
  margin: '0 auto',
  padding: isDesktop ? '24px 32px 32px' : '0 0 32px',
}}>
      <style>{`
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Summary cards ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <SummaryCard label="Income" value={totalIncome}  color="var(--green)" icon="ti-trending-up"   />
        <SummaryCard label="Spent"  value={totalExpense} color="var(--red)"   icon="ti-trending-down" />
      </div>

      {/* ── Search + filter row ───────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {/* Search toggle button */}
        <button
          onClick={() => { setShowSearch(s => !s); if (showSearch) setSearch('') }}
          aria-label={showSearch ? 'Close search' : 'Search transactions'}
          style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: showSearch ? 'var(--accent-light)' : 'var(--bg-card)',
            border: `1px solid ${showSearch ? 'var(--accent)' : 'var(--border)'}`,
            color: showSearch ? 'var(--accent)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all .2s',
          }}
        >
          <i className={showSearch ? 'ti ti-x' : 'ti ti-search'} style={{ fontSize: 17 }} />
        </button>

        {/* Filter pills — horizontal scroll */}
        <div style={{
          display: 'flex', gap: 7, overflowX: 'auto', flex: 1,
          scrollbarWidth: 'none', paddingBottom: 2,
        }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              style={{
                padding: '8px 14px', borderRadius: 99,
                fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
                cursor: 'pointer', border: '1px solid',
                borderColor: filter === f ? 'var(--accent)' : 'var(--border)',
                background:  filter === f ? 'var(--accent)' : 'var(--bg-card)',
                color:       filter === f ? '#fff' : 'var(--text-secondary)',
                transition: 'all .2s',
              }}
            >{f}</button>
          ))}
        </div>

        {/* Export split button — CSV or PDF */}
        <div style={{ position: 'relative', flexShrink: 0 }} ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(m => !m)}
            aria-label="Export transactions"
            title="Export"
            style={{
              height: 40, padding: '0 12px', borderRadius: 12,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: 6,
              cursor: 'pointer', transition: 'all .2s', fontSize: 13,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--accent)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <i className="ti ti-download" style={{ fontSize: 16 }} aria-hidden="true" />
            Export
            <i className="ti ti-chevron-down" style={{ fontSize: 12 }} aria-hidden="true" />
          </button>

          {/* Dropdown menu */}
          {showExportMenu && (
            <div style={{
              position: 'absolute', top: 46, right: 0,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 6, zIndex: 100,
              minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              animation: 'slideDown .15s ease',
            }}>
              <button onClick={() => { exportToCSV(); setShowExportMenu(false) }} style={{
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
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <i className="ti ti-table" style={{ fontSize: 14, color: 'var(--green)' }} aria-hidden="true" />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>CSV</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>For spreadsheets</p>
                </div>
              </button>

              <button onClick={() => { exportToPDF(); setShowExportMenu(false) }} style={{
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
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <i className="ti ti-file-type-pdf" style={{ fontSize: 14, color: 'var(--accent)' }} aria-hidden="true" />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>PDF</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Branded statement</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Search input (animated) ───────────────────────────── */}
      {showSearch && (
        <div style={{
          marginBottom: 12, position: 'relative',
          animation: 'slideDown .2s ease',
        }}>
          <i className="ti ti-search" style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', fontSize: 16, pointerEvents: 'none',
          }} aria-hidden="true" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or category..."
            aria-label="Search transactions"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg-card)', border: '1px solid var(--accent)',
              borderRadius: 14, padding: '13px 42px', fontSize: 14,
              color: 'var(--text-primary)', outline: 'none',
              boxShadow: '0 0 0 3px rgba(124,58,237,0.12)',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Clear search"
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                color: 'var(--text-muted)',
              }}
            >
              <i className="ti ti-x" style={{ fontSize: 16 }} />
            </button>
          )}
        </div>
      )}

      {/* ── Error banner ──────────────────────────────────────── */}
      {error && (
        <div style={{
          background: 'rgba(255,159,67,0.08)', border: '1px solid rgba(255,159,67,0.25)',
          borderRadius: 12, padding: '10px 14px', marginBottom: 14,
          fontSize: 13, color: 'var(--orange)',
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true" />
          {error}
        </div>
      )}

      {/* ── Loading skeleton ──────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4, 5].map(i => <Shimmer key={i} height={72} />)}
        </div>

      ) : filtered.length === 0 ? (
        /* ── Empty state ── */
        <div style={{
          textAlign: 'center', padding: '56px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-receipt-off"
               style={{ fontSize: 28, color: 'var(--text-muted)' }} aria-hidden="true" />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            No transactions found
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 220, lineHeight: 1.5 }}>
            {search ? `No results for "${search}"` : 'Try a different filter or add your first transaction.'}
          </p>
        </div>

      ) : (
        /* ── Grouped list ── */
        Object.entries(grouped).map(([label, txs]) => (
          <div key={label}>
            {/* Date label */}
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
              textTransform: 'uppercase', color: 'var(--text-muted)',
              margin: '18px 0 8px', paddingLeft: 2,
            }}>{label}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {txs.map(tx => (
                <TransactionItem
                  key={tx.id}
                  tx={tx}
                  onEdit={() => setEditTarget(tx)}
                  onDelete={() => setConfirmId(tx.id)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* ── FAB ───────────────────────────────────────────────── */}
      <button
        onClick={() => setShowAddModal(true)}
        aria-label="Add transaction"
        style={{
          position: 'fixed',
          // ✅ Uses env() safe area for devices with home indicator
          bottom: 'calc(72px + env(safe-area-inset-bottom, 0px) + 16px)',
          right: 20, width: 52, height: 52, borderRadius: '50%',
          background: 'var(--accent)', border: 'none',
          color: '#fff', cursor: 'pointer',
          boxShadow: '0 4px 20px var(--accent-glow)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 40, transition: 'transform .2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <i className="ti ti-plus" style={{ fontSize: 22 }} aria-hidden="true" />
      </button>

      {/* ── Add modal ─────────────────────────────────────────── */}
      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); fetchTransactions() }}
        />
      )}

      {editTarget && (
        <EditTransactionModal
          tx={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null)
            fetchTransactions()
            showToast('Transaction updated', 'success')
          }}
        />
      )}

      {/* ── Custom confirm dialog ─────────────────────────────── */}
      {confirmId && confirmingItem && (
        <ConfirmDialog
          message={`"${confirmingItem.title}" (£${confirmingItem.amount.toFixed(2)}) will be permanently removed.`}
          onConfirm={() => confirmDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}

// ── Summary card ───────────────────────────────────────────────────
function SummaryCard({ label, value, color, icon }: {
  label: string; value: number; color: string; icon: string
}) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 14, color }} aria-hidden="true" />
        <span style={{
          fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
          letterSpacing: '.05em', textTransform: 'uppercase',
        }}>{label}</span>
      </div>
      <p style={{ fontSize: 20, fontWeight: 700, color }}>
        £{value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}

// ── Transaction row ────────────────────────────────────────────────
function TransactionItem({ tx, onEdit, onDelete }: {
  tx: Transaction; onEdit: () => void; onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const { icon, color } = getCat(tx.category)
  const isIncome = tx.type === 'income'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--bg-card)', border: '1px solid',
        borderColor: hovered ? 'var(--accent)' : 'var(--border)',
        borderRadius: 14, padding: '12px 14px',
        transition: 'border-color .2s, transform .15s',
        transform: hovered ? 'translateX(2px)' : 'none',
      }}
    >
      {/* Category icon badge */}
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 18, color }} aria-hidden="true" />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{tx.title}</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {tx.category} · {new Date(tx.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Amount */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 700,
          color: isIncome ? 'var(--green)' : 'var(--red)',
        }}>
          {isIncome ? '+' : '-'}£{tx.amount.toFixed(2)}
        </p>
      </div>

      <button
        onClick={e => { e.stopPropagation(); onEdit() }}
        aria-label={`Edit ${tx.title}`}
        style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: hovered ? 'var(--accent-light)' : 'transparent',
          border: '1px solid',
          borderColor: hovered ? 'var(--accent)' : 'transparent',
          color: hovered ? 'var(--accent)' : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s', padding: 0,
          opacity: hovered ? 1 : 0.4,
          marginRight: 4,
        }}
      >
        <i className="ti ti-edit" style={{ fontSize: 15 }} aria-hidden="true" />
      </button>

      {/* ✅ Delete button — always visible (small), scales on hover */}
      {/* Works on both mobile tap and desktop hover */}
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        aria-label={`Delete ${tx.title}`}
        style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: hovered ? 'rgba(255,79,100,0.12)' : 'transparent',
          border: '1px solid',
          borderColor: hovered ? 'rgba(255,79,100,0.3)' : 'transparent',
          color: hovered ? 'var(--red)' : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s',
          // ✅ Always 32px — meets minimum touch target with padding
          padding: 0,
        }}
      >
        <i className="ti ti-trash" style={{ fontSize: 15 }} aria-hidden="true" />
      </button>
    </div>
  )
}

// ── Add Transaction Modal ──────────────────────────────────────────
const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Subscriptions', 'Health', 'Rent', 'Utilities', 'Other']
const INCOME_CATEGORIES  = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other']

function AddTransactionModal({ onClose, onAdded }: {
  onClose: () => void; onAdded: () => void
}) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    title: '', amount: '',
    type: 'expense' as 'income' | 'expense',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]               = useState('')

  const update = (k: keyof typeof form, v: string) => {
    if (k === 'type') {
      const defaultCat = v === 'income' ? 'Salary' : 'Food'
      setForm(p => ({ ...p, [k]: v as 'income' | 'expense', category: defaultCat }))
      return
    }
    setForm(p => ({ ...p, [k]: v }))
  }
  const _update_unused = (k: keyof typeof form, v: string) =>
    setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit() {
    if (!form.title.trim())                         return setErr('Description is required.')
    if (!form.amount || isNaN(Number(form.amount))) return setErr('Enter a valid amount.')
    if (Number(form.amount) <= 0)                   return setErr('Amount must be greater than zero.')
    setErr(''); setSubmitting(true)
    try {
      const token = await getAuthToken()
      const res = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      })
      if (!res.ok) throw new Error()
      showToast('Transaction added successfully!', 'success')
      onAdded()
    } catch {
      setErr('Could not save transaction. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          // ✅ Max width for desktop — doesn't look awkward
          maxWidth: 520,
          background: 'var(--bg-secondary)',
          borderRadius: '24px 24px 0 0',
          padding: '20px 20px 40px',
          border: '1px solid var(--border)',
          // Respect home indicator on iPhone
          paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 36, height: 4, background: 'rgba(255,255,255,0.15)',
          borderRadius: 99, margin: '0 auto 18px',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            Add transaction
          </h2>
          <button onClick={onClose} aria-label="Close modal" style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        {/* ✅ Type toggle — vector icons, no emoji */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {(['expense', 'income'] as const).map(t => (
            <button key={t} onClick={() => update('type', t)} style={{
              height: 44, borderRadius: 12, cursor: 'pointer',
              border: `1.5px solid ${form.type === t ? 'var(--accent)' : 'var(--border)'}`,
              background: form.type === t ? 'var(--accent-light)' : 'var(--bg-card)',
              color: form.type === t ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <i className={t === 'expense' ? 'ti ti-arrow-up-right' : 'ti ti-arrow-down-left'}
                 style={{ fontSize: 15 }} aria-hidden="true" />
              {t === 'expense' ? 'Expense' : 'Income'}
            </button>
          ))}
        </div>

        {/* Description */}
        <ModalField label="Description" id="tx-title">
          <input id="tx-title" type="text" value={form.title}
            onChange={e => update('title', e.target.value)}
            placeholder="e.g. Tesco, Salary..."
            style={inputStyle} />
        </ModalField>

        {/* Amount */}
        <ModalField label="Amount (£)" id="tx-amount">
          <input id="tx-amount" type="number" min="0.01" step="0.01"
            value={form.amount}
            onChange={e => update('amount', e.target.value)}
            placeholder="0.00"
            style={inputStyle} />
        </ModalField>

        {/* Category */}
        <ModalField label="Category" id="tx-category">
          <select id="tx-category" value={form.category}
            onChange={e => update('category', e.target.value)}
            style={{ ...inputStyle, appearance: 'none' }}>
            {(form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </ModalField>

        {/* Date */}
        <ModalField label="Date" id="tx-date">
          <input id="tx-date" type="date" value={form.date}
            onChange={e => update('date', e.target.value)}
            style={inputStyle} />
        </ModalField>

        {/* Error */}
        {err && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 14px', borderRadius: 10, marginBottom: 12,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 15, color: 'var(--red)', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: 'var(--red)' }}>{err}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%', height: 52, borderRadius: 14, border: 'none',
            background: submitting ? 'rgba(124,58,237,0.6)' : 'var(--accent)',
            color: '#ede0ff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background .2s',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Saving...
            </>
          ) : 'Add transaction'}
        </button>
      </div>
    </div>
  )
}

// ── Edit Transaction Modal ─────────────────────────────────────────
function EditTransactionModal({ tx, onClose, onSaved }: {
  tx: Transaction; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useToast()

  const [form, setForm] = useState({
    title: tx.title,
    amount: tx.amount.toString(),
    type: tx.type as 'income' | 'expense',
    category: tx.category,
    date: tx.date.split('T')[0],
    notes: tx.notes || '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  const update = (k: keyof typeof form, v: string) => {
    if (k === 'type') {
      const defaultCat = v === 'income' ? 'Salary' : 'Food'
      setForm(p => ({ ...p, [k]: v as 'income' | 'expense', category: defaultCat }))
      return
    }
    setForm(p => ({ ...p, [k]: v }))
  }
  const _update_unused = (k: keyof typeof form, v: string) =>
    setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit() {
    if (!form.title.trim()) return setErr('Description is required.')
    if (!form.amount || isNaN(Number(form.amount))) return setErr('Enter a valid amount.')
    if (Number(form.amount) <= 0) return setErr('Amount must be greater than zero.')
    setErr('')
    setSubmitting(true)
    try {
      const token = await getAuthToken()
      const res = await fetch(`${API_URL}/api/transactions/${tx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      })
      if (!res.ok) throw new Error()
      onSaved()
    } catch {
      setErr('Could not update transaction. Please try again.')
      showToast('Update failed. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 520,
        background: 'var(--bg-secondary)',
        borderRadius: '24px 24px 0 0',
        padding: '20px 20px',
        paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
        border: '1px solid var(--border)',
      }}>
        <div style={{
          width: 36, height: 4, background: 'rgba(255,255,255,0.15)',
          borderRadius: 99, margin: '0 auto 18px',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            Edit transaction
          </h2>
          <button onClick={onClose} aria-label="Close" style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {(['expense', 'income'] as const).map(t => (
            <button key={t} onClick={() => update('type', t)} style={{
              height: 44, borderRadius: 12, cursor: 'pointer',
              border: `1.5px solid ${form.type === t ? 'var(--accent)' : 'var(--border)'}`,
              background: form.type === t ? 'var(--accent-light)' : 'var(--bg-card)',
              color: form.type === t ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <i className={t === 'expense' ? 'ti ti-arrow-up-right' : 'ti ti-arrow-down-left'}
                 style={{ fontSize: 15 }} aria-hidden="true" />
              {t === 'expense' ? 'Expense' : 'Income'}
            </button>
          ))}
        </div>

        {[
          { id: 'edit-title', label: 'Description', type: 'text', key: 'title', placeholder: 'e.g. Tesco, Salary...' },
          { id: 'edit-amount', label: 'Amount (£)', type: 'number', key: 'amount', placeholder: '0.00' },
          { id: 'edit-date', label: 'Date', type: 'date', key: 'date', placeholder: '' },
        ].map(f => (
          <div key={f.id} style={{ marginBottom: 12 }}>
            <label htmlFor={f.id} style={{
              fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
              letterSpacing: '.04em', display: 'block', marginBottom: 6,
              textTransform: 'uppercase',
            }}>{f.label}</label>
            <input
              id={f.id} type={f.type}
              value={form[f.key as keyof typeof form]}
              onChange={e => update(f.key as keyof typeof form, e.target.value)}
              placeholder={f.placeholder}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '12px 14px', fontSize: 14, height: 48,
                color: 'var(--text-primary)', outline: 'none',
              }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="edit-category" style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
            letterSpacing: '.04em', display: 'block', marginBottom: 6,
            textTransform: 'uppercase',
          }}>Category</label>
          <select id="edit-category" value={form.category}
            onChange={e => update('category', e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 14px', fontSize: 14, height: 48,
              color: 'var(--text-primary)', outline: 'none', appearance: 'none',
            }}>
            {['Food','Transport','Shopping','Entertainment','Subscriptions','Health','Rent','Utilities','Income','Other']
              .map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {err && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 14px', borderRadius: 10, marginBottom: 12,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 15, color: 'var(--red)', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: 'var(--red)' }}>{err}</p>
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting} style={{
          width: '100%', height: 52, borderRadius: 14, border: 'none',
          background: submitting ? 'rgba(124,58,237,0.6)' : 'var(--accent)',
          color: '#ede0ff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: submitting ? 0.7 : 1,
        }}>
          {submitting ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Saving...
            </>
          ) : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

// ── Modal field wrapper ────────────────────────────────────────────
function ModalField({ label, id, children }: {
  label: string; id: string; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={{
        fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
        letterSpacing: '.04em', display: 'block', marginBottom: 6,
        textTransform: 'uppercase',
      }}>{label}</label>
      {children}
    </div>
  )
}

// ── Shared input style ─────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 12, padding: '12px 14px', fontSize: 14,
  color: 'var(--text-primary)', outline: 'none',
  height: 48,
}