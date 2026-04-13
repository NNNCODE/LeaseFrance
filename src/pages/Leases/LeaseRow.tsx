import { motion } from 'framer-motion'
import {
  Building2,
  CalendarDays,
  Euro,
  FileText,
  Pencil,
  ScrollText,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Upload,
  User,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { isRevisionEligible } from '@/lib/irl'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getDepositReturnedAmount, getDepositStatus, getDepositStatusMeta } from './depositUtils'
import { STATUS_CONFIG, statusLabel, typeLabel } from './leasePageUtils'

interface LeaseRowProps {
  lease: Lease
  onEdit: () => void
  onDelete: () => void
  onOpenContract: () => void
  onImportContract: () => void
  onManageDeposit: () => void
  onManageCharges: () => void
  onRevise: () => void
}

export default function LeaseRow({
  lease,
  onEdit,
  onDelete,
  onOpenContract,
  onImportContract,
  onManageDeposit,
  onManageCharges,
  onRevise,
}: LeaseRowProps) {
  const { t } = useTranslation()
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
  const depositMeta = getDepositStatusMeta(depositStatus, t)
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
              <Badge variant="muted">{typeLabel(lease.type, t)}</Badge>
              <Badge variant={status.variant as 'success' | 'danger' | 'muted'}>
                {statusLabel(lease.status, t)}
              </Badge>
              {lease.irl_reference_quarter && (
                <span className="text-[10px] text-textMuted">IRL : {lease.irl_reference_quarter}</span>
              )}
            </div>

            <div className="flex flex-col gap-1 text-xs text-textMuted">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span>{t('leases.row.since', { date: formatDate(lease.start_date) })}</span>
              </div>
              {lease.end_date && (
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-0" />
                  <span>{t('leases.row.until', { date: formatDate(lease.end_date) })}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1 text-right">
              <div className="flex items-center justify-end gap-1 text-sm font-semibold text-textPrimary">
                <Euro className="h-3.5 w-3.5 text-primary" />
                {t('leases.row.perMonth', { amount: formatCurrency(lease.rent_amount) })}
              </div>
              {lease.charges_amount > 0 && (
                <p className="text-xs text-textMuted">{t('leases.row.charges', { amount: formatCurrency(lease.charges_amount) })}</p>
              )}
              {lease.deposit_amount > 0 && (
                <div className="flex items-center justify-end gap-2">
                  <p className="text-xs text-textMuted">{t('leases.row.deposit', { amount: formatCurrency(lease.deposit_amount) })}</p>
                  <Badge variant={depositMeta.variant} className="text-[10px]">
                    {depositMeta.label}
                  </Badge>
                </div>
              )}
              {lease.deposit_amount > 0 && depositStatus !== 'awaiting' && (
                <p className="text-xs text-textMuted">
                  {depositStatus === 'held'
                    ? t('leases.row.depositCollected', { date: formatDate(lease.deposit_received_date!) })
                    : t('leases.row.depositToReturn', { amount: formatCurrency(returnedAmount) })}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={onImportContract}
              title={t('leases.row.importContract')}
              className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
            {lease.type === 'meuble' && (
              <button
                type="button"
                onClick={onOpenContract}
                title={t('leases.row.openContract')}
                className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <FileText className="h-3.5 w-3.5" />
              </button>
            )}
            {lease.charges_amount > 0 && (
              <button
                type="button"
                onClick={onManageCharges}
                title={t('leases.row.manageCharges')}
                className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-warning/10 hover:text-warning"
              >
                <ScrollText className="h-3.5 w-3.5" />
              </button>
            )}
            {lease.deposit_amount > 0 && (
              <button
                type="button"
                onClick={onManageDeposit}
                title={t('leases.row.manageDeposit')}
                className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
              </button>
            )}
            {canRevise && (
              <button
                type="button"
                onClick={onRevise}
                title={t('leases.row.reviseRent')}
                className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <TrendingUp className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-surfaceHigh hover:text-textPrimary"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
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
