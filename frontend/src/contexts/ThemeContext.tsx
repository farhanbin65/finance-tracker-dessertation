import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type ThemeMode = 'dark' | 'light';
type Palette = 'purple' | 'blue' | 'gold' | 'teal' | 'rose';

interface ThemeContextType {
  mode: ThemeMode;
  palette: Palette;
  setMode: (m: ThemeMode) => void;
  setPalette: (p: Palette) => void;
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

// Palette accent colours — used as CSS variables
const PALETTES: Record<Palette, { accent: string; accentLight: string; accentGlow: string }> = {
  purple: { accent: '#7c5cfc', accentLight: 'rgba(124,92,252,0.15)', accentGlow: 'rgba(124,92,252,0.3)' },
  blue:   { accent: '#3b82f6', accentLight: 'rgba(59,130,246,0.15)',  accentGlow: 'rgba(59,130,246,0.3)' },
  gold:   { accent: '#f0b429', accentLight: 'rgba(240,180,41,0.15)',  accentGlow: 'rgba(240,180,41,0.3)' },
  teal:   { accent: '#0ea5e9', accentLight: 'rgba(14,165,233,0.15)',  accentGlow: 'rgba(14,165,233,0.3)' },
  rose:   { accent: '#f43f5e', accentLight: 'rgba(244,63,94,0.15)',   accentGlow: 'rgba(244,63,94,0.3)' },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() =>
    (localStorage.getItem('fs-mode') as ThemeMode) || 'dark'
  );
  const [palette, setPaletteState] = useState<Palette>(() =>
    (localStorage.getItem('fs-palette') as Palette) || 'purple'
  );

  const applyTheme = (m: ThemeMode, p: Palette) => {
    const root = document.documentElement;
    const pal = PALETTES[p];

    // CSS variables injected on :root
    root.style.setProperty('--accent', pal.accent);
    root.style.setProperty('--accent-light', pal.accentLight);
    root.style.setProperty('--accent-glow', pal.accentGlow);

    if (m === 'dark') {
      root.style.setProperty('--bg-primary',   '#0d0f14');
      root.style.setProperty('--bg-secondary', '#161922');
      root.style.setProperty('--bg-card',      '#1e2230');
      root.style.setProperty('--bg-card2',     '#252a38');
      root.style.setProperty('--text-primary', '#f0f2f8');
      root.style.setProperty('--text-secondary','#8b90a4');
      root.style.setProperty('--text-muted',   '#555c72');
      root.style.setProperty('--border',       'rgba(255,255,255,0.07)');
    } else {
      root.style.setProperty('--bg-primary',   '#f0f2f8');
      root.style.setProperty('--bg-secondary', '#e4e7f0');
      root.style.setProperty('--bg-card',      '#ffffff');
      root.style.setProperty('--bg-card2',     '#f7f8fc');
      root.style.setProperty('--text-primary', '#0d0f14');
      root.style.setProperty('--text-secondary','#555c72');
      root.style.setProperty('--text-muted',   '#8b90a4');
      root.style.setProperty('--border',       'rgba(0,0,0,0.08)');
    }
  };

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem('fs-mode', m);
    applyTheme(m, palette);
  };

  const setPalette = (p: Palette) => {
    setPaletteState(p);
    localStorage.setItem('fs-palette', p);
    applyTheme(mode, p);
  };

  // Apply on mount
  useEffect(() => { applyTheme(mode, palette); }, []);

  return (
    <ThemeContext.Provider value={{ mode, palette, setMode, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);