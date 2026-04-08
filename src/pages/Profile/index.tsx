import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  UserCircle2, Mail, MapPin, Phone, Save, CheckCircle2,
  Building2, FileText, PenTool, Upload, Trash2, MapPinned, Eraser, Plus,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useOwnerStore } from '@/stores/useOwnerStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

interface FeedbackState {
  type: 'success' | 'error'
  message: string
}

function ownerDisplayName(owner: Pick<UserProfile, 'name'> | Pick<OwnerProfile, 'name'> | null, fallback: string) {
  return owner?.name?.trim() || fallback
}

function ownerTypeLabel(owner: Pick<OwnerProfile, 'legalType'> | Pick<UserProfile, 'legalType'> | null, t: (key: string) => string) {
  return owner?.legalType === 'personne_morale'
    ? t('profile.ownerTypeCompany')
    : t('profile.ownerTypePerson')
}

export default function Profile() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  const ownerStatus = useOwnerStore((state) => state.status)
  const owners = useOwnerStore((state) => state.owners)
  const activeOwner = useOwnerStore((state) => state.activeOwner)
  const createOwner = useOwnerStore((state) => state.createOwner)
  const setActiveOwner = useOwnerStore((state) => state.setActiveOwner)
  const deleteOwner = useOwnerStore((state) => state.deleteOwner)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [ownerBusy, setOwnerBusy] = useState(false)

  const currentProfile = activeOwner ?? profile

  useEffect(() => {
    if (!feedback) return undefined
    const timeout = window.setTimeout(() => setFeedback(null), 3200)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  async function handleCreateOwner() {
    setOwnerBusy(true)
    try {
      await createOwner()
      setFeedback({ type: 'success', message: t('profile.createOwnerNotice') })
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : t('profile.ownerSaveError'),
      })
    } finally {
      setOwnerBusy(false)
    }
  }

  async function handleActivateOwner(ownerId: string) {
    setOwnerBusy(true)
    try {
      const nextOwner = await setActiveOwner(ownerId)
      setFeedback({
        type: nextOwner ? 'success' : 'error',
        message: nextOwner ? t('profile.activateOwnerNotice') : t('profile.ownerSaveError'),
      })
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : t('profile.ownerSaveError'),
      })
    } finally {
      setOwnerBusy(false)
    }
  }

  async function handleDeleteOwner(owner: OwnerProfile) {
    if (owner.isPrimary) {
      setFeedback({ type: 'error', message: t('profile.cannotDeletePrimary') })
      return
    }

    const confirmed = window.confirm(
      t('profile.deleteOwnerConfirm', {
        name: ownerDisplayName(owner, t('profile.unnamedOwner')),
      }),
    )
    if (!confirmed) return

    setOwnerBusy(true)
    try {
      const deleted = await deleteOwner(owner.id)
      setFeedback({
        type: deleted ? 'success' : 'error',
        message: deleted ? t('profile.deleteOwnerNotice') : t('profile.deleteOwnerError'),
      })
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : t('profile.deleteOwnerError'),
      })
    } finally {
      setOwnerBusy(false)
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">{t('profile.title')}</h1>
        <p className="mt-1 text-sm text-textMuted">{t('profile.subtitle')}</p>
      </div>

      {feedback ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-danger/30 bg-danger/10 text-danger'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <OwnerProfilesCard
        owners={owners}
        activeOwnerId={activeOwner?.id ?? null}
        loading={ownerStatus !== 'ready' || ownerBusy}
        onAdd={handleCreateOwner}
        onUse={handleActivateOwner}
        onDelete={handleDeleteOwner}
      />

      <ProfileOverview profile={currentProfile} />

      {activeOwner ? (
        <>
          <ProfileForm profile={activeOwner} />
          <SignatureCard profile={activeOwner} />
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-textMuted">
            {t('common.loading')}
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5 pb-5">
          <div className="flex gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="mb-1 text-sm font-medium text-textPrimary">{t('profile.infoTitle')}</p>
              <p className="text-xs leading-relaxed text-textMuted">{t('profile.infoDesc')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function OwnerProfilesCard({
  owners,
  activeOwnerId,
  loading,
  onAdd,
  onUse,
  onDelete,
}: {
  owners: OwnerProfile[]
  activeOwnerId: string | null
  loading: boolean
  onAdd: () => void
  onUse: (ownerId: string) => void
  onDelete: (owner: OwnerProfile) => void
}) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{t('profile.ownersTitle')}</CardTitle>
            <CardDescription>{t('profile.ownersDesc')}</CardDescription>
          </div>
          <Button size="sm" onClick={onAdd} disabled={loading}>
            <Plus className="h-3.5 w-3.5" />
            {t('profile.addOwner')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {loading && owners.length === 0 ? (
          <div className="rounded-xl border border-border bg-surfaceHigh/20 px-4 py-5 text-sm text-textMuted">
            {t('common.loading')}
          </div>
        ) : owners.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surfaceHigh/20 px-4 py-5 text-sm text-textMuted">
            {t('common.noData')}
          </div>
        ) : (
          owners.map((owner) => (
            <div
              key={owner.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surfaceHigh/20 px-4 py-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-textPrimary">
                    {ownerDisplayName(owner, t('profile.unnamedOwner'))}
                  </p>
                  {owner.id === activeOwnerId ? (
                    <Badge variant="default">{t('profile.activeOwner')}</Badge>
                  ) : null}
                  {owner.isPrimary ? (
                    <Badge variant="muted">{t('profile.primaryOwner')}</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-textMuted">
                  {owner.email || t('profile.notProvided')}
                </p>
                <p className="mt-2 text-xs text-textMuted">
                  {ownerTypeLabel(owner, t)}
                  {owner.familySci ? ` | ${t('profile.familySci')}` : ''}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {owner.id !== activeOwnerId ? (
                  <Button size="sm" variant="secondary" onClick={() => onUse(owner.id)} disabled={loading}>
                    {t('profile.useOwner')}
                  </Button>
                ) : null}
                {!owner.isPrimary ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(owner)}
                    disabled={loading}
                    className="text-danger hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('profile.deleteOwner')}
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function ProfileOverview({
  profile,
}: {
  profile: UserProfile | OwnerProfile | null
}) {
  const { t } = useTranslation()

  if (!profile) return null

  const infoItems = [
    { icon: UserCircle2, label: t('profile.fullName'), value: ownerDisplayName(profile, t('nav.profile')) },
    { icon: Mail, label: t('profile.email'), value: profile.email || t('profile.notProvided') },
    { icon: MapPin, label: t('profile.address'), value: profile.address || t('profile.notProvidedF') },
    { icon: MapPinned, label: t('profile.city'), value: profile.city || t('profile.notProvidedF') },
    { icon: Phone, label: t('profile.phone'), value: profile.phone || t('profile.notProvided') },
    { icon: Building2, label: t('profile.ownerType'), value: ownerTypeLabel(profile, t) },
  ]

  return (
    <Card>
      <CardContent className="pt-6 pb-6">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
            <UserCircle2 className="h-8 w-8 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-textPrimary">
                {ownerDisplayName(profile, t('nav.profile'))}
              </h2>
              {'isPrimary' in profile && profile.isPrimary ? (
                <Badge variant="muted">{t('profile.primaryOwner')}</Badge>
              ) : null}
              {'familySci' in profile && profile.familySci ? (
                <Badge variant="default">{t('profile.familySci')}</Badge>
              ) : null}
            </div>
            {profile.createdAt ? (
              <p className="mt-0.5 text-xs text-textMuted">
                {t('profile.createdAt', { date: formatDate(profile.createdAt) })}
              </p>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {infoItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 rounded-lg bg-surfaceHigh/50 px-3 py-2"
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0 text-textMuted" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-textMuted">
                      {item.label}
                    </p>
                    <p className="truncate text-sm text-textPrimary">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProfileForm({ profile }: { profile: OwnerProfile }) {
  const { t } = useTranslation()
  const updateOwner = useOwnerStore((state) => state.updateOwner)
  const refreshProfile = useAuthStore((state) => state.refreshProfile)
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [address, setAddress] = useState(profile.address)
  const [city, setCity] = useState(profile.city)
  const [phone, setPhone] = useState(profile.phone)
  const [legalType, setLegalType] = useState<OwnerProfile['legalType']>(profile.legalType)
  const [familySci, setFamilySci] = useState(profile.familySci)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setName(profile.name)
    setEmail(profile.email)
    setAddress(profile.address)
    setCity(profile.city)
    setPhone(profile.phone)
    setLegalType(profile.legalType)
    setFamilySci(profile.familySci)
    setStatus('idle')
    setErrorMessage('')
  }, [profile])

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()

    if (!name.trim()) {
      setStatus('error')
      setErrorMessage(t('profile.requiredName'))
      return
    }

    if (profile.isPrimary && !email.trim()) {
      setStatus('error')
      setErrorMessage(t('profile.requiredPrimaryEmail'))
      return
    }

    setLoading(true)
    const updated = await updateOwner(profile.id, {
      name,
      email,
      address,
      city,
      phone,
      legalType,
      familySci: legalType === 'personne_morale' ? familySci : false,
    })
    if (updated?.isPrimary) {
      await refreshProfile()
    }
    setLoading(false)

    if (updated) {
      setStatus('saved')
      setErrorMessage('')
    } else {
      setStatus('error')
      setErrorMessage(t('profile.ownerSaveError'))
    }

    window.setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <CardTitle>{t('profile.formTitle')}</CardTitle>
        </div>
        <CardDescription>{t('profile.formDesc')}</CardDescription>
        <p className="text-xs text-textMuted">
          {profile.isPrimary ? t('profile.primaryEmailHelp') : t('profile.emailOptional')}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">
                {t('profile.fullName')} <span className="text-danger">*</span>
              </label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('profile.fullNamePlaceholder')}
              />
              <p className="text-[10px] text-textMuted">{t('profile.fullNameHelp')}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">
                {t('profile.email')}
                {profile.isPrimary ? <span className="text-danger"> *</span> : null}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('profile.emailPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('profile.ownerType')}</label>
              <select
                value={legalType}
                onChange={(event) => {
                  const nextType = event.target.value === 'personne_morale' ? 'personne_morale' : 'personne_physique'
                  setLegalType(nextType)
                  if (nextType === 'personne_physique') {
                    setFamilySci(false)
                  }
                }}
                className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="personne_physique">{t('profile.ownerTypePerson')}</option>
                <option value="personne_morale">{t('profile.ownerTypeCompany')}</option>
              </select>
            </div>
            <label className="flex items-start gap-2 rounded-xl border border-border/70 bg-surfaceHigh/35 px-3 py-2.5 text-xs text-textMuted">
              <input
                type="checkbox"
                checked={familySci}
                onChange={(event) => setFamilySci(event.target.checked)}
                disabled={legalType !== 'personne_morale'}
                className="mt-0.5 h-4 w-4 rounded border-border bg-surface text-primary"
              />
              <span>
                <span className="block font-medium text-textPrimary">{t('profile.familySci')}</span>
                <span>{t('profile.familySciHelp')}</span>
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{t('profile.address')}</label>
            <Input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder={t('profile.addressPlaceholder')}
            />
            <p className="text-[10px] text-textMuted">{t('profile.addressHelp')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('profile.city')}</label>
              <Input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder={t('profile.cityPlaceholder')}
              />
              <p className="text-[10px] text-textMuted">{t('profile.cityHelp')}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('profile.phone')}</label>
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={t('profile.phonePlaceholder')}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm" disabled={loading}>
              <Save className="h-3.5 w-3.5" />
              {loading ? t('profile.saving') : t('profile.save')}
            </Button>
            <AnimatePresence>
              {status === 'saved' ? (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-success"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t('profile.ownerSaved')}
                </motion.span>
              ) : null}
              {status === 'error' ? (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-danger"
                >
                  {errorMessage || t('profile.ownerSaveError')}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function SignaturePad({ onSave, disabled }: { onSave: (dataUrl: string) => void; disabled: boolean }) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    return ctx
  }, [])

  function applyCtxStyle(ctx: CanvasRenderingContext2D) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2
    ctx.strokeStyle = '#1a1a2e'
  }

  function fillWhite(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = 'transparent'
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    fillWhite(canvas, ctx, rect.width, rect.height)
    applyCtxStyle(ctx)
  }, [])

  function getPos(event: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in event) {
      const touch = event.touches[0]
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function handleStart(event: React.MouseEvent | React.TouchEvent) {
    if (disabled) return
    event.preventDefault()
    const ctx = getCtx()
    if (!ctx) return
    const pos = getPos(event)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
  }

  function handleMove(event: React.MouseEvent | React.TouchEvent) {
    if (!drawing || disabled) return
    event.preventDefault()
    const ctx = getCtx()
    if (!ctx) return
    const pos = getPos(event)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasStrokes(true)
  }

  function handleEnd() {
    setDrawing(false)
  }

  function handleClear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    fillWhite(canvas, ctx, canvas.width / dpr, canvas.height / dpr)
    applyCtxStyle(ctx)
    setHasStrokes(false)
  }

  function handleSave() {
    const canvas = canvasRef.current
    if (!canvas || !hasStrokes) return
    const rect = canvas.getBoundingClientRect()
    const out = document.createElement('canvas')
    out.width = rect.width
    out.height = rect.height
    const outCtx = out.getContext('2d')
    if (!outCtx) return
    outCtx.drawImage(canvas, 0, 0, out.width, out.height)
    onSave(out.toDataURL('image/png'))
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        className="h-28 w-full touch-none cursor-crosshair rounded-lg border border-border bg-white"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={!hasStrokes || disabled}>
          <Save className="h-3.5 w-3.5" />
          {t('profile.saveSignature')}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleClear} disabled={disabled}>
          <Eraser className="h-3.5 w-3.5" />
          {t('profile.clearSignature')}
        </Button>
      </div>
    </div>
  )
}

function SignatureCard({ profile }: { profile: OwnerProfile }) {
  const { t } = useTranslation()
  const updateOwner = useOwnerStore((state) => state.updateOwner)
  const refreshProfile = useAuthStore((state) => state.refreshProfile)
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [mode, setMode] = useState<'preview' | 'draw'>('preview')

  const hasSignature = !!profile.signatureImage

  useEffect(() => {
    setMode('preview')
    setStatus('idle')
  }, [profile.id, profile.signatureImage])

  async function saveSignature(signatureImage: string) {
    setSaving(true)
    const updated = await updateOwner(profile.id, { signatureImage })
    if (updated?.isPrimary) {
      await refreshProfile()
    }
    setSaving(false)
    setStatus(updated ? 'saved' : 'error')
    if (updated) setMode('preview')
    window.setTimeout(() => setStatus('idle'), 2500)
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = async () => {
      await saveSignature(reader.result as string)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <PenTool className="h-4 w-4 text-primary" />
          <CardTitle>{t('profile.signature')}</CardTitle>
        </div>
        <CardDescription>{t('profile.signatureDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {mode === 'draw' ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-textMuted">{t('profile.signatureDrawHelp')}</p>
            <SignaturePad onSave={saveSignature} disabled={saving} />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMode('preview')}
              className="self-start"
            >
              {t('common.cancel')}
            </Button>
          </div>
        ) : (
          <div className="flex items-start gap-5">
            <div className="flex h-24 w-48 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-white">
              {hasSignature ? (
                <img
                  src={profile.signatureImage}
                  alt={t('profile.signatureAlt')}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-textMuted">{t('profile.noSignature')}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={() => setMode('draw')} disabled={saving}>
                <PenTool className="h-3.5 w-3.5" />
                {t('profile.drawSignature')}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => fileRef.current?.click()}
                disabled={saving}
              >
                <Upload className="h-3.5 w-3.5" />
                {hasSignature ? t('profile.replaceSignature') : t('profile.uploadSignature')}
              </Button>
              {hasSignature ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void saveSignature('')
                  }}
                  disabled={saving}
                  className="text-danger hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('profile.removeSignature')}
                </Button>
              ) : null}
              <AnimatePresence>
                {status === 'saved' ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-xs text-success"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> {t('profile.signatureSaved')}
                  </motion.span>
                ) : null}
                {status === 'error' ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-xs text-danger"
                  >
                    {t('profile.ownerSaveError')}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
