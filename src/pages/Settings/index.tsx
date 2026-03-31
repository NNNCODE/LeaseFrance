import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserCircle2, Lock, Trash2, Eye, EyeOff, AlertTriangle, CheckCircle2,
  ChevronRight, Copy, Download, KeyRound, Upload, FolderOpen, HardDrive, RefreshCw,
  Clock, ShieldCheck, Timer, ChevronDown, Globe,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'
import { useLanguageStore } from '@/stores/useLanguageStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function Settings() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">{t('settings.title')}</h1>
        <p className="text-textMuted text-sm mt-1">{t('settings.subtitle')}</p>
      </div>
      <ProfileLink />
      <LanguageSection />
      <BackupSection />
      <PasswordSection />
      <RecoveryKeySection />
      <DangerZone />
    </div>
  )
}

// ── Link to Profile page ──────────────────────────────────────────────────────

function ProfileLink() {
  const { t } = useTranslation()
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
                {profile?.name || t('settings.owner')}
              </p>
              <p className="text-xs text-textMuted">{profile?.email || t('settings.viewProfile')}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-textMuted" />
        </div>
      </CardContent>
    </Card>
  )
}

const LANGUAGE_OPTIONS = [
  { value: 'fr', labelKey: 'settings.languageFr' },
  { value: 'en', labelKey: 'settings.languageEn' },
  { value: 'zh', labelKey: 'settings.languageZh' },
] as const

function LanguageSection() {
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguageStore()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <CardTitle>{t('settings.language')}</CardTitle>
        </div>
        <CardDescription>{t('settings.languageDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3">
        {LANGUAGE_OPTIONS.map((option) => {
          const active = language === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setLanguage(option.value)}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surfaceHigh/30 text-textMuted hover:border-primary/30 hover:text-textPrimary'
              }`}
            >
              <p className="text-sm font-medium">{t(option.labelKey)}</p>
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ── Sauvegarde / Restauration ─────────────────────────────────────────────────

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function relativeNextBackup(settings: BackupSettings, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (!settings.lastBackupAt) return t('settings.backup.nextSoon')
  const next = new Date(settings.lastBackupAt).getTime() + settings.intervalHours * 3_600_000
  const diff = next - Date.now()
  if (diff <= 0) return t('settings.backup.nextWaiting')
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 0) return t('settings.backup.nextInHours', { h, m })
  return t('settings.backup.nextInMinutes', { m })
}

const INTERVAL_OPTIONS = [
  { value: 6, labelKey: 'settings.backup.interval6' },
  { value: 12, labelKey: 'settings.backup.interval12' },
  { value: 24, labelKey: 'settings.backup.interval24' },
  { value: 48, labelKey: 'settings.backup.interval48' },
  { value: 168, labelKey: 'settings.backup.interval168' },
]
const MAX_BACKUPS_OPTIONS = [3, 5, 10, 20]

// ── Backup section ───────────────────────────────────────────────────────────

function BackupSection() {
  const { t } = useTranslation()
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
        setMessage(t('settings.backup.saved', { path: result.path }))
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
          <CardTitle>{t('settings.backup.title')}</CardTitle>
        </div>
        <CardDescription>
          {t('settings.backup.desc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">

        {/* ── Manual backup ────────────────────────────────────────────── */}
        <div className="p-4 bg-primary/5 border border-primary/15 rounded-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-textPrimary">{t('settings.backup.save')}</p>
              <p className="text-xs text-textMuted mt-1">
                {t('settings.backup.saveDesc')}
              </p>
            </div>
            <Button size="sm" onClick={handleBackup} disabled={busy} className="shrink-0">
              <Download className="w-3.5 h-3.5" />
              {status === 'saving' ? t('settings.backup.saving') : t('settings.backup.save')}
            </Button>
          </div>
          {/* Last backup info */}
          {settings?.lastBackupAt && (
            <div className="mt-3 flex items-center gap-2 text-xs text-textMuted">
              <Clock className="w-3 h-3 shrink-0" />
              <span>
                {t('settings.backup.lastBackup', { date: formatDateTime(settings.lastBackupAt) })}
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
              <p className="text-sm font-medium text-textPrimary">{t('settings.backup.autoBackup')}</p>
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
                    <span className="text-xs text-textMuted">{t('settings.backup.frequency')}</span>
                    <div className="relative">
                      <select
                        value={settings.intervalHours}
                        onChange={(e) => updateSettings({ intervalHours: Number(e.target.value) })}
                        className="appearance-none text-xs bg-surface border border-border rounded-lg px-3 py-1.5 pr-7 text-textPrimary cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40"
                      >
                        {INTERVAL_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-textMuted pointer-events-none" />
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-textMuted">{t('settings.backup.destination')}</span>
                    <button
                      onClick={handlePickFolder}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors max-w-[280px]"
                    >
                      <FolderOpen className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {settings.destinationFolder || t('settings.backup.pickFolder')}
                      </span>
                    </button>
                  </div>

                  {/* Max backups */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-textMuted">{t('settings.backup.retention')}</span>
                    <div className="relative">
                      <select
                        value={settings.maxBackups}
                        onChange={(e) => updateSettings({ maxBackups: Number(e.target.value) })}
                        className="appearance-none text-xs bg-surface border border-border rounded-lg px-3 py-1.5 pr-7 text-textPrimary cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40"
                      >
                        {MAX_BACKUPS_OPTIONS.map((n) => (
                          <option key={n} value={n}>{t('settings.backup.retentionCount', { count: n })}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-textMuted pointer-events-none" />
                    </div>
                  </div>

                  {/* Next backup estimate */}
                  {settings.destinationFolder && (
                    <div className="flex items-center gap-2 text-xs text-textMuted pt-1 border-t border-border/50">
                      <Clock className="w-3 h-3" />
                      <span>{t('settings.backup.nextBackup', { time: relativeNextBackup(settings, t) })}</span>
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
              <p className="text-sm font-medium text-textPrimary">{t('settings.backup.restore')}</p>
              <p className="text-xs text-textMuted mt-1">
                {t('settings.backup.restoreDesc')}
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
              {previewing ? t('common.loading') : t('settings.backup.restore')}
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
                      <span>{t('settings.backup.createdAt', { date: formatDateTime(preview.createdAt) })}</span>
                    )}
                    <span>{formatBytes(preview.fileSize)}</span>
                    <span className={`flex items-center gap-1 ${preview.valid ? 'text-success' : 'text-danger'}`}>
                      <ShieldCheck className="w-3 h-3" />
                      {preview.valid ? t('settings.backup.valid') : t('settings.backup.invalid')}
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
                        <span>{t('settings.backup.restoreWarning')}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPreview(null)}
                    >
                      {t('common.cancel')}
                    </Button>
                    {preview.valid && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleConfirmRestore}
                        disabled={status === 'restoring'}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {status === 'restoring' ? t('settings.backup.restoring') : t('settings.backup.confirmRestore')}
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
              <p className="text-sm font-medium text-textPrimary">{t('settings.backup.verify')}</p>
              <p className="text-xs text-textMuted mt-1">
                {t('settings.backup.verifyDesc')}
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
              {verifying ? t('settings.backup.verifying') : t('settings.backup.verifyBtn')}
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
                      {verifyResult.valid ? t('settings.backup.backupValid') : t('settings.backup.backupCorrupt')}
                    </span>
                  </div>
                  <div className="text-textMuted flex flex-wrap gap-x-3 gap-y-0.5 pl-5">
                    {verifyResult.createdAt && (
                      <span>{t('settings.backup.createdAt', { date: formatDateTime(verifyResult.createdAt) })}</span>
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
            <p className="text-sm font-medium text-textPrimary">{t('settings.backup.dataFolder')}</p>
            <p className="text-xs text-textMuted mt-1">
              {t('settings.backup.dataFolderDesc')}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleOpenFolder} className="shrink-0">
            <FolderOpen className="w-3.5 h-3.5" />
            {t('common.open')}
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
                <p>{t('settings.backup.restoring')}</p>
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
  const { t } = useTranslation()
  const { changePassword } = useAuthStore()
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (newPwd.length < 8) return setError(t('settings.password.min8'))
    if (newPwd !== confirm) return setError(t('settings.password.mismatch'))

    setLoading(true)
    const ok = await changePassword(oldPwd, newPwd)
    setLoading(false)

    if (ok) {
      setOldPwd('')
      setNewPwd('')
      setConfirm('')
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)
    } else {
      setError(t('settings.password.incorrect'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          <CardTitle>{t('settings.password.title')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{t('settings.password.current')}</label>
            <PasswordInput
              value={oldPwd}
              onChange={setOldPwd}
              show={show}
              onToggle={() => setShow(!show)}
              placeholder={t('settings.password.currentPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('settings.password.new')}</label>
              <PasswordInput
                value={newPwd}
                onChange={setNewPwd}
                show={show}
                onToggle={() => setShow(!show)}
                placeholder={t('settings.password.newPlaceholder')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('settings.password.confirm')}</label>
              <PasswordInput
                value={confirm}
                onChange={setConfirm}
                show={show}
                onToggle={() => setShow(!show)}
                placeholder={t('settings.password.confirmPlaceholder')}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={loading}>
              <Lock className="w-3.5 h-3.5" />
              {loading ? t('settings.password.submitting') : t('settings.password.submit')}
            </Button>
            <AnimatePresence>
              {status === 'saved' && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-success"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('settings.password.success')}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function RecoveryKeySection() {
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

function DangerZone() {
  const { t } = useTranslation()
  const { deleteAccount } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [pwd, setPwd] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleDelete(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (!pwd) return setError(t('settings.danger.passwordRequired'))

    setLoading(true)
    const ok = await deleteAccount(pwd)
    setLoading(false)

    if (!ok) setError(t('settings.danger.incorrect'))
  }

  return (
    <Card className="border-danger/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-danger" />
          <CardTitle className="text-danger">{t('settings.danger.title')}</CardTitle>
        </div>
        <CardDescription>{t('settings.danger.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 p-4 bg-danger/5 border border-danger/20 rounded-xl">
          <div>
            <p className="text-sm font-medium text-textPrimary">{t('settings.danger.deleteAccount')}</p>
            <p className="text-xs text-textMuted mt-1">{t('settings.danger.deleteAccountDesc')}</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setOpen(true)} className="shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
            {t('common.delete')}
          </Button>
        </div>

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
                  <p className="text-sm font-medium">{t('settings.danger.confirmDelete')}</p>
                </div>

                <p
                  className="text-xs text-textMuted"
                  dangerouslySetInnerHTML={{ __html: t('settings.danger.irreversible') }}
                />

                <PasswordInput
                  value={pwd}
                  onChange={setPwd}
                  show={show}
                  onToggle={() => setShow(!show)}
                  placeholder={t('settings.danger.passwordPlaceholder')}
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
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" variant="danger" size="sm" disabled={loading}>
                    <Trash2 className="w-3.5 h-3.5" />
                    {loading ? t('common.deleting') : t('settings.danger.deleteForever')}
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
