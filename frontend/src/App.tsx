import { useAuth0 } from '@auth0/auth0-react'
import { Navigate, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import TransactionsPage from './pages/TransactionsPage'
import BudgetPage from './pages/BudgetPage'
import GoalsPage from './pages/GoalsPage'
import ChatPage from './pages/ChatPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './features/auth/LoginPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth0()

  // Show nothing while Auth0 checks session
  if (isLoading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100dvh', background: 'var(--bg-primary)'
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid var(--accent)',
        borderTopColor: 'transparent',
        animation: 'spin 0.8s linear infinite'
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
      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/transactions" replace />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="budget" element={<BudgetPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/transactions" replace />} />
    </Routes>
  )
}