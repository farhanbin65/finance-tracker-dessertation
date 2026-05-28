/**
 * FinSight — RegisterPage.tsx
 * UI UX Pro Max: Responsive split layout, fixed localStorage keys,
 * password strength, focus states, autocomplete, accessibility
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || ''

// ── Password strength helper ──────────────────────────────────────
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak', color: '#EF4444' }
  if (score <= 2) return { score, label: 'Fair', color: '#F59E0B' }
  if (score <= 3) return { score, label: 'Good', color: '#3B82F6' }
  return { score, label: 'Strong', color: '#10B981' }
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [consented, setConsented] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (error) setError('')
  }

  // ── Focus/blur helpers for input ring ────────────────────────────
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const wrapper = e.currentTarget.closest<HTMLDivElement>('.input-wrapper')
    if (wrapper) {
      wrapper.style.border = '1px solid rgba(124,58,237,0.6)'
      wrapper.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'
    }
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const wrapper = e.currentTarget.closest<HTMLDivElement>('.input-wrapper')
    if (wrapper) {
      wrapper.style.border = '1px solid #2D2A35'
      wrapper.style.boxShadow = 'none'
    }
  }

  const strength = getPasswordStrength(form.password)
  // Password match indicator
  const passwordsMatch =
    form.confirm_password.length > 0 && form.password === form.confirm_password

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.')
      return
    }
    if (!consented) {
      setError('Please agree to the Privacy Policy to continue.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed.')
        return
      }

      // ✅ Keys aligned to handover doc
      localStorage.setItem('fs_token', data.access_token)
      localStorage.setItem('fs_refresh_token', data.refresh_token)
      localStorage.setItem('fs_user', JSON.stringify(data.user))
      localStorage.setItem('fs_name', data.user?.full_name || '')
      localStorage.setItem('fs_email', data.user?.email || '')

      navigate('/dashboard')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex overflow-x-hidden"
      style={{ backgroundColor: '#0F1629', color: '#e8dfee', fontFamily: 'Inter, sans-serif' }}
    >
      {/* ─── Left brand panel — lg+ only ───────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Glows */}
        <div className="absolute top-[-15%] right-[-10%] w-[70%] h-[70%] rounded-full pointer-events-none"
             style={{ background: 'rgba(124,58,237,0.1)', filter: 'blur(100px)' }} aria-hidden="true" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full pointer-events-none"
             style={{ background: 'rgba(63,70,92,0.12)', filter: 'blur(80px)' }} aria-hidden="true" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <span className="material-symbols-outlined"
                  style={{ color: '#a78bfa', fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true">shield_lock</span>
          </div>
          <span className="text-xl font-bold" style={{ color: '#e8dfee' }}>FinSight</span>
        </div>

        {/* Brand copy */}
        <div className="relative z-10 flex-grow flex flex-col justify-center max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 w-fit text-xs font-medium"
               style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#6EE7B7' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true">verified</span>
            Free forever · No credit card needed
          </div>

          <h1 className="font-bold mb-4 leading-tight"
              style={{ fontSize: 'clamp(32px, 3vw, 44px)', letterSpacing: '-0.02em', color: '#f1eeff' }}>
            Start your<br />
            <span style={{ color: '#a78bfa' }}>financial</span><br />
            journey today.
          </h1>

          <p style={{ fontSize: '16px', lineHeight: '1.7', color: '#94A3B8', maxWidth: '340px' }}>
            Join FinSight and get instant access to AI-powered budgeting, smart savings goals,
            and real-time spending insights.
          </p>

          {/* What you get */}
          <div className="flex flex-col gap-3 mt-8">
            {[
              { icon: 'auto_awesome', text: 'AI financial insights on day one' },
              { icon: 'savings', text: 'Smart savings goals tracker' },
              { icon: 'bar_chart', text: 'Budget categories & alerts' },
              { icon: 'lock', text: 'Your data stays yours, always' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                     style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <span className="material-symbols-outlined"
                        style={{ color: '#a78bfa', fontSize: '16px' }} aria-hidden="true">{icon}</span>
                </div>
                <span style={{ fontSize: '14px', color: '#94A3B8' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p style={{ fontSize: '12px', color: '#475569' }}>
            © 2025 FinSight · Dissertation Project · BSc Computing Systems
          </p>
        </div>
      </div>

      {/* ─── Right form panel ───────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex flex-col min-h-screen">

        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-5 h-16 flex-shrink-0">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            aria-label="Go back to login"
          >
            <span className="material-symbols-outlined" style={{ color: '#a78bfa', fontSize: '20px' }}>
              arrow_back
            </span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color: '#e8dfee' }}>FinSight</span>
          </div>
          <div style={{ width: 36 }} aria-hidden="true" />
        </header>

        {/* Scrollable form area */}
        <div className="flex-grow flex flex-col justify-center px-5 sm:px-8 lg:px-12 xl:px-16 py-8">
          <div className="w-full max-w-sm mx-auto lg:mx-0">

            {/* Heading */}
            <div className="mb-7">
              <h2 className="font-bold mb-1.5"
                  style={{ fontSize: '28px', letterSpacing: '-0.02em', color: '#f1eeff' }}>
                Create your account
              </h2>
              <p style={{ fontSize: '15px', color: '#94A3B8' }}>
                Free forever. No credit card required.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-5 p-3.5 rounded-xl text-sm flex items-start gap-2.5"
                   role="alert"
                   style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
                <span className="material-symbols-outlined flex-shrink-0"
                      style={{ fontSize: '18px', color: '#EF4444', marginTop: '1px' }} aria-hidden="true">
                  error
                </span>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleRegister} className="flex flex-col gap-4" noValidate>

              {/* ── Full name ── */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="full_name"
                       style={{ fontSize: '14px', color: '#CBD5E1', fontWeight: 500 }}>
                  Full name
                </label>
                <div className="input-wrapper relative flex items-center rounded-xl transition-all duration-200"
                     style={{ height: '52px', background: 'rgba(16,13,22,0.8)', border: '1px solid #2D2A35' }}>
                  <span className="material-symbols-outlined absolute left-4 pointer-events-none"
                        style={{ color: '#475569', fontSize: '18px' }} aria-hidden="true">person</span>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your full name"
                    value={form.full_name}
                    onChange={handleChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    required
                    className="bg-transparent border-none outline-none w-full pl-11 pr-4 text-base"
                    style={{ color: '#e8dfee', height: '100%' }}
                  />
                </div>
              </div>

              {/* ── Email ── */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg_email"
                       style={{ fontSize: '14px', color: '#CBD5E1', fontWeight: 500 }}>
                  Email address
                </label>
                <div className="input-wrapper relative flex items-center rounded-xl transition-all duration-200"
                     style={{ height: '52px', background: 'rgba(16,13,22,0.8)', border: '1px solid #2D2A35' }}>
                  <span className="material-symbols-outlined absolute left-4 pointer-events-none"
                        style={{ color: '#475569', fontSize: '18px' }} aria-hidden="true">mail</span>
                  <input
                    id="reg_email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={handleChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    required
                    className="bg-transparent border-none outline-none w-full pl-11 pr-4 text-base"
                    style={{ color: '#e8dfee', height: '100%' }}
                  />
                </div>
              </div>

              {/* ── Password ── */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg_password"
                       style={{ fontSize: '14px', color: '#CBD5E1', fontWeight: 500 }}>
                  Password
                </label>
                <div className="input-wrapper relative flex items-center rounded-xl transition-all duration-200"
                     style={{ height: '52px', background: 'rgba(16,13,22,0.8)', border: '1px solid #2D2A35' }}>
                  <span className="material-symbols-outlined absolute left-4 pointer-events-none"
                        style={{ color: '#475569', fontSize: '18px' }} aria-hidden="true">lock</span>
                  <input
                    id="reg_password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={handleChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    required
                    className="bg-transparent border-none outline-none w-full pl-11 pr-12 text-base"
                    style={{ color: '#e8dfee', height: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>

                {/* Password strength bar */}
                {form.password.length > 0 && (
                  <div className="mt-1.5">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{
                            background: i <= strength.score
                              ? strength.color
                              : 'rgba(255,255,255,0.08)',
                          }}
                        />
                      ))}
                    </div>
                    <p style={{ fontSize: '12px', color: strength.color }}>
                      {strength.label} password
                    </p>
                  </div>
                )}
              </div>

              {/* ── Confirm Password ── */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirm_password"
                       style={{ fontSize: '14px', color: '#CBD5E1', fontWeight: 500 }}>
                  Confirm password
                </label>
                <div className="input-wrapper relative flex items-center rounded-xl transition-all duration-200"
                     style={{ height: '52px', background: 'rgba(16,13,22,0.8)', border: '1px solid #2D2A35' }}>
                  <span className="material-symbols-outlined absolute left-4 pointer-events-none"
                        style={{ color: '#475569', fontSize: '18px' }} aria-hidden="true">lock_reset</span>
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    value={form.confirm_password}
                    onChange={handleChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    required
                    className="bg-transparent border-none outline-none w-full pl-11 pr-12 text-base"
                    style={{ color: '#e8dfee', height: '100%' }}
                  />
                  {/* Match indicator */}
                  {form.confirm_password.length > 0 && (
                    <span
                      className="material-symbols-outlined absolute right-10"
                      style={{
                        fontSize: '16px',
                        color: passwordsMatch ? '#10B981' : '#EF4444',
                        fontVariationSettings: "'FILL' 1",
                      }}
                      aria-hidden="true"
                    >
                      {passwordsMatch ? 'check_circle' : 'cancel'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {showConfirm ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>

              {/* ── GDPR consent ── */}
              <div className="flex items-start gap-3 pt-1">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={consented}
                  onClick={() => setConsented(!consented)}
                  className="flex-shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-all duration-200"
                  style={{
                    background: consented ? '#7c3aed' : 'transparent',
                    border: consented ? '1px solid #7c3aed' : '1px solid #4A4558',
                    minWidth: '20px',
                  }}
                  aria-label="Agree to Privacy Policy"
                >
                  {consented && (
                    <span className="material-symbols-outlined"
                          style={{ fontSize: '14px', color: '#fff', fontVariationSettings: "'FILL' 1" }}
                          aria-hidden="true">check</span>
                  )}
                </button>
                <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: '1.5' }}>
                  I agree to the{' '}
                  <a href="#" style={{ color: '#a78bfa' }} className="hover:underline">
                    Privacy Policy
                  </a>
                  {' '}and consent to my data being processed in accordance with GDPR.
                </p>
              </div>

              {/* GDPR info box */}
              <div className="p-4 rounded-xl flex gap-3 items-start"
                   style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <span className="material-symbols-outlined flex-shrink-0"
                      style={{ color: '#a78bfa', fontSize: '18px' }} aria-hidden="true">encrypted</span>
                <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.6' }}>
                  Your data is encrypted with AES-256 and never shared with third parties.
                  You can delete your account and all associated data at any time.
                </p>
              </div>

              {/* ── Submit ── */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ height: '52px', background: loading ? 'rgba(124,58,237,0.6)' : '#7c3aed', color: '#ede0ff' }}
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
                ) : (
                  'Create account'
                )}
              </button>
            </form>

            {/* Sign in link */}
            <p className="mt-6 text-center" style={{ fontSize: '14px', color: '#64748B' }}>
              Already have an account?{' '}
              <Link to="/login" className="font-semibold hover:underline" style={{ color: '#a78bfa' }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-center gap-4 px-5 py-5 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#334155' }} aria-hidden="true">
              verified_user
            </span>
            <span style={{ fontSize: '12px', color: '#334155' }}>AES-256 encrypted</span>
          </div>
          <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#334155' }} aria-hidden="true" />
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#334155' }} aria-hidden="true">
              shield
            </span>
            <span style={{ fontSize: '12px', color: '#334155' }}>GDPR compliant</span>
          </div>
        </footer>
      </div>
    </div>
  )
}