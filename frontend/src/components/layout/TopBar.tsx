import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const PALETTES = [
  { id: 'purple', color: '#7c5cfc', label: 'Violet' },
  { id: 'blue',   color: '#3b82f6', label: 'Blue'   },
  { id: 'gold',   color: '#f0b429', label: 'Gold'   },
  { id: 'teal',   color: '#0ea5e9', label: 'Teal'   },
  { id: 'rose',   color: '#f43f5e', label: 'Rose'   },
] as const;

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  backPath?: string;
}

// ── Check if current user is admin from JWT ────────────────────────
function isAdmin(): boolean {
  try {
    const token = localStorage.getItem('fs_token')
    if (!token) return false
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role === 'admin'
  } catch {
    return false
  }
}

export default function TopBar({ title, showBack, backPath }: TopBarProps) {
  const navigate = useNavigate();
  const { mode, palette, setMode, setPalette } = useTheme();
  const [open, setOpen] = useState(false);
  const admin = isAdmin();

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 20px 14px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {showBack ? (
          <button
            onClick={() => navigate(backPath || -1 as any)}
            style={{ background:'none', border:'none', cursor:'pointer',
              color:'var(--text-secondary)', fontSize: 20, display:'flex' }}
          >
            <i className="ti ti-arrow-left" />
          </button>
        ) : (
          <div style={{
            width: 28, height: 28,
            background: 'var(--accent)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-shield" style={{ fontSize: 14, color: '#fff' }} aria-hidden="true" />
          </div>
        )}
        {title ? (
          <span style={{ fontFamily:'var(--font-main)', fontSize:17, fontWeight:700 }}>
            {title}
          </span>
        ) : (
          <span style={{ fontFamily:'var(--font-main)', fontSize:16, fontWeight:700 }}>
            FinSight
          </span>
        )}
      </div>

      {/* Right icons */}
      <div style={{ display:'flex', gap:8, alignItems:'center', position:'relative' }}>

        <IconBtn icon="ti-palette" onClick={() => setOpen(o => !o)} />
        <IconBtn icon="ti-user-circle" onClick={() => navigate('/safety')} />

        {/* Theme panel */}
        {open && (
          <div
            style={{
              position:'absolute', top:44, right:0,
              background:'var(--bg-card)',
              border:'1px solid var(--border)',
              borderRadius:14, padding:16, width:220, zIndex:100,
            }}
            // Close when clicking outside
            onMouseLeave={() => setOpen(false)}
          >
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.06em',
              textTransform:'uppercase', color:'var(--text-muted)',
              fontFamily:'var(--font-main)', marginBottom:12 }}>
              Appearance
            </p>

            {/* Mode toggle */}
            <p style={{ fontSize:11, color:'var(--text-muted)',
              marginBottom:6, fontFamily:'var(--font-main)', fontWeight:500 }}>
              MODE
            </p>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              {(['dark','light'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex:1, padding:'8px 4px',
                  borderRadius:10,
                  border: `1.5px solid ${mode===m ? 'var(--accent)' : 'var(--border)'}`,
                  background: mode===m ? 'var(--accent-light)' : 'var(--bg-card2)',
                  color: mode===m ? 'var(--accent)' : 'var(--text-secondary)',
                  fontFamily:'var(--font-main)', fontSize:12, fontWeight:600, cursor:'pointer',
                }}>
                  {m === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </button>
              ))}
            </div>

            {/* Palette dots */}
            <p style={{ fontSize:11, color:'var(--text-muted)',
              marginBottom:8, fontFamily:'var(--font-main)', fontWeight:500 }}>
              COLOUR
            </p>
            <div style={{ display:'flex', gap:8 }}>
              {PALETTES.map(p => (
                <button
                  key={p.id}
                  title={p.label}
                  onClick={() => setPalette(p.id)}
                  style={{
                    width:32, height:32, borderRadius:'50%',
                    background: p.color, cursor:'pointer',
                    border: palette===p.id
                      ? '2.5px solid var(--text-primary)'
                      : '2.5px solid transparent',
                    transform: palette===p.id ? 'scale(1.15)' : 'scale(1)',
                    transition:'all .2s',
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function IconBtn({ icon, onClick }: { icon: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width:36, height:36,
      background:'var(--bg-card)',
      border:'1px solid var(--border)',
      borderRadius:10,
      display:'flex', alignItems:'center', justifyContent:'center',
      cursor:'pointer', fontSize:17,
      color:'var(--text-secondary)',
    }}>
      <i className={`ti ${icon}`} />
    </button>
  );
}