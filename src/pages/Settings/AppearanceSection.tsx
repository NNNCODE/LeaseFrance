import { useTranslation } from 'react-i18next'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/stores/useThemeStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const THEME_OPTIONS = [
  {
    value: 'light',
    labelKey: 'settings.themeLight',
    descKey: 'settings.themeLightDesc',
    icon: Sun,
    preview: {
      frame: 'linear-gradient(180deg, #f4eee5 0%, #ece3d6 100%)',
      panel: '#fffbf5',
      outline: '#d8ccbc',
      pill: '#d9cfc0',
      text: '#6f6152',
      accent: '#c46844',
      glow: 'linear-gradient(180deg, rgba(255, 251, 245, 0.95), rgba(255, 251, 245, 0))',
    },
  },
  {
    value: 'auto',
    labelKey: 'settings.themeAuto',
    descKey: 'settings.themeAutoDesc',
    icon: Monitor,
    preview: {
      frame: 'linear-gradient(90deg, #f4eee5 0%, #f4eee5 50%, #252423 50%, #252423 100%)',
      panel: 'linear-gradient(90deg, #fffbf5 0%, #fffbf5 50%, #454442 50%, #454442 100%)',
      outline: '#8d857b',
      pill: 'linear-gradient(90deg, #d9cfc0 0%, #d9cfc0 50%, #121212 50%, #121212 100%)',
      text: '#f4ede3',
      accent: '#d3704c',
      glow: 'linear-gradient(180deg, rgba(255, 251, 245, 0.38), rgba(255, 251, 245, 0) 45%)',
    },
  },
  {
    value: 'dark',
    labelKey: 'settings.themeDark',
    descKey: 'settings.themeDarkDesc',
    icon: Moon,
    preview: {
      frame: 'linear-gradient(180deg, #2a2928 0%, #1f1f1f 100%)',
      panel: '#484746',
      outline: '#5f5e5d',
      pill: '#111111',
      text: '#f3ece1',
      accent: '#d3704c',
      glow: 'linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0) 50%)',
    },
  },
] as const

export default function AppearanceSection() {
  const { t } = useTranslation()
  const { theme, setTheme } = useThemeStore()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-primary" />
          <CardTitle>{t('settings.appearance')}</CardTitle>
        </div>
        <CardDescription>{t('settings.appearanceDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-textMuted">
          {t('settings.colorMode')}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map((option) => {
            const active = theme === option.value
            const Icon = option.icon

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={`rounded-[22px] border p-3 text-left transition-all duration-200 ${
                  active
                    ? 'border-primary bg-primary/5 shadow-glow'
                    : 'border-border bg-surfaceHigh/20 hover:border-primary/30 hover:bg-surfaceHigh/35'
                }`}
              >
                <ThemePreviewCard preview={option.preview} active={active} />
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-textPrimary">{t(option.labelKey)}</p>
                    <p className="mt-1 text-xs leading-5 text-textMuted">{t(option.descKey)}</p>
                  </div>
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-textMuted'}`} />
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function ThemePreviewCard({
  preview,
  active,
}: {
  preview: (typeof THEME_OPTIONS)[number]['preview']
  active: boolean
}) {
  return (
    <div
      className={`relative h-32 overflow-hidden rounded-[18px] border transition-transform duration-200 ${
        active ? 'scale-[1.01]' : ''
      }`}
      style={{ background: preview.frame, borderColor: preview.outline }}
    >
      <div className="absolute inset-x-0 top-0 h-14" style={{ background: preview.glow }} />
      <div className="absolute left-4 top-5 space-y-1">
        <div className="h-1 w-14 rounded-full" style={{ background: preview.text, opacity: 0.55 }} />
        <div className="h-1 w-10 rounded-full" style={{ background: preview.text, opacity: 0.42 }} />
        <div className="h-1 w-8 rounded-full" style={{ background: preview.text, opacity: 0.3 }} />
      </div>
      <div className="absolute right-3 top-3 h-4 w-12 rounded-full" style={{ background: preview.pill }}>
        <div className="absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 rounded-full" style={{ background: preview.text, opacity: 0.34 }} />
      </div>
      <div
        className="absolute inset-x-4 bottom-4 h-10 rounded-xl border shadow-sm"
        style={{ background: preview.panel, borderColor: preview.outline }}
      />
      <div className="absolute bottom-5 right-5 h-3 w-3 rounded-full" style={{ background: preview.accent }} />
    </div>
  )
}
