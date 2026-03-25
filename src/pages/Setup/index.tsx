import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Lock, Mail, ShieldCheck, User, Copy, CheckCircle2, KeyRound } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AuthShell from '@/components/layout/AuthShell'

interface SetupProps {
  onBack?: () => void
  onComplete?: (email: string) => void
}

export default function Setup({ onBack, onComplete }: SetupProps) {
  const { setup, completeSetup } = useAuthStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null)

  const strength = getStrength(password)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (!name.trim()) return setError('Le nom est requis.')
    if (!isValidEmail(email)) return setError('Adresse e-mail invalide.')
    if (password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caracteres.')
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.')

    setLoading(true)
    const normalizedEmail = normalizeEmail(email)
    const key = await setup(password, name, normalizedEmail)
    setLoading(false)

    if (key) {
      setRecoveryKey(key)
    } else {
      setError("Cette adresse e-mail est deja utilisee par un autre compte. La casse n'a pas d'importance.")
    }
  }

  return (
    <>
      <AuthShell
        eyebrow="Initialisation"
        title="Configurez votre espace proprietaire."
        description="Creez votre compte local pour demarrer avec une interface plus complete et des controles de fenetre coherents."
        footer={(
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-textMuted">
              <ShieldCheck className="w-3.5 h-3.5 text-success" />
              Aucun serveur externe. Toutes les donnees restent sur la machine.
            </div>
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="text-xs font-medium text-textMuted transition-colors hover:text-primary"
              >
                Retour a la connexion
              </button>
            ) : null}
          </div>
        )}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Nom complet</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <Input
                className="pl-10"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Jean Dupont"
                autoFocus
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Adresse e-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <Input
                className="pl-10"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="jean.dupont@email.fr"
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
                placeholder="Minimum 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPwd((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted transition-colors hover:text-textPrimary"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password.length > 0 ? <StrengthBar strength={strength} /> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Confirmer le mot de passe</label>
            <Input
              type={showPwd ? 'text' : 'password'}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Repetez le mot de passe"
            />
          </div>

          {error ? (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
            >
              {error}
            </motion.p>
          ) : null}

          <Button type="submit" disabled={loading} className="mt-1">
            <Lock className="w-4 h-4" />
            {loading ? 'Creation...' : 'Creer le compte'}
          </Button>
        </form>
      </AuthShell>

      <AnimatePresence>
        {recoveryKey && (
          <RecoveryKeyModal
            recoveryKey={recoveryKey}
            onDone={() => {
              setRecoveryKey(null)
              completeSetup()
              onComplete?.(normalizeEmail(email))
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ── Recovery Key Modal (shown once after setup) ──────────────────────────────

function RecoveryKeyModal({
  recoveryKey,
  onDone,
}: {
  recoveryKey: string
  onDone: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(recoveryKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl no-drag"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-warning/10 shrink-0">
            <KeyRound className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-base font-semibold text-textPrimary">Cle de recuperation</p>
            <p className="mt-1 text-sm text-textMuted leading-relaxed">
              Notez cette cle dans un endroit sur. Elle est le seul moyen de reinitialiser votre mot de passe si vous l'oubliez.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-warning/20 bg-warning/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-lg font-bold text-textPrimary tracking-wider select-all">
              {recoveryKey}
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

        <div className="mt-4 rounded-xl bg-surfaceHigh/40 border border-border p-3 text-xs text-textMuted leading-5">
          <p>Cette cle ne sera plus affichee apres fermeture de cette fenetre.</p>
          <p className="mt-1">Vous pourrez en regenerer une nouvelle depuis Parametres, mais il vous faudra votre mot de passe actuel.</p>
        </div>

        <label className="mt-4 flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded border-border"
          />
          <span className="text-xs text-textMuted">J'ai note ma cle de recuperation en lieu sur.</span>
        </label>

        <div className="mt-5 flex justify-end">
          <Button disabled={!confirmed} onClick={onDone}>
            <CheckCircle2 className="w-4 h-4" />
            Continuer
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StrengthBar({ strength }: { strength: ReturnType<typeof getStrength> }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 flex flex-col gap-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              index <= strength.score ? strength.color : 'bg-surfaceHigh'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${strength.textColor}`}>{strength.label}</p>
    </motion.div>
  )
}

function getStrength(password: string) {
  let score = 0

  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1

  const levels = [
    { label: 'Tres faible', color: 'bg-danger', textColor: 'text-danger' },
    { label: 'Faible', color: 'bg-warning', textColor: 'text-warning' },
    { label: 'Moyen', color: 'bg-warning', textColor: 'text-warning' },
    { label: 'Fort', color: 'bg-success', textColor: 'text-success' },
    { label: 'Tres fort', color: 'bg-success', textColor: 'text-success' },
  ]

  return { score, ...levels[score] }
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}
