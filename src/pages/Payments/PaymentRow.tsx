import { motion } from 'framer-motion'
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Euro,
  Pencil,
  Receipt,
  ScrollText,
  StickyNote,
  Trash2,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { methodLabel, STATUS_CONFIG } from './paymentPageUtils'

interface PaymentRowProps {
  payment: Payment
  onMarkPaid: () => void
  onReminder: () => void
  onEdit: () => void
  onDelete: () => void
  onGenerateDocument: () => void
}

export default function PaymentRow({
  payment,
  onMarkPaid,
  onReminder,
  onEdit,
  onDelete,
  onGenerateDocument,
}: PaymentRowProps) {
  const status = STATUS_CONFIG[payment.status]
  const StatusIcon = status.icon
  const total = payment.rent_amount + payment.charges_amount

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: -8 },
        show: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' } },
      }}
    >
      <Card
        className={`group transition-colors duration-200 ${
          payment.status === 'late'
            ? 'border-danger/30 hover:border-danger/50'
            : 'hover:border-primary/30'
        }`}
      >
        <CardContent className="flex items-center gap-4 px-4 py-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              payment.status === 'paid'
                ? 'bg-success/10'
                : payment.status === 'late'
                  ? 'bg-danger/10'
                  : 'bg-warning/10'
            }`}
          >
            <StatusIcon
              className={`h-4 w-4 ${
                payment.status === 'paid'
                  ? 'text-success'
                  : payment.status === 'late'
                    ? 'text-danger'
                    : 'text-warning'
              }`}
            />
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-3 items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate text-sm font-medium text-textPrimary">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{payment.property_name}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-textMuted">
                <User className="h-3 w-3 shrink-0" />
                {payment.tenant_first_name} {payment.tenant_last_name}
              </div>
            </div>

            <div className="flex flex-col gap-0.5 text-xs text-textMuted">
              <span>{methodLabel(payment.payment_method)}</span>
              {payment.payment_date && (
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {formatDate(payment.payment_date)}
                </div>
              )}
              {payment.notes && (
                <div className="flex items-center gap-1 text-accent">
                  <StickyNote className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{payment.notes}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-sm font-semibold text-textPrimary">
                <Euro className="h-3.5 w-3.5 text-primary" />
                {formatCurrency(total)}
              </div>
              <Badge variant={status.variant as 'success' | 'warning' | 'danger'}>
                {status.label}
              </Badge>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {payment.status !== 'paid' && (
              <button
                onClick={onReminder}
                title="Relancer cet impaye"
                className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-warning/10 hover:text-warning"
              >
                <ScrollText className="h-3.5 w-3.5" />
              </button>
            )}
            {payment.status !== 'paid' && (
              <button
                onClick={onMarkPaid}
                title="Marquer comme paye"
                className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-success/10 hover:text-success"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </button>
            )}
            {payment.status === 'paid' && (
              <button
                onClick={onGenerateDocument}
                title="Generer quittance ou recu"
                className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-accent/10 hover:text-accent"
              >
                <Receipt className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={onEdit}
              className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-surfaceHigh hover:text-textPrimary"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
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
