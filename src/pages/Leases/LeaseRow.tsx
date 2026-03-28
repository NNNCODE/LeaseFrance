import { motion } from 'framer-motion'
import {
  Building2,
  CalendarDays,
  Euro,
  Pencil,
  ScrollText,
  ShieldCheck,
  Trash2,
  TrendingUp,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { isRevisionEligible } from '@/lib/irl'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getDepositReturnedAmount, getDepositStatus, getDepositStatusMeta } from './depositUtils'
import { STATUS_CONFIG, typeLabel } from './leasePageUtils'

interface LeaseRowProps {
  lease: Lease
  onEdit: () => void
  onDelete: () => void
  onManageDeposit: () => void
  onManageCharges: () => void
  onRevise: () => void
}

export default function LeaseRow({
  lease,
  onEdit,
  onDelete,
  onManageDeposit,
  onManageCharges,
  onRevise,
}: LeaseRowProps) {
  const status = STATUS_CONFIG[lease.status]
  const StatusIcon = status.icon
  const canRevise =
    lease.status === 'active'
    && isRevisionEligible(
      lease.type,
      lease.start_date,
      lease.irl_reference_index,
      lease.irl_reference_quarter,
    )
  const depositStatus = getDepositStatus(lease)
  const depositMeta = getDepositStatusMeta(depositStatus)
  const returnedAmount = getDepositReturnedAmount(lease)

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
      }}
    >
      <Card className="group transition-colors duration-200 hover:border-primary/40">
        <CardContent className="flex items-center gap-5 px-5 py-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              lease.status === 'active'
                ? 'bg-success/10'
                : lease.status === 'terminated'
                  ? 'bg-danger/10'
                  : 'bg-surfaceHigh'
            }`}
          >
            <StatusIcon
              className={`h-4 w-4 ${
                lease.status === 'active'
                  ? 'text-success'
                  : lease.status === 'terminated'
                    ? 'text-danger'
                    : 'text-textMuted'
              }`}
            />
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-4 items-center gap-4">
            <div className="col-span-1 min-w-0">
              <div className="flex items-center gap-1.5 truncate text-sm font-semibold text-textPrimary">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{lease.property_name}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-textMuted">
                <User className="h-3 w-3 shrink-0" />
                <span>
                  {lease.tenant_first_name} {lease.tenant_last_name}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Badge variant="muted">{typeLabel(lease.type)}</Badge>
              <Badge variant={status.variant as 'success' | 'danger' | 'muted'}>
                {status.label}
              </Badge>
              {lease.irl_reference_quarter && (
                <span className="text-[10px] text-textMuted">IRL : {lease.irl_reference_quarter}</span>
              )}
            </div>

            <div className="flex flex-col gap-1 text-xs text-textMuted">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span>Depuis le {formatDate(lease.start_date)}</span>
              </div>
              {lease.end_date && (
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-0" />
                  <span>Jusqu'au {formatDate(lease.end_date)}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1 text-right">
              <div className="flex items-center justify-end gap-1 text-sm font-semibold text-textPrimary">
                <Euro className="h-3.5 w-3.5 text-primary" />
                {formatCurrency(lease.rent_amount)} / mois
              </div>
              {lease.charges_amount > 0 && (
                <p className="text-xs text-textMuted">+ {formatCurrency(lease.charges_amount)} charges</p>
              )}
              {lease.deposit_amount > 0 && (
                <div className="flex items-center justify-end gap-2">
                  <p className="text-xs text-textMuted">Depot : {formatCurrency(lease.deposit_amount)}</p>
                  <Badge variant={depositMeta.variant} className="text-[10px]">
                    {depositMeta.label}
                  </Badge>
                </div>
              )}
              {lease.deposit_amount > 0 && depositStatus !== 'awaiting' && (
                <p className="text-xs text-textMuted">
                  {depositStatus === 'held'
                    ? `Encaisse le ${formatDate(lease.deposit_received_date!)}`
                    : `A restituer : ${formatCurrency(returnedAmount)}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {lease.charges_amount > 0 && (
              <button
                onClick={onManageCharges}
                title="Regulariser les charges"
                className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-warning/10 hover:text-warning"
              >
                <ScrollText className="h-3.5 w-3.5" />
              </button>
            )}
            {lease.deposit_amount > 0 && (
              <button
                onClick={onManageDeposit}
                title="Gerer le depot de garantie"
                className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
              </button>
            )}
            {canRevise && (
              <button
                onClick={onRevise}
                title="Reviser le loyer (IRL)"
                className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <TrendingUp className="h-3.5 w-3.5" />
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
