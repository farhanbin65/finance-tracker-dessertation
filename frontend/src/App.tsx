import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
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
import AdminPage         from './pages/AdminPage'
import AdminUserPage     from './pages/AdminUserPage'
import AdminSettingsPage from './pages/AdminSettingsPage'

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

// ── Admin route wrapper — clean layout, no BottomNav ──────────────
function AdminRoute() {
  const token = localStorage.getItem('fs_token')
  if (!token) return <Navigate to="/login" replace />
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp * 1000 < Date.now()) return <Navigate to="/login" replace />
    if (payload.role !== 'admin') return <Navigate to="/dashboard" replace />
  } catch {
    return <Navigate to="/login" replace />
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    }}>
      {/* Minimal admin top bar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Left — brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(255,79,100,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-shield-lock"
               style={{ fontSize: 15, color: 'var(--red)' }} aria-hidden="true" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            FinSight
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px',
            borderRadius: 99, background: 'rgba(255,79,100,0.12)',
            color: 'var(--red)', letterSpacing: '.06em', textTransform: 'uppercase',
          }}>Admin</span>
        </div>

        {/* Right — admin name + settings + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {localStorage.getItem('fs_name') || 'Admin'}
          </span>

          {/* Settings button */}
          <button
            onClick={() => window.location.href = '/admin/settings'}
            title="Settings"
            style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <i className="ti ti-settings" style={{ fontSize: 15 }} aria-hidden="true" />
          </button>

          <button
            onClick={() => {
              localStorage.clear()
              window.location.href = '/login'
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 34, padding: '0 12px', borderRadius: 8,
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
            }}
          >
            <i className="ti ti-logout" style={{ fontSize: 14 }} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>

      {/* Page content */}
      <main style={{ padding: '24px 24px 40px' }}>
        <Outlet />
      </main>
    </div>
  )
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

      {/* ── Admin routes — own layout, no BottomNav ───────── */}
      <Route element={<AdminRoute />}>
        <Route path="/admin"                element={<AdminPage />} />
        <Route path="/admin/users/:userId"  element={<AdminUserPage />} />
        <Route path="/admin/settings"       element={<AdminSettingsPage />} />
      </Route>

      {/* ── User protected routes — full AppLayout ────────── */}
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