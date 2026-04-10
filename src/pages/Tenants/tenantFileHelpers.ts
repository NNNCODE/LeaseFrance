export const DOSSIER_ITEMS = [
  { key: 'dossier_id_document', labelKey: 'tenants.dossier.idDocument' },
  { key: 'dossier_income_proof', labelKey: 'tenants.dossier.incomeProof' },
  { key: 'dossier_employment_proof', labelKey: 'tenants.dossier.employmentProof' },
  { key: 'dossier_tax_notice', labelKey: 'tenants.dossier.taxNotice' },
  { key: 'dossier_bank_details', labelKey: 'tenants.dossier.bankDetails' },
] as const

export type DossierKey = (typeof DOSSIER_ITEMS)[number]['key']

type TenantDossierShape = Pick<
  Tenant,
  | 'guarantor_name'
  | 'guarantor_email'
  | 'guarantor_phone'
  | 'guarantor_address'
  | 'emergency_contact_name'
  | 'emergency_contact_phone'
  | 'emergency_contact_relation'
  | 'dossier_id_document'
  | 'dossier_income_proof'
  | 'dossier_employment_proof'
  | 'dossier_tax_notice'
  | 'dossier_bank_details'
  | 'dossier_notes'
>

export function hasGuarantor(tenant: Pick<TenantDossierShape, 'guarantor_name' | 'guarantor_email' | 'guarantor_phone' | 'guarantor_address'>): boolean {
  return Boolean(
    tenant.guarantor_name
    || tenant.guarantor_email
    || tenant.guarantor_phone
    || tenant.guarantor_address
  )
}

export function hasEmergencyContact(tenant: Pick<TenantDossierShape, 'emergency_contact_name' | 'emergency_contact_phone' | 'emergency_contact_relation'>): boolean {
  return Boolean(
    tenant.emergency_contact_name
    || tenant.emergency_contact_phone
    || tenant.emergency_contact_relation
  )
}

export function getCompletedDossierCount(tenant: Pick<TenantDossierShape, DossierKey>): number {
  return DOSSIER_ITEMS.reduce((count, item) => count + (tenant[item.key] ? 1 : 0), 0)
}

export function getMissingDossierItems(tenant: Pick<TenantDossierShape, DossierKey>) {
  return DOSSIER_ITEMS.filter((item) => !tenant[item.key])
}

export function getDossierStatusVariant(tenant: Pick<TenantDossierShape, DossierKey>) {
  const completed = getCompletedDossierCount(tenant)
  if (completed === DOSSIER_ITEMS.length) return 'success' as const
  if (completed === 0) return 'muted' as const
  return 'warning' as const
}

export function isDossierKey(value: string | null | undefined): value is DossierKey {
  return DOSSIER_ITEMS.some((item) => item.key === value)
}

export function buildTenantInputFromTenant(tenant: Tenant): TenantInput {
  return {
    first_name: tenant.first_name,
    last_name: tenant.last_name,
    email: tenant.email,
    phone: tenant.phone,
    guarantor_name: tenant.guarantor_name,
    guarantor_email: tenant.guarantor_email,
    guarantor_phone: tenant.guarantor_phone,
    guarantor_address: tenant.guarantor_address,
    emergency_contact_name: tenant.emergency_contact_name,
    emergency_contact_phone: tenant.emergency_contact_phone,
    emergency_contact_relation: tenant.emergency_contact_relation,
    dossier_id_document: tenant.dossier_id_document,
    dossier_income_proof: tenant.dossier_income_proof,
    dossier_employment_proof: tenant.dossier_employment_proof,
    dossier_tax_notice: tenant.dossier_tax_notice,
    dossier_bank_details: tenant.dossier_bank_details,
    dossier_notes: tenant.dossier_notes,
  }
}
