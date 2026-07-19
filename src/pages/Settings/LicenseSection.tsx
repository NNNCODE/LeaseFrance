import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { useLicenseStore } from '@/stores/useLicenseStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

function resolveLicenseStatusTone(status: LicenseState['status']) {
  switch (status) {
    case 'active':
      return 'border-success/20 bg-success/10 text-success'
    case 'grace':
    case 'refreshing':
    case 'checking':
    case 'activating':
      return 'border-warning/20 bg-warning/10 text-warning'
    case 'inactive':
    case 'expired':
      return 'border-danger/20 bg-danger/10 text-danger'
    default:
      return 'border-border bg-surfaceHigh/30 text-textMuted'
  }
}

function resolveLicenseStatusLabel(status: LicenseState['status'], t: (key: string) => string) {
  switch (status) {
    case 'active': return t('settings.license.status.active')
    case 'grace': return t('settings.license.status.grace')
    case 'refreshing': return t('settings.license.status.refreshing')
    case 'checking': return t('settings.license.status.checking')
    case 'activating': return t('settings.license.status.activating')
    case 'inactive': return t('settings.license.status.inactive')
    case 'expired': return t('settings.license.status.expired')
    case 'disabled': return t('settings.license.status.disabled')
    default: return t('settings.license.status.unlicensed')
  }
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface px-3 py-2">
      <span className="text-[11px] uppercase tracking-[0.18em] text-textMuted">{label}</span>
      <p className="mt-1 text-sm font-medium text-textPrimary break-all">{value}</p>
    </div>
  )
}

export default function LicenseSection() {
  const { t } = useTranslation()
  const { license, refresh } = useLicenseStore()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleRefresh() {
    setLoading(true)
    setMessage('')
    try {
      const next = await refresh()
      if (next.lastErrorMessage) {
        setMessage(next.lastErrorMessage)
      } else {
        setMessage(t('settings.license.refreshSuccess'))
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  const current = license ?? {
    enabled: false,
    status: 'disabled' as const,
    accessGranted: true,
    hasStoredToken: false,
    billingEmail: null,
    subscriptionStatus: null,
    refreshAfterSeconds: null,
    offlineGraceDays: null,
    nextRefreshAt: null,
    offlineGraceUntil: null,
    currentPeriodEndsAt: null,
    trialEndsAt: null,
    lastValidatedAt: null,
    lastRefreshAttemptAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    disabledReason: 'not-configured' as const,
    supportLogPath: null,
    endpointBaseUrl: null,
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <CardTitle>{t('settings.license.title')}</CardTitle>
        </div>
        <CardDescription>{t('settings.license.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className={`rounded-xl border p-4 ${resolveLicenseStatusTone(current.status)}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">{resolveLicenseStatusLabel(current.status, t)}</p>
              <p className="mt-1 text-xs opacity-80">
                {current.accessGranted ? t('settings.license.accessGranted') : t('settings.license.accessBlocked')}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRefresh}
              disabled={loading || !current.enabled || !current.hasStoredToken}
              className="shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? t('settings.license.refreshing') : t('settings.license.refresh')}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoBlock label={t('settings.license.billingEmail')} value={current.billingEmail || '—'} />
          <InfoBlock label={t('settings.license.subscriptionStatus')} value={current.subscriptionStatus || '—'} />
          <InfoBlock label={t('settings.license.lastValidated')} value={current.lastValidatedAt ? formatDateTime(current.lastValidatedAt) : '—'} />
          <InfoBlock label={t('settings.license.nextRefresh')} value={current.nextRefreshAt ? formatDateTime(current.nextRefreshAt) : '—'} />
          <InfoBlock label={t('settings.license.offlineGraceUntil')} value={current.offlineGraceUntil ? formatDateTime(current.offlineGraceUntil) : '—'} />
          <InfoBlock label={t('settings.license.currentPeriodEndsAt')} value={current.currentPeriodEndsAt ? formatDateTime(current.currentPeriodEndsAt) : '—'} />
        </div>

        <div className="flex flex-col gap-1 text-xs text-textMuted">
          {current.trialEndsAt ? <p>{t('settings.license.trialEndsAt', { date: formatDateTime(current.trialEndsAt) })}</p> : null}
          {current.endpointBaseUrl ? <p className="truncate">{t('settings.license.endpoint', { value: current.endpointBaseUrl })}</p> : null}
          {current.lastErrorMessage ? <p className="text-danger">{current.lastErrorMessage}</p> : null}
          {message ? <p className={current.lastErrorMessage ? 'text-danger' : 'text-success'}>{message}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}
