import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, Mail, ShieldCheck, User } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AuthShell from '@/components/layout/AuthShell'

interface SetupProps {
  onBack?: () => void
}

export default function Setup({ onBack }: SetupProps) {
  const { setup } = useAuthStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = getStrength(password)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (!name.trim()) return setError('Le nom est requis.')
    if (!isValidEmail(email)) return setError('Adresse e-mail invalide.')
    if (password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caracteres.')
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.')

    setLoading(true)
    await setup(password, name, email)
    setLoading(false)
  }

  return (
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
  )
}

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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
