import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PropertyDeleteModal({
  property, onConfirm, onClose, error, loading,
}: {
  property: Property
  onConfirm: () => void
  onClose: () => void
  error: string
  loading: boolean
}) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm bg-surface border border-danger/30 rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-danger/10 shrink-0">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div>
            <p className="text-sm font-semibold text-textPrimary">{t('properties.deleteTitle')}</p>
            <p className="text-xs text-textMuted mt-0.5">{t('properties.deleteDesc', { name: property.name })}</p>
          </div>
        </div>
        {error ? (
          <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
        ) : null}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>{t('common.cancel')}</Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1" disabled={loading}>
            <Trash2 className="w-3.5 h-3.5" />
            {loading ? t('common.deleting') : t('common.delete')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
