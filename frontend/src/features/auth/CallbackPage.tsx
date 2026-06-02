/**
 * FinSight — CallbackPage (features/auth)
 * Auth0 removed — redirects based on JWT in localStorage.
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('fs_token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const isExpired = payload.exp * 1000 < Date.now()
        if (!isExpired) {
          navigate('/dashboard', { replace: true })
          return
        }
      } catch { /* fall through */ }
    }
    navigate('/login', { replace: true })
  }, [])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '100dvh', background: 'var(--bg-primary)',
      gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '3px solid var(--accent-light)',
        borderTopColor: 'var(--accent)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>
        Signing you in...
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}