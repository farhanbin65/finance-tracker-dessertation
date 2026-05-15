import type { Config } from 'tailwindcss'

const config: Config = {
  // Enable dark mode via class — we toggle 'dark' on <html>
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── FinSight Brand ─────────────────────────────
        'primary':              '#7c3aed',   // Purple — main brand
        'primary-light':        '#d2bbff',   // Light purple for dark mode text
        'primary-container':    '#7c3aed',   // Purple containers/buttons
        'on-primary':           '#ffffff',   // Text on purple
        'on-primary-container': '#ede0ff',   // Text on purple containers

        // ── Surfaces (Dark Mode) ───────────────────────
        'surface':                  '#15121b',
        'surface-dim':              '#15121b',
        'surface-container':        '#221e28',
        'surface-container-low':    '#1d1a24',
        'surface-container-high':   '#2c2833',
        'surface-container-highest':'#37333e',
        'surface-container-lowest': '#100d16',
        'surface-variant':          '#37333e',
        'surface-glass':            'rgba(255, 255, 255, 0.08)',
        'surface-bright':           '#3c3742',

        // ── Surfaces (Light Mode) ──────────────────────
        'surface-light':            '#F9FAFB',
        'surface-container-light':  '#FFFFFF',
        'surface-variant-light':    '#F3F4F6',

        // ── Text ───────────────────────────────────────
        'on-surface':         '#e8dfee',   // Dark mode text
        'on-surface-light':   '#0F1629',   // Light mode text
        'on-surface-variant': '#ccc3d8',
        'on-background':      '#e8dfee',
        'text-muted':         '#94A3B8',

        // ── Secondary ──────────────────────────────────
        'secondary':           '#bfc6e0',
        'secondary-container': '#3f465c',
        'on-secondary':        '#293044',

        // ── Tertiary (amber/orange accents) ───────────
        'tertiary':           '#ffb784',
        'tertiary-container': '#a15100',

        // ── Status ─────────────────────────────────────
        'status-success': '#10B981',
        'status-warning': '#F59E0B',
        'status-danger':  '#EF4444',

        // ── Outline ────────────────────────────────────
        'outline':         '#958da1',
        'outline-variant': '#4a4455',

        // ── Background ─────────────────────────────────
        'background':       '#15121b',
        'background-light': '#F9FAFB',

        // ── Error ──────────────────────────────────────
        'error': '#ffb4ab',
      },
      borderRadius: {
        DEFAULT: '1rem',
        'lg':    '2rem',
        'xl':    '3rem',
        'full':  '9999px',
        'sm':    '0.5rem',
        'md':    '0.75rem',
      },
      spacing: {
        'section-gap':              '32px',
        'container-margin-mobile':  '20px',
        'container-margin-desktop': '40px',
        'card-padding':             '24px',
        'gutter':                   '16px',
        'base':                     '8px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg':        ['40px', { lineHeight: '48px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg-mobile': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md':       ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'subheading':        ['18px', { lineHeight: '26px', fontWeight: '500' }],
        'body-base':         ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-pill':        ['14px', { lineHeight: '20px', letterSpacing: '0.01em', fontWeight: '600' }],
        'caption-muted':     ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(124, 58, 237, 0.3)',
        'glow-purple-lg': '0 0 40px rgba(124, 58, 237, 0.4)',
        'glow-green': '0 0 12px rgba(16, 185, 129, 0.3)',
        'card': '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%)',
        'purple-glow': 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(124,58,237,0.3)' },
          '50%': { boxShadow: '0 0 24px rgba(124,58,237,0.6)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
