import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { UserCircle2, Lock, Trash2, Eye, EyeOff, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function Settings() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">Param\u00e8tres</h1>
        <p className="text-textMuted text-sm mt-1">G\u00e9rez votre compte et vos pr\u00e9f\u00e9rences</p>
      </div>
      <ProfileLink />
      <PasswordSection />
      <DangerZone />
    </div>
  )
}

// ── Link to Profile page ──────────────────────────────────────────────────────

function ProfileLink() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()

  return (
    <Card
      className="cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => navigate('/profile')}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15">
              <UserCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-textPrimary">
                {profile?.name || 'Propri\u00e9taire'}
              </p>
              <p className="text-xs text-textMuted">{profile?.email || 'Voir le profil'}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-textMuted" />
        </div>
      </CardContent>
    </Card>
  )
}

// ── Mot de passe ──────────────────────────────────────────────────────────────

function PasswordSection() {
  const { changePassword } = useAuthStore()
  const [oldPwd, setOldPwd]   = useState('')
  const [newPwd, setNewPwd]   = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow]       = useState(false)
  const [error, setError]     = useState('')
  const [status, setStatus]   = useState<'idle' | 'saved' | 'error'>('idle')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPwd.length < 8)    return setError('Minimum 8 caractères.')
    if (newPwd !== confirm)   return setError('Les mots de passe ne correspondent pas.')
    setLoading(true)
    const ok = await changePassword(oldPwd, newPwd)
    setLoading(false)
    if (ok) {
      setOldPwd(''); setNewPwd(''); setConfirm('')
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)
    } else {
      setError('Mot de passe actuel incorrect.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          <CardTitle>Changer le mot de passe</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Mot de passe actuel</label>
            <PasswordInput value={oldPwd} onChange={setOldPwd} show={show} onToggle={() => setShow(!show)} placeholder="••••••••" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Nouveau mot de passe</label>
              <PasswordInput value={newPwd} onChange={setNewPwd} show={show} onToggle={() => setShow(!show)} placeholder="Minimum 8 caractères" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Confirmer</label>
              <PasswordInput value={confirm} onChange={setConfirm} show={show} onToggle={() => setShow(!show)} placeholder="Répétez" />
            </div>
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={loading}>
              <Lock className="w-3.5 h-3.5" />
              {loading ? 'Modification...' : 'Modifier'}
            </Button>
            <AnimatePresence>
              {status === 'saved' && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-success"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mot de passe mis à jour
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Zone de danger : suppression de compte ────────────────────────────────────

function DangerZone() {
  const { deleteAccount } = useAuthStore()
  const [open, setOpen]     = useState(false)
  const [pwd, setPwd]       = useState('')
  const [show, setShow]     = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!pwd) return setError('Entrez votre mot de passe pour confirmer.')
    setLoading(true)
    const ok = await deleteAccount(pwd)
    setLoading(false)
    if (!ok) setError('Mot de passe incorrect.')
    // Si ok → le store passe en status 'setup', App.tsx affiche Setup automatiquement
  }

  return (
    <Card className="border-danger/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-danger" />
          <CardTitle className="text-danger">Zone de danger</CardTitle>
        </div>
        <CardDescription>Actions irréversibles — procédez avec prudence</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 p-4 bg-danger/5 border border-danger/20 rounded-xl">
          <div>
            <p className="text-sm font-medium text-textPrimary">Supprimer le compte</p>
            <p className="text-xs text-textMuted mt-1">
              Supprime votre compte et réinitialise l'application.
              Vos données locatives ne seront pas effacées.
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setOpen(true)} className="shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </Button>
        </div>

        {/* Confirmation dialog inline */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form
                onSubmit={handleDelete}
                className="flex flex-col gap-3 p-4 bg-danger/5 border border-danger/30 rounded-xl"
              >
                <div className="flex items-center gap-2 text-danger">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p className="text-sm font-medium">Confirmez la suppression</p>
                </div>
                <p className="text-xs text-textMuted">
                  Cette action est <strong className="text-textPrimary">irréversible</strong>.
                  Entrez votre mot de passe pour confirmer.
                </p>

                <PasswordInput
                  value={pwd}
                  onChange={setPwd}
                  show={show}
                  onToggle={() => setShow(!show)}
                  placeholder="Votre mot de passe"
                />

                {error && (
                  <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => { setOpen(false); setPwd(''); setError('') }}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" variant="danger" size="sm" disabled={loading}>
                    <Trash2 className="w-3.5 h-3.5" />
                    {loading ? 'Suppression...' : 'Supprimer définitivement'}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

// ── Shared ─────────────────────────────────────────────────────────────────────

function PasswordInput({
  value, onChange, show, onToggle, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}
