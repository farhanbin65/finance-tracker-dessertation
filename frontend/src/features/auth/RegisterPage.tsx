/**
 * Finance Tracker — Register Page
 * Converted from Stitch design to production React + TypeScript
 * Privacy-first onboarding with GDPR consent
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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
    setError('')
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Client-side validation
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
      const res = await fetch('/api/auth/register', {
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

      // Store tokens — auto login after register
      // ✅ Correct key — matches what all pages expect
      localStorage.setItem('fs_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // Redirect to dashboard
      navigate('/dashboard')

    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden relative"
      style={{ backgroundColor: '#15121b', color: '#e8dfee', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Background glows */}
      <div className="fixed top-[-10%] right-[-20%] w-[70vw] h-[70vw] rounded-full -z-10"
           style={{ background: 'rgba(124,58,237,0.07)', filter: 'blur(120px)' }} />
      <div className="fixed bottom-[-5%] left-[-10%] w-[50vw] h-[50vw] rounded-full -z-10"
           style={{ background: 'rgba(63,70,92,0.08)', filter: 'blur(100px)' }} />

      {/* Header */}
      <header className="flex justify-between items-center w-full px-5 h-16 fixed top-0 left-0 z-50"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button className="flex items-center justify-center p-2 opacity-80 hover:opacity-100 transition-opacity">
          <span className="material-symbols-outlined" style={{ color: '#7c3aed' }}>arrow_back</span>
        </button>
        <h1 className="font-bold text-lg" style={{ color: '#e8dfee' }}>Finance Tracker</h1>
        <span className="material-symbols-outlined" style={{ color: '#ccc3d8' }}>shield_lock</span>
      </header>

      {/* Main */}
      <main className="flex-grow flex flex-col pt-24 px-5 pb-8 max-w-lg mx-auto w-full">

        {/* Hero */}
        <div className="mb-8">
          <h2 className="font-bold mb-2"
              style={{ fontSize: '32px', lineHeight: '40px', letterSpacing: '-0.02em' }}>
            Create Account
          </h2>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm"
                  style={{ color: '#7c3aed', fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>
              verified_user
            </span>
            <p style={{ fontSize: '18px', color: '#ccc3d8' }}>Privacy-first from day one.</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm"
               style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} className="flex flex-col gap-5">

          {/* Full Name */}
          <div className="flex flex-col gap-2">
            <label className="text-xs ml-2" style={{ color: '#94A3B8' }}>Full name</label>
            <div className="flex items-center rounded-full px-5 py-3.5 transition-all duration-300"
                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <input
                name="full_name"
                type="text"
                placeholder="Enter your legal name"
                value={form.full_name}
                onChange={handleChange}
                required
                className="bg-transparent border-none outline-none w-full text-base"
                style={{ color: '#e8dfee' }}
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label className="text-xs ml-2" style={{ color: '#94A3B8' }}>Email address</label>
            <div className="flex items-center rounded-full px-5 py-3.5 transition-all duration-300"
                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <input
                name="email"
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={handleChange}
                required
                className="bg-transparent border-none outline-none w-full text-base"
                style={{ color: '#e8dfee' }}
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label className="text-xs ml-2" style={{ color: '#94A3B8' }}>Password</label>
            <div className="flex items-center rounded-full px-5 py-3.5 transition-all duration-300"
                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={handleChange}
                required
                className="bg-transparent border-none outline-none w-full text-base"
                style={{ color: '#e8dfee' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined" style={{ color: '#94A3B8', fontSize: '20px' }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-2">
            <label className="text-xs ml-2" style={{ color: '#94A3B8' }}>Confirm password</label>
            <div className="flex items-center rounded-full px-5 py-3.5 transition-all duration-300"
                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <input
                name="confirm_password"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={form.confirm_password}
                onChange={handleChange}
                required
                className="bg-transparent border-none outline-none w-full text-base"
                style={{ color: '#e8dfee' }}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined" style={{ color: '#94A3B8', fontSize: '20px' }}>
                  {showConfirm ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Consent Toggle */}
          <div className="flex items-start gap-3 mt-2 px-2">
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={consented}
                onChange={e => setConsented(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 rounded-full peer transition-all duration-300 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                   style={{
                     background: consented ? '#7c3aed' : '#37333e',
                     position: 'relative',
                   }} />
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span style={{ color: '#e8dfee', fontSize: '16px' }}>I agree to the Privacy Policy</span>
              <span className="material-symbols-outlined cursor-pointer"
                    style={{ color: '#7c3aed', fontSize: '18px' }}>info</span>
            </div>
          </div>

          {/* GDPR Notice */}
          <div className="p-4 rounded-xl flex gap-3 items-start"
               style={{ background: '#1d1a24', border: '1px solid rgba(74,68,85,0.3)' }}>
            <span className="material-symbols-outlined" style={{ color: '#7c3aed', fontSize: '20px' }}>
              encrypted
            </span>
            <p className="text-xs" style={{ color: '#ccc3d8', lineHeight: '1.5' }}>
              Your data never leaves your device without consent. All personal information
              is encrypted locally before synchronization.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-4 py-4 rounded-full font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-60"
            style={{
              background: '#7c3aed',
              color: '#ede0ff',
              boxShadow: '0 0 20px rgba(124,58,237,0.3)',
            }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Sign In Link */}
        <div className="mt-8 text-center">
          <p className="text-sm" style={{ color: '#ccc3d8' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold" style={{ color: '#7c3aed' }}>
              Sign In
            </Link>
          </p>
        </div>

        {/* Security Badge */}
        <div className="mt-10 flex justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
                 style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
              <span className="material-symbols-outlined"
                    style={{ color: '#7c3aed', fontSize: '32px', fontVariationSettings: "'FILL' 1" }}>
                security
              </span>
            </div>
            <span className="text-xs" style={{ color: '#94A3B8' }}>AES-256 Encrypted</span>
          </div>
        </div>
      </main>
    </div>
  )
}