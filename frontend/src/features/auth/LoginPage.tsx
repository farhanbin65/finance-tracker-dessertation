/**
 * Finance Tracker — Login Page
 * Hybrid Auth: Email/Password (our JWT) + Social Login (Auth0)
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const { loginWithRedirect } = useAuth0()

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/dashboard')

    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    loginWithRedirect({
      authorizationParams: { connection: 'google-oauth2' }
    })
  }

  const handleGithubLogin = () => {
    loginWithRedirect({
      authorizationParams: { connection: 'github' }
    })
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-between overflow-x-hidden relative"
      style={{ backgroundColor: '#0F1629', color: '#e8dfee', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Background decorative glows */}
      <div
        className="fixed top-[-10%] right-[-20%] w-[80vw] h-[80vw] rounded-full -z-10"
        style={{ background: 'rgba(124,58,237,0.08)', filter: 'blur(120px)' }}
      />
      <div
        className="fixed bottom-[-5%] left-[-10%] w-[60vw] h-[60vw] rounded-full -z-10"
        style={{ background: 'rgba(63,70,92,0.1)', filter: 'blur(100px)' }}
      />

      {/* Header */}
      <header className="w-full px-5 h-16 flex justify-between items-center fixed top-0 left-0 z-50">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined"
            style={{ color: '#7c3aed', fontVariationSettings: "'FILL' 1" }}
          >
            shield_lock
          </span>
          <span className="text-xl font-bold" style={{ color: '#e8dfee' }}>
            Finance Tracker
          </span>
        </div>
        <span
          className="material-symbols-outlined"
          style={{ color: '#ccc3d8', cursor: 'pointer' }}
        >
          help_outline
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-5 pt-24 pb-12 w-full max-w-md mx-auto">

        {/* Hero Text */}
        <div className="text-center mb-8">
          <h1
            className="font-bold mb-2"
            style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}
          >
            Welcome Back
          </h1>
          <p style={{ fontSize: '18px', color: '#94A3B8' }}>
            Your Money. Your Privacy.
          </p>
        </div>

        {/* Login Card */}
        <div
          className="w-full rounded-2xl p-6"
          style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Error message */}
          {error && (
            <div
              className="mb-4 p-3 rounded-xl text-sm"
              style={{
                background: 'rgba(239,68,68,0.1)',
                color: '#EF4444',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              {error}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">

            {/* Email */}
            <div className="flex flex-col gap-2">
              <label className="text-xs ml-1" style={{ color: '#94A3B8' }}>
                Email Address
              </label>
              <div
                className="flex items-center rounded-full px-4 py-3.5 transition-all duration-300"
                style={{ background: 'rgba(16,13,22,1)', border: '1px solid #37333e' }}
              >
                <span
                  className="material-symbols-outlined mr-3"
                  style={{ color: '#94A3B8', fontSize: '20px' }}
                >
                  mail
                </span>
                <input
                  type="email"
                  placeholder="name@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="bg-transparent border-none outline-none w-full text-base"
                  style={{ color: '#e8dfee' }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label className="text-xs ml-1" style={{ color: '#94A3B8' }}>
                Password
              </label>
              <div
                className="flex items-center rounded-full px-4 py-3.5 transition-all duration-300"
                style={{ background: 'rgba(16,13,22,1)', border: '1px solid #37333e' }}
              >
                <span
                  className="material-symbols-outlined mr-3"
                  style={{ color: '#94A3B8', fontSize: '20px' }}
                >
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="bg-transparent border-none outline-none w-full text-base"
                  style={{ color: '#e8dfee' }}
                />
                <span
                  className="material-symbols-outlined ml-2 cursor-pointer"
                  style={{ color: '#94A3B8', fontSize: '20px' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'visibility' : 'visibility_off'}
                </span>
              </div>
              <div className="flex justify-end mt-1">
                <a href="#" className="text-xs" style={{ color: '#7c3aed' }}>
                  Forgot Password?
                </a>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-full font-semibold text-sm mt-2 transition-all duration-200 active:scale-95 disabled:opacity-60"
              style={{
                background: '#7c3aed',
                color: '#ede0ff',
                boxShadow: '0 0 20px rgba(124,58,237,0.3)',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 mt-6">
            <div className="h-px flex-grow" style={{ background: '#37333e' }} />
            <span className="text-xs" style={{ color: '#94A3B8' }}>or continue with</span>
            <div className="h-px flex-grow" style={{ background: '#37333e' }} />
          </div>

          {/* Social Login Buttons */}
          <div className="flex flex-col gap-3 mt-4">

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-full font-semibold text-sm transition-all duration-200 active:scale-95 hover:opacity-90"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e8dfee',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* GitHub */}
            <button
              type="button"
              onClick={handleGithubLogin}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-full font-semibold text-sm transition-all duration-200 active:scale-95 hover:opacity-90"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e8dfee',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#e8dfee">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>
          </div>

          {/* Biometric */}
          <div className="flex flex-col items-center gap-2 mt-6 cursor-pointer group">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all"
              style={{ border: '1px solid #37333e' }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: '#7c3aed', fontSize: '32px', fontVariationSettings: "'wght' 300" }}
              >
                fingerprint
              </span>
            </div>
            <span className="text-xs" style={{ color: '#94A3B8' }}>Biometric Login</span>
          </div>
        </div>

        {/* Register link */}
        <div className="mt-8 text-center">
          <p style={{ color: '#ccc3d8' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold" style={{ color: '#7c3aed' }}>
              Register
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full pb-10 flex flex-col items-center gap-2 px-5">
        <div className="flex items-center gap-1.5" style={{ opacity: 0.6 }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '16px', color: '#94A3B8' }}
          >
            verified_user
          </span>
          <span className="text-xs" style={{ color: '#94A3B8' }}>
            Protected by AES-256 encryption
          </span>
        </div>
        <div
          className="text-xs uppercase tracking-widest"
          style={{ color: '#94A3B8', opacity: 0.4 }}
        >
          System Status: Operational
        </div>
      </footer>
    </div>
  )
}