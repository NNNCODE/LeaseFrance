import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Copy, Eye, EyeOff, KeyRound, Lock, LogIn, Mail, ShieldCheck, UserPlus, X } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AuthShell from '@/components/layout/AuthShell'

const MAX_ATTEMPTS = 5
const LOCK_SECONDS = 30

interface LoginProps {
  onRegister: () => void
}

export default function Login({ onRegister }: LoginProps) {
  const { login, profile, error } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [lockout, setLockout] = useState(0)
  const [showRecovery, setShowRecovery] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!profile?.email) return
    setEmail((current) => current || profile.email)
  }, [profile?.email])

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
      setLocalError('Veuillez entrer votre adresse e-mail.')
      return
    }

    if (profile?.email && email.toLowerCase() !== profile.email.toLowerCase()) {
      setLocalError('Adresse e-mail incorrecte.')
      return
    }

    setLoading(true)
    const ok = await login(password)
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
        eyebrow="Connexion"
        title="Retrouvez votre poste de pilotage."
        description="Connectez-vous a votre espace proprietaire avec les memes controles de fenetre que dans le reste de l application."
        footer={(
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowRecovery(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-textMuted transition-colors hover:text-primary"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Mot de passe oublie
              </button>
              <div className="flex items-center gap-2 text-xs text-textMuted">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                Donnees locales et chiffrees sur ce poste.
              </div>
            </div>
            <button
              type="button"
              onClick={onRegister}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-textMuted transition-colors hover:text-primary"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Creer un compte
            </button>
          </div>
        )}
      >
        {profile ? (
          <div className="rounded-2xl border border-border/70 bg-surfaceHigh/50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-textMuted">Compte detecte</p>
            <p className="mt-2 text-sm font-semibold text-textPrimary">{profile.name}</p>
            <p className="mt-1 text-xs text-textMuted">{profile.email}</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Adresse e-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <Input
                ref={inputRef}
                className="pl-10"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="jean.dupont@email.fr"
                disabled={isLocked || loading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Mot de passe</label>
            <div className="relative">
              <Input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Votre mot de passe"
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

          <AnimatePresence mode="wait">
            {isLocked ? (
              <motion.div
                key="lockout"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning"
              >
                Trop de tentatives. Reessayez dans {lockout}s.
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
                    ({MAX_ATTEMPTS - attempts} tentative{MAX_ATTEMPTS - attempts > 1 ? 's' : ''} restante{MAX_ATTEMPTS - attempts > 1 ? 's' : ''})
                  </span>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <Button type="submit" disabled={isLocked || loading || !password}>
            <LogIn className="w-4 h-4" />
            {loading ? 'Verification...' : 'Se connecter'}
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

type RecoveryStep = 'key' | 'password' | 'done'

function RecoveryModal({ onClose }: { onClose: () => void }) {
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
    if (!cleaned) return setError('Veuillez entrer votre cle de recuperation.')
    setLoading(true)
    const valid = await window.api.auth.verifyRecoveryKey(cleaned)
    setLoading(false)
    if (valid) {
      setStep('password')
    } else {
      setError('Cle de recuperation invalide.')
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPwd.length < 8) return setError('Minimum 8 caracteres.')
    if (newPwd !== confirm) return setError('Les mots de passe ne correspondent pas.')
    setLoading(true)
    const cleaned = recoveryKey.trim().toUpperCase()
    const key = await window.api.auth.resetWithRecoveryKey(cleaned, newPwd)
    setLoading(false)
    if (key) {
      setNewRecoveryKey(key)
      setStep('done')
    } else {
      setError('Echec de la reinitialisation. Verifiez votre cle.')
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

  // Prevent closing during the "done" step to force user to save the new key
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
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shrink-0 ${step === 'done' ? 'bg-success/10' : 'bg-warning/10'}`}>
              {step === 'done'
                ? <CheckCircle2 className="h-5 w-5 text-success" />
                : <KeyRound className="h-5 w-5 text-warning" />}
            </div>
            <div>
              <p className="text-base font-semibold text-textPrimary">
                {step === 'key' && 'Reinitialiser le mot de passe'}
                {step === 'password' && 'Nouveau mot de passe'}
                {step === 'done' && 'Mot de passe reinitialise'}
              </p>
              <p className="mt-1 text-sm text-textMuted leading-relaxed">
                {step === 'key' && 'Entrez la cle de recuperation fournie lors de la creation de votre compte.'}
                {step === 'password' && 'Choisissez un nouveau mot de passe pour votre compte.'}
                {step === 'done' && 'Votre mot de passe a ete reinitialise. Notez votre nouvelle cle de recuperation.'}
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

        {/* Step 1: Recovery key input */}
        {step === 'key' && (
          <form onSubmit={handleVerifyKey} className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Cle de recuperation</label>
              <Input
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
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
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                <KeyRound className="w-4 h-4" />
                {loading ? 'Verification...' : 'Verifier'}
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: New password */}
        {step === 'password' && (
          <form onSubmit={handleReset} className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Nouveau mot de passe</label>
              <div className="relative">
                <Input
                  type={showPwd ? 'text' : 'password'}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Minimum 8 caracteres"
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
              <label className="text-xs font-medium text-textMuted">Confirmer le mot de passe</label>
              <Input
                type={showPwd ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repetez le mot de passe"
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
                Retour
              </Button>
              <Button type="submit" disabled={loading}>
                <Lock className="w-4 h-4" />
                {loading ? 'Reinitialisation...' : 'Reinitialiser'}
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: New recovery key */}
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
                  {copied ? 'Copie !' : 'Copier'}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-surfaceHigh/40 border border-border p-3 text-xs text-textMuted leading-5">
              <p>Cette cle ne sera plus affichee apres fermeture de cette fenetre.</p>
              <p className="mt-1">Conservez-la dans un endroit sur pour pouvoir reinitialiser votre mot de passe a l'avenir.</p>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <span className="text-xs text-textMuted">J'ai note ma nouvelle cle de recuperation en lieu sur.</span>
            </label>

            <div className="flex justify-end">
              <Button disabled={!confirmed} onClick={handleFinish}>
                <CheckCircle2 className="w-4 h-4" />
                Se connecter
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
