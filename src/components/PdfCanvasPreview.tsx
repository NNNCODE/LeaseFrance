import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

interface RenderedPdfPage {
  dataUrl: string
  width: number
  height: number
  pageNumber: number
}

interface PdfCanvasPreviewProps {
  data: Uint8Array
}

export default function PdfCanvasPreview({ data }: PdfCanvasPreviewProps) {
  const { t } = useTranslation()
  const [pages, setPages] = useState<RenderedPdfPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function renderPdf() {
      setPages([])
      setError('')
      setLoading(true)

      try {
        const loadingTask = getDocument({
          data,
          isEvalSupported: false,
          stopAtErrors: true,
          useWasm: false,
          useWorkerFetch: false,
        })
        const pdf = await loadingTask.promise
        const renderedPages: RenderedPdfPage[] = []

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber)
          const viewport = page.getViewport({ scale: 1.35 })
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')

          if (!context) {
            throw new Error('Canvas 2D unavailable')
          }

          canvas.width = Math.ceil(viewport.width)
          canvas.height = Math.ceil(viewport.height)

          await page.render({
            canvas,
            canvasContext: context,
            viewport,
          }).promise

          renderedPages.push({
            dataUrl: canvas.toDataURL('image/png'),
            width: viewport.width,
            height: viewport.height,
            pageNumber,
          })

          page.cleanup()
        }

        if (cancelled) return
        setPages(renderedPages)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void renderPdf()
    return () => {
      cancelled = true
    }
  }, [data])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-sm text-textMuted">{t('documents.loadingPdf')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <AlertTriangle className="h-8 w-8 text-warning" />
        <p className="max-w-lg text-center text-sm text-textMuted">
          {t('common.error')}: {error}
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col items-center gap-4 overflow-auto bg-[#5f656a] p-6">
      {pages.map((page) => (
        <div
          key={page.pageNumber}
          className="w-full max-w-4xl rounded-lg bg-white shadow-xl"
          style={{ aspectRatio: `${page.width} / ${page.height}` }}
        >
          <img
            src={page.dataUrl}
            alt={`${t('documents.preview')} ${page.pageNumber}`}
            className="h-full w-full rounded-lg object-contain"
          />
        </div>
      ))}
    </div>
  )
}
