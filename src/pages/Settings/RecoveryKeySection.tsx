import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Copy, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import PasswordInput from './PasswordInput'

export default function RecoveryKeySection() {
  const { t } = useTranslation()
  const [pwd, setPwd] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function handleRegenerate(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (!pwd) return setError(t('settings.recoveryKey.passwordRequired'))

    setLoading(true)
    const key = await window.api.auth.regenerateRecoveryKey(pwd)
    setLoading(false)

    if (key) {
      setRecoveryKey(key)
      setPwd('')
    } else {
      setError(t('settings.recoveryKey.incorrect'))
    }
  }

  function handleCopy() {
    if (!recoveryKey) return
    navigator.clipboard.writeText(recoveryKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDone() {
    setRecoveryKey(null)
    setConfirmed(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <CardTitle>{t('settings.recoveryKey.title')}</CardTitle>
        </div>
        <CardDescription>{t('settings.recoveryKey.desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {recoveryKey ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-lg font-bold text-textPrimary tracking-wider select-all">
                  {recoveryKey}
                </p>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surfaceHigh border border-border text-xs font-medium text-textMuted hover:text-textPrimary transition-colors shrink-0"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? t('common.copied') : t('common.copy')}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-surfaceHigh/40 border border-border p-3 text-xs text-textMuted leading-5">
              <p>{t('settings.recoveryKey.oldInvalid')}</p>
              <p className="mt-1">{t('settings.recoveryKey.notShownAgain')}</p>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <span className="text-xs text-textMuted">{t('settings.recoveryKey.confirmSaved')}</span>
            </label>

            <div className="flex justify-end">
              <Button size="sm" disabled={!confirmed} onClick={handleDone}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('common.close')}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegenerate} className="flex flex-col gap-4">
            <div className="rounded-xl bg-surfaceHigh/40 border border-border p-3 text-xs text-textMuted leading-5">
              <p>{t('settings.recoveryKey.regenWarning')}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('settings.recoveryKey.confirmPassword')}</label>
              <PasswordInput
                value={pwd}
                onChange={setPwd}
                show={show}
                onToggle={() => setShow(!show)}
                placeholder={t('settings.recoveryKey.confirmPassword')}
              />
            </div>

            {error && (
              <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" size="sm" disabled={loading}>
                <KeyRound className="w-3.5 h-3.5" />
                {loading ? t('settings.recoveryKey.regenerating') : t('settings.recoveryKey.regenerate')}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
