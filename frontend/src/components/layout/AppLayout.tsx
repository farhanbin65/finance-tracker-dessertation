import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

interface AppLayoutProps {
  title?: string;
  showBack?: boolean;
  backPath?: string;
}

export default function AppLayout({ title, showBack, backPath }: AppLayoutProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100dvh',
      maxWidth: 430,
      margin: '0 auto',
      background: 'var(--bg-primary)',
    }}>
      <TopBar title={title} showBack={showBack} backPath={backPath} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}