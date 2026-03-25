import { calculateRevision, formatQuarter, parseQuarter, type RevisionResult } from '@/lib/irl'

export const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
]

export type DocumentTemplateKind =
  | 'payment_certificate'
  | 'rent_revision_notice'
  | 'deposit_receipt'
  | 'deposit_settlement'

export interface RevisionTemplateContext {
  revision: RevisionResult
  latestIrl: IrlIndex
  effectiveDate: string
}

export function isFullPayment(payment: Payment): boolean {
  return (
    payment.rent_amount >= payment.lease_rent_amount
    && payment.charges_amount >= payment.lease_charges_amount
  )
}

export function canGenerateDepositReceipt(lease: Lease): boolean {
  return lease.deposit_amount > 0 && Boolean(lease.deposit_received_date)
}

export function canGenerateDepositSettlement(lease: Lease): boolean {
  return lease.deposit_amount > 0 && Boolean(lease.deposit_refund_date)
}

export function getDepositReturnedAmount(lease: Pick<Lease, 'deposit_amount' | 'deposit_refund_date' | 'deposit_retained_amount'>): number {
  if (!lease.deposit_refund_date) return 0
  return Math.max(0, lease.deposit_amount - lease.deposit_retained_amount)
}

export function getRevisionTemplateContext(lease: Lease, irlIndices: IrlIndex[]): RevisionTemplateContext | null {
  if (lease.status !== 'active') return null
  if (lease.type === 'mobilite') return null
  if (!lease.irl_reference_index || !lease.irl_reference_quarter) return null

  const parsed = parseQuarter(lease.irl_reference_quarter)
  if (!parsed) return null

  const latestIrl = irlIndices
    .filter((index) => index.quarter === parsed.quarter && index.year > parsed.year)
    .sort((a, b) => b.year - a.year)[0]

  if (!latestIrl) return null

  const revision = calculateRevision(
    lease.rent_amount,
    lease.irl_reference_index,
    latestIrl.value,
    lease.irl_reference_quarter,
    formatQuarter(latestIrl.year, latestIrl.quarter),
  )

  return {
    revision,
    latestIrl,
    effectiveDate: getAnniversaryIso(lease.start_date),
  }
}

function getAnniversaryIso(startDate: string, now = new Date()): string {
  const start = new Date(startDate)
  const anniversary = new Date(now.getFullYear(), start.getMonth(), start.getDate())
  return toIsoDate(anniversary)
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
