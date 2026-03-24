import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserCircle2, Mail, MapPin, Phone, Save, CheckCircle2,
  Building2, FileText, PenTool, Upload, Trash2, MapPinned, Eraser,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

export default function Profile() {
  const { profile } = useAuthStore()

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">Profil du propriétaire</h1>
        <p className="text-textMuted text-sm mt-1">
          Vos informations personnelles utilisées dans les documents officiels
        </p>
      </div>

      {/* Profile overview card */}
      <ProfileOverview />

      {/* Editable form */}
      <ProfileForm />

      {/* Signature upload */}
      <SignatureCard />

      {/* Info card about how this data is used */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5 pb-5">
          <div className="flex gap-3">
            <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-textPrimary mb-1">
                Utilisation de vos informations
              </p>
              <p className="text-xs text-textMuted leading-relaxed">
                Votre nom, adresse et téléphone apparaissent sur les quittances de loyer et
                reçus générés par l'application. Assurez-vous que ces informations sont complètes
                et à jour pour garantir la conformité légale de vos documents.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Profile Overview ──────────────────────────────────────────────────────────

function ProfileOverview() {
  const { profile } = useAuthStore()

  if (!profile) return null

  const infoItems = [
    { icon: UserCircle2, label: 'Nom complet', value: profile.name || '—' },
    { icon: Mail,        label: 'E-mail',      value: profile.email || '—' },
    { icon: MapPin,      label: 'Adresse',     value: profile.address || 'Non renseignée' },
    { icon: MapPinned,   label: 'Ville',       value: profile.city || 'Non renseignée' },
    { icon: Phone,       label: 'Téléphone',   value: profile.phone || 'Non renseigné' },
  ]

  return (
    <Card>
      <CardContent className="pt-6 pb-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 shrink-0">
            <UserCircle2 className="w-8 h-8 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-textPrimary truncate">
              {profile.name || 'Propriétaire'}
            </h2>
            {profile.createdAt && (
              <p className="text-xs text-textMuted mt-0.5">
                Membre depuis le {formatDate(profile.createdAt)}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 mt-4">
              {infoItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surfaceHigh/50"
                >
                  <item.icon className="w-3.5 h-3.5 text-textMuted shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-textMuted font-medium">
                      {item.label}
                    </p>
                    <p className="text-sm text-textPrimary truncate">{item.value}</p>
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

// ── Editable Profile Form ─────────────────────────────────────────────────────

function ProfileForm() {
  const { profile, updateProfile } = useAuthStore()
  const [name, setName]       = useState(profile?.name ?? '')
  const [email, setEmail]     = useState(profile?.email ?? '')
  const [address, setAddress] = useState(profile?.address ?? '')
  const [city, setCity]       = useState(profile?.city ?? '')
  const [phone, setPhone]     = useState(profile?.phone ?? '')
  const [status, setStatus]   = useState<'idle' | 'saved' | 'error'>('idle')
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    setLoading(true)
    const ok = await updateProfile(name, email, address, city, phone)
    setLoading(false)
    setStatus(ok ? 'saved' : 'error')
    setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <CardTitle>Modifier les informations</CardTitle>
        </div>
        <CardDescription>
          Ces informations seront utilisées sur les quittances et reçus de loyer.
          Le champ « Ville » correspond au lieu de signature (« Fait à ») des documents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">
                Nom complet <span className="text-danger">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jean Dupont"
              />
              <p className="text-[10px] text-textMuted">
                Nom légal tel qu'il apparaît sur les documents
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">
                Adresse e-mail <span className="text-danger">*</span>
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jean@email.fr"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">
              Adresse postale
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="12 rue de la Paix, 75002 Paris"
            />
            <p className="text-[10px] text-textMuted">
              Adresse complète du propriétaire (affichée sur les quittances)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">
                Ville (pour « Fait à »)
              </label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Paris"
              />
              <p className="text-[10px] text-textMuted">
                Ville de signature affichée dans « Fait à » sur les documents
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">
                Téléphone
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12 34 56 78"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm" disabled={loading}>
              <Save className="w-3.5 h-3.5" />
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <AnimatePresence>
              {status === 'saved' && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-success"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Modifications enregistrées
                </motion.span>
              )}
              {status === 'error' && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-danger"
                >
                  Erreur lors de la sauvegarde
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Signature Pad (Canvas Drawing) ───────────────────────────────────────────

function SignaturePad({ onSave, disabled }: { onSave: (dataUrl: string) => void; disabled: boolean }) {
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

  function fillWhite(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'transparent'
  }

  // Initialize canvas
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

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0]
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handleStart(e: React.MouseEvent | React.TouchEvent) {
    if (disabled) return
    e.preventDefault()
    const ctx = getCtx()
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
  }

  function handleMove(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing || disabled) return
    e.preventDefault()
    const ctx = getCtx()
    if (!ctx) return
    const pos = getPos(e)
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
    // Export at standard resolution (not high-DPI) for smaller base64 output
    const rect = canvas.getBoundingClientRect()
    const out = document.createElement('canvas')
    out.width = rect.width
    out.height = rect.height
    const outCtx = out.getContext('2d')
    if (!outCtx) return
    outCtx.drawImage(canvas, 0, 0, out.width, out.height)
    const dataUrl = out.toDataURL('image/png')
    onSave(dataUrl)
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        className="w-full h-28 rounded-lg border border-border bg-white cursor-crosshair touch-none"
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
          <Save className="w-3.5 h-3.5" />
          Enregistrer
        </Button>
        <Button size="sm" variant="ghost" onClick={handleClear} disabled={disabled}>
          <Eraser className="w-3.5 h-3.5" />
          Effacer
        </Button>
      </div>
    </div>
  )
}

// ── Signature Upload Card ─────────────────────────────────────────────────────

function SignatureCard() {
  const { profile, updateProfile } = useAuthStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [mode, setMode] = useState<'preview' | 'draw'>('preview')

  const hasSignature = !!profile?.signatureImage

  async function saveSignature(base64: string) {
    if (!profile) return
    setSaving(true)
    const ok = await updateProfile(
      profile.name, profile.email, profile.address, profile.city, profile.phone, base64,
    )
    setSaving(false)
    setStatus(ok ? 'saved' : 'error')
    if (ok) setMode('preview')
    setTimeout(() => setStatus('idle'), 2500)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = async () => {
      await saveSignature(reader.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleRemove() {
    if (!profile) return
    setSaving(true)
    const ok = await updateProfile(
      profile.name, profile.email, profile.address, profile.city, profile.phone, '',
    )
    setSaving(false)
    setStatus(ok ? 'saved' : 'error')
    setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <PenTool className="w-4 h-4 text-primary" />
          <CardTitle>Signature du propriétaire</CardTitle>
        </div>
        <CardDescription>
          Dessinez votre signature directement ou importez une image (PNG/JPG).
          Elle sera apposée automatiquement sur les quittances et reçus.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mode === 'draw' ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-textMuted">
              Dessinez votre signature ci-dessous avec la souris ou un stylet :
            </p>
            <SignaturePad onSave={saveSignature} disabled={saving} />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMode('preview')}
              className="self-start"
            >
              Annuler
            </Button>
          </div>
        ) : (
          <div className="flex items-start gap-5">
            {/* Preview */}
            <div className="flex items-center justify-center w-48 h-24 rounded-lg border border-dashed border-border bg-white shrink-0 overflow-hidden">
              {hasSignature ? (
                <img
                  src={profile.signatureImage}
                  alt="Signature"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-xs text-textMuted">Aucune signature</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={() => setMode('draw')}
                disabled={saving}
              >
                <PenTool className="w-3.5 h-3.5" />
                Dessiner
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
                <Upload className="w-3.5 h-3.5" />
                {hasSignature ? 'Remplacer' : 'Importer'}
              </Button>
              {hasSignature && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRemove}
                  disabled={saving}
                  className="text-danger hover:text-danger"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </Button>
              )}
              <AnimatePresence>
                {status === 'saved' && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-xs text-success"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Signature enregistrée
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
