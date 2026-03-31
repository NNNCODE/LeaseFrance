import { motion } from 'framer-motion'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface LeaseDeleteModalProps {
  lease: Lease
  onConfirm: () => void
  onClose: () => void
  error: string
  loading: boolean
}

export default function LeaseDeleteModal({
  lease,
  onConfirm,
  onClose,
  error,
  loading,
}: LeaseDeleteModalProps) {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-danger/30 bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/10">
            <AlertTriangle className="h-5 w-5 text-danger" />
          </div>
          <div>
            <p className="text-sm font-semibold text-textPrimary">{t('leases.deleteTitle')}</p>
            <p className="mt-0.5 text-xs text-textMuted">
              {lease.property_name} | {lease.tenant_first_name} {lease.tenant_last_name}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
          {t('leases.deleteWarning')}
        </div>

        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading} className="flex-1">
            <Trash2 className="h-3.5 w-3.5" />
            {loading ? t('common.deleting') : t('common.delete')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
