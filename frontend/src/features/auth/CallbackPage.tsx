/**
 * Finance Tracker — Auth0 Callback Page
 * Handles redirect after Auth0 social login
 */

import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'

export default function CallbackPage() {
  const { isAuthenticated, isLoading, user, error: auth0Error } = useAuth0()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      // Still loading Auth0 state
      if (isLoading) return

      // Auth0 error
      if (auth0Error) {
        setError(`Auth0 error: ${auth0Error.message}`)
        return
      }

      // Not authenticated — go back to login
      if (!isAuthenticated || !user) {
        navigate('/login')
        return
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

        console.log('Auth0 user:', user)
        console.log('API URL:', apiUrl)

        // Send user info to our Flask backend
        const res = await fetch(`${apiUrl}/api/auth/auth0-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            full_name: user.name,
            auth0_id: user.sub,
            auth0_token: 'social-login',
          }),
        })

        console.log('Backend response status:', res.status)
        const data = await res.json()
        console.log('Backend response data:', data)

        if (!res.ok) {
          setError(data.error || 'Authentication failed.')
          return
        }

        // Store our JWT tokens
        // ✅ Correct key — matches what all pages expect
        localStorage.setItem('fs_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        localStorage.setItem('user', JSON.stringify(data.user))

        // Redirect to dashboard
        navigate('/dashboard')

      } catch (err) {
        console.error('Callback error:', err)
        setError(`Connection error: ${err}. Make sure Flask is running.`)
      }
    }

    handleCallback()
  }, [isAuthenticated, isLoading, user, auth0Error])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ backgroundColor: '#15121b', color: '#e8dfee' }}
    >
      {error ? (
        <div className="text-center space-y-4 max-w-sm px-6">
          <div
            className="p-4 rounded-xl text-sm"
            style={{
              background: 'rgba(239,68,68,0.1)',
              color: '#EF4444',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            {error}
          </div>
          <button
            onClick={() => navigate('/login')}
            className="py-3 px-6 rounded-full font-semibold text-sm"
            style={{ background: '#7c3aed', color: '#ede0ff' }}
          >
            Back to Login
          </button>
        </div>
      ) : (
        <div className="text-center space-y-6">
          {/* Spinner */}
          <div
            className="w-16 h-16 rounded-full mx-auto"
            style={{
              border: '3px solid rgba(124,58,237,0.2)',
              borderTopColor: '#7c3aed',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div>
            <p className="font-semibold text-lg" style={{ color: '#e8dfee' }}>
              Securing your session...
            </p>
            <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
              Setting up your Finance Tracker account
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span
              className="material-symbols-outlined"
              style={{ color: '#7c3aed', fontSize: '16px' }}
            >
              shield_lock
            </span>
            <span className="text-xs" style={{ color: '#94A3B8' }}>
              End-to-end encrypted
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}