import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Copy, Eye, EyeOff, KeyRound, Lock, LogIn, Mail, ShieldCheck, UserPlus, X } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AuthShell from '@/components/layout/AuthShell'

const MAX_ATTEMPTS = 5
const LOCK_SECONDS = 30

interface LoginProps {
  onRegister?: () => void
  initialEmail?: string
  notice?: string | null
}

export default function Login({ onRegister, initialEmail = '', notice = null }: LoginProps) {
  const { t } = useTranslation()
  const { login, profile, error } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberSession, setRememberSession] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [lockout, setLockout] = useState(0)
  const [showRecovery, setShowRecovery] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail)
      return
    }
    if (!profile?.email) return
    setEmail((current) => current || profile.email)
  }, [initialEmail, profile?.email])

  useEffect(() => {
    if (lockout <= 0) return
    const timer = setTimeout(() => setLockout((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [lockout])

  const isLocked = lockout > 0
  const displayError = localError || error

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLocalError('')

    if (isLocked || !password) return

    if (!email.trim()) {
      setLocalError(t('auth.login.emailRequired'))
      return
    }

    setLoading(true)
    const ok = await login(normalizeEmail(email), password, rememberSession)
    setLoading(false)

    if (!ok) {
      const nextAttempts = attempts + 1
      setAttempts(nextAttempts)
      setPassword('')

      if (nextAttempts >= MAX_ATTEMPTS) {
        setLockout(LOCK_SECONDS)
        setAttempts(0)
      }

      inputRef.current?.focus()
    }
  }

  return (
    <>
      <AuthShell
        eyebrow={t('auth.login.eyebrow')}
        title={t('auth.login.title')}
        description={t('auth.login.description')}
        footer={(
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowRecovery(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-textMuted transition-colors hover:text-primary"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {t('auth.login.forgotPassword')}
              </button>
              <div className="flex items-center gap-2 text-xs text-textMuted">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                {t('auth.login.localData')}
              </div>
            </div>
            {onRegister ? (
              <button
                type="button"
                onClick={onRegister}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-textMuted transition-colors hover:text-primary"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {t('auth.login.createAccount')}
              </button>
            ) : <div />}
          </div>
        )}
      >
        {notice ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
          >
            {notice}
          </motion.div>
        ) : null}

        {profile ? (
          <div className="rounded-2xl border border-border/70 bg-surfaceHigh/50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-textMuted">{t('auth.login.lastAccount')}</p>
            <p className="mt-2 text-sm font-semibold text-textPrimary">{profile.name}</p>
            <p className="mt-1 text-xs text-textMuted">{profile.email}</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{t('auth.login.email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <Input
                ref={inputRef}
                className="pl-10"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('auth.login.emailPlaceholder')}
                disabled={isLocked || loading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{t('auth.login.password')}</label>
            <div className="relative">
              <Input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('auth.login.passwordPlaceholder')}
                disabled={isLocked || loading}
              />
              <button
                type="button"
                onClick={() => setShowPwd((current) => !current)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted transition-colors hover:text-textPrimary"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2 rounded-xl border border-border/70 bg-surfaceHigh/35 px-3 py-2.5 text-xs text-textMuted">
            <input
              type="checkbox"
              checked={rememberSession}
              onChange={(event) => setRememberSession(event.target.checked)}
              disabled={isLocked || loading}
              className="mt-0.5 h-4 w-4 rounded border-border bg-surface text-primary"
            />
            <span>
              {t('auth.login.rememberMe')}
            </span>
          </label>

          <AnimatePresence mode="wait">
            {isLocked ? (
              <motion.div
                key="lockout"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning"
              >
                {t('auth.login.lockout', { seconds: lockout })}
              </motion.div>
            ) : displayError ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
              >
                {displayError}
                {attempts > 0 ? (
                  <span className="ml-1 opacity-70">
                    {t('auth.login.attemptsLeft', { count: MAX_ATTEMPTS - attempts })}
                  </span>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <Button type="submit" disabled={isLocked || loading || !email.trim() || !password}>
            <LogIn className="w-4 h-4" />
            {loading ? t('auth.login.verifying') : t('auth.login.submit')}
          </Button>
        </form>
      </AuthShell>

      <AnimatePresence>
        {showRecovery ? (
          <RecoveryModal onClose={() => setShowRecovery(false)} />
        ) : null}
      </AnimatePresence>
    </>
  )
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

type RecoveryStep = 'key' | 'password' | 'done'

function RecoveryModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [step, setStep] = useState<RecoveryStep>('key')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [newRecoveryKey, setNewRecoveryKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function handleVerifyKey(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const cleaned = recoveryKey.trim().toUpperCase()
    if (!cleaned) return setError(t('auth.recovery.keyRequired'))
    setLoading(true)
    const valid = await window.api.auth.verifyRecoveryKey(cleaned)
    setLoading(false)
    if (valid) {
      setStep('password')
    } else {
      setError(t('auth.recovery.keyInvalid'))
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPwd.length < 8) return setError(t('auth.recovery.min8'))
    if (newPwd !== confirm) return setError(t('auth.recovery.mismatch'))
    setLoading(true)
    const cleaned = recoveryKey.trim().toUpperCase()
    const key = await window.api.auth.resetWithRecoveryKey(cleaned, newPwd)
    setLoading(false)
    if (key) {
      setNewRecoveryKey(key)
      setStep('done')
    } else {
      setError(t('auth.recovery.resetFailed'))
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(newRecoveryKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleFinish() {
    window.location.reload()
  }

  function handleBackdropClick(event: React.MouseEvent) {
    if (step === 'done') return
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl no-drag"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shrink-0 ${step === 'done' ? 'bg-success/10' : 'bg-warning/10'}`}>
              {step === 'done'
                ? <CheckCircle2 className="h-5 w-5 text-success" />
                : <KeyRound className="h-5 w-5 text-warning" />}
            </div>
            <div>
              <p className="text-base font-semibold text-textPrimary">
                {step === 'key' && t('auth.recovery.title')}
                {step === 'password' && t('auth.recovery.titleNewPassword')}
                {step === 'done' && t('auth.recovery.titleDone')}
              </p>
              <p className="mt-1 text-sm text-textMuted leading-relaxed">
                {step === 'key' && t('auth.recovery.descKey')}
                {step === 'password' && t('auth.recovery.descNewPassword')}
                {step === 'done' && t('auth.recovery.descDone')}
              </p>
            </div>
          </div>
          {step !== 'done' && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-textMuted transition-colors hover:bg-surfaceHigh hover:text-textPrimary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {step === 'key' && (
          <form onSubmit={handleVerifyKey} className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('auth.recovery.keyLabel')}</label>
              <Input
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                placeholder={t('auth.recovery.keyPlaceholder')}
                className="font-mono tracking-wider"
                autoFocus
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
              >
                {error}
              </motion.p>
            )}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                <KeyRound className="w-4 h-4" />
                {loading ? t('auth.recovery.verifying') : t('auth.recovery.verify')}
              </Button>
            </div>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handleReset} className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('auth.recovery.newPassword')}</label>
              <div className="relative">
                <Input
                  type={showPwd ? 'text' : 'password'}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder={t('auth.recovery.newPasswordPlaceholder')}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted transition-colors hover:text-textPrimary"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('auth.recovery.confirmPassword')}</label>
              <Input
                type={showPwd ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t('auth.recovery.confirmPlaceholder')}
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
              >
                {error}
              </motion.p>
            )}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={() => { setStep('key'); setError('') }}>
                {t('common.back')}
              </Button>
              <Button type="submit" disabled={loading}>
                <Lock className="w-4 h-4" />
                {loading ? t('auth.recovery.resetting') : t('auth.recovery.reset')}
              </Button>
            </div>
          </form>
        )}

        {step === 'done' && (
          <div className="mt-5 flex flex-col gap-4">
            <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-lg font-bold text-textPrimary tracking-wider select-all">
                  {newRecoveryKey}
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
              <p>{t('auth.recovery.keyNotShownAgain')}</p>
              <p className="mt-1">{t('auth.recovery.keepKeySafe')}</p>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <span className="text-xs text-textMuted">{t('auth.recovery.confirmSaved')}</span>
            </label>

            <div className="flex justify-end">
              <Button disabled={!confirmed} onClick={handleFinish}>
                <CheckCircle2 className="w-4 h-4" />
                {t('auth.login.submit')}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
