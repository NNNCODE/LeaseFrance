import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Download, RefreshCw, Upload } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

function resolveUpdateStatusTitle(state: AutoUpdateState, t: (key: string, opts?: Record<string, unknown>) => string): string {
  switch (state.status) {
    case 'checking':
      return t('settings.updates.status.checking')
    case 'available':
      return t('settings.updates.status.available')
    case 'downloading':
      return t('settings.updates.status.downloading')
    case 'downloaded':
      return t('settings.updates.status.downloaded')
    case 'up_to_date':
      return t('settings.updates.status.upToDate')
    case 'error':
      return t('settings.updates.status.error')
    case 'disabled':
      return t('settings.updates.status.disabled')
    default:
      return t('settings.updates.status.idle')
  }
}

function resolveUpdateStatusDescription(state: AutoUpdateState, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (!state.enabled) {
    if (state.disabledReason === 'development') return t('settings.updates.disabledReason.development')
    if (state.disabledReason === 'unsupported-platform') return t('settings.updates.disabledReason.unsupportedPlatform')
    return t('settings.updates.disabledReason.notConfigured')
  }

  switch (state.status) {
    case 'checking':
      return t('settings.updates.checkingDesc')
    case 'available':
      return t('settings.updates.availableDesc', { version: state.availableVersion || '?' })
    case 'downloading':
      return t('settings.updates.progress', { percent: state.downloadPercent ?? 0 })
    case 'downloaded':
      return t('settings.updates.downloadReady')
    case 'up_to_date':
      return t('settings.updates.upToDateDesc')
    case 'error':
      return t('settings.updates.errorDesc')
    default:
      return t('settings.updates.idleDesc')
  }
}

export default function UpdatesSection() {
  const { t } = useTranslation()
  const [state, setState] = useState<AutoUpdateState | null>(null)
  const [actionError, setActionError] = useState('')
  const [action, setAction] = useState<'check' | 'download' | 'install' | null>(null)

  useEffect(() => {
    let mounted = true

    window.api.updates.getState()
      .then((next) => {
        if (mounted) setState(next)
      })
      .catch((error) => {
        if (mounted) setActionError(error instanceof Error ? error.message : String(error))
      })

    const unsubscribe = window.api.updates.onStateChanged((_event, next) => {
      setState(next)
      if (next.status !== 'checking' && next.status !== 'downloading') {
        setAction(null)
      }
      if (next.lastError) {
        setActionError(next.lastError)
      } else {
        setActionError('')
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  async function handleCheck() {
    setAction('check')
    setActionError('')
    try {
      const next = await window.api.updates.check()
      setState(next)
    } catch (error) {
      setAction(null)
      setActionError(error instanceof Error ? error.message : String(error))
    }
  }

  async function handleDownload() {
    setAction('download')
    setActionError('')
    try {
      const next = await window.api.updates.download()
      setState(next)
      setAction(null)
    } catch (error) {
      setAction(null)
      setActionError(error instanceof Error ? error.message : String(error))
    }
  }

  async function handleInstall() {
    setAction('install')
    setActionError('')
    try {
      await window.api.updates.install()
    } catch (error) {
      setAction(null)
      setActionError(error instanceof Error ? error.message : String(error))
    }
  }

  const cardState: AutoUpdateState = state ?? {
    enabled: false,
    status: 'disabled',
    currentVersion: '...',
    availableVersion: null,
    releaseName: null,
    releaseDate: null,
    releaseNotes: [],
    downloadPercent: null,
    lastCheckedAt: null,
    lastError: null,
    feedUrl: null,
    channel: null,
    disabledReason: 'not-configured',
  }

  const busy = action !== null || cardState.status === 'checking' || cardState.status === 'downloading'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-primary" />
          <CardTitle>{t('settings.updates.title')}</CardTitle>
        </div>
        <CardDescription>{t('settings.updates.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="rounded-xl border border-border bg-surfaceHigh/30 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-textPrimary">{resolveUpdateStatusTitle(cardState, t)}</p>
              <p className="mt-1 text-xs text-textMuted">{resolveUpdateStatusDescription(cardState, t)}</p>
            </div>
            {cardState.status === 'available' ? (
              <Button size="sm" onClick={handleDownload} disabled={busy}>
                <Download className="w-3.5 h-3.5" />
                {cardState.status === 'downloading' || action === 'download'
                  ? t('settings.updates.downloading')
                  : t('settings.updates.download')}
              </Button>
            ) : cardState.status === 'downloaded' ? (
              <Button size="sm" onClick={handleInstall} disabled={busy}>
                <Upload className="w-3.5 h-3.5" />
                {t('settings.updates.install')}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={handleCheck} disabled={busy || !cardState.enabled}>
                <RefreshCw className={`w-3.5 h-3.5 ${cardState.status === 'checking' || action === 'check' ? 'animate-spin' : ''}`} />
                {cardState.status === 'checking' || action === 'check'
                  ? t('settings.updates.checking')
                  : t('settings.updates.check')}
              </Button>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-surface px-3 py-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-textMuted">{t('settings.updates.currentVersion')}</span>
              <p className="mt-1 text-sm font-medium text-textPrimary">{cardState.currentVersion}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-surface px-3 py-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-textMuted">{t('settings.updates.availableVersion')}</span>
              <p className="mt-1 text-sm font-medium text-textPrimary">{cardState.availableVersion || '—'}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-1 text-xs text-textMuted">
            {cardState.lastCheckedAt && (
              <p>{t('settings.updates.lastChecked', { date: formatDateTime(cardState.lastCheckedAt) })}</p>
            )}
            {cardState.releaseDate && (
              <p>{t('settings.updates.releaseDate', { date: formatDateTime(cardState.releaseDate) })}</p>
            )}
            {cardState.channel && (
              <p>{t('settings.updates.channel', { value: cardState.channel })}</p>
            )}
            {cardState.feedUrl && (
              <p className="truncate">{t('settings.updates.feed', { value: cardState.feedUrl })}</p>
            )}
          </div>
        </div>

        {cardState.releaseNotes.length > 0 && (
          <div className="rounded-xl border border-border bg-surfaceHigh/20 p-4">
            <p className="text-sm font-medium text-textPrimary">{t('settings.updates.releaseNotes')}</p>
            <ul className="mt-2 space-y-1 text-xs leading-5 text-textMuted">
              {cardState.releaseNotes.slice(0, 4).map((note, index) => (
                <li key={`${index}-${note.slice(0, 24)}`} className="list-disc ml-4">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(actionError || cardState.lastError) && (
          <div className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/10 p-3 text-xs text-danger">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <p>{actionError || cardState.lastError}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
