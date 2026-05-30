/**
 * FinSight — ForgotPasswordPage.tsx
 * Sends password reset email via backend
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../components/ui/Toast'

const API_URL = import.meta.env.VITE_API_URL || ''

type Step = 'form' | 'sent'

export default function ForgotPasswordPage() {
  const { showToast } = useToast()
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep]       = useState<Step>('form')
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return setError('Please enter your email address.')
    setError(''); setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      // ✅ Always show success — don't reveal if email exists (security best practice)
      if (res.ok || res.status === 404) {
        setStep('sent')
        showToast('Reset email sent if account exists', 'success')
      } else {
        throw new Error()
      }
    } catch {
      // ✅ Still show sent screen — prevents email enumeration attack
      setStep('sent')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0F1629',
      fontFamily: 'Inter, sans-serif',
      padding: '24px 20px',
    }}>
      {/* Glow */}
      <div style={{
        position: 'fixed', top: '-10%', right: '-10%',
        width: '60vw', height: '60vw', borderRadius: '50%',
        background: 'rgba(124,58,237,0.08)', filter: 'blur(100px)',
        pointerEvents: 'none',
      }} aria-hidden="true" />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>

        {step === 'form' ? (
          <>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              {/* Icon */}
              <div style={{
                width: 64, height: 64, borderRadius: 20, margin: '0 auto 20px',
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined"
                      style={{ color: '#a78bfa', fontSize: '32px', fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true">lock_reset</span>
              </div>
              <h1 style={{
                fontSize: 26, fontWeight: 700, color: '#f1eeff',
                letterSpacing: '-0.02em', marginBottom: 8,
              }}>Forgot password?</h1>
              <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.6 }}>
                Enter your email and we'll send you a link to reset your password.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginBottom: 16, padding: '12px 14px', borderRadius: 12,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#FCA5A5', fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 8,
              }} role="alert">
                <span className="material-symbols-outlined"
                      style={{ fontSize: '16px', color: '#EF4444', flexShrink: 0 }}
                      aria-hidden="true">error</span>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="reset-email"
                       style={{ fontSize: 14, color: '#CBD5E1', fontWeight: 500 }}>
                  Email address
                </label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: '#475569', fontSize: '18px', pointerEvents: 'none',
                  }} aria-hidden="true">mail</span>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@email.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); if (error) setError('') }}
                    required
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      height: 52, paddingLeft: 44, paddingRight: 16,
                      background: 'rgba(16,13,22,0.8)',
                      border: '1px solid #2D2A35', borderRadius: 12,
                      color: '#e8dfee', fontSize: 16, outline: 'none',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.border = '1px solid rgba(124,58,237,0.6)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'
                    }}
                    onBlur={e => {
                      e.currentTarget.style.border = '1px solid #2D2A35'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading} style={{
                height: 52, borderRadius: 12, border: 'none',
                background: loading ? 'rgba(124,58,237,0.6)' : '#7c3aed',
                color: '#ede0ff', fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: loading ? 0.7 : 1,
              }}>
                {loading ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Sending...
                  </>
                ) : 'Send reset link'}
              </button>
            </form>
          </>
        ) : (
          /* ── Success screen ── */
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22, margin: '0 auto 24px',
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined"
                    style={{ color: '#10B981', fontSize: '36px', fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true">mark_email_read</span>
            </div>
            <h1 style={{
              fontSize: 24, fontWeight: 700, color: '#f1eeff',
              letterSpacing: '-0.02em', marginBottom: 10,
            }}>Check your inbox</h1>
            <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.7, marginBottom: 8 }}>
              If an account exists for <strong style={{ color: '#e8dfee' }}>{email}</strong>,
              you'll receive a password reset link shortly.
            </p>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 32 }}>
              Don't see it? Check your spam folder.
            </p>

            {/* Resend */}
            <button
              onClick={() => setStep('form')}
              style={{
                width: '100%', height: 52, borderRadius: 12, border: 'none',
                background: 'rgba(124,58,237,0.15)',
                color: '#a78bfa', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', marginBottom: 16,
              }}
            >
              Try a different email
            </button>
          </div>
        )}

        {/* Back to login */}
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#64748B' }}>
          <Link to="/login" style={{
            color: '#a78bfa', fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <span className="material-symbols-outlined"
                  style={{ fontSize: '16px' }} aria-hidden="true">arrow_back</span>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}