import { motion } from 'framer-motion'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { monthLabel } from './paymentPageUtils'

interface PaymentDeleteModalProps {
  payment: Payment
  onConfirm: () => void
  onClose: () => void
}

export default function PaymentDeleteModal({
  payment,
  onConfirm,
  onClose,
}: PaymentDeleteModalProps) {
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
            <p className="text-sm font-semibold text-textPrimary">Supprimer ce paiement ?</p>
            <p className="mt-0.5 text-xs text-textMuted">
              {monthLabel(payment.period_month, payment.period_year)} · {payment.property_name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1">
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
