/**
 * FinSight — LoginPage.tsx
 * UI UX Pro Max: Responsive split layout (mobile-first → lg: two-panel)
 * Fixes: localStorage keys, focus states, accessibility, autocomplete, responsive
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function LoginPage() {
  const navigate = useNavigate()
  const { loginWithRedirect } = useAuth0()

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ✅ Keys aligned to handover doc
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed. Please check your credentials.')
        return
      }
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

  const handleGoogleLogin = () =>
    loginWithRedirect({ authorizationParams: { connection: 'google-oauth2' } })

  const handleGithubLogin = () =>
    loginWithRedirect({ authorizationParams: { connection: 'github' } })

  return (
    <div
      className="min-h-screen flex overflow-x-hidden"
      style={{ backgroundColor: '#0F1629', color: '#e8dfee', fontFamily: 'Inter, sans-serif' }}
    >
      {/* ─── Left brand panel — hidden on mobile, visible lg+ ─── */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Decorative glow — top right */}
        <div
          className="absolute top-[-15%] right-[-10%] w-[70%] h-[70%] rounded-full pointer-events-none"
          style={{ background: 'rgba(124,58,237,0.12)', filter: 'blur(100px)' }}
          aria-hidden="true"
        />
        {/* Decorative glow — bottom left */}
        <div
          className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full pointer-events-none"
          style={{ background: 'rgba(63,70,92,0.15)', filter: 'blur(80px)' }}
          aria-hidden="true"
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}
          >
            <span
              className="material-symbols-outlined"
              style={{ color: '#a78bfa', fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              shield_lock
            </span>
          </div>
          <span className="text-xl font-bold" style={{ color: '#e8dfee' }}>FinSight</span>
        </div>

        {/* Brand copy — centre of panel */}
        <div className="relative z-10 flex-grow flex flex-col justify-center max-w-sm">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 w-fit text-xs font-medium"
            style={{
              background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.25)',
              color: '#c4b5fd',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              verified
            </span>
            Bank-grade security
          </div>

          <h1
            className="font-bold mb-4 leading-tight"
            style={{ fontSize: 'clamp(32px, 3vw, 44px)', letterSpacing: '-0.02em', color: '#f1eeff' }}
          >
            Your money,<br />
            <span style={{ color: '#a78bfa' }}>intelligently</span><br />
            managed.
          </h1>

          <p style={{ fontSize: '16px', lineHeight: '1.7', color: '#94A3B8', maxWidth: '340px' }}>
            FinSight gives you AI-powered insights, real-time budget tracking, and complete
            financial clarity — all in one private, secure platform.
          </p>

          {/* Trust signals */}
          <div className="flex flex-col gap-3 mt-8">
            {[
              { icon: 'lock', text: 'AES-256 encrypted at rest' },
              { icon: 'visibility_off', text: 'Zero data sharing, ever' },
              { icon: 'psychology', text: 'AI insights powered by Llama 3' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: '#a78bfa', fontSize: '16px' }}
                    aria-hidden="true"
                  >
                    {icon}
                  </span>
                </div>
                <span style={{ fontSize: '14px', color: '#94A3B8' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom footnote */}
        <div className="relative z-10">
          <p style={{ fontSize: '12px', color: '#475569' }}>
            © 2025 FinSight · Dissertation Project · BSc Computing Systems
          </p>
        </div>
      </div>

      {/* ─── Right form panel ─── */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex flex-col min-h-screen">

        {/* Mobile-only header */}
        <header className="lg:hidden flex items-center justify-between px-5 h-16 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: '#a78bfa', fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                shield_lock
              </span>
            </div>
            <span className="text-lg font-bold" style={{ color: '#e8dfee' }}>FinSight</span>
          </div>
        </header>

        {/* Form scroll area */}
        <div className="flex-grow flex flex-col justify-center px-5 sm:px-8 lg:px-12 xl:px-16 py-8">
          <div className="w-full max-w-sm mx-auto lg:mx-0">

            {/* Heading */}
            <div className="mb-8">
              <h2
                className="font-bold mb-1.5"
                style={{ fontSize: '28px', letterSpacing: '-0.02em', color: '#f1eeff' }}
              >
                Welcome back
              </h2>
              <p style={{ fontSize: '15px', color: '#94A3B8' }}>
                Sign in to your FinSight account
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div
                className="mb-5 p-3.5 rounded-xl text-sm flex items-start gap-2.5"
                role="alert"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#FCA5A5',
                }}
              >
                <span
                  className="material-symbols-outlined flex-shrink-0"
                  style={{ fontSize: '18px', color: '#EF4444', marginTop: '1px' }}
                  aria-hidden="true"
                >
                  error
                </span>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>

              {/* Email field */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  style={{ fontSize: '14px', color: '#CBD5E1', fontWeight: 500 }}
                >
                  Email address
                </label>
                <div className="relative">
                  <span
                    className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: '#475569', fontSize: '18px' }}
                    aria-hidden="true"
                  >
                    mail
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 rounded-xl text-base transition-all duration-200"
                    style={{
                      height: '52px',          // ✅ exceeds 44px touch target
                      background: 'rgba(16,13,22,0.8)',
                      border: '1px solid #2D2A35',
                      color: '#e8dfee',
                      outline: 'none',
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

              {/* Password field */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    style={{ fontSize: '14px', color: '#CBD5E1', fontWeight: 500 }}
                  >
                    Password
                  </label>
                  <a
                    href="#"
                    style={{ fontSize: '13px', color: '#7c3aed' }}
                    className="hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <span
                    className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: '#475569', fontSize: '18px' }}
                    aria-hidden="true"
                  >
                    lock
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full pl-11 pr-12 rounded-xl text-base transition-all duration-200"
                    style={{
                      height: '52px',
                      background: 'rgba(16,13,22,0.8)',
                      border: '1px solid #2D2A35',
                      color: '#e8dfee',
                      outline: 'none',
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
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl font-semibold text-sm mt-1 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  height: '52px',
                  background: loading ? 'rgba(124,58,237,0.6)' : '#7c3aed',
                  color: '#ede0ff',
                }}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin"
                      width="16" height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-grow" style={{ background: '#1E1B2E' }} />
              <span style={{ fontSize: '12px', color: '#475569' }}>or continue with</span>
              <div className="h-px flex-grow" style={{ background: '#1E1B2E' }} />
            </div>

            {/* Social buttons */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 rounded-xl font-medium text-sm transition-all duration-200 active:scale-[0.98]"
                style={{
                  height: '52px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#CBD5E1',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              >
                {/* Official Google G */}
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <button
                type="button"
                onClick={handleGithubLogin}
                className="w-full flex items-center justify-center gap-3 rounded-xl font-medium text-sm transition-all duration-200 active:scale-[0.98]"
                style={{
                  height: '52px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#CBD5E1',
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
            <p className="mt-7 text-center" style={{ fontSize: '14px', color: '#64748B' }}>
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold hover:underline"
                style={{ color: '#a78bfa' }}
              >
                Create one free
              </Link>
            </p>
          </div>
        </div>

        {/* Footer — trust signal */}
        <footer className="flex items-center justify-center gap-4 px-5 py-5 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '14px', color: '#334155' }}
              aria-hidden="true"
            >
              verified_user
            </span>
            <span style={{ fontSize: '12px', color: '#334155' }}>AES-256 encrypted</span>
          </div>
          <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#334155' }} aria-hidden="true" />
          <div className="flex items-center gap-1.5">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '14px', color: '#334155' }}
              aria-hidden="true"
            >
              shield
            </span>
            <span style={{ fontSize: '12px', color: '#334155' }}>GDPR compliant</span>
          </div>
          <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#334155' }} aria-hidden="true" />
          <span style={{ fontSize: '12px', color: '#334155' }}>UK privacy law</span>
        </footer>
      </div>
    </div>
  )
}