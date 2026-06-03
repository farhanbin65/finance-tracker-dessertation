/**
 * FinSight — LoginPage.tsx
 * Auth0 removed — email/password only.
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || ''

function useIsDesktop() {
  const [is, setIs] = useState(window.innerWidth >= 1024)
  useEffect(() => {
    const fn = () => setIs(window.innerWidth >= 1024)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return is
}

export default function LoginPage() {
  const navigate  = useNavigate()
  const isDesktop = useIsDesktop()

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Invalid email or password.'); return }
      localStorage.setItem('fs_token',         data.access_token)
      localStorage.setItem('fs_refresh_token', data.refresh_token)
      localStorage.setItem('fs_user',          JSON.stringify(data.user))
      localStorage.setItem('fs_name',          data.user?.full_name || '')
      localStorage.setItem('fs_email',         data.user?.email || '')
      // Admin goes to admin panel, regular users go to dashboard
      const role = data.user?.role || 'user'
      navigate(role === 'admin' ? '/admin' : '/dashboard')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputBase: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    height: 52, paddingLeft: 44, paddingRight: 16,
    background: '#fff',
    border: '1.5px solid #E2E8F0',
    borderRadius: 12,
    color: '#0F172A',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color .15s, box-shadow .15s',
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'row',
      background: '#FAFAF9',
      fontFamily: 'Inter, sans-serif',
      color: '#0F172A',
    }}>

      {/* ── LEFT PANEL — desktop only ────────────────────────── */}
      {isDesktop && (
        <div style={{
          width: '52%', flexShrink: 0,
          background: '#1E293B',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-80px', right: '-80px',
            width: 320, height: 320, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            pointerEvents: 'none',
          }} aria-hidden="true" />
          <div style={{
            position: 'absolute', bottom: '15%', left: '-60px',
            width: 240, height: 240, borderRadius: '50%',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            pointerEvents: 'none',
          }} aria-hidden="true" />

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: '#F1F5F9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined"
                    style={{ color: '#1E293B', fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true">trending_up</span>
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              FinSight
            </span>
          </div>

          {/* Main copy */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '6px 12px', borderRadius: 99, marginBottom: 32,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.7)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} aria-hidden="true" />
              Trusted by students across the UK
            </div>
            <h1 style={{
              fontSize: 'clamp(32px, 3vw, 46px)', fontWeight: 700,
              lineHeight: 1.1, letterSpacing: '-0.03em',
              color: '#fff', marginBottom: 20,
            }}>
              Take control of<br />your finances.<br />
              <span style={{ color: '#94A3B8' }}>Finally.</span>
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(255,255,255,0.5)', maxWidth: 360 }}>
              FinSight turns your spending data into clear insights,
              helping you budget smarter and save faster.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 48 }}>
              {[
                { value: 'AI',   label: 'Powered insights' },
                { value: '256',  label: 'Bit encryption'   },
                { value: 'GDPR', label: 'Compliant'        },
              ].map(({ value, label }) => (
                <div key={label} style={{
                  padding: '16px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14,
                }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 4 }}>{value}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', position: 'relative', zIndex: 1 }}>
            © 2026 FinSight · BSc Computing Systems · Final Year Dissertation
          </p>
        </div>
      )}

      {/* ── RIGHT FORM PANEL ─────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minHeight: '100vh', minWidth: 0, background: '#FAFAF9',
      }}>

        {!isDesktop && (
          <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px', height: 64, borderBottom: '1px solid #E2E8F0',
            background: '#FAFAF9', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, background: '#1E293B',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined"
                      style={{ color: '#fff', fontSize: '17px', fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true">trending_up</span>
              </div>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
                FinSight
              </span>
            </div>
          </header>
        )}

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          padding: isDesktop ? '48px 64px' : '32px 20px',
          overflowY: 'auto',
        }}>
          <div style={{ width: '100%', maxWidth: 420 }}>

            <div style={{ marginBottom: 32 }}>
              <h2 style={{
                fontSize: 28, fontWeight: 700, color: '#0F172A',
                letterSpacing: '-0.02em', marginBottom: 6,
              }}>Sign in</h2>
              <p style={{ fontSize: 15, color: '#64748B' }}>
                Welcome back — let's check your finances.
              </p>
            </div>

            {error && (
              <div style={{
                marginBottom: 16, padding: '12px 14px', borderRadius: 10,
                background: '#FEF2F2', border: '1px solid #FECACA',
                color: '#DC2626', fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 8,
              }} role="alert">
                <span className="material-symbols-outlined"
                      style={{ fontSize: '16px', flexShrink: 0 }} aria-hidden="true">error</span>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                  noValidate>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="email" style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                  Email address
                </label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9CA3AF', fontSize: '18px', pointerEvents: 'none',
                  }} aria-hidden="true">mail</span>
                  <input
                    id="email" type="email" autoComplete="email"
                    placeholder="name@email.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); if (error) setError('') }}
                    required style={inputBase}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = '#1E293B'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,41,59,0.08)'
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = '#E2E8F0'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="password" style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                    Password
                  </label>
                  <Link to="/forgot-password"
                        style={{ fontSize: 13, color: '#6366F1', textDecoration: 'none', fontWeight: 500 }}>
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9CA3AF', fontSize: '18px', pointerEvents: 'none',
                  }} aria-hidden="true">lock</span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); if (error) setError('') }}
                    required
                    style={{ ...inputBase, paddingRight: 48 }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = '#1E293B'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,41,59,0.08)'
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = '#E2E8F0'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute', right: 14, top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none',
                      cursor: 'pointer', padding: 4, color: '#9CA3AF',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                style={{
                  height: 52, borderRadius: 12, border: 'none',
                  background: loading ? '#475569' : '#1E293B',
                  color: '#fff', fontSize: 15, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8,
                  marginTop: 4, transition: 'background .15s',
                  opacity: loading ? 0.8 : 1,
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#334155' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#1E293B' }}
              >
                {loading ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2" aria-hidden="true"
                         style={{ animation: 'spin 0.8s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Signing in...
                  </>
                ) : 'Sign in'}
              </button>
            </form>

            <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: '#64748B' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#1E293B', fontWeight: 600, textDecoration: 'none' }}>
                Create one free →
              </Link>
            </p>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 20, marginTop: 32,
              paddingTop: 24, borderTop: '1px solid #F1F5F9',
            }}>
              {[
                { icon: 'verified_user', text: 'AES-256' },
                { icon: 'shield',        text: 'GDPR'    },
                { icon: 'lock',          text: 'Secure'  },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span className="material-symbols-outlined"
                        style={{ fontSize: '14px', color: '#94A3B8' }}
                        aria-hidden="true">{icon}</span>
                  <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>{text}</span>
                </div>
              ))}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        </div>
      </div>
    </div>
  )
}