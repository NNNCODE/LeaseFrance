import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, Download, FolderOpen, LifeBuoy } from 'lucide-react'
import { useLicenseStore } from '@/stores/useLicenseStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function DiagnosticsSection() {
  const { t } = useTranslation()
  const { license } = useLicenseStore()
  const [busyAction, setBusyAction] = useState<'export' | 'logs' | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleExport() {
    setBusyAction('export')
    setMessage('')
    setError('')
    try {
      const result = await window.api.diagnostics.exportReport()
      if (result.saved && result.path) {
        setMessage(t('settings.diagnostics.exported', { path: result.path }))
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleOpenLogs() {
    setBusyAction('logs')
    setMessage('')
    setError('')
    try {
      await window.api.diagnostics.openLogsFolder()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <LifeBuoy className="w-4 h-4 text-primary" />
          <CardTitle>{t('settings.diagnostics.title')}</CardTitle>
        </div>
        <CardDescription>{t('settings.diagnostics.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="rounded-xl border border-border bg-surfaceHigh/30 p-4">
          <p className="text-sm font-medium text-textPrimary">{t('settings.diagnostics.includesTitle')}</p>
          <p className="mt-1 text-xs leading-5 text-textMuted">{t('settings.diagnostics.includesDesc')}</p>
          {license?.supportLogPath ? (
            <p className="mt-3 text-xs text-textMuted break-all">
              {t('settings.diagnostics.logPath', { path: license.supportLogPath })}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleExport} disabled={busyAction !== null}>
            <Download className="w-3.5 h-3.5" />
            {busyAction === 'export' ? t('settings.diagnostics.exporting') : t('settings.diagnostics.export')}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleOpenLogs} disabled={busyAction !== null}>
            <FolderOpen className="w-3.5 h-3.5" />
            {t('settings.diagnostics.openLogs')}
          </Button>
        </div>

        {message ? (
          <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 p-3 text-xs text-success">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <p>{message}</p>
          </div>
        ) : null}
        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/10 p-3 text-xs text-danger">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
