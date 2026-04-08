/// <reference types="vite/client" />

interface UserProfile {
  name: string
  email: string
  address: string
  city: string
  phone: string
  signatureImage: string
  createdAt: string
  legalType?: 'personne_physique' | 'personne_morale'
  familySci?: boolean
  updatedAt?: string
}

interface OwnerProfile extends UserProfile {
  id: string
  legalType: 'personne_physique' | 'personne_morale'
  familySci: boolean
  updatedAt: string
  isPrimary: boolean
}

interface OwnerProfileDraft {
  name?: string
  email?: string
  address?: string
  city?: string
  phone?: string
  signatureImage?: string
  legalType?: 'personne_physique' | 'personne_morale'
  familySci?: boolean
}

interface LeaseContractDetails {
  landlordType: 'personne_physique' | 'personne_morale'
  landlordFamilySci: boolean
  landlordEmailOverride: string | null
  representedByMandataire: boolean
  mandataireName: string | null
  mandataireAddress: string | null
  mandataireActivity: string | null
  professionalCardNumber: string | null
  professionalCardLocation: string | null
  guarantorNameOverride: string | null
  guarantorAddressOverride: string | null
  secondTenantName: string | null
  secondTenantEmail: string | null
  unitDetails: string | null
  taxId: string | null
  habitatType: 'collectif' | 'individuel' | ''
  buildingRegime: 'mono_propriete' | 'copropriete' | ''
  constructionPeriod: 'avant_1949' | '1949_1974' | '1975_1989' | '1989_2005' | 'depuis_2005' | ''
  surfaceHabitableOverride: number | null
  mainRoomCount: number | null
  otherParts: string[]
  otherPartsOther: string | null
  housingEquipment: string | null
  sanitaryInstallations: string | null
  heatingMode: 'individuel' | 'collectif' | 'autre' | ''
  heatingDetails: string | null
  hotWaterMode: 'individuelle' | 'collective' | 'autre' | ''
  hotWaterDetails: string | null
  dpeClass: string | null
  energyExpenseEstimate: string | null
  destination: 'habitation' | 'mixte'
  privateAccessors: string | null
  commonAccessors: string | null
  ictAccess: string | null
  studentLease: boolean
  durationMonths: number | null
  paymentFrequency: string | null
  paymentTiming: 'echoir' | 'terme_echu' | ''
  paymentPeriodText: string | null
  paymentPlace: string | null
  rentRelocationCap: boolean
  referenceRentApplies: boolean
  referenceRent: number | null
  referenceRentMajored: number | null
  baseRent: number | null
  rentComplement: number | null
  rentComplementReason: string | null
  previousTenantRent: number | null
  previousTenantLastPaidOn: string | null
  previousTenantLastRevisionOn: string | null
  chargeRecoveryMode: 'provisions' | 'paiement_periodique_sans_provision' | 'forfait' | ''
  chargeRevisionNote: string | null
  colocInsuranceEnabled: boolean
  colocInsuranceAnnualAmount: number | null
  firstPaymentTotal: number | null
  reevaluatedRentAmount: number | null
  reevaluatedRentMode: string | null
  worksCompleted: string | null
  worksRentIncrease: string | null
  tenantWorksRentDecrease: string | null
  solidarityClauseEnabled: boolean
  resolutoryClauseEnabled: boolean
  agencyFeesEnabled: boolean
  agencyFeeVisitFileLeaseTenant: string | null
  agencyFeeInventoryTenant: string | null
  agencyFeeOtherTenant: string | null
  agencyFeeVisitFileLeaseLandlord: string | null
  agencyFeeInventoryLandlord: string | null
  agencyFeeOtherLandlord: string | null
  specialConditions: string | null
  annexCoproExcerpt: boolean
  annexDiagnostics: boolean
  annexInformationNotice: boolean
  annexInventory: boolean
  annexPriorAuthorization: boolean
  annexReferenceRents: boolean
  annexAdditional: string | null
  signingCity: string | null
  signingDate: string | null
}

interface Property {
  id: number
  name: string
  address: string
  city: string
  zip: string
  type: string
  area_m2: number | null
  created_at: string
  updated_at: string
}

interface PropertyInput {
  name: string
  address: string
  city: string
  zip: string
  type: string
  area_m2?: number | null
}

interface Lease {
  id: number
  property_id: number
  tenant_id: number
  type: 'vide' | 'meuble' | 'mobilite'
  start_date: string
  end_date: string | null
  rent_amount: number
  charges_amount: number
  deposit_amount: number
  deposit_received_date: string | null
  deposit_refund_date: string | null
  deposit_retained_amount: number
  deposit_notes: string | null
  irl_reference_index: number | null
  irl_reference_quarter: string | null
  contract_details: LeaseContractDetails | null
  status: 'active' | 'ended' | 'terminated'
  created_at: string
  updated_at: string
  property_name: string
  property_address: string
  property_city: string
  property_zip: string
  property_area_m2: number | null
  tenant_first_name: string
  tenant_last_name: string
  tenant_email: string | null
  tenant_phone: string | null
  tenant_guarantor_name: string | null
  tenant_guarantor_address: string | null
  tenant_guarantor_email: string | null
  tenant_guarantor_phone: string | null
}

interface LeaseInput {
  property_id: number
  tenant_id: number
  type: string
  start_date: string
  end_date?: string | null
  rent_amount: number
  charges_amount: number
  deposit_amount: number
  deposit_received_date?: string | null
  deposit_refund_date?: string | null
  deposit_retained_amount?: number
  deposit_notes?: string | null
  irl_reference_index?: number | null
  irl_reference_quarter?: string | null
  contract_details?: LeaseContractDetails | null
  status?: string
}

interface Tenant {
  id: number
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  guarantor_name: string | null
  guarantor_email: string | null
  guarantor_phone: string | null
  guarantor_address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relation: string | null
  dossier_id_document: boolean
  dossier_income_proof: boolean
  dossier_employment_proof: boolean
  dossier_tax_notice: boolean
  dossier_bank_details: boolean
  dossier_notes: string | null
  created_at: string
  updated_at: string
  lease_id: number | null
  lease_type: string | null
  property_name: string | null
  property_city: string | null
  rent_amount: number | null
  charges_amount: number | null
  lease_start_date: string | null
  unpaid_count: number
}

interface TenantInput {
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  guarantor_name?: string | null
  guarantor_email?: string | null
  guarantor_phone?: string | null
  guarantor_address?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  emergency_contact_relation?: string | null
  dossier_id_document?: boolean
  dossier_income_proof?: boolean
  dossier_employment_proof?: boolean
  dossier_tax_notice?: boolean
  dossier_bank_details?: boolean
  dossier_notes?: string | null
}

interface Payment {
  id: number
  lease_id: number
  period_month: number
  period_year: number
  rent_amount: number
  charges_amount: number
  payment_date: string | null
  payment_method: string
  status: 'pending' | 'paid' | 'late'
  notes: string | null
  created_at: string
  updated_at: string
  property_name: string
  property_address: string
  property_city: string
  property_zip: string
  tenant_first_name: string
  tenant_last_name: string
  lease_rent_amount: number
  lease_charges_amount: number
}

interface PaymentInput {
  lease_id: number
  period_month: number
  period_year: number
  rent_amount: number
  charges_amount: number
  payment_date?: string | null
  payment_method?: string
  status?: string
  notes?: string | null
}

interface PaymentSummary {
  total_due: number
  total_paid: number
  total_late: number
}

interface AutoRentResult {
  created: number
  markedLate: number
}

interface PaymentReminder {
  id: number
  payment_id: number
  stage: 'relance_amiable' | 'mise_en_demeure' | 'proposition_echeancier'
  sent_at: string
  notes: string | null
  created_at: string
  lease_id: number
  property_name: string
  tenant_first_name: string
  tenant_last_name: string
  period_month: number
  period_year: number
}

interface PaymentReminderInput {
  payment_id: number
  stage: string
  sent_at: string
  notes?: string | null
}

interface InspectionRoom {
  area: string
  condition: string
  notes: string
}

interface Inspection {
  id: number
  lease_id: number
  kind: 'entry' | 'exit'
  inspection_date: string
  meter_readings: string | null
  general_condition: string | null
  notes: string | null
  rooms: InspectionRoom[]
  created_at: string
  property_name: string
  property_address: string
  property_city: string
  property_zip: string
  tenant_first_name: string
  tenant_last_name: string
  lease_start_date: string
  lease_end_date: string | null
}

interface InspectionInput {
  lease_id: number
  kind: 'entry' | 'exit'
  inspection_date: string
  meter_readings?: string | null
  general_condition?: string | null
  notes?: string | null
  rooms: InspectionRoom[]
}

interface ChargeReconciliation {
  id: number
  lease_id: number
  year: number
  actual_charges: number
  provisions_collected_override: number | null
  notes: string | null
  created_at: string
  property_name: string
  property_address: string
  property_city: string
  property_zip: string
  tenant_first_name: string
  tenant_last_name: string
  lease_start_date: string
  lease_end_date: string | null
  lease_charges_amount: number
}

interface ChargeReconciliationInput {
  lease_id: number
  year: number
  actual_charges: number
  provisions_collected_override?: number | null
  notes?: string | null
}

interface ManualReminder {
  id: number
  lease_id: number | null
  title: string
  category: 'insurance' | 'diagnostic' | 'tax' | 'custom'
  due_date: string
  notes: string | null
  status: 'pending' | 'done'
  created_at: string
  property_name: string | null
  tenant_first_name: string | null
  tenant_last_name: string | null
}

interface ManualReminderInput {
  lease_id?: number | null
  title: string
  category: string
  due_date: string
  notes?: string | null
  status?: string
}

interface DocumentRecord {
  id: number
  lease_id: number
  type: string
  generated_at: string
  file_path: string | null
  status: 'generated' | 'sent' | 'archived'
  property_name: string
  property_city: string
  tenant_first_name: string
  tenant_last_name: string
}

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

interface ReminderFeedItem {
  id: string
  source: 'derived' | 'manual'
  title: string
  category: string
  due_date: string
  notes: string | null
  lease_id: number | null
  property_name: string | null
  tenant_label: string | null
  status: 'pending' | 'done'
  derived_kind?: 'lease_end' | 'irl_revision'
}

interface ReminderFeedStats {
  overdue: number
  upcoming30: number
  manualPending: number
  completed: number
}

interface ReminderFeed {
  pendingItems: ReminderFeedItem[]
  completedManual: ReminderFeedItem[]
  manualReminders: ManualReminder[]
  stats: ReminderFeedStats
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

interface DocumentGenerationAvailability {
  paymentCertificates: number
  rentRevisionNotices: number
  furnishedLeaseContracts: number
  depositReceipts: number
  depositSettlements: number
  canGenerateAny: boolean
}

interface DocumentGenerationSources {
  payments: Payment[]
  leases: Lease[]
  irlIndices: IrlIndex[]
}

interface IrlIndex {
  id: number
  year: number
  quarter: number
  value: number
  published_at: string | null
}

interface FiscalExpense {
  id: number
  property_id: number
  year: number
  category: 'taxe_fonciere' | 'travaux' | 'assurance_pno' | 'frais_gestion' | 'interets_emprunt' | 'autre'
  label: string
  amount: number
  notes: string | null
  created_at: string
  property_name: string
  property_city: string
}

interface FiscalExpenseInput {
  property_id: number
  year: number
  category: string
  label: string
  amount: number
  notes?: string | null
}

interface Attachment {
  id: number
  entity_type: 'tenant' | 'lease' | 'inspection'
  entity_id: number
  slot: string | null
  file_name: string
  mime_type: string
  file_size: number
  stored_name: string
  created_at: string
}

interface BankImportEntry {
  fingerprint: string
  tx_date: string
  description: string
  amount: number
  payment_id: number | null
}

interface BackupSettings {
  autoEnabled: boolean
  intervalHours: number
  destinationFolder: string
  maxBackups: number
  encryptionPassword: string | null
  lastBackupAt: string | null
  lastBackupPath: string | null
  lastBackupSizeBytes: number | null
}

interface BackupVerifyResult {
  valid: boolean
  createdAt: string | null
  fileSize: number
  encrypted: boolean
  errors: string[]
}

interface BackupPreviewResult {
  filePath: string
  valid: boolean
  createdAt: string | null
  fileSize: number
  encrypted: boolean
  profile: { name: string; email: string } | null
  tables: Array<{ name: string; label: string; count: number }>
  errors: string[]
}

type LicenseStatus = 'disabled' | 'unlicensed' | 'checking' | 'activating' | 'active' | 'grace' | 'refreshing' | 'inactive' | 'expired'
type LicenseDisabledReason = 'not-configured' | null

interface LicenseState {
  enabled: boolean
  status: LicenseStatus
  accessGranted: boolean
  hasStoredToken: boolean
  billingEmail: string | null
  subscriptionStatus: string | null
  refreshAfterSeconds: number | null
  offlineGraceDays: number | null
  nextRefreshAt: string | null
  offlineGraceUntil: string | null
  currentPeriodEndsAt: string | null
  trialEndsAt: string | null
  lastValidatedAt: string | null
  lastRefreshAttemptAt: string | null
  lastErrorCode: string | null
  lastErrorMessage: string | null
  disabledReason: LicenseDisabledReason
  supportLogPath: string | null
  endpointBaseUrl: string | null
}

type AutoUpdateStatus = 'disabled' | 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'up_to_date' | 'error'
type AutoUpdateDisabledReason = 'not-configured' | 'unsupported-platform' | 'development' | null

interface AutoUpdateState {
  enabled: boolean
  status: AutoUpdateStatus
  currentVersion: string
  availableVersion: string | null
  releaseName: string | null
  releaseDate: string | null
  releaseNotes: string[]
  downloadPercent: number | null
  lastCheckedAt: string | null
  lastError: string | null
  feedUrl: string | null
  channel: string | null
  disabledReason: AutoUpdateDisabledReason
}

interface Window {
  api: import('./shared/ipc').RentFlowApi
}
