import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Eye, EyeOff, KeyRound, LogIn, Mail, ShieldCheck, UserPlus, X } from 'lucide-react'
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
          <RecoveryModal
            hasKnownProfile={Boolean(profile)}
            onClose={() => setShowRecovery(false)}
          />
        ) : null}
      </AnimatePresence>
    </>
  )
}

function RecoveryModal({
  hasKnownProfile,
  onClose,
}: {
  hasKnownProfile: boolean
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-lg rounded-[24px] border border-border bg-surface p-6 shadow-2xl no-drag"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-base font-semibold text-textPrimary">Mot de passe oublie</p>
              <p className="mt-1 text-sm leading-6 text-textMuted">
                Cette application fonctionne en local. Il n existe donc pas de recuperation par e-mail ou serveur externe.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-textMuted transition-colors hover:bg-surfaceHigh hover:text-textPrimary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-surfaceHigh/40 p-4 text-sm text-textMuted leading-6">
          <p>Si vous connaissez encore le mot de passe sur une session ouverte, changez-le depuis `Parametres` apres connexion.</p>
          <p className="mt-3">
            Si le mot de passe est definitivement perdu, la version actuelle ne propose pas encore de reinitialisation locale securisee.
          </p>
          {hasKnownProfile ? (
            <p className="mt-3">
              Le compte detecte reste present sur cette machine, mais l acces ne peut pas etre reouvert sans le mot de passe actuel.
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
