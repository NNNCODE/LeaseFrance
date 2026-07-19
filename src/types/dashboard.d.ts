type SearchCategory = 'properties' | 'tenants' | 'leases' | 'payments' | 'reminders' | 'inspections'
type SearchFilterKey = 'all' | SearchCategory

interface SearchResult {
  id: string
  category: SearchCategory
  title: string
  subtitle: string
  route: string
  badge?: string
  badgeColor?: string
}

interface DashboardRevenuePoint {
  month: string
  revenus: number
}

interface DashboardExpiringLease extends Lease {
  days_until_end: number
}

interface DashboardTenantDossier extends Tenant {
  completed_dossier_count: number
  attachment_count: number
}

interface DashboardPendingReminder extends ManualReminder {
  days_until_due: number
}

interface DashboardSnapshot {
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
  recentPayments: Payment[]
  latePaymentsPreview: Payment[]
  expiringLeasesCount: number
  expiringLeasesPreview: DashboardExpiringLease[]
  depositsToReturnCount: number
  depositsToReturnPreview: Lease[]
  depositsAwaitingCount: number
  depositsAwaitingPreview: Lease[]
  incompleteDossiersCount: number
  incompleteDossiersPreview: DashboardTenantDossier[]
  pendingRemindersCount: number
  pendingRemindersPreview: DashboardPendingReminder[]
  irlRevisionLeasesCount: number
  irlRevisionLeasesPreview: Lease[]
  totalActions: number
}
