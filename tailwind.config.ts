import type { Config } from 'tailwindcss'

const withOpacity = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        background:  withOpacity('--color-background'),
        surface:     withOpacity('--color-surface'),
        surfaceHigh: withOpacity('--color-surface-high'),
        border:      withOpacity('--color-border'),
        primary: {
          DEFAULT: withOpacity('--color-primary'),
          hover:   withOpacity('--color-primary-hover'),
          muted:   'rgb(var(--color-primary) / 0.16)',
        },
        accent: {
          DEFAULT: withOpacity('--color-accent'),
          muted:   'rgb(var(--color-accent) / 0.16)',
        },
        success: {
          DEFAULT: withOpacity('--color-success'),
          muted:   'rgb(var(--color-success) / 0.16)',
        },
        warning: {
          DEFAULT: withOpacity('--color-warning'),
          muted:   'rgb(var(--color-warning) / 0.16)',
        },
        danger: {
          DEFAULT: withOpacity('--color-danger'),
          muted:   'rgb(var(--color-danger) / 0.16)',
        },
        textPrimary: withOpacity('--color-text-primary'),
        textMuted:   withOpacity('--color-text-muted'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl:  '12px',
        '2xl': '16px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        glow: 'var(--shadow-glow)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
