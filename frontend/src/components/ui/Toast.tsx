/**
 * FinSight — Toast.tsx
 * Global toast notification system
 * Usage: import { useToast } from './Toast'
 *        const { showToast } = useToast()
 *        showToast('Saved!', 'success')
 */

import { createContext, useContext, useState, useCallback, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void
}

// ── Context ────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

// ── Config per type ────────────────────────────────────────────────
const TOAST_CONFIG: Record<ToastType, { icon: string; color: string; bg: string; border: string }> = {
  success: {
    icon:   'ti-circle-check',
    color:  '#10B981',
    bg:     'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.25)',
  },
  error: {
    icon:   'ti-alert-circle',
    color:  '#EF4444',
    bg:     'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.25)',
  },
  warning: {
    icon:   'ti-alert-triangle',
    color:  '#F59E0B',
    bg:     'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.25)',
  },
  info: {
    icon:   'ti-info-circle',
    color:  '#3B82F6',
    bg:     'rgba(59,130,246,0.1)',
    border: 'rgba(59,130,246,0.25)',
  },
}

// ── Provider ───────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
  }, [])

  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    duration = 3500
  ) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev.slice(-4), { id, message, type }]) // max 5 toasts
    timers.current[id] = setTimeout(() => removeToast(id), duration)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* ── Toast container ── */}
      <div style={{
        position: 'fixed',
        // ✅ Top centre — visible above everything
        top: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        maxWidth: 420,
        padding: '0 16px',
        boxSizing: 'border-box',
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ── Single toast item ──────────────────────────────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const cfg = TOAST_CONFIG[toast.type]

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 14,
        background: 'var(--bg-secondary)',
        border: `1px solid ${cfg.border}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(12px)',
        pointerEvents: 'all',
        animation: 'toastIn .25s cubic-bezier(.34,1.56,.64,1)',
        // ✅ Left accent border matching type
        borderLeft: `3px solid ${cfg.color}`,
      }}
    >
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
      `}</style>

      {/* Icon */}
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: cfg.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${cfg.icon}`} style={{ fontSize: 16, color: cfg.color }} aria-hidden="true" />
      </div>

      {/* Message */}
      <p style={{
        flex: 1,
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--text-primary)',
        lineHeight: 1.4,
      }}>
        {toast.message}
      </p>

      {/* Dismiss */}
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
        style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <i className="ti ti-x" style={{ fontSize: 14 }} />
      </button>
    </div>
  )
}

// ── Hook ───────────────────────────────────────────────────────────
export function useToast() {
  return useContext(ToastContext)
}