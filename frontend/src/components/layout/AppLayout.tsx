import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import BottomNav from './BottomNav'

interface AppLayoutProps {
  title?: string
  showBack?: boolean
  backPath?: string
}

export default function AppLayout({ title, showBack, backPath }: AppLayoutProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100dvh',
      // ✅ REMOVED maxWidth: 430 — was locking all pages to mobile width
      background: 'var(--bg-primary)',
    }}>
      <TopBar title={title} showBack={showBack} backPath={backPath} />

      <main style={{
        flex: 1,
        overflowY: 'auto',
        // ✅ Centred content with max width — looks great on all screen sizes
        padding: '16px',
        maxWidth: 780,
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}>
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}