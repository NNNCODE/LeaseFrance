import { motion } from 'framer-motion'
import {
  CalendarClock,
  Home,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import WindowControls from './WindowControls'

interface AuthShellProps {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}

const featureCards = [
  {
    titleKey: 'authShell.featurePayments' as const,
    descKey: 'authShell.featurePaymentsDesc' as const,
    icon: ReceiptText,
    tone: 'text-warning',
    bg: 'bg-warning/10',
  },
  {
    titleKey: 'authShell.featureLeases' as const,
    descKey: 'authShell.featureLeasesDesc' as const,
    icon: CalendarClock,
    tone: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    titleKey: 'authShell.featureLocal' as const,
    descKey: 'authShell.featureLocalDesc' as const,
    icon: ShieldCheck,
    tone: 'text-success',
    bg: 'bg-success/10',
  },
]

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  const { t } = useTranslation()
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <header className="drag flex h-14 items-center justify-between border-b border-border bg-background/95 px-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <Home className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">RentFlow Desktop</p>
            <p className="text-sm font-semibold text-textPrimary">{t('authShell.subtitle')}</p>
          </div>
        </div>
        <WindowControls />
      </header>

      <main className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_28%),radial-gradient(circle_at_75%_18%,rgba(99,102,241,0.18),transparent_26%),radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.10),transparent_24%)]" />
          <div className="absolute left-[-10%] top-[18%] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-[-8%] right-[10%] h-64 w-64 rounded-full bg-warning/10 blur-3xl" />
        </div>

        <div className="relative z-10 grid h-full gap-6 p-6 md:grid-cols-[minmax(0,1.1fr)_420px]">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="hidden rounded-[28px] border border-border/70 bg-[linear-gradient(145deg,rgba(20,24,34,0.96),rgba(26,26,36,0.88))] p-8 shadow-card md:flex md:flex-col md:justify-between no-drag"
          >
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {t('authShell.desktopApp')}
              </div>

              <h2 className="mt-6 max-w-lg text-4xl font-semibold leading-tight text-textPrimary">
                {t('authShell.heroTitle')}
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                {t('authShell.heroDesc')}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MetricCard value="100%" label={t('authShell.metricLocal')} />
              <MetricCard value="PDF" label={t('authShell.metricPdf')} />
              <MetricCard value="CSV" label={t('authShell.metricCsv')} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {featureCards.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.titleKey}
                    className="rounded-2xl border border-border/70 bg-surface/60 p-4"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.bg}`}>
                      <Icon className={`h-4 w-4 ${item.tone}`} />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-textPrimary">{t(item.titleKey)}</p>
                    <p className="mt-2 text-xs leading-6 text-textMuted">{t(item.descKey)}</p>
                  </div>
                )
              })}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex items-center justify-center no-drag"
          >
            <div className="w-full max-w-md rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(26,26,36,0.95),rgba(20,20,28,0.92))] p-7 shadow-card backdrop-blur-sm">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">{eyebrow}</p>
                <h1 className="mt-3 text-2xl font-semibold text-textPrimary">{title}</h1>
                <p className="mt-2 text-sm leading-6 text-textMuted">{description}</p>
              </div>

              <div className="mt-7">{children}</div>

              {footer ? (
                <div className="mt-6 border-t border-border/80 pt-5">
                  {footer}
                </div>
              ) : null}
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  )
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface/60 px-4 py-3">
      <p className="text-2xl font-semibold text-textPrimary">{value}</p>
      <p className="mt-1 text-xs text-textMuted">{label}</p>
    </div>
  )
}
