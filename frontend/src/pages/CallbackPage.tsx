import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

export default function CallbackPage() {
  const { isAuthenticated, isLoading, error } = useAuth0()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        navigate('/dashboard', { replace: true })
      } else if (error) {
        navigate('/login', { replace: true })
      }
    }
  }, [isAuthenticated, isLoading, error])

  return (
    <div style={{
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      minHeight:'100dvh', background:'var(--bg-primary)',
      gap:16,
    }}>
      {/* Spinner */}
      <div style={{
        width:48, height:48, borderRadius:'50%',
        border:'3px solid var(--accent-light)',
        borderTopColor:'var(--accent)',
        animation:'spin 0.8s linear infinite',
      }} />
      <p style={{
        fontFamily:'var(--font-main)', fontSize:14,
        color:'var(--text-muted)', fontWeight:500,
      }}>
        Signing you in...
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}