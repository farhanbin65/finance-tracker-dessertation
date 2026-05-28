import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import AppLayout from './components/layout/AppLayout'
import LoginPage        from './features/auth/LoginPage'
import CallbackPage    from './pages/CallbackPage'
import DashboardPage   from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import BudgetPage      from './pages/BudgetPage'
import GoalsPage       from './pages/GoalsPage'
import ChatPage        from './pages/ChatPage'
import ProfilePage     from './pages/ProfilePage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth0()

  if (isLoading) return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      minHeight:'100dvh', background:'var(--bg-primary)',
    }}>
      <div style={{
        width:36, height:36, borderRadius:'50%',
        border:'3px solid var(--accent-light)',
        borderTopColor:'var(--accent)',
        animation:'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/callback" element={<CallbackPage />} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected routes */}
      <Route element={
        <PrivateRoute>
          <AppLayout />
        </PrivateRoute>
      }>
        <Route path="/dashboard"    element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/budget"       element={<BudgetPage />} />
        <Route path="/goals"        element={<GoalsPage />} />
        <Route path="/insights"     element={<ChatPage />} />
        <Route path="/safety"       element={<ProfilePage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}