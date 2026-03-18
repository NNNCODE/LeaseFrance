import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Eye, EyeOff, LogIn, UserPlus, KeyRound, Mail } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const MAX_ATTEMPTS = 5
const LOCK_SECONDS = 30

interface LoginProps {
  onRegister: () => void
}

export default function Login({ onRegister }: LoginProps) {
  const { login, profile, error } = useAuthStore()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [localError, setLocalError] = useState('')
  const [attempts, setAttempts]   = useState(0)
  const [lockout, setLockout]     = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (lockout <= 0) return
    const t = setTimeout(() => setLockout((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [lockout])

  const isLocked = lockout > 0
  const displayError = localError || error

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError('')
    if (isLocked || !password) return
    // Vérifier l'email si un compte existe
    if (profile?.email && email.toLowerCase() !== profile.email.toLowerCase()) {
      setLocalError('Adresse e-mail incorrecte.')
      return
    }
    if (!email.trim()) {
      setLocalError('Veuillez entrer votre adresse e-mail.')
      return
    }
    setLoading(true)
    const ok = await login(password)
    setLoading(false)
    if (!ok) {
      const next = attempts + 1
      setAttempts(next)
      setPassword('')
      if (next >= MAX_ATTEMPTS) {
        setLockout(LOCK_SECONDS)
        setAttempts(0)
      }
      inputRef.current?.focus()
    }
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
          <motion.div
            animate={{ boxShadow: ['0 0 20px rgba(99,102,241,0.1)', '0 0 32px rgba(99,102,241,0.25)', '0 0 20px rgba(99,102,241,0.1)'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20"
          >
            <Home className="w-7 h-7 text-primary" />
          </motion.div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-textPrimary">LeaseFrance</h1>
            <p className="text-sm text-textMuted mt-1">Connectez-vous à votre espace</p>
          </div>
        </div>

        {/* Card — toujours le formulaire de connexion */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Adresse e-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                <Input
                  ref={inputRef}
                  className="pl-9"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean.dupont@email.fr"
                  disabled={isLocked || loading}
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
                  placeholder="••••••••"
                  disabled={isLocked || loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary transition-colors"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {isLocked ? (
                <motion.div key="lockout" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2">
                  Trop de tentatives. Réessayez dans {lockout}s.
                </motion.div>
              ) : displayError ? (
                <motion.div key="error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
                  {displayError}
                  {attempts > 0 && (
                    <span className="ml-1 opacity-70">
                      ({MAX_ATTEMPTS - attempts} tentative{MAX_ATTEMPTS - attempts > 1 ? 's' : ''} restante{MAX_ATTEMPTS - attempts > 1 ? 's' : ''})
                    </span>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <Button type="submit" disabled={isLocked || loading || !password} className="mt-1">
              <LogIn className="w-4 h-4" />
              {loading ? 'Vérification...' : 'Se connecter'}
            </Button>
          </form>
        </div>

        {/* Liens sous le formulaire */}
        <div className="flex items-center justify-between mt-5 px-1">
          <button
            onClick={() => {}}
            className="flex items-center gap-1.5 text-xs text-textMuted hover:text-primary transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Mot de passe oublié
          </button>
          <button
            onClick={onRegister}
            className="flex items-center gap-1.5 text-xs text-textMuted hover:text-primary transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Créer un compte
          </button>
        </div>
      </motion.div>
    </div>
  )
}
