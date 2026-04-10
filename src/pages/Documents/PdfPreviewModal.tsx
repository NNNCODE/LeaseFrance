import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, FolderOpen, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import PdfCanvasPreview from '@/components/PdfCanvasPreview'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { getDocumentMeta } from './documentPageUtils'

interface PdfPreviewModalProps {
  doc: DocumentRecord
  onClose: () => void
}

export default function PdfPreviewModal({ doc, onClose }: PdfPreviewModalProps) {
  const { t } = useTranslation()
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPdfData(null)
    setError('')
    setLoading(true)

    if (!doc.file_path) {
      setError(t('documents.fileMissing'))
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadPdf() {
      const result = await window.api.documents.readFile(doc.file_path!)
      if (cancelled) return

      if (result.error || !result.data || !result.mimeType) {
        setError(result.error || t('documents.readError'))
      } else {
        setPdfData(result.data)
      }
      setLoading(false)
    }

    void loadPdf()
    return () => {
      cancelled = true
    }
  }, [doc.file_path, t])

  const meta = getDocumentMeta(doc.type, t)
  const PreviewIcon = meta.icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-surfaceHigh/50 px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${meta.iconBg}`}>
              <PreviewIcon className={`h-3.5 w-3.5 ${meta.iconClass}`} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-textPrimary">
                {meta.label} - {doc.tenant_first_name} {doc.tenant_last_name}
              </p>
              <p className="truncate text-xs text-textMuted">
                {doc.property_name} · {formatDate(doc.generated_at)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {doc.file_path && (
              <Button variant="secondary" size="sm" onClick={() => window.api.documents.openFile(doc.file_path!)}>
                <FolderOpen className="h-3.5 w-3.5" />
                {t('documents.open')}
              </Button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-surfaceHigh hover:text-textPrimary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="animate-pulse text-sm text-textMuted">{t('documents.loadingPdf')}</div>
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <AlertTriangle className="h-8 w-8 text-warning" />
              <p className="text-sm text-textMuted">{error}</p>
            </div>
          ) : pdfData ? (
            <PdfCanvasPreview data={pdfData} />
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  )
}
