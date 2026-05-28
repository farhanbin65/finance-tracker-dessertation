import { useNavigate, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/dashboard',    icon: 'ti-home',         label: 'Home'     },
  { path: '/transactions', icon: 'ti-wallet',       label: 'Wealth'   },
  { path: '/budget',       icon: 'ti-chart-pie',    label: 'Trade'    },
  { path: '/insights',     icon: 'ti-chart-line',   label: 'Insights' },
  { path: '/safety',       icon: 'ti-shield-check', label: 'Safety'   },
]

export default function BottomNav() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Main navigation"
      style={{
        display: 'flex',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        padding: '10px 0 16px',
        // ✅ Safe area for iPhone home indicator
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        position: 'sticky',
        bottom: 0,
        zIndex: 50,
      }}
    >
      {/* ✅ Inner wrapper — caps nav width on desktop, stays full width mobile */}
      <div style={{
        display: 'flex',
        width: '100%',
        maxWidth: 780,
        margin: '0 auto',
      }}>
        {NAV_ITEMS.map(item => {
          const active = pathname.startsWith(item.path)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
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
                // ✅ 44px minimum touch target
                minHeight: 44,
                justifyContent: 'center',
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
                  style={{ fontSize: 20, color: active ? '#fff' : 'var(--text-muted)' }}
                  aria-hidden="true"
                />
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: 500,
                color: active ? 'var(--accent)' : 'var(--text-muted)',
              }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}