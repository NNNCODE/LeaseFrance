import { useState } from 'react'
import { motion } from 'framer-motion'
import { Home, Lock, Eye, EyeOff, User, Mail } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SetupProps {
  onBack?: () => void
}

export default function Setup({ onBack }: SetupProps) {
  const { setup } = useAuthStore()

  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  const strength = getStrength(password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim())             return setError('Le nom est requis.')
    if (!isValidEmail(email))     return setError('Adresse e-mail invalide.')
    if (password.length < 8)      return setError('Le mot de passe doit contenir au moins 8 caractères.')
    if (password !== confirm)     return setError('Les mots de passe ne correspondent pas.')
    setLoading(true)
    await setup(password, name, email)
    setLoading(false)
  }

  return (
    <div className="flex h-screen w-screen bg-background items-center justify-center drag">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="no-drag w-full max-w-sm px-4 relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 shadow-glow">
            <Home className="w-7 h-7 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-textPrimary">LeaseFrance</h1>
            <p className="text-sm text-textMuted mt-1">Créez votre compte propriétaire</p>
          </div>
        </div>

        {/* Card — formulaire unique */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Nom */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Nom complet</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                <Input
                  className="pl-9"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jean Dupont"
                  autoFocus
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Adresse e-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                <Input
                  className="pl-9"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean.dupont@email.fr"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Mot de passe</label>
              <div className="relative">
                <Input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary transition-colors">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && <StrengthBar strength={strength} />}
            </div>

            {/* Confirmer mot de passe */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Confirmer le mot de passe</label>
              <Input
                type={showPwd ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Répétez le mot de passe"
              />
            </div>

            {/* Erreur */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2"
              >
                {error}
              </motion.p>
            )}

            <Button type="submit" disabled={loading} className="mt-1">
              <Lock className="w-4 h-4" />
              {loading ? 'Création...' : 'Créer le compte'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-textMuted mt-4">
          Données stockées localement · Aucun serveur externe
        </p>

        {onBack && (
          <div className="flex justify-center mt-3">
            <button
              onClick={onBack}
              className="text-xs text-textMuted hover:text-primary transition-colors"
            >
              ← Retour à la connexion
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StrengthBar({ strength }: { strength: ReturnType<typeof getStrength> }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-1 mt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
            i <= strength.score ? strength.color : 'bg-surfaceHigh'
          }`} />
        ))}
      </div>
      <p className={`text-xs ${strength.textColor}`}>{strength.label}</p>
    </motion.div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStrength(pwd: string) {
  let score = 0
  if (pwd.length >= 8)  score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++
  const levels = [
    { label: 'Très faible',  color: 'bg-danger',  textColor: 'text-danger'  },
    { label: 'Faible',       color: 'bg-warning', textColor: 'text-warning' },
    { label: 'Moyen',        color: 'bg-warning', textColor: 'text-warning' },
    { label: 'Fort',         color: 'bg-success', textColor: 'text-success' },
    { label: 'Très fort',    color: 'bg-success', textColor: 'text-success' },
  ]
  return { score, ...levels[score] }
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
