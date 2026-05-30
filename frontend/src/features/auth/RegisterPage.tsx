/**
 * FinSight — RegisterPage.tsx
 * Light mode — matches new LoginPage design
 * useIsDesktop hook — no Tailwind responsive classes
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

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)            score++
  if (pw.length >= 12)           score++
  if (/[A-Z]/.test(pw))         score++
  if (/[0-9]/.test(pw))         score++
  if (/[^A-Za-z0-9]/.test(pw))  score++
  if (score <= 1) return { score, label: 'Weak',   color: '#EF4444' }
  if (score <= 2) return { score, label: 'Fair',   color: '#F59E0B' }
  if (score <= 3) return { score, label: 'Good',   color: '#3B82F6' }
  return              { score, label: 'Strong', color: '#10B981' }
}

export default function RegisterPage() {
  const navigate   = useNavigate()
  const isDesktop  = useIsDesktop()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [consented, setConsented] = useState(false)

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (error) setError('')
  }

  const strength        = getPasswordStrength(form.password)
  const passwordsMatch  = form.confirm_password.length > 0 && form.password === form.confirm_password

  const inputBase: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    height: 52, paddingLeft: 44, paddingRight: 16,
    background: '#fff',
    border: '1.5px solid #E2E8F0',
    borderRadius: 12,
    color: '#0F172A', fontSize: 15,
    outline: 'none', fontFamily: 'Inter, sans-serif',
    transition: 'border-color .15s, box-shadow .15s',
  }

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#0F172A'
    e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(15,23,42,0.08)'
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#E2E8F0'
    e.currentTarget.style.boxShadow   = 'none'
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm_password) return setError('Passwords do not match.')
    if (form.password.length < 8)               return setError('Password must be at least 8 characters.')
    if (!consented)                              return setError('Please agree to the Privacy Policy to continue.')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email:     form.email,
          password:  form.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Registration failed.'); return }
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

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'row',
      background: '#F8FAFC', fontFamily: 'Inter, sans-serif', color: '#0F172A',
    }}>

      {/* ── LEFT PANEL — desktop only ──────────────────────────── */}
      {isDesktop && (
        <div style={{
          width: '52%', flexShrink: 0,
          background: '#0F172A',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Texture circles */}
          <div style={{
            position: 'absolute', top: '-60px', left: '-60px',
            width: 280, height: 280, borderRadius: '50%',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            pointerEvents: 'none',
          }} aria-hidden="true" />
          <div style={{
            position: 'absolute', bottom: '20%', right: '-40px',
            width: 220, height: 220, borderRadius: '50%',
            background: 'rgba(99,102,241,0.08)',
            pointerEvents: 'none',
          }} aria-hidden="true" />
          <div style={{
            position: 'absolute', bottom: '-60px', left: '20%',
            width: 300, height: 300, borderRadius: '50%',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            pointerEvents: 'none',
          }} aria-hidden="true" />

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined"
                    style={{ color: '#0F172A', fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true">trending_up</span>
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              FinSight
            </span>
          </div>

          {/* Main copy */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '6px 12px', borderRadius: 99, marginBottom: 32,
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.25)',
              fontSize: 12, fontWeight: 500, color: '#6EE7B7',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} aria-hidden="true" />
              Free forever · No credit card needed
            </div>

            <h1 style={{
              fontSize: 'clamp(30px, 3vw, 44px)',
              fontWeight: 700, lineHeight: 1.1,
              letterSpacing: '-0.03em', color: '#fff', marginBottom: 20,
            }}>
              Start your<br />
              financial<br />
              <span style={{ color: '#94A3B8' }}>journey today.</span>
            </h1>

            <p style={{
              fontSize: 16, lineHeight: 1.7,
              color: 'rgba(255,255,255,0.5)', maxWidth: 340,
            }}>
              Join FinSight and get instant access to AI-powered budgeting,
              smart savings goals, and real-time spending insights.
            </p>

            {/* Feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 40 }}>
              {[
                { icon: 'auto_awesome',  text: 'AI financial insights on day one'  },
                { icon: 'savings',       text: 'Smart savings goals tracker'       },
                { icon: 'bar_chart',     text: 'Budget categories and alerts'      },
                { icon: 'lock',          text: 'Your data stays yours, always'     },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined"
                          style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px' }}
                          aria-hidden="true">{icon}</span>
                  </div>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', position: 'relative', zIndex: 1 }}>
            © 2025 FinSight · BSc Computing Systems · Final Year Dissertation
          </p>
        </div>
      )}

      {/* ── RIGHT FORM PANEL ──────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minHeight: '100vh', minWidth: 0, background: '#F8FAFC',
      }}>

        {/* Mobile header */}
        {!isDesktop && (
          <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px', height: 64,
            borderBottom: '1px solid #E2E8F0',
            background: '#fff', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, background: '#0F172A',
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
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#64748B', fontSize: 14, fontWeight: 500,
              }}
            >
              Sign in
            </button>
          </header>
        )}

        {/* Scrollable form */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          padding: isDesktop ? '48px 64px' : '32px 20px',
          overflowY: 'auto',
        }}>
          <div style={{ width: '100%', maxWidth: 420 }}>

            {/* Heading */}
            <div style={{ marginBottom: 28 }}>
              <h2 style={{
                fontSize: 26, fontWeight: 700, color: '#0F172A',
                letterSpacing: '-0.02em', marginBottom: 6,
              }}>
                Create your account
              </h2>
              <p style={{ fontSize: 15, color: '#64748B' }}>
                Free forever. No credit card required.
              </p>
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
            <form onSubmit={handleRegister}
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                  noValidate>

              {/* Full name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="full_name"
                       style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                  Full name
                </label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: '#9CA3AF', fontSize: '18px', pointerEvents: 'none',
                  }} aria-hidden="true">person</span>
                  <input
                    id="full_name" name="full_name" type="text"
                    autoComplete="name" placeholder="Your full name"
                    value={form.full_name} onChange={handleChange}
                    onFocus={onFocus} onBlur={onBlur}
                    required style={inputBase}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="reg_email"
                       style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                  Email address
                </label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: '#9CA3AF', fontSize: '18px', pointerEvents: 'none',
                  }} aria-hidden="true">mail</span>
                  <input
                    id="reg_email" name="email" type="email"
                    autoComplete="email" placeholder="name@example.com"
                    value={form.email} onChange={handleChange}
                    onFocus={onFocus} onBlur={onBlur}
                    required style={inputBase}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="reg_password"
                       style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: '#9CA3AF', fontSize: '18px', pointerEvents: 'none',
                  }} aria-hidden="true">lock</span>
                  <input
                    id="reg_password" name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password" placeholder="Min. 8 characters"
                    value={form.password} onChange={handleChange}
                    onFocus={onFocus} onBlur={onBlur}
                    required style={{ ...inputBase, paddingRight: 48 }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: 4, color: '#9CA3AF',
                    }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
                {/* Password strength */}
                {form.password.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{
                          height: 3, flex: 1, borderRadius: 99,
                          background: i <= strength.score ? strength.color : '#E2E8F0',
                          transition: 'background .3s',
                        }} />
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: strength.color, fontWeight: 500 }}>
                      {strength.label} password
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="confirm_password"
                       style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                  Confirm password
                </label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: '#9CA3AF', fontSize: '18px', pointerEvents: 'none',
                  }} aria-hidden="true">lock_reset</span>
                  <input
                    id="confirm_password" name="confirm_password"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password" placeholder="Repeat your password"
                    value={form.confirm_password} onChange={handleChange}
                    onFocus={onFocus} onBlur={onBlur}
                    required style={{ ...inputBase, paddingRight: 80 }}
                  />
                  {/* Match indicator */}
                  {form.confirm_password.length > 0 && (
                    <span className="material-symbols-outlined" style={{
                      position: 'absolute', right: 44, top: '50%', transform: 'translateY(-50%)',
                      fontSize: '16px',
                      color: passwordsMatch ? '#10B981' : '#EF4444',
                      fontVariationSettings: "'FILL' 1",
                    }} aria-hidden="true">
                      {passwordsMatch ? 'check_circle' : 'cancel'}
                    </span>
                  )}
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: 4, color: '#9CA3AF',
                    }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {showConfirm ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>

              {/* GDPR consent */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 2 }}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={consented}
                  onClick={() => setConsented(!consented)}
                  style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                    background: consented ? '#0F172A' : '#fff',
                    border: `1.5px solid ${consented ? '#0F172A' : '#D1D5DB'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all .15s',
                  }}
                  aria-label="Agree to Privacy Policy"
                >
                  {consented && (
                    <span className="material-symbols-outlined"
                          style={{ fontSize: '13px', color: '#fff', fontVariationSettings: "'FILL' 1" }}
                          aria-hidden="true">check</span>
                  )}
                </button>
                <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                  I agree to the{' '}
                  <a href="#" style={{ color: '#0F172A', fontWeight: 600 }}>Privacy Policy</a>
                  {' '}and consent to data processing under GDPR.
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                style={{
                  height: 52, borderRadius: 12, border: 'none',
                  background: loading ? '#374151' : '#0F172A',
                  color: '#fff', fontSize: 15, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginTop: 4, transition: 'background .15s',
                  opacity: loading ? 0.8 : 1,
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1E293B' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#0F172A' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Creating account...
                  </>
                ) : 'Create account'}
              </button>
            </form>

            {/* Sign in link */}
            <p style={{ marginTop: 20, textAlign: 'center', fontSize: 14, color: '#64748B' }}>
              Already have an account?{' '}
              <Link to="/login"
                    style={{ color: '#0F172A', fontWeight: 600, textDecoration: 'none' }}>
                Sign in →
              </Link>
            </p>

            {/* Trust bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 20, marginTop: 28,
              paddingTop: 20, borderTop: '1px solid #F1F5F9',
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