import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Eye,
  File,
  FileImage,
  FileText,
  Film,
  FolderOpen,
  Paperclip,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import PdfCanvasPreview from '@/components/PdfCanvasPreview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'

// ── Props ─────────────────────────────────────────────────────────────────────

interface AttachmentPanelProps {
  entityType: 'tenant' | 'lease' | 'inspection'
  entityId: number
  /** Named slots for structured uploads (e.g. dossier items). */
  slots?: Array<{
    key: string
    label: string
    description?: string
    featured?: boolean
    badge?: string
  }>
  /** Panel title. */
  title?: string
  /** Optional label for unslotted files when slots are present. */
  generalSectionLabel?: string
  /** Optional helper text for unslotted files when slots are present. */
  generalSectionDescription?: string
  /** Keep the general section visible even when it is empty. */
  alwaysShowGeneralSection?: boolean
  /** Compact mode for inline embedding. */
  compact?: boolean
  /** Optional callback fired after a successful upload. */
  onUploadComplete?: (slot: string | null, uploaded: Attachment[]) => Promise<void> | void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType === 'application/pdf') return FileText
  if (mimeType === 'video/mp4') return Film
  return File
}

function formatAttachmentDateTime(value: string) {
  return formatDateTime(value.includes('T') ? value : value.replace(' ', 'T'))
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AttachmentPanel({
  entityType,
  entityId,
  slots,
  title,
  generalSectionLabel,
  generalSectionDescription,
  alwaysShowGeneralSection = false,
  compact = false,
  onUploadComplete,
}: AttachmentPanelProps) {
  const { t } = useTranslation()
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    setError('')
    try {
      const rows = await window.api.attachments.getByEntity(entityType, entityId)
      setAttachments(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => { load() }, [load])

  async function handleUpload(slot: string | null) {
    setError('')
    try {
      const uploaded = await window.api.attachments.upload(entityType, entityId, slot)
      if (uploaded.length > 0) {
        await load()
        await onUploadComplete?.(slot, uploaded)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleDelete(attachment: Attachment) {
    if (
      entityType === 'inspection'
      && attachment.mime_type === 'video/mp4'
      && !window.confirm(t('attachments.confirmDeleteInspectionVideo'))
    ) {
      return
    }

    setError('')
    try {
      await window.api.attachments.delete(attachment.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  // Group by slot
  const slotted = slots
    ? slots.map((s) => ({
      ...s,
      files: attachments.filter((a) => a.slot === s.key),
    }))
    : null

  const generalFiles = slotted ? attachments.filter((a) => !a.slot) : attachments
  const resolvedTitle = title ?? t('attachments.title')
  const resolvedGeneralSectionLabel = generalSectionLabel ?? t('attachments.otherFiles')
  const showGeneralSection = generalFiles.length > 0 || (Boolean(slotted) && alwaysShowGeneralSection)

  return (
    <div className={compact ? '' : 'rounded-2xl border border-border'}>
      {/* ── Header ──────────────────────────────────────── */}
      <div className={`flex items-center justify-between gap-3 ${compact ? 'mb-3' : 'px-4 py-3 border-b border-border'}`}>
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-textPrimary">{resolvedTitle}</p>
          {attachments.length > 0 && (
            <Badge variant="muted">{attachments.length}</Badge>
          )}
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={() => handleUpload(null)}>
          <Plus className="w-3 h-3" />
          {t('common.add')}
        </Button>
      </div>

      <div className={compact ? '' : 'px-4 pb-4 pt-2'}>
        {error ? (
          <div className={`mb-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger ${compact ? '' : 'mt-2'}`}>
            {error}
          </div>
        ) : null}
        {loading ? (
          <div className="py-4 text-xs text-textMuted text-center animate-pulse">{t('common.loading')}</div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* ── Slot sections ───────────────────────────── */}
            {slotted && slotted.map((slotDef) => (
              <div
                key={slotDef.key}
                className={`rounded-xl border p-3 ${
                  slotDef.featured
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border bg-surfaceHigh/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {slotDef.featured ? <Film className="w-3.5 h-3.5 text-primary shrink-0" /> : null}
                      <p className="text-xs font-medium text-textPrimary">{slotDef.label}</p>
                      {slotDef.badge ? (
                        <Badge variant="default" className="text-[10px]">{slotDef.badge}</Badge>
                      ) : null}
                      {slotDef.files.length > 0 ? (
                        <Badge variant="success" className="text-[10px]">
                          {t('attachments.fileCount', { count: slotDef.files.length })}
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-[10px]">{t('attachments.missing')}</Badge>
                      )}
                    </div>
                    {slotDef.description ? (
                      <p className="text-[11px] text-textMuted mt-1 leading-5">{slotDef.description}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpload(slotDef.key)}
                    className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    {t('common.add')}
                  </button>
                </div>

                {slotDef.files.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {slotDef.files.map((file) => (
                      <AttachmentRow
                        key={file.id}
                        attachment={file}
                        showUploadDate={entityType === 'inspection' && file.mime_type === 'video/mp4'}
                        onPreview={() => setPreviewAttachment(file)}
                        onOpen={() => window.api.attachments.open(file.id)}
                        onDelete={() => handleDelete(file)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {/* ── General files ────────────────────────────── */}
            {showGeneralSection && (
              <div className={slotted ? 'rounded-xl border border-border bg-surfaceHigh/20 p-3' : 'flex flex-col gap-1'}>
                {slotted ? (
                  <div className={generalFiles.length > 0 ? 'mb-2' : ''}>
                    <p className="text-xs font-medium text-textPrimary">{resolvedGeneralSectionLabel}</p>
                    {generalSectionDescription ? (
                      <p className="text-[11px] text-textMuted mt-1 leading-5">{generalSectionDescription}</p>
                    ) : null}
                  </div>
                ) : null}
                {generalFiles.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {generalFiles.map((file) => (
                      <AttachmentRow
                        key={file.id}
                        attachment={file}
                        showUploadDate={entityType === 'inspection' && file.mime_type === 'video/mp4'}
                        onPreview={() => setPreviewAttachment(file)}
                        onOpen={() => window.api.attachments.open(file.id)}
                        onDelete={() => handleDelete(file)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {/* ── Empty ────────────────────────────────────── */}
            {attachments.length === 0 && !slotted && (
              <div className="py-6 text-center">
                <Paperclip className="w-5 h-5 text-textMuted mx-auto" />
                <p className="text-xs text-textMuted mt-2">{t('attachments.emptyTitle')}</p>
                <p className="text-xs text-textMuted mt-0.5">{t('attachments.emptyDesc')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Preview Modal ───────────────────────────────── */}
      <AnimatePresence>
        {previewAttachment && (
          <AttachmentPreviewModal
            attachment={previewAttachment}
            onClose={() => setPreviewAttachment(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Attachment Row ────────────────────────────────────────────────────────────

function AttachmentRow({
  attachment,
  showUploadDate = false,
  onPreview,
  onOpen,
  onDelete,
}: {
  attachment: Attachment
  showUploadDate?: boolean
  onPreview: () => void
  onOpen: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const FileIcon = getFileIcon(attachment.mime_type)
  const metadata = [
    formatFileSize(attachment.file_size),
    showUploadDate ? t('attachments.uploadedAt', { date: formatAttachmentDateTime(attachment.created_at) }) : null,
  ].filter(Boolean).join(' | ')

  return (
    <div className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-surfaceHigh/60 transition-colors group">
      <FileIcon className="w-4 h-4 text-textMuted shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-textPrimary truncate">{attachment.file_name}</p>
        <p className="text-[10px] text-textMuted">{metadata}</p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onPreview}
          title={t('attachments.preview')}
          className="p-1 rounded-md text-textMuted hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onOpen}
          title={t('common.open')}
          className="p-1 rounded-md text-textMuted hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title={t('common.delete')}
          className="p-1 rounded-md text-textMuted hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

function AttachmentPreviewModal({
  attachment,
  onClose,
}: {
  attachment: Attachment
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [videoReady, setVideoReady] = useState(false)
  const [videoError, setVideoError] = useState('')

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    setPreviewUrl(null)
    setPdfData(null)
    setError('')
    setLoading(true)
    setVideoReady(false)
    setVideoError('')

    async function loadFile() {
      const result = await window.api.attachments.read(attachment.id)
      if (cancelled) return

      if (result.error || !result.data) {
        setError(result.error || t('attachments.readError'))
      } else {
        const fileBytes = new Uint8Array(result.data)

        if (attachment.mime_type === 'application/pdf') {
          setPdfData(fileBytes)
        } else if (result.mimeType) {
          const nextUrl = URL.createObjectURL(new Blob([fileBytes], { type: result.mimeType }))
          if (cancelled) {
            URL.revokeObjectURL(nextUrl)
            return
          }
          objectUrl = nextUrl
          setPreviewUrl(nextUrl)
        }
      }
      setLoading(false)
    }

    loadFile()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [attachment.id])

  const isImage = attachment.mime_type.startsWith('image/')
  const isPdf = attachment.mime_type === 'application/pdf'
  const isMp4 = attachment.mime_type === 'video/mp4'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className={`bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
          isPdf ? 'w-full max-w-4xl h-[85vh]' : 'w-full max-w-2xl max-h-[85vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surfaceHigh/50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {(() => { const FI = getFileIcon(attachment.mime_type); return <FI className="w-4 h-4 text-textMuted shrink-0" /> })()}
            <p className="text-sm font-semibold text-textPrimary truncate">{attachment.file_name}</p>
            <span className="text-xs text-textMuted">{formatFileSize(attachment.file_size)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => window.api.attachments.open(attachment.id)}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              {t('common.open')}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-textMuted hover:bg-surfaceHigh hover:text-textPrimary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
          {loading ? (
            <p className="text-sm text-textMuted animate-pulse">{t('common.loading')}</p>
          ) : error ? (
            <div className="flex flex-col items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-warning" />
              <p className="text-sm text-textMuted">{error}</p>
            </div>
          ) : previewUrl && isImage ? (
            <img
              src={previewUrl}
              alt={attachment.file_name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : previewUrl && isMp4 ? (
            videoError ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <File className="w-8 h-8 text-textMuted" />
                <p className="text-sm text-textMuted">{videoError}</p>
              </div>
            ) : (
              <div className="relative flex items-center justify-center w-full h-full">
                {!videoReady && (
                  <p className="text-sm text-textMuted animate-pulse">
                    {t('attachments.videoPreviewLoading')}
                  </p>
                )}
                <video
                  data-testid="attachment-video-preview"
                  src={previewUrl}
                  controls
                  preload="auto"
                  playsInline
                  onLoadedData={() => setVideoReady(true)}
                  onCanPlay={() => setVideoReady(true)}
                  onError={() => {
                    setVideoReady(false)
                    setVideoError(t('attachments.videoPreviewFailed'))
                  }}
                  className={`max-w-full max-h-full rounded-lg bg-black ${videoReady ? '' : 'opacity-0 absolute pointer-events-none'}`}
                />
              </div>
            )
          ) : pdfData && isPdf ? (
            <div className="h-full w-full overflow-hidden">
              <PdfCanvasPreview data={pdfData} />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <File className="w-8 h-8 text-textMuted" />
              <p className="text-sm text-textMuted">{t('attachments.previewUnavailable')}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
