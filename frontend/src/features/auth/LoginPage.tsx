/**
 * FinSight — LoginPage.tsx (Layout Fixed)
 * No Tailwind responsive classes — pure inline styles + useIsDesktop hook
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

const API_URL = import.meta.env.VITE_API_URL || ''

// ── Responsive hook ────────────────────────────────────────────────
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isDesktop
}

export default function LoginPage() {
  const navigate    = useNavigate()
  const { loginWithRedirect } = useAuth0()
  const isDesktop   = useIsDesktop()

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
      if (!res.ok) { setError(data.error || 'Login failed.'); return }
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

  const handleGoogleLogin = () => loginWithRedirect({ authorizationParams: { connection: 'google-oauth2' } })
  const handleGithubLogin = () => loginWithRedirect({ authorizationParams: { connection: 'github' } })

  return (
    // ── Root: flex ROW — this is what was broken ──────────────────
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'row',       // ← KEY: side by side
      overflow: 'hidden',
      backgroundColor: '#0F1629',
      color: '#e8dfee',
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* ── LEFT BRAND PANEL — desktop only ──────────────────────── */}
      {isDesktop && (
        <div style={{
          width: '55%',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Glow top-right */}
          <div style={{
            position: 'absolute', top: '-15%', right: '-10%',
            width: '70%', height: '70%', borderRadius: '50%',
            background: 'rgba(124,58,237,0.12)', filter: 'blur(100px)',
            pointerEvents: 'none',
          }} aria-hidden="true" />
          {/* Glow bottom-left */}
          <div style={{
            position: 'absolute', bottom: '-10%', left: '-5%',
            width: '50%', height: '50%', borderRadius: '50%',
            background: 'rgba(63,70,92,0.15)', filter: 'blur(80px)',
            pointerEvents: 'none',
          }} aria-hidden="true" />

          {/* Logo */}
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined"
                    style={{ color: '#a78bfa', fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true">shield_lock</span>
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#e8dfee' }}>FinSight</span>
          </div>

          {/* Brand copy — vertically centred */}
          <div style={{ position: 'relative', zIndex: 10, maxWidth: 380 }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 99, marginBottom: 28,
              background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)',
              fontSize: 12, fontWeight: 500, color: '#c4b5fd',
            }}>
              <span className="material-symbols-outlined"
                    style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true">verified</span>
              Bank-grade security
            </div>

            <h1 style={{
              fontSize: 'clamp(32px, 3vw, 46px)',
              fontWeight: 700, lineHeight: 1.15,
              letterSpacing: '-0.02em', color: '#f1eeff', marginBottom: 16,
            }}>
              Your money,<br />
              <span style={{ color: '#a78bfa' }}>intelligently</span><br />
              managed.
            </h1>

            <p style={{ fontSize: 16, lineHeight: 1.7, color: '#94A3B8', maxWidth: 340 }}>
              FinSight gives you AI-powered insights, real-time budget
              tracking, and complete financial clarity — all in one
              private, secure platform.
            </p>

            {/* Trust signals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 36 }}>
              {[
                { icon: 'lock',           text: 'AES-256 encrypted at rest'      },
                { icon: 'visibility_off', text: 'Zero data sharing, ever'         },
                { icon: 'psychology',     text: 'AI insights powered by Llama 3' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(124,58,237,0.12)',
                    border: '1px solid rgba(124,58,237,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined"
                          style={{ color: '#a78bfa', fontSize: '16px' }}
                          aria-hidden="true">{icon}</span>
                  </div>
                  <span style={{ fontSize: 14, color: '#94A3B8' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p style={{ position: 'relative', zIndex: 10, fontSize: 12, color: '#475569' }}>
            © 2025 FinSight · Dissertation Project · BSc Computing Systems
          </p>
        </div>
      )}

      {/* ── RIGHT FORM PANEL ─────────────────────────────────────── */}
      <div style={{
        flex: 1,                  // ← takes remaining space
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        minWidth: 0,
      }}>

        {/* Mobile header — only on small screens */}
        {!isDesktop && (
          <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px', height: 64, flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined"
                      style={{ color: '#a78bfa', fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true">shield_lock</span>
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#e8dfee' }}>FinSight</span>
            </div>
          </header>
        )}

        {/* Scrollable form area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: isDesktop ? '48px 64px' : '32px 20px',
          overflowY: 'auto',
        }}>
          <div style={{ width: '100%', maxWidth: 400 }}>

            {/* Heading */}
            <div style={{ marginBottom: 32 }}>
              <h2 style={{
                fontSize: 28, fontWeight: 700,
                letterSpacing: '-0.02em', color: '#f1eeff', marginBottom: 6,
              }}>Welcome back</h2>
              <p style={{ fontSize: 15, color: '#94A3B8' }}>
                Sign in to your FinSight account
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div style={{
                marginBottom: 20, padding: '12px 14px', borderRadius: 12,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#FCA5A5', fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 8,
              }} role="alert">
                <span className="material-symbols-outlined"
                      style={{ fontSize: '18px', color: '#EF4444', flexShrink: 0 }}
                      aria-hidden="true">error</span>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} noValidate>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="email" style={{ fontSize: 14, color: '#CBD5E1', fontWeight: 500 }}>
                  Email address
                </label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: '#475569', fontSize: '18px', pointerEvents: 'none',
                  }} aria-hidden="true">mail</span>
                  <input
                    id="email" type="email" autoComplete="email"
                    placeholder="name@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} required
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

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="password" style={{ fontSize: 14, color: '#CBD5E1', fontWeight: 500 }}>
                    Password
                  </label>
                  <a href="#" style={{ fontSize: 13, color: '#7c3aed' }}>Forgot password?</a>
                </div>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: '#475569', fontSize: '18px', pointerEvents: 'none',
                  }} aria-hidden="true">lock</span>
                  <input
                    id="password" type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      height: 52, paddingLeft: 44, paddingRight: 48,
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
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                      color: '#475569',
                    }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading} style={{
                height: 52, borderRadius: 12, border: 'none',
                background: loading ? 'rgba(124,58,237,0.6)' : '#7c3aed',
                color: '#ede0ff', fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 4, transition: 'background .2s',
                opacity: loading ? 0.7 : 1,
              }}>
                {loading ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Signing in...
                  </>
                ) : 'Sign in'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#1E1B2E' }} />
              <span style={{ fontSize: 12, color: '#475569' }}>or continue with</span>
              <div style={{ flex: 1, height: 1, background: '#1E1B2E' }} />
            </div>

            {/* Social buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button type="button" onClick={handleGoogleLogin} style={{
                height: 52, borderRadius: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#CBD5E1', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'background .2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <button type="button" onClick={handleGithubLogin} style={{
                height: 52, borderRadius: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#CBD5E1', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'background .2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#CBD5E1" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                Continue with GitHub
              </button>
            </div>

            {/* Register link */}
            <p style={{ marginTop: 28, textAlign: 'center', fontSize: 14, color: '#64748B' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}>
                Create one free
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 16, padding: '16px 20px', flexShrink: 0,
        }}>
          {[
            { icon: 'verified_user', text: 'AES-256 encrypted' },
            { icon: 'shield',        text: 'GDPR compliant'    },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined"
                    style={{ fontSize: '14px', color: '#334155' }}
                    aria-hidden="true">{icon}</span>
              <span style={{ fontSize: 12, color: '#334155' }}>{text}</span>
            </div>
          ))}
        </footer>
      </div>
    </div>
  )
}