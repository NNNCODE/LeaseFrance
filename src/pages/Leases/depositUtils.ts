import type { TFunction } from 'i18next'

export type DepositStatus = 'none' | 'awaiting' | 'held' | 'returned' | 'partial' | 'retained'

export function getDepositReturnedAmount(lease: Pick<Lease, 'deposit_amount' | 'deposit_refund_date' | 'deposit_retained_amount'>): number {
  if (!lease.deposit_refund_date) return 0
  return Math.max(0, lease.deposit_amount - lease.deposit_retained_amount)
}

export function getDepositStatus(lease: Pick<Lease, 'deposit_amount' | 'deposit_received_date' | 'deposit_refund_date' | 'deposit_retained_amount'>): DepositStatus {
  if (lease.deposit_amount <= 0) return 'none'
  if (!lease.deposit_received_date) return 'awaiting'
  if (!lease.deposit_refund_date) return 'held'
  if (lease.deposit_retained_amount <= 0) return 'returned'
  if (lease.deposit_retained_amount >= lease.deposit_amount) return 'retained'
  return 'partial'
}

export function getDepositStatusMeta(status: DepositStatus, t?: TFunction) {
  switch (status) {
    case 'awaiting':
      return { label: t ? t('leases.depositStatus.awaiting') : 'A encaisser', variant: 'warning' as const }
    case 'held':
      return { label: t ? t('leases.depositStatus.held') : 'Detenu', variant: 'default' as const }
    case 'returned':
      return { label: t ? t('leases.depositStatus.returned') : 'Restitue', variant: 'success' as const }
    case 'partial':
      return { label: t ? t('leases.depositStatus.partial') : 'Restitue partiellement', variant: 'warning' as const }
    case 'retained':
      return { label: t ? t('leases.depositStatus.retained') : 'Retenu', variant: 'danger' as const }
    default:
      return { label: t ? t('leases.depositStatus.none') : 'Aucun depot', variant: 'muted' as const }
  }
}
