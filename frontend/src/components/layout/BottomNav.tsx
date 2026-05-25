import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/transactions', icon: 'ti-wallet',       label: 'Wealth'   },
  { path: '/budget',       icon: 'ti-chart-pie',    label: 'Trade'    },
  { path: '/insights',     icon: 'ti-chart-line',   label: 'Insights' },
  { path: '/safety',       icon: 'ti-shield-check', label: 'Safety'   },
];

export default function BottomNav() {
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav style={{
      display: 'flex',
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      padding: '10px 0 16px',
      position: 'sticky',
      bottom: 0,
      zIndex: 50,
    }}>
      {NAV_ITEMS.map(item => {
        const active = pathname.startsWith(item.path);
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            <div style={{
              width: 40, height: 40,
              borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active ? 'var(--accent)' : 'transparent',
              transition: 'background .2s',
            }}>
              <i
                className={`ti ${item.icon}`}
                style={{
                  fontSize: 20,
                  color: active ? '#fff' : 'var(--text-muted)',
                }}
              />
            </div>
            <span style={{
              fontSize: 10,
              fontFamily: 'var(--font-main)',
              fontWeight: 500,
              color: active ? 'var(--accent)' : 'var(--text-muted)',
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}