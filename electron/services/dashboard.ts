import * as attachmentsDb from '../db/queries/attachments'
import * as leasesDb from '../db/queries/leases'
import * as manualRemindersDb from '../db/queries/manualReminders'
import * as paymentsDb from '../db/queries/payments'
import * as propertiesDb from '../db/queries/properties'
import * as tenantsDb from '../db/queries/tenants'
import { isAnniversaryWithinDays, isRevisionEligible } from '../../src/lib/irl'

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']
const DOSSIER_KEYS = [
  'dossier_id_document',
  'dossier_income_proof',
  'dossier_employment_proof',
  'dossier_tax_notice',
  'dossier_bank_details',
] as const

type DashboardLease = leasesDb.Lease
type DashboardPayment = paymentsDb.Payment
type DashboardTenant = tenantsDb.Tenant
type DashboardReminder = manualRemindersDb.ManualReminder
type DashboardAttachment = attachmentsDb.Attachment

export interface DashboardRevenuePoint {
  month: string
  revenus: number
}

export interface DashboardExpiringLease extends DashboardLease {
  days_until_end: number
}

export interface DashboardTenantDossier extends DashboardTenant {
  completed_dossier_count: number
  attachment_count: number
}

export interface DashboardPendingReminder extends DashboardReminder {
  days_until_due: number
}

export interface DashboardSnapshot {
  counts: {
    properties: number
    tenants: number
    leases: number
    payments: number
  }
  monthRevenue: number
  monthPaymentsTotal: number
  monthPaymentsPaid: number
  lateAmount: number
  lateCount: number
  revenueData: DashboardRevenuePoint[]
  recentPayments: DashboardPayment[]
  latePaymentsPreview: DashboardPayment[]
  expiringLeasesCount: number
  expiringLeasesPreview: DashboardExpiringLease[]
  depositsToReturnCount: number
  depositsToReturnPreview: DashboardLease[]
  depositsAwaitingCount: number
  depositsAwaitingPreview: DashboardLease[]
  incompleteDossiersCount: number
  incompleteDossiersPreview: DashboardTenantDossier[]
  pendingRemindersCount: number
  pendingRemindersPreview: DashboardPendingReminder[]
  irlRevisionLeasesCount: number
  irlRevisionLeasesPreview: DashboardLease[]
  totalActions: number
}

function daysUntil(dateStr: string, now = new Date()): number {
  const target = new Date(dateStr)
  const current = new Date(now)
  current.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))
}

function getDepositStatus(
  lease: Pick<DashboardLease, 'deposit_amount' | 'deposit_received_date' | 'deposit_refund_date' | 'deposit_retained_amount'>,
): 'none' | 'awaiting' | 'held' | 'returned' | 'partial' | 'retained' {
  if (lease.deposit_amount <= 0) return 'none'
  if (!lease.deposit_received_date) return 'awaiting'
  if (!lease.deposit_refund_date) return 'held'
  if (lease.deposit_retained_amount <= 0) return 'returned'
  if (lease.deposit_retained_amount >= lease.deposit_amount) return 'retained'
  return 'partial'
}

function getCompletedDossierCount(tenant: DashboardTenant): number {
  return DOSSIER_KEYS.reduce((count, key) => count + (tenant[key] ? 1 : 0), 0)
}

function buildRevenueData(payments: DashboardPayment[], now = new Date()): DashboardRevenuePoint[] {
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const months: DashboardRevenuePoint[] = []

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(currentYear, currentMonth - 1 - offset, 1)
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    const revenus = payments
      .filter((payment) => payment.status === 'paid' && payment.period_month === month && payment.period_year === year)
      .reduce((sum, payment) => sum + payment.rent_amount + payment.charges_amount, 0)

    months.push({
      month: MONTHS_SHORT[month - 1],
      revenus,
    })
  }

  return months
}

export function getDashboardSnapshot(now = new Date()): DashboardSnapshot {
  const propertiesCount = propertiesDb.count()
  const tenantsCount = tenantsDb.count()
  const leasesCount = leasesDb.count()
  const payments = paymentsDb.getAll()
  const leases = leasesDb.getAll()
  const tenants = tenantsDb.getAll()
  const reminders = manualRemindersDb.getAll()
  const attachments = attachmentsDb.getAll()

  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const monthPayments = payments.filter(
    (payment) => payment.period_month === currentMonth && payment.period_year === currentYear,
  )
  const monthPaymentsPaid = monthPayments.filter((payment) => payment.status === 'paid')
  const monthRevenue = monthPaymentsPaid.reduce(
    (sum, payment) => sum + payment.rent_amount + payment.charges_amount,
    0,
  )

  const latePayments = payments.filter((payment) => payment.status === 'late')
  const lateAmount = latePayments.reduce((sum, payment) => sum + payment.rent_amount + payment.charges_amount, 0)

  const revenueData = buildRevenueData(payments, now)
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const irlRevisionLeases = leases.filter((lease) =>
    lease.status === 'active'
    && isRevisionEligible(lease.type, lease.start_date, lease.irl_reference_index, lease.irl_reference_quarter)
    && isAnniversaryWithinDays(lease.start_date, 60),
  )

  const expiringLeases = leases
    .filter((lease) => lease.status === 'active' && lease.end_date)
    .map((lease) => ({
      ...lease,
      days_until_end: daysUntil(lease.end_date!, now),
    }))
    .filter((lease) => lease.days_until_end >= -30 && lease.days_until_end <= 90)
    .sort((a, b) => a.days_until_end - b.days_until_end)

  const depositsToReturn = leases.filter((lease) => lease.status !== 'active' && getDepositStatus(lease) === 'held')
  const depositsAwaiting = leases.filter((lease) => lease.status === 'active' && getDepositStatus(lease) === 'awaiting')

  const activeLeaseTenantIds = new Set(
    leases.filter((lease) => lease.status === 'active').map((lease) => lease.tenant_id),
  )
  const tenantAttachmentCount = new Map<number, number>()
  for (const attachment of attachments) {
    if (attachment.entity_type === 'tenant') {
      tenantAttachmentCount.set(
        attachment.entity_id,
        (tenantAttachmentCount.get(attachment.entity_id) ?? 0) + 1,
      )
    }
  }

  const incompleteDossiers = tenants
    .filter((tenant) => activeLeaseTenantIds.has(tenant.id))
    .map((tenant) => ({
      ...tenant,
      completed_dossier_count: getCompletedDossierCount(tenant),
      attachment_count: tenantAttachmentCount.get(tenant.id) ?? 0,
    }))
    .filter((tenant) => tenant.completed_dossier_count < DOSSIER_KEYS.length)
    .sort((a, b) => a.completed_dossier_count - b.completed_dossier_count)

  const pendingReminders = reminders
    .filter((reminder) => reminder.status === 'pending')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .map((reminder) => ({
      ...reminder,
      days_until_due: daysUntil(reminder.due_date, now),
    }))

  const totalActions = latePayments.length
    + expiringLeases.length
    + depositsToReturn.length
    + depositsAwaiting.length
    + incompleteDossiers.length
    + pendingReminders.length
    + irlRevisionLeases.length

  return {
    counts: {
      properties: propertiesCount,
      tenants: tenantsCount,
      leases: leasesCount,
      payments: payments.length,
    },
    monthRevenue,
    monthPaymentsTotal: monthPayments.length,
    monthPaymentsPaid: monthPaymentsPaid.length,
    lateAmount,
    lateCount: latePayments.length,
    revenueData,
    recentPayments,
    latePaymentsPreview: latePayments.slice(0, 4),
    expiringLeasesCount: expiringLeases.length,
    expiringLeasesPreview: expiringLeases.slice(0, 4),
    depositsToReturnCount: depositsToReturn.length,
    depositsToReturnPreview: depositsToReturn.slice(0, 3),
    depositsAwaitingCount: depositsAwaiting.length,
    depositsAwaitingPreview: depositsAwaiting.slice(0, 3),
    incompleteDossiersCount: incompleteDossiers.length,
    incompleteDossiersPreview: incompleteDossiers.slice(0, 4),
    pendingRemindersCount: pendingReminders.length,
    pendingRemindersPreview: pendingReminders.slice(0, 4),
    irlRevisionLeasesCount: irlRevisionLeases.length,
    irlRevisionLeasesPreview: irlRevisionLeases.slice(0, 4),
    totalActions,
  }
}
