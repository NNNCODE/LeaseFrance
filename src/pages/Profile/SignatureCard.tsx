import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Eraser, PenTool, Save, Trash2, Upload } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useOwnerStore } from '@/stores/useOwnerStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

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

export default function SignatureCard({ profile }: { profile: OwnerProfile }) {
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
