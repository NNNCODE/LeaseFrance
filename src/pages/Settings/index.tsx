import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserCircle2, Lock, Trash2, Eye, EyeOff, AlertTriangle, CheckCircle2,
  ChevronRight, Copy, Download, KeyRound, Upload, FolderOpen, HardDrive, RefreshCw,
  Clock, ShieldCheck, Search, Timer, Settings2, ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function Settings() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">Paramètres</h1>
        <p className="text-textMuted text-sm mt-1">Gérez votre compte et vos préférences</p>
      </div>
      <ProfileLink />
      <BackupSection />
      <PasswordSection />
      <RecoveryKeySection />
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
                {profile?.name || 'Propriétaire'}
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

// ── Sauvegarde / Restauration ─────────────────────────────────────────────────

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDateTimeFr(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' a '
      + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

function relativeNextBackup(settings: BackupSettings): string {
  if (!settings.lastBackupAt) return 'Prochainement'
  const next = new Date(settings.lastBackupAt).getTime() + settings.intervalHours * 3_600_000
  const diff = next - Date.now()
  if (diff <= 0) return 'En attente...'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 0) return `dans ${h}h ${m}min`
  return `dans ${m} min`
}

const INTERVAL_OPTIONS = [
  { value: 6, label: 'Toutes les 6 heures' },
  { value: 12, label: 'Toutes les 12 heures' },
  { value: 24, label: 'Toutes les 24 heures' },
  { value: 48, label: 'Toutes les 48 heures' },
  { value: 168, label: 'Toutes les semaines' },
]
const MAX_BACKUPS_OPTIONS = [3, 5, 10, 20]

// ── Backup section ───────────────────────────────────────────────────────────

function BackupSection() {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'restoring' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [settings, setSettings] = useState<BackupSettings | null>(null)
  const [verifyResult, setVerifyResult] = useState<BackupVerifyResult | null>(null)
  const [preview, setPreview] = useState<BackupPreviewResult | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  // Load settings on mount
  useEffect(() => {
    window.api.backup.getSettings().then(setSettings).catch(() => {})
  }, [])

  // Listen for auto-backup completions
  useEffect(() => {
    const unsub = window.api.backup.onAutoDone((_e, data) => {
      setSettings(prev => prev ? { ...prev, lastBackupAt: data.at, lastBackupPath: data.path, lastBackupSizeBytes: data.sizeBytes } : prev)
    })
    return unsub
  }, [])

  const updateSettings = useCallback(async (patch: Partial<BackupSettings>) => {
    const updated = await window.api.backup.updateSettings(patch)
    setSettings(updated)
    return updated
  }, [])

  async function handleBackup() {
    setStatus('saving')
    setMessage('')
    try {
      const result = await window.api.backup.create()
      if (result.saved) {
        setStatus('saved')
        setMessage(`Sauvegarde enregistree : ${result.path}`)
        // Refresh settings to pick up lastBackupAt
        window.api.backup.getSettings().then(setSettings).catch(() => {})
        setTimeout(() => setStatus('idle'), 4000)
      } else {
        setStatus('idle')
      }
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleToggleAuto() {
    if (!settings) return
    const enabling = !settings.autoEnabled
    if (enabling && !settings.destinationFolder) {
      const folder = await window.api.backup.pickFolder()
      if (!folder) return
      await updateSettings({ autoEnabled: true, destinationFolder: folder })
    } else {
      await updateSettings({ autoEnabled: enabling })
    }
  }

  async function handlePickFolder() {
    const folder = await window.api.backup.pickFolder()
    if (folder) await updateSettings({ destinationFolder: folder })
  }

  async function handleVerify() {
    setVerifying(true)
    setVerifyResult(null)
    try {
      const result = await window.api.backup.verify()
      if (result) setVerifyResult(result)
    } catch (err) {
      setVerifyResult({ valid: false, createdAt: null, fileSize: 0, errors: [String(err)] })
    } finally {
      setVerifying(false)
    }
  }

  async function handlePreview() {
    setPreviewing(true)
    setPreview(null)
    try {
      const result = await window.api.backup.preview()
      if (result) setPreview(result)
    } catch (err) {
      setPreview({ filePath: '', valid: false, createdAt: null, fileSize: 0, profile: null, tables: [], errors: [String(err)] })
    } finally {
      setPreviewing(false)
    }
  }

  async function handleConfirmRestore() {
    if (!preview) return
    setStatus('restoring')
    setMessage('')
    try {
      const result = await window.api.backup.restoreFromPath(preview.filePath)
      if (result.error) {
        setStatus('error')
        setMessage(result.error)
        setPreview(null)
      } else if (!result.restored) {
        setStatus('idle')
        setPreview(null)
      }
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : String(err))
      setPreview(null)
    }
  }

  async function handleOpenFolder() {
    await window.api.backup.openDataFolder()
  }

  const busy = status === 'saving' || status === 'restoring'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-primary" />
          <CardTitle>Sauvegarde et restauration</CardTitle>
        </div>
        <CardDescription>
          Protegez vos donnees en creant des sauvegardes regulieres
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">

        {/* ── Manual backup ────────────────────────────────────────────── */}
        <div className="p-4 bg-primary/5 border border-primary/15 rounded-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-textPrimary">Sauvegarder</p>
              <p className="text-xs text-textMuted mt-1">
                Exporte la base de donnees et le profil dans une archive unique.
              </p>
            </div>
            <Button size="sm" onClick={handleBackup} disabled={busy} className="shrink-0">
              <Download className="w-3.5 h-3.5" />
              {status === 'saving' ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
          {/* Last backup info */}
          {settings?.lastBackupAt && (
            <div className="mt-3 flex items-center gap-2 text-xs text-textMuted">
              <Clock className="w-3 h-3 shrink-0" />
              <span>
                Derniere sauvegarde : {formatDateTimeFr(settings.lastBackupAt)}
                {settings.lastBackupSizeBytes != null && (
                  <span className="ml-1 text-textMuted/70">({formatBytes(settings.lastBackupSizeBytes)})</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* ── Auto-backup ──────────────────────────────────────────────── */}
        <div className="p-4 bg-surfaceHigh/30 border border-border rounded-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-textPrimary">Sauvegarde automatique</p>
            </div>
            <button
              onClick={handleToggleAuto}
              className={`relative inline-flex h-5 w-9 items-center rounded-full shrink-0 transition-colors ${
                settings?.autoEnabled ? 'bg-primary' : 'bg-border'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  settings?.autoEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`}
              />
            </button>
          </div>

          <AnimatePresence>
            {settings?.autoEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex flex-col gap-2.5">
                  {/* Interval */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-textMuted">Frequence</span>
                    <div className="relative">
                      <select
                        value={settings.intervalHours}
                        onChange={(e) => updateSettings({ intervalHours: Number(e.target.value) })}
                        className="appearance-none text-xs bg-surface border border-border rounded-lg px-3 py-1.5 pr-7 text-textPrimary cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40"
                      >
                        {INTERVAL_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-textMuted pointer-events-none" />
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-textMuted">Destination</span>
                    <button
                      onClick={handlePickFolder}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors max-w-[280px]"
                    >
                      <FolderOpen className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {settings.destinationFolder || 'Choisir un dossier...'}
                      </span>
                    </button>
                  </div>

                  {/* Max backups */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-textMuted">Conservation</span>
                    <div className="relative">
                      <select
                        value={settings.maxBackups}
                        onChange={(e) => updateSettings({ maxBackups: Number(e.target.value) })}
                        className="appearance-none text-xs bg-surface border border-border rounded-lg px-3 py-1.5 pr-7 text-textPrimary cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40"
                      >
                        {MAX_BACKUPS_OPTIONS.map((n) => (
                          <option key={n} value={n}>{n} dernieres sauvegardes</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-textMuted pointer-events-none" />
                    </div>
                  </div>

                  {/* Next backup estimate */}
                  {settings.destinationFolder && (
                    <div className="flex items-center gap-2 text-xs text-textMuted pt-1 border-t border-border/50">
                      <Clock className="w-3 h-3" />
                      <span>Prochaine sauvegarde : {relativeNextBackup(settings)}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Restore with preview ─────────────────────────────────────── */}
        <div className="p-4 bg-warning/5 border border-warning/15 rounded-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-textPrimary">Restaurer</p>
              <p className="text-xs text-textMuted mt-1">
                Un apercu sera affiche avant la restauration.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={busy || previewing}
              className="shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              {previewing ? 'Chargement...' : 'Restaurer'}
            </Button>
          </div>

          {/* Preview panel */}
          <AnimatePresence>
            {preview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 p-3 bg-surface border border-border rounded-lg flex flex-col gap-3">
                  {/* File info */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-textMuted">
                    {preview.createdAt && (
                      <span>Creee le {formatDateTimeFr(preview.createdAt)}</span>
                    )}
                    <span>{formatBytes(preview.fileSize)}</span>
                    <span className={`flex items-center gap-1 ${preview.valid ? 'text-success' : 'text-danger'}`}>
                      <ShieldCheck className="w-3 h-3" />
                      {preview.valid ? 'Integre' : 'Erreur'}
                    </span>
                  </div>

                  {/* Profile */}
                  {preview.profile && (
                    <div className="text-xs text-textMuted">
                      <span className="text-textPrimary font-medium">{preview.profile.name}</span>
                      {' '}({preview.profile.email})
                    </div>
                  )}

                  {/* Table counts */}
                  {preview.tables.length > 0 && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                      {preview.tables
                        .filter(t => t.count > 0)
                        .map(t => (
                          <div key={t.name} className="flex items-center justify-between py-0.5">
                            <span className="text-textMuted">{t.label}</span>
                            <span className="font-mono text-textPrimary">{t.count}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Errors */}
                  {preview.errors.length > 0 && (
                    <div className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
                      {preview.errors.map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                  )}

                  {/* Confirm / cancel */}
                  {preview.valid && (
                    <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                      <div className="flex items-center gap-1.5 text-xs text-warning flex-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Cela remplacera toutes les donnees. L'application redemarrera.</span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPreview(null)}
                    >
                      Annuler
                    </Button>
                    {preview.valid && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleConfirmRestore}
                        disabled={status === 'restoring'}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {status === 'restoring' ? 'Restauration...' : 'Confirmer la restauration'}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Verify integrity ─────────────────────────────────────────── */}
        <div className="p-4 bg-surfaceHigh/30 border border-border rounded-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-textPrimary">Verifier une sauvegarde</p>
              <p className="text-xs text-textMuted mt-1">
                Controle l'integrite d'un fichier sans le restaurer.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleVerify}
              disabled={busy || verifying}
              className="shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {verifying ? 'Verification...' : 'Verifier'}
            </Button>
          </div>

          <AnimatePresence>
            {verifyResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={`mt-3 flex flex-col gap-1.5 p-3 rounded-lg text-xs ${
                  verifyResult.valid
                    ? 'bg-success/10 border border-success/20 text-success'
                    : 'bg-danger/10 border border-danger/20 text-danger'
                }`}>
                  <div className="flex items-center gap-2">
                    {verifyResult.valid
                      ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                    <span className="font-medium">
                      {verifyResult.valid ? 'Sauvegarde valide' : 'Sauvegarde corrompue ou invalide'}
                    </span>
                  </div>
                  <div className="text-textMuted flex flex-wrap gap-x-3 gap-y-0.5 pl-5">
                    {verifyResult.createdAt && (
                      <span>Creee le {formatDateTimeFr(verifyResult.createdAt)}</span>
                    )}
                    <span>{formatBytes(verifyResult.fileSize)}</span>
                  </div>
                  {verifyResult.errors.length > 0 && (
                    <div className="pl-5 mt-1">
                      {verifyResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Open data folder ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 p-4 bg-surfaceHigh/30 border border-border rounded-xl">
          <div>
            <p className="text-sm font-medium text-textPrimary">Dossier de donnees</p>
            <p className="text-xs text-textMuted mt-1">
              Ouvrir le repertoire contenant la base de donnees et le profil.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleOpenFolder} className="shrink-0">
            <FolderOpen className="w-3.5 h-3.5" />
            Ouvrir
          </Button>
        </div>

        {/* ── Status messages ──────────────────────────────────────────── */}
        <AnimatePresence>
          {status === 'saved' && message && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg text-xs text-success">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <p className="truncate">{message}</p>
              </div>
            </motion.div>
          )}
          {status === 'error' && message && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-xs text-danger">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <p>{message}</p>
              </div>
            </motion.div>
          )}
          {status === 'restoring' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-xs text-warning">
                <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
                <p>Restauration en cours, l'application va redemarrer...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

// ── Cle de recuperation ───────────────────────────────────────────────────────

function RecoveryKeySection() {
  const [pwd, setPwd] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function handleRegenerate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!pwd) return setError('Entrez votre mot de passe pour confirmer.')
    setLoading(true)
    const key = await window.api.auth.regenerateRecoveryKey(pwd)
    setLoading(false)
    if (key) {
      setRecoveryKey(key)
      setPwd('')
    } else {
      setError('Mot de passe incorrect.')
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
          <CardTitle>Cle de recuperation</CardTitle>
        </div>
        <CardDescription>
          Regenerez votre cle pour reinitialiser le mot de passe en cas d'oubli
        </CardDescription>
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
                  {copied ? 'Copie !' : 'Copier'}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-surfaceHigh/40 border border-border p-3 text-xs text-textMuted leading-5">
              <p>L'ancienne cle n'est plus valide. Notez cette nouvelle cle dans un endroit sur.</p>
              <p className="mt-1">Elle ne sera plus affichee apres fermeture.</p>
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
              <Button size="sm" disabled={!confirmed} onClick={handleDone}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Fermer
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegenerate} className="flex flex-col gap-4">
            <div className="rounded-xl bg-surfaceHigh/40 border border-border p-3 text-xs text-textMuted leading-5">
              <p>La regeneration invalide l'ancienne cle. Seule la derniere cle generee permet de reinitialiser votre mot de passe.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Mot de passe actuel</label>
              <PasswordInput value={pwd} onChange={setPwd} show={show} onToggle={() => setShow(!show)} placeholder="Confirmez votre mot de passe" />
            </div>

            {error && (
              <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" size="sm" disabled={loading}>
                <KeyRound className="w-3.5 h-3.5" />
                {loading ? 'Generation...' : 'Regenerer la cle'}
              </Button>
            </div>
          </form>
        )}
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
