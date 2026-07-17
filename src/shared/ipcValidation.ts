import { z } from 'zod'
import type { BaillioInvokeChannels } from './ipc'
import { normalizeLeaseContractDetails } from './leaseContract'

const nonEmptyText = z.string().trim().min(1)
const optionalText = z.string().optional()
const optionalNullableText = z.string().nullable().optional()
const positiveInt = z.number().int().positive()
const nonNegativeInt = z.number().int().nonnegative()
const finiteNumber = z.number().finite()
const nonNegativeNumber = z.number().finite().min(0)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const versionToken = z.string().trim().min(1)
const uint8Array = z.instanceof(Uint8Array).refine((value) => value.byteLength > 0, 'Expected a non-empty binary payload.')

const propertyType = z.enum(['appartement', 'maison', 'studio', 'parking', 'autre'])
const dpeClass = z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
const leaseType = z.enum(['vide', 'meuble', 'mobilite'])
const leaseStatus = z.enum(['active', 'ended', 'terminated'])
const paymentMethod = z.enum(['virement', 'cheque', 'especes', 'prelevement'])
const paymentStatus = z.enum(['pending', 'paid', 'late'])
const paymentReminderStage = z.enum(['relance_amiable', 'mise_en_demeure', 'proposition_echeancier'])
const inspectionKind = z.enum(['entry', 'exit'])
const manualReminderCategory = z.enum(['insurance', 'diagnostic', 'tax', 'custom'])
const manualReminderStatus = z.enum(['pending', 'done'])
const documentStatus = z.enum(['generated', 'sent', 'archived'])
const searchFilterKey = z.enum(['all', 'properties', 'tenants', 'leases', 'payments', 'reminders', 'inspections'])
const fiscalExpenseCategory = z.enum(['taxe_fonciere', 'travaux', 'assurance_pno', 'frais_gestion', 'interets_emprunt', 'autre'])
const attachmentEntityType = z.enum(['tenant', 'lease', 'inspection', 'property'])
const backupPassword = z.string().min(1).optional()
const documentType = z.enum([
  'quittance',
  'recu',
  'avis_revision_loyer',
  'contrat_location',
  'contrat_location_meublee',
  'recu_depot_garantie',
  'solde_depot_garantie',
  'relance_amiable',
  'mise_en_demeure',
  'proposition_echeancier',
  'etat_des_lieux_entree',
  'etat_des_lieux_sortie',
  'regularisation_charges',
]).optional()

const propertyInput = z.object({
  name: nonEmptyText,
  address: nonEmptyText,
  city: nonEmptyText,
  zip: nonEmptyText,
  type: propertyType,
  area_m2: nonNegativeNumber.nullable().optional(),
  owner_profile_id: optionalNullableText,
})

const propertyDiagnosticsInput = z.object({
  dpe_class: dpeClass.nullable().optional(),
  dpe_ges_class: dpeClass.nullable().optional(),
  dpe_performed_at: isoDate.nullable().optional(),
  dpe_expires_at: isoDate.nullable().optional(),
  dpe_ademe_number: optionalNullableText,
  dpe_energy_estimate: optionalNullableText,
  lead_performed_at: isoDate.nullable().optional(),
  lead_expires_at: isoDate.nullable().optional(),
  gas_performed_at: isoDate.nullable().optional(),
  gas_expires_at: isoDate.nullable().optional(),
  electricity_performed_at: isoDate.nullable().optional(),
  electricity_expires_at: isoDate.nullable().optional(),
  erp_performed_at: isoDate.nullable().optional(),
  erp_expires_at: isoDate.nullable().optional(),
  noise_performed_at: isoDate.nullable().optional(),
  noise_expires_at: isoDate.nullable().optional(),
  asbestos_available: z.boolean().optional(),
  notes: optionalNullableText,
})

const tenantInput = z.object({
  first_name: nonEmptyText,
  last_name: nonEmptyText,
  email: optionalNullableText,
  phone: optionalNullableText,
  guarantor_name: optionalNullableText,
  guarantor_email: optionalNullableText,
  guarantor_phone: optionalNullableText,
  guarantor_address: optionalNullableText,
  emergency_contact_name: optionalNullableText,
  emergency_contact_phone: optionalNullableText,
  emergency_contact_relation: optionalNullableText,
  dossier_id_document: z.boolean().optional(),
  dossier_income_proof: z.boolean().optional(),
  dossier_employment_proof: z.boolean().optional(),
  dossier_tax_notice: z.boolean().optional(),
  dossier_bank_details: z.boolean().optional(),
  dossier_notes: optionalNullableText,
})

const leaseContractDetails = z.object({}).passthrough().transform((value) => normalizeLeaseContractDetails(value))

const leaseInput = z.object({
  property_id: positiveInt,
  tenant_id: positiveInt,
  owner_profile_id: optionalNullableText,
  type: leaseType,
  start_date: isoDate,
  end_date: isoDate.nullable().optional(),
  rent_amount: nonNegativeNumber,
  charges_amount: nonNegativeNumber,
  deposit_amount: nonNegativeNumber,
  deposit_received_date: isoDate.nullable().optional(),
  deposit_refund_date: isoDate.nullable().optional(),
  deposit_retained_amount: nonNegativeNumber.optional(),
  deposit_notes: optionalNullableText,
  irl_reference_index: nonNegativeNumber.nullable().optional(),
  irl_reference_quarter: optionalNullableText,
  contract_details: leaseContractDetails.nullable().optional(),
  status: leaseStatus.optional(),
})

const paymentInput = z.object({
  lease_id: positiveInt,
  period_month: z.number().int().min(1).max(12),
  period_year: z.number().int().min(2000).max(2100),
  rent_amount: nonNegativeNumber,
  charges_amount: nonNegativeNumber,
  payment_date: isoDate.nullable().optional(),
  payment_method: paymentMethod.optional(),
  status: paymentStatus.optional(),
  notes: optionalNullableText,
})

const paymentReminderInput = z.object({
  payment_id: positiveInt,
  stage: paymentReminderStage,
  sent_at: isoDate,
  notes: optionalNullableText,
})

const inspectionRoomInput = z.object({
  area: nonEmptyText,
  condition: z.string(),
  notes: z.string(),
})

const inspectionInput = z.object({
  lease_id: positiveInt,
  kind: inspectionKind,
  inspection_date: isoDate,
  meter_readings: optionalNullableText,
  general_condition: optionalNullableText,
  notes: optionalNullableText,
  rooms: z.array(inspectionRoomInput),
})

const chargeReconciliationInput = z.object({
  lease_id: positiveInt,
  year: z.number().int().min(2000).max(2100),
  actual_charges: nonNegativeNumber,
  provisions_collected_override: nonNegativeNumber.nullable().optional(),
  notes: optionalNullableText,
})

const manualReminderInput = z.object({
  lease_id: positiveInt.nullable().optional(),
  title: nonEmptyText,
  category: manualReminderCategory,
  due_date: isoDate,
  notes: optionalNullableText,
  status: manualReminderStatus.optional(),
})

const fileFilterInput = z.object({
  name: nonEmptyText,
  extensions: z.array(z.string().regex(/^[a-z0-9]+$/i)).min(1),
})

const fiscalExpenseInput = z.object({
  property_id: positiveInt,
  year: z.number().int().min(2000).max(2100),
  category: fiscalExpenseCategory,
  label: nonEmptyText,
  amount: nonNegativeNumber,
  notes: optionalNullableText,
})

const bankImportEntry = z.object({
  fingerprint: nonEmptyText,
  tx_date: isoDate,
  description: nonEmptyText,
  amount: finiteNumber,
  payment_id: positiveInt.nullable(),
})

const backupSettingsPatch = z.object({
  autoEnabled: z.boolean().optional(),
  intervalHours: z.number().int().min(1).max(24 * 30).optional(),
  destinationFolder: z.string().optional(),
  maxBackups: z.number().int().min(1).max(50).optional(),
  encryptionPassword: z.string().nullable().optional(),
})

const ownerLegalType = z.enum(['personne_physique', 'personne_morale'])
const ownerProfileDraft = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  signatureImage: z.string().optional(),
  legalType: ownerLegalType.optional(),
  familySci: z.boolean().optional(),
})

const authUpdateProfileArgs = z.union([
  z.tuple([nonEmptyText, nonEmptyText]),
  z.tuple([nonEmptyText, nonEmptyText, optionalText]),
  z.tuple([nonEmptyText, nonEmptyText, optionalText, optionalText]),
  z.tuple([nonEmptyText, nonEmptyText, optionalText, optionalText, optionalText]),
  z.tuple([nonEmptyText, nonEmptyText, optionalText, optionalText, optionalText, optionalText]),
])

const documentSavePdfArgs = z.union([
  z.tuple([positiveInt, nonEmptyText, uint8Array]),
  z.tuple([positiveInt, nonEmptyText, uint8Array, documentType]),
])

const documentImportArgs = z.union([
  z.tuple([positiveInt]),
  z.tuple([positiveInt, documentType]),
])

const exportSaveFileArgs = z.union([
  z.tuple([nonEmptyText, uint8Array]),
  z.tuple([nonEmptyText, uint8Array, z.array(fileFilterInput)]),
])

const optionalPasswordArg = z.union([
  z.tuple([]),
  z.tuple([backupPassword.unwrap()]),
])

const restoreBackupArgs = z.union([
  z.tuple([nonEmptyText]),
  z.tuple([nonEmptyText, backupPassword.unwrap()]),
])

const invokeArgSchemas = {
  'auth:setup': z.tuple([z.string().min(8), nonEmptyText, nonEmptyText]),
  'auth:verify': z.tuple([nonEmptyText, nonEmptyText, z.boolean()]),
  'auth:change': z.tuple([nonEmptyText, z.string().min(8)]),
  'auth:updateProfile': authUpdateProfileArgs,
  'auth:delete': z.tuple([nonEmptyText]),
  'auth:verifyRecoveryKey': z.tuple([nonEmptyText]),
  'auth:resetWithRecoveryKey': z.tuple([nonEmptyText, z.string().min(8)]),
  'auth:regenerateRecoveryKey': z.tuple([nonEmptyText]),
  'owners:create': z.union([z.tuple([]), z.tuple([ownerProfileDraft.optional()])]),
  'owners:update': z.tuple([nonEmptyText, ownerProfileDraft]),
  'owners:setActive': z.tuple([nonEmptyText]),
  'owners:delete': z.tuple([nonEmptyText]),
  'properties:create': z.tuple([propertyInput]),
  'properties:update': z.tuple([positiveInt, propertyInput, versionToken]),
  'properties:delete': z.tuple([positiveInt]),
  'propertyDiagnostics:getByProperty': z.tuple([positiveInt]),
  'propertyDiagnostics:upsert': z.tuple([positiveInt, propertyDiagnosticsInput]),
  'tenants:create': z.tuple([tenantInput]),
  'tenants:update': z.tuple([positiveInt, tenantInput, versionToken]),
  'tenants:delete': z.tuple([positiveInt]),
  'leases:create': z.tuple([leaseInput]),
  'leases:update': z.tuple([positiveInt, leaseInput, versionToken]),
  'leases:updateContractDetails': z.tuple([positiveInt, leaseContractDetails.nullable(), versionToken]),
  'leases:delete': z.tuple([positiveInt]),
  'leases:deleteWithLinkedRecords': z.tuple([positiveInt]),
  'payments:getByLease': z.tuple([positiveInt]),
  'payments:create': z.tuple([paymentInput]),
  'payments:update': z.tuple([positiveInt, paymentInput.partial(), versionToken]),
  'payments:markPaid': z.tuple([positiveInt, isoDate, versionToken]),
  'payments:delete': z.tuple([positiveInt]),
  'paymentReminders:getByPayment': z.tuple([positiveInt]),
  'paymentReminders:create': z.tuple([paymentReminderInput]),
  'inspections:create': z.tuple([inspectionInput]),
  'inspections:update': z.tuple([positiveInt, inspectionInput]),
  'inspections:delete': z.tuple([positiveInt]),
  'chargeReconciliations:getByLease': z.tuple([positiveInt]),
  'chargeReconciliations:create': z.tuple([chargeReconciliationInput]),
  'chargeReconciliations:update': z.tuple([positiveInt, chargeReconciliationInput]),
  'chargeReconciliations:delete': z.tuple([positiveInt]),
  'manualReminders:create': z.tuple([manualReminderInput]),
  'manualReminders:update': z.tuple([positiveInt, manualReminderInput]),
  'manualReminders:delete': z.tuple([positiveInt]),
  'search:query': z.tuple([z.string(), searchFilterKey]),
  'documents:delete': z.tuple([positiveInt]),
  'documents:savePdf': documentSavePdfArgs,
  'documents:importForLease': documentImportArgs,
  'documents:updateStatus': z.tuple([positiveInt, documentStatus]),
  'documents:readFile': z.tuple([nonEmptyText]),
  'documents:openFile': z.tuple([nonEmptyText]),
  'documents:exportCopy': z.tuple([positiveInt]),
  'documents:showInFolder': z.tuple([positiveInt]),
  'exports:saveFile': exportSaveFileArgs,
  'fiscalExpenses:getByYear': z.tuple([z.number().int().min(2000).max(2100)]),
  'fiscalExpenses:create': z.tuple([fiscalExpenseInput]),
  'fiscalExpenses:update': z.tuple([positiveInt, fiscalExpenseInput]),
  'fiscalExpenses:delete': z.tuple([positiveInt]),
  'attachments:getByEntity': z.tuple([attachmentEntityType, positiveInt]),
  'attachments:upload': z.tuple([attachmentEntityType, positiveInt, z.string().trim().min(1).max(120).nullable()]),
  'attachments:read': z.tuple([positiveInt]),
  'attachments:open': z.tuple([positiveInt]),
  'attachments:delete': z.tuple([positiveInt]),
  'bankImports:findDuplicates': z.tuple([z.array(nonEmptyText)]),
  'bankImports:recordImported': z.tuple([z.array(bankImportEntry)]),
  'backup:create': optionalPasswordArg,
  'diagnostics:exportReport': z.tuple([]),
  'diagnostics:openLogsFolder': z.tuple([]),
  'license:getState': z.tuple([]),
  'license:activate': z.tuple([nonEmptyText, nonEmptyText]),
  'license:refresh': z.tuple([]),
  'updates:getState': z.tuple([]),
  'updates:check': z.tuple([]),
  'updates:download': z.tuple([]),
  'updates:install': z.tuple([]),
  'backup:updateSettings': z.tuple([backupSettingsPatch]),
  'backup:verify': optionalPasswordArg,
  'backup:preview': optionalPasswordArg,
  'backup:restoreFromPath': restoreBackupArgs,
  'irl:getByQuarter': z.tuple([z.number().int().min(2000).max(2100), z.number().int().min(1).max(4)]),
  'irl:getLatestForQuarter': z.tuple([z.number().int().min(1).max(4)]),
  'irl:upsert': z.tuple([z.number().int().min(2000).max(2100), z.number().int().min(1).max(4), nonNegativeNumber]),
  'irl:delete': z.tuple([positiveInt]),
} satisfies Partial<Record<keyof BaillioInvokeChannels, z.ZodTypeAny>>

function formatIssuePath(path: Array<string | number>): string {
  if (path.length === 0) return 'args'
  return path
    .map((segment, index) => (typeof segment === 'number' || index === 0 ? String(segment) : `.${segment}`))
    .join('')
}

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${formatIssuePath(issue.path)}: ${issue.message}`)
    .join('; ')
}

export function validateInvokeArgs<Channel extends keyof BaillioInvokeChannels>(
  channel: Channel,
  rawArgs: unknown[],
): BaillioInvokeChannels[Channel]['args'] {
  const schema = invokeArgSchemas[channel]
  if (!schema) {
    if (rawArgs.length === 0) return [] as BaillioInvokeChannels[Channel]['args']
    throw new Error(`Missing IPC runtime validation schema for "${channel}".`)
  }

  const parsed = schema.safeParse(rawArgs)
  if (!parsed.success) {
    throw new Error(`Invalid IPC payload for "${channel}": ${formatZodError(parsed.error)}`)
  }

  return parsed.data as BaillioInvokeChannels[Channel]['args']
}
