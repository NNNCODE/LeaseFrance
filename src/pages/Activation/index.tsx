import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, KeyRound, LifeBuoy, Mail, RefreshCw, ShieldCheck } from 'lucide-react'
import AuthShell from '@/components/layout/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLicenseStore } from '@/stores/useLicenseStore'

export default function Activation() {
  const { t } = useTranslation()
  const { license, activate, refresh } = useLicenseStore()
  const [billingEmail, setBillingEmail] = useState('')
  const [activationCode, setActivationCode] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!license?.billingEmail) return
    setBillingEmail((current) => current || license.billingEmail || '')
  }, [license?.billingEmail])

  const loading = license?.status === 'activating' || license?.status === 'refreshing' || license?.status === 'checking'
  const derivedError = useMemo(() => resolveLicenseErrorMessage(license, t), [license, t])
  const displayError = localError || derivedError

  async function handleActivate(event: React.FormEvent) {
    event.preventDefault()
    setLocalError(null)

    const normalizedEmail = billingEmail.trim().toLowerCase()
    const normalizedCode = activationCode.trim().toUpperCase()

    if (!normalizedEmail) {
      setLocalError(t('license.activation.emailRequired'))
      return
    }

    if (!normalizedCode) {
      setLocalError(t('license.activation.codeRequired'))
      return
    }

    const nextState = await activate(normalizedEmail, normalizedCode)
    if (!nextState.accessGranted) {
      setLocalError(resolveLicenseErrorMessage(nextState, t))
    }
  }

  async function handleRefreshRetry() {
    setLocalError(null)
    const nextState = await refresh()
    if (!nextState.accessGranted) {
      setLocalError(resolveLicenseErrorMessage(nextState, t))
    }
  }

  return (
    <AuthShell
      eyebrow={t('license.activation.eyebrow')}
      title={t('license.activation.title')}
      description={t('license.activation.description')}
      footer={(
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs text-textMuted">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            {t('license.activation.footer')}
          </div>
          <div className="flex items-start gap-2 text-xs text-textMuted">
            <LifeBuoy className="mt-0.5 w-3.5 h-3.5 shrink-0" />
            <span>{t('license.activation.supportLogs', { path: license?.supportLogPath ?? '-' })}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => window.api.diagnostics.openLogsFolder()}>
              <LifeBuoy className="w-3.5 h-3.5" />
              {t('license.activation.openLogsFolder')}
            </Button>
            {license?.hasStoredToken ? (
              <Button variant="secondary" size="sm" onClick={handleRefreshRetry} disabled={loading}>
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                {t('license.activation.retryRefresh')}
              </Button>
            ) : null}
          </div>
        </div>
      )}
    >
      <div className="flex flex-col gap-4">
        <StatusPanel license={license} />

        <form onSubmit={handleActivate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{t('license.activation.billingEmail')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <Input
                className="pl-10"
                type="email"
                value={billingEmail}
                onChange={(event) => setBillingEmail(event.target.value)}
                placeholder={t('license.activation.billingEmailPlaceholder')}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{t('license.activation.activationCode')}</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <Input
                className="pl-10 uppercase tracking-[0.18em]"
                value={activationCode}
                onChange={(event) => setActivationCode(event.target.value.toUpperCase())}
                placeholder={t('license.activation.activationCodePlaceholder')}
                disabled={loading}
              />
            </div>
          </div>

          {displayError ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
            >
              {displayError}
            </motion.div>
          ) : null}

          <Button type="submit" disabled={loading || !billingEmail.trim() || !activationCode.trim()}>
            <KeyRound className="w-4 h-4" />
            {loading ? t('license.activation.activating') : t('license.activation.submit')}
          </Button>
        </form>
      </div>
    </AuthShell>
  )
}

function StatusPanel({ license }: { license: LicenseState | null }) {
  const { t } = useTranslation()
  const warning = license?.status === 'inactive' || license?.status === 'expired'
  const Icon = warning ? AlertTriangle : CheckCircle2

  return (
    <div className={`rounded-2xl border px-4 py-3 ${warning ? 'border-warning/30 bg-warning/10 text-warning' : 'border-border/70 bg-surfaceHigh/40 text-textPrimary'}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex flex-col gap-1.5 text-sm">
          <p className="font-medium">{resolveStatusTitle(license, t)}</p>
          <p className="text-xs leading-5 opacity-80">{resolveStatusDescription(license, t)}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] opacity-75">
            {license?.lastValidatedAt ? <span>{t('license.activation.lastValidatedAt', { date: formatDateTime(license.lastValidatedAt) })}</span> : null}
            {license?.offlineGraceUntil ? <span>{t('license.activation.offlineGraceUntil', { date: formatDateTime(license.offlineGraceUntil) })}</span> : null}
            {license?.currentPeriodEndsAt ? <span>{t('license.activation.currentPeriodEndsAt', { date: formatDateTime(license.currentPeriodEndsAt) })}</span> : null}
            {license?.trialEndsAt ? <span>{t('license.activation.trialEndsAt', { date: formatDateTime(license.trialEndsAt) })}</span> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function resolveStatusTitle(license: LicenseState | null, t: (key: string) => string) {
  switch (license?.status) {
    case 'inactive': return t('license.status.inactiveTitle')
    case 'expired': return t('license.status.expiredTitle')
    case 'grace': return t('license.status.graceTitle')
    case 'active': return t('license.status.activeTitle')
    default: return t('license.status.unlicensedTitle')
  }
}

function resolveStatusDescription(license: LicenseState | null, t: (key: string) => string) {
  switch (license?.status) {
    case 'inactive': return t('license.status.inactiveDesc')
    case 'expired': return t('license.status.expiredDesc')
    case 'grace': return t('license.status.graceDesc')
    case 'active': return t('license.status.activeDesc')
    default: return t('license.status.unlicensedDesc')
  }
}

function resolveLicenseErrorMessage(license: LicenseState | null, t: (key: string) => string) {
  switch (license?.lastErrorCode) {
    case 'LICENSE_NOT_FOUND': return t('license.errors.licenseNotFound')
    case 'SUBSCRIPTION_INACTIVE': return t('license.errors.subscriptionInactive')
    case 'NETWORK_ERROR': return t('license.errors.network')
    case 'NETWORK_TIMEOUT': return t('license.errors.timeout')
    case 'INVALID_TOKEN_FORMAT':
    case 'INVALID_TOKEN_SIGNATURE':
    case 'UNSUPPORTED_TOKEN_VERSION':
    case 'LOCAL_LICENSE_CORRUPT':
      return t('license.errors.tokenInvalid')
    case 'INVALID_RESPONSE': return t('license.errors.invalidResponse')
    case 'LICENSE_NOT_CONFIGURED': return t('license.errors.notConfigured')
    default: return license?.lastErrorMessage ?? null
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
