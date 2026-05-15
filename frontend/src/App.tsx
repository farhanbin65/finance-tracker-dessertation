import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import CallbackPage from './features/auth/CallbackPage'

// Temporary dashboard placeholder
function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  return (
    <div className="min-h-screen flex flex-col items-center justify-center"
         style={{ backgroundColor: '#15121b', color: '#e8dfee' }}>
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold" style={{ color: '#7c3aed' }}>
          🎉 Welcome, {user.full_name}!
        </h1>
        <p style={{ color: '#94A3B8' }}>Auth0 + JWT hybrid login working perfectly!</p>
        <p style={{ color: '#10B981' }}>✅ Dashboard coming next...</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App