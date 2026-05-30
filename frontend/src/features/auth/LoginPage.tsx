/**
 * FinSight — LoginPage.tsx
 * Light mode redesign — clean, professional, fintech-grade
 * No purple gradients, no AI aesthetic
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

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
  const navigate   = useNavigate()
  const { loginWithRedirect } = useAuth0()
  const isDesktop  = useIsDesktop()

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
      navigate('/dashboard')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () =>
    loginWithRedirect({ authorizationParams: { connection: 'google-oauth2' } })
  const handleGithubLogin = () =>
    loginWithRedirect({ authorizationParams: { connection: 'github' } })

  // ── Shared input style ───────────────────────────────────────────
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

      {/* ── LEFT PANEL — desktop only ─────────────────────────── */}
      {isDesktop && (
        <div style={{
          width: '52%', flexShrink: 0,
          background: '#1E293B',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Subtle texture circles */}
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
          <div style={{
            position: 'absolute', bottom: '-40px', right: '10%',
            width: 180, height: 180, borderRadius: '50%',
            background: 'rgba(99,102,241,0.08)',
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
            {/* Tag */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '6px 12px', borderRadius: 99, marginBottom: 32,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.7)',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#10B981',
              }} aria-hidden="true" />
              Trusted by students across the UK
            </div>

            <h1 style={{
              fontSize: 'clamp(32px, 3vw, 46px)',
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#fff',
              marginBottom: 20,
            }}>
              Take control of<br />
              your finances.<br />
              <span style={{ color: '#94A3B8' }}>Finally.</span>
            </h1>

            <p style={{
              fontSize: 16, lineHeight: 1.7,
              color: 'rgba(255,255,255,0.5)',
              maxWidth: 360,
            }}>
              FinSight turns your spending data into clear insights,
              helping you budget smarter and save faster.
            </p>

            {/* Stats row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gap: 16, marginTop: 48,
            }}>
              {[
                { value: 'AI',    label: 'Powered insights'  },
                { value: '256',   label: 'Bit encryption'    },
                { value: 'GDPR',  label: 'Compliant'         },
              ].map(({ value, label }) => (
                <div key={label} style={{
                  padding: '16px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14,
                }}>
                  <p style={{
                    fontSize: 22, fontWeight: 700, color: '#fff',
                    letterSpacing: '-0.02em', marginBottom: 4,
                  }}>{value}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', position: 'relative', zIndex: 1 }}>
            © 2025 FinSight · BSc Computing Systems · Final Year Dissertation
          </p>
        </div>
      )}

      {/* ── RIGHT FORM PANEL ──────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minHeight: '100vh', minWidth: 0,
        background: '#FAFAF9',
      }}>

        {/* Mobile header */}
        {!isDesktop && (
          <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px', height: 64, borderBottom: '1px solid #E2E8F0',
            background: '#FAFAF9', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: '#1E293B',
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

        {/* Form area */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          padding: isDesktop ? '48px 64px' : '32px 20px',
          overflowY: 'auto',
        }}>
          <div style={{ width: '100%', maxWidth: 420 }}>

            {/* Heading */}
            <div style={{ marginBottom: 32 }}>
              <h2 style={{
                fontSize: 28, fontWeight: 700, color: '#0F172A',
                letterSpacing: '-0.02em', marginBottom: 6,
              }}>
                Sign in
              </h2>
              <p style={{ fontSize: 15, color: '#64748B' }}>
                Welcome back — let's check your finances.
              </p>
            </div>

            {/* Social buttons — ABOVE form (modern pattern) */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button type="button" onClick={handleGoogleLogin} style={{
                flex: 1, height: 48, borderRadius: 10,
                background: '#fff', border: '1.5px solid #E2E8F0',
                color: '#374151', fontSize: 14, fontWeight: 500,
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'border-color .15s, box-shadow .15s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#CBD5E1'
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#E2E8F0'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button type="button" onClick={handleGithubLogin} style={{
                flex: 1, height: 48, borderRadius: 10,
                background: '#fff', border: '1.5px solid #E2E8F0',
                color: '#374151', fontSize: 14, fontWeight: 500,
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'border-color .15s, box-shadow .15s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#CBD5E1'
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#E2E8F0'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1F2937" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                GitHub
              </button>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
              <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                or sign in with email
              </span>
              <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            </div>

            {/* Error */}
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

            {/* Form */}
            <form onSubmit={handleLogin}
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                  noValidate>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="email"
                       style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
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
                    required
                    style={inputBase}
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
                  <label htmlFor="password"
                         style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
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

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  height: 52, borderRadius: 12, border: 'none',
                  background: loading ? '#475569' : '#1E293B',
                  color: '#fff', fontSize: 15, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8,
                  marginTop: 4,
                  transition: 'background .15s',
                  opacity: loading ? 0.8 : 1,
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#334155' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#1E293B' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="16" height="16"
                         viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Signing in...
                  </>
                ) : 'Sign in'}
              </button>
            </form>

            {/* Register link */}
            <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: '#64748B' }}>
              Don't have an account?{' '}
                <Link to="/register"
                  style={{ color: '#1E293B', fontWeight: 600, textDecoration: 'none' }}>
                Create one free →
              </Link>
            </p>

            {/* Trust bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 20, marginTop: 32,
              paddingTop: 24, borderTop: '1px solid #F1F5F9',
            }}>
              {[
                { icon: 'verified_user', text: 'AES-256'  },
                { icon: 'shield',        text: 'GDPR'     },
                { icon: 'lock',          text: 'Secure'   },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span className="material-symbols-outlined"
                        style={{ fontSize: '14px', color: '#94A3B8' }}
                        aria-hidden="true">{icon}</span>
                  <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}