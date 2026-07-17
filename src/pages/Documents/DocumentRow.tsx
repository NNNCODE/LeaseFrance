import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Archive,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  FolderOpen,
  FolderSearch,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { getDocumentMeta, getDocumentStatusMeta } from './documentPageUtils'

interface DocumentRowProps {
  doc: DocumentRecord
  onOpen: () => void
  onPreview: () => void
  onExport: () => void
  onShowInFolder: () => void
  onDelete: () => void
  onStatusChange: (status: string) => void
  onRegenerate: () => void
}

export default function DocumentRow({
  doc,
  onOpen,
  onPreview,
  onExport,
  onShowInFolder,
  onDelete,
  onStatusChange,
  onRegenerate,
}: DocumentRowProps) {
  const { t } = useTranslation()
  const documentStatusMeta = getDocumentStatusMeta(t)
  const meta = getDocumentMeta(doc.type, t)
  const statusMeta = documentStatusMeta[doc.status] ?? documentStatusMeta.generated
  const Icon = meta.icon
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const canRegenerate = [
    'quittance',
    'recu',
    'avis_revision_loyer',
    'contrat_location_meublee',
    'recu_depot_garantie',
    'solde_depot_garantie',
  ].includes(doc.type)

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: -8 },
        show: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' } },
      }}
    >
      <Card className="group transition-colors duration-200 hover:border-primary/30">
        <CardContent className="flex items-center gap-4 px-4 py-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.iconBg}`}>
            <Icon className={`h-4 w-4 ${meta.iconClass}`} />
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-[1.2fr_0.8fr_0.7fr_0.6fr] items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-textPrimary">
                {doc.tenant_first_name} {doc.tenant_last_name}
              </p>
              <p className="truncate text-xs text-textMuted">{doc.property_name}</p>
            </div>

            <div>
              <Badge variant={meta.variant}>{meta.label}</Badge>
            </div>

            <div className="relative">
              <button onClick={() => setShowStatusMenu((current) => !current)} className="inline-flex">
                <Badge
                  variant={statusMeta.variant}
                  className="cursor-pointer transition-opacity hover:opacity-80"
                >
                  {statusMeta.label}
                </Badge>
              </button>

              {showStatusMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-xl border border-border bg-surface py-1 shadow-lg">
                    {Object.entries(documentStatusMeta).map(([status, statusOption]) => (
                      <button
                        key={status}
                        onClick={() => {
                          onStatusChange(status)
                          setShowStatusMenu(false)
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-surfaceHigh ${
                          doc.status === status ? 'font-medium text-primary' : 'text-textMuted'
                        }`}
                      >
                        {status === 'generated' && <FileText className="h-3 w-3" />}
                        {status === 'sent' && <Send className="h-3 w-3" />}
                        {status === 'archived' && <Archive className="h-3 w-3" />}
                        {statusOption.label}
                        {doc.status === status && <CheckCircle2 className="ml-auto h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="text-xs text-textMuted">{formatDate(doc.generated_at)}</div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {doc.file_path && (
              <button
                onClick={onPreview}
                title={t('documents.preview')}
                className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            )}
            {doc.file_path && (
              <button
                onClick={onOpen}
                title={t('documents.open')}
                className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <FolderOpen className="h-3.5 w-3.5" />
              </button>
            )}
            {doc.file_path && (
              <button
                onClick={onExport}
                title={t('documents.exportCopy')}
                className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            )}
            {doc.file_path && (
              <button
                onClick={onShowInFolder}
                title={t('documents.showInFolder')}
                className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <FolderSearch className="h-3.5 w-3.5" />
              </button>
            )}
            {canRegenerate && (
              <button
                onClick={onRegenerate}
                title={t('documents.regenerate')}
                className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-warning/10 hover:text-warning"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={onDelete}
              title={t('common.delete')}
              className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
