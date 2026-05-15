import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <span style={{fontFamily: 'Material Symbols Outlined'}}>shield_lock</span>
          <h1 className="text-2xl font-bold" style={{color: '#7c3aed'}}>FinSight</h1>
        </div>
        <p style={{color: '#94A3B8'}}>Your Money. Your Privacy.</p>
        <div className="glass-card p-6 rounded-2xl">
          <p style={{color: '#e8dfee'}}>✅ React + Vite + Tailwind working!</p>
        </div>
      </div>
    </div>
  )
}

export default App
