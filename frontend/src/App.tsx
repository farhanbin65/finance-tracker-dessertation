import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'

// Auth pages
import LoginPage           from './features/auth/LoginPage'
import RegisterPage        from './features/auth/RegisterPage'
import ForgotPasswordPage  from './features/auth/ForgotPasswordPage'
import CallbackPage        from './pages/CallbackPage'

// App pages
import DashboardPage    from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import BudgetPage       from './pages/BudgetPage'
import GoalsPage        from './pages/GoalsPage'
import ChatPage         from './pages/ChatPage'
import ProfilePage      from './pages/ProfilePage'
import AdminPage        from './pages/AdminPage'
import AdminUserPage from './pages/AdminUserPage'

// ── Private route guard — JWT only, no Auth0 ──────────────────────
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('fs_token')

  // Check token exists and is not expired
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const isExpired = payload.exp * 1000 < Date.now()
      if (!isExpired) return <>{children}</>
      // Expired — clean up
      localStorage.removeItem('fs_token')
    } catch {
      // Malformed token — clean up
      localStorage.removeItem('fs_token')
    }
  }

  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      {/* ── Public routes ─────────────────────────────────── */}
      <Route path="/login"           element={<LoginPage />} />
      <Route path="/register"        element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/callback"        element={<CallbackPage />} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* ── Protected routes ──────────────────────────────── */}
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
        <Route path="/admin"        element={<AdminPage />} />
        <Route path="/admin/users/:userId" element={<AdminUserPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}