import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        background:  '#0F0F13',
        surface:     '#1A1A24',
        surfaceHigh: '#22222F',
        border:      '#2A2A3A',
        primary: {
          DEFAULT: '#6366F1',
          hover:   '#818CF8',
          muted:   '#6366F120',
        },
        accent: {
          DEFAULT: '#F59E0B',
          muted:   '#F59E0B20',
        },
        success: {
          DEFAULT: '#10B981',
          muted:   '#10B98120',
        },
        warning: {
          DEFAULT: '#F59E0B',
          muted:   '#F59E0B20',
        },
        danger: {
          DEFAULT: '#EF4444',
          muted:   '#EF444420',
        },
        textPrimary: '#E2E8F0',
        textMuted:   '#64748B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl:  '12px',
        '2xl': '16px',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.3)',
        glow: '0 0 20px rgba(99,102,241,0.15)',
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
