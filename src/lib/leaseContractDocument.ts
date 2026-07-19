import {
  createDefaultLeaseContractDetails,
  normalizeLeaseContractDetails,
  type LeaseContractDetails,
} from '@/shared/leaseContract'

export const HABITAT_TYPE_OPTIONS = [
  { value: 'collectif', label: 'Immeuble collectif' },
  { value: 'individuel', label: 'Immeuble individuel' },
] as const

export const BUILDING_REGIME_OPTIONS = [
  { value: 'mono_propriete', label: 'Mono-propriete' },
  { value: 'copropriete', label: 'Copropriete' },
] as const

export const CONSTRUCTION_PERIOD_OPTIONS = [
  { value: 'avant_1949', label: 'Avant 1949' },
  { value: '1949_1974', label: 'De 1949 a 1974' },
  { value: '1975_1989', label: 'De 1975 a 1989' },
  { value: '1989_2005', label: 'De 1989 a 2005' },
  { value: 'depuis_2005', label: 'Depuis 2005' },
] as const

export const HEATING_MODE_OPTIONS = [
  { value: 'individuel', label: 'Individuel' },
  { value: 'collectif', label: 'Collectif' },
  { value: 'autre', label: 'Autre' },
] as const

export const HOT_WATER_MODE_OPTIONS = [
  { value: 'individuelle', label: 'Individuelle' },
  { value: 'collective', label: 'Collective' },
  { value: 'autre', label: 'Autre' },
] as const

export const DESTINATION_OPTIONS = [
  { value: 'habitation', label: 'Usage d habitation' },
  { value: 'mixte', label: 'Usage mixte professionnel et habitation' },
] as const

export const CHARGE_MODE_OPTIONS = [
  { value: 'provisions', label: 'Provisions sur charges avec regularisation annuelle' },
  { value: 'paiement_periodique_sans_provision', label: 'Paiement periodique des charges sans provision' },
  { value: 'forfait', label: 'Forfait de charges' },
] as const

export const PAYMENT_TIMING_OPTIONS = [
  { value: 'echoir', label: 'A echoir' },
  { value: 'terme_echu', label: 'A terme echu' },
] as const

export interface FurnishedLeaseContractPdfData {
  landlordName: string
  landlordAddress: string
  landlordCity: string
  landlordEmail: string | null
  landlordPhone: string | null
  landlordTypeLabel: string
  landlordFamilySci: boolean
  landlordSignature: string | null
  representedByMandataire: boolean
  mandataireName: string | null
  mandataireAddress: string | null
  mandataireActivity: string | null
  professionalCard: string | null
  guarantorName: string | null
  guarantorAddress: string | null
  tenantName: string
  tenantEmail: string | null
  secondTenantName: string | null
  secondTenantEmail: string | null
  propertyAddress: string
  propertyZip: string
  propertyCity: string
  unitDetails: string | null
  taxId: string | null
  habitatTypeLabel: string | null
  buildingRegimeLabel: string | null
  constructionPeriodLabel: string | null
  surfaceHabitable: number | null
  mainRoomCount: number | null
  otherPartsLabel: string | null
  housingEquipment: string | null
  sanitaryInstallations: string | null
  heatingModeLabel: string | null
  heatingDetails: string | null
  hotWaterModeLabel: string | null
  hotWaterDetails: string | null
  dpeClass: string | null
  energyExpenseEstimate: string | null
  destinationLabel: string
  privateAccessors: string | null
  commonAccessors: string | null
  ictAccess: string | null
  leaseStartDate: string
  durationMonths: number | null
  studentLease: boolean
  rentAmount: number
  chargesAmount: number
  depositAmount: number
  irlReferenceQuarter: string | null
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
  chargeRecoveryModeLabel: string | null
  chargeRevisionNote: string | null
  colocInsuranceEnabled: boolean
  colocInsuranceAnnualAmount: number | null
  paymentFrequency: string | null
  paymentTimingLabel: string | null
  paymentPeriodText: string | null
  paymentPlace: string | null
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
  annexes: Array<{ label: string; checked: boolean }>
  annexAdditional: string | null
  signingCity: string
  signingDate: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function calculateFirstPaymentTotal(details: LeaseContractDetails, lease: Lease): number {
  const insuranceMonthly = details.colocInsuranceEnabled && details.colocInsuranceAnnualAmount
    ? Number((details.colocInsuranceAnnualAmount / 12).toFixed(2))
    : 0

  return Number((lease.rent_amount + lease.charges_amount + insuranceMonthly).toFixed(2))
}

function labelFor<T extends string>(value: T | '', options: ReadonlyArray<{ value: T; label: string }>): string | null {
  return options.find((option) => option.value === value)?.label ?? null
}

export function prepareLeaseContractDetails(
  lease: Lease,
  profile: UserProfile | null,
): LeaseContractDetails {
  const base = lease.contract_details
    ? normalizeLeaseContractDetails(lease.contract_details)
    : {
        ...createDefaultLeaseContractDetails(),
        landlordType: profile?.legalType === 'personne_morale' ? 'personne_morale' : 'personne_physique',
        landlordFamilySci: profile?.familySci ?? false,
      }

  return {
    ...base,
    baseRent: base.baseRent ?? lease.rent_amount,
    firstPaymentTotal: base.firstPaymentTotal ?? calculateFirstPaymentTotal(base, lease),
    paymentPeriodText: base.paymentPeriodText ?? 'Avant le 5 de chaque mois',
    paymentPlace: base.paymentPlace ?? 'Virement bancaire',
    signingCity: base.signingCity ?? profile?.city ?? lease.property_city,
    signingDate: base.signingDate ?? today(),
  }
}

export function getFurnishedLeaseContractBlockingIssues(
  lease: Lease,
  details: LeaseContractDetails,
  profile: UserProfile | null,
): string[] {
  const issues: string[] = []

  if (!profile?.name?.trim()) issues.push('Renseignez le nom du bailleur dans le profil.')
  if (!profile?.address?.trim() || !profile?.city?.trim()) issues.push('Renseignez l adresse du bailleur dans le profil.')
  if (!lease.property_address?.trim() || !lease.property_zip?.trim() || !lease.property_city?.trim()) {
    issues.push('La fiche bien doit contenir une adresse complete.')
  }
  if (!lease.start_date) issues.push('Le bail doit avoir une date de debut.')
  if (lease.rent_amount <= 0) issues.push('Le bail doit avoir un loyer positif.')
  if (!resolveSurfaceHabitable(lease, details)) issues.push('Renseignez la surface habitable du logement.')
  if (!details.mainRoomCount) issues.push('Renseignez le nombre de pieces principales.')
  if (!details.durationMonths || details.durationMonths <= 0) issues.push('Renseignez la duree du contrat.')
  if (!details.paymentPeriodText?.trim()) issues.push('Precisez la date ou periode de paiement.')
  if (!details.signingCity?.trim() || !details.signingDate?.trim()) issues.push('Renseignez le lieu et la date de signature.')

  return issues
}

export function getFurnishedLeaseContractAdvisories(
  lease: Lease,
  details: LeaseContractDetails,
): string[] {
  const warnings: string[] = []
  if (!details.taxId?.trim()) warnings.push('Identifiant fiscal du logement non renseigne.')
  if (!details.habitatType) warnings.push('Type d habitat non precise.')
  if (!details.buildingRegime) warnings.push('Regime juridique de l immeuble non precise.')
  if (!details.constructionPeriod) warnings.push('Periode de construction non precisee.')
  if (!details.heatingMode) warnings.push('Mode de chauffage non precise.')
  if (!details.hotWaterMode) warnings.push('Mode de production d eau chaude non precise.')
  if (!details.dpeClass?.trim()) warnings.push('Classe DPE non renseignee.')
  if (lease.type !== 'meuble') warnings.push('Ce generateur cible le bail meublé.')
  return warnings
}

export function resolveSurfaceHabitable(lease: Lease, details: LeaseContractDetails): number | null {
  return details.surfaceHabitableOverride ?? lease.property_area_m2 ?? null
}

export function buildFurnishedLeaseContractPdfData(
  lease: Lease,
  profile: UserProfile | null,
  details: LeaseContractDetails,
): FurnishedLeaseContractPdfData {
  const normalized = normalizeLeaseContractDetails(details)
  const guarantorName = normalized.guarantorNameOverride ?? lease.tenant_guarantor_name ?? null
  const guarantorAddress = normalized.guarantorAddressOverride ?? lease.tenant_guarantor_address ?? null
  const firstPaymentTotal = normalized.firstPaymentTotal ?? calculateFirstPaymentTotal(normalized, lease)

  return {
    landlordName: profile?.name?.trim() || 'Proprietaire',
    landlordAddress: profile?.address?.trim() || '',
    landlordCity: profile?.city?.trim() || '',
    landlordEmail: normalized.landlordEmailOverride ?? profile?.email ?? null,
    landlordPhone: profile?.phone ?? null,
    landlordTypeLabel: normalized.landlordType === 'personne_morale' ? 'Personne morale' : 'Personne physique',
    landlordFamilySci: normalized.landlordFamilySci,
    landlordSignature: profile?.signatureImage ?? null,
    representedByMandataire: normalized.representedByMandataire,
    mandataireName: normalized.mandataireName,
    mandataireAddress: normalized.mandataireAddress,
    mandataireActivity: normalized.mandataireActivity,
    professionalCard: [normalized.professionalCardNumber, normalized.professionalCardLocation].filter(Boolean).join(' - ') || null,
    guarantorName,
    guarantorAddress,
    tenantName: [lease.tenant_first_name, lease.tenant_last_name].filter(Boolean).join(' '),
    tenantEmail: lease.tenant_email ?? null,
    secondTenantName: normalized.secondTenantName,
    secondTenantEmail: normalized.secondTenantEmail,
    propertyAddress: lease.property_address,
    propertyZip: lease.property_zip,
    propertyCity: lease.property_city,
    unitDetails: normalized.unitDetails,
    taxId: normalized.taxId,
    habitatTypeLabel: labelFor(normalized.habitatType, HABITAT_TYPE_OPTIONS),
    buildingRegimeLabel: labelFor(normalized.buildingRegime, BUILDING_REGIME_OPTIONS),
    constructionPeriodLabel: labelFor(normalized.constructionPeriod, CONSTRUCTION_PERIOD_OPTIONS),
    surfaceHabitable: resolveSurfaceHabitable(lease, normalized),
    mainRoomCount: normalized.mainRoomCount,
    otherPartsLabel: [...normalized.otherParts, normalized.otherPartsOther].filter(Boolean).join(', ') || null,
    housingEquipment: normalized.housingEquipment,
    sanitaryInstallations: normalized.sanitaryInstallations,
    heatingModeLabel: labelFor(normalized.heatingMode, HEATING_MODE_OPTIONS),
    heatingDetails: normalized.heatingDetails,
    hotWaterModeLabel: labelFor(normalized.hotWaterMode, HOT_WATER_MODE_OPTIONS),
    hotWaterDetails: normalized.hotWaterDetails,
    dpeClass: normalized.dpeClass,
    energyExpenseEstimate: normalized.energyExpenseEstimate,
    destinationLabel: labelFor(normalized.destination, DESTINATION_OPTIONS) ?? 'Usage d habitation',
    privateAccessors: normalized.privateAccessors,
    commonAccessors: normalized.commonAccessors,
    ictAccess: normalized.ictAccess,
    leaseStartDate: lease.start_date,
    durationMonths: normalized.studentLease ? 9 : normalized.durationMonths,
    studentLease: normalized.studentLease,
    rentAmount: lease.rent_amount,
    chargesAmount: lease.charges_amount,
    depositAmount: lease.deposit_amount,
    irlReferenceQuarter: lease.irl_reference_quarter,
    rentRelocationCap: normalized.rentRelocationCap,
    referenceRentApplies: normalized.referenceRentApplies,
    referenceRent: normalized.referenceRent,
    referenceRentMajored: normalized.referenceRentMajored,
    baseRent: normalized.baseRent ?? lease.rent_amount,
    rentComplement: normalized.rentComplement,
    rentComplementReason: normalized.rentComplementReason,
    previousTenantRent: normalized.previousTenantRent,
    previousTenantLastPaidOn: normalized.previousTenantLastPaidOn,
    previousTenantLastRevisionOn: normalized.previousTenantLastRevisionOn,
    chargeRecoveryModeLabel: labelFor(normalized.chargeRecoveryMode, CHARGE_MODE_OPTIONS),
    chargeRevisionNote: normalized.chargeRevisionNote,
    colocInsuranceEnabled: normalized.colocInsuranceEnabled,
    colocInsuranceAnnualAmount: normalized.colocInsuranceAnnualAmount,
    paymentFrequency: normalized.paymentFrequency,
    paymentTimingLabel: labelFor(normalized.paymentTiming, PAYMENT_TIMING_OPTIONS),
    paymentPeriodText: normalized.paymentPeriodText,
    paymentPlace: normalized.paymentPlace,
    firstPaymentTotal,
    reevaluatedRentAmount: normalized.reevaluatedRentAmount,
    reevaluatedRentMode: normalized.reevaluatedRentMode,
    worksCompleted: normalized.worksCompleted,
    worksRentIncrease: normalized.worksRentIncrease,
    tenantWorksRentDecrease: normalized.tenantWorksRentDecrease,
    solidarityClauseEnabled: normalized.solidarityClauseEnabled,
    resolutoryClauseEnabled: normalized.resolutoryClauseEnabled,
    agencyFeesEnabled: normalized.agencyFeesEnabled,
    agencyFeeVisitFileLeaseTenant: normalized.agencyFeeVisitFileLeaseTenant,
    agencyFeeInventoryTenant: normalized.agencyFeeInventoryTenant,
    agencyFeeOtherTenant: normalized.agencyFeeOtherTenant,
    agencyFeeVisitFileLeaseLandlord: normalized.agencyFeeVisitFileLeaseLandlord,
    agencyFeeInventoryLandlord: normalized.agencyFeeInventoryLandlord,
    agencyFeeOtherLandlord: normalized.agencyFeeOtherLandlord,
    specialConditions: normalized.specialConditions,
    annexes: [
      { label: 'Extrait du reglement de copropriete', checked: normalized.annexCoproExcerpt },
      { label: 'Dossier de diagnostic technique', checked: normalized.annexDiagnostics },
      { label: 'Notice d information locative', checked: normalized.annexInformationNotice },
      { label: 'Etat des lieux, inventaire et mobilier', checked: normalized.annexInventory },
      { label: 'Autorisation prealable de mise en location', checked: normalized.annexPriorAuthorization },
      { label: 'References de loyers comparables', checked: normalized.annexReferenceRents },
    ],
    annexAdditional: normalized.annexAdditional,
    signingCity: normalized.signingCity ?? profile?.city ?? lease.property_city,
    signingDate: normalized.signingDate ?? today(),
  }
}
