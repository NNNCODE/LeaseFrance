export interface LeaseContractDetails {
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

export const OTHER_PART_OPTIONS = [
  'grenier',
  'comble',
  'terrasse',
  'balcon',
  'loggia',
  'jardin',
] as const

export function createDefaultLeaseContractDetails(): LeaseContractDetails {
  return {
    landlordType: 'personne_physique',
    landlordFamilySci: false,
    landlordEmailOverride: null,
    representedByMandataire: false,
    mandataireName: null,
    mandataireAddress: null,
    mandataireActivity: null,
    professionalCardNumber: null,
    professionalCardLocation: null,
    guarantorNameOverride: null,
    guarantorAddressOverride: null,
    secondTenantName: null,
    secondTenantEmail: null,
    unitDetails: null,
    taxId: null,
    habitatType: '',
    buildingRegime: '',
    constructionPeriod: '',
    surfaceHabitableOverride: null,
    mainRoomCount: null,
    otherParts: [],
    otherPartsOther: null,
    housingEquipment: null,
    sanitaryInstallations: null,
    heatingMode: '',
    heatingDetails: null,
    hotWaterMode: '',
    hotWaterDetails: null,
    dpeClass: null,
    energyExpenseEstimate: null,
    destination: 'habitation',
    privateAccessors: null,
    commonAccessors: null,
    ictAccess: null,
    studentLease: false,
    durationMonths: 12,
    paymentFrequency: 'mensuelle',
    paymentTiming: 'echoir',
    paymentPeriodText: null,
    paymentPlace: null,
    rentRelocationCap: false,
    referenceRentApplies: false,
    referenceRent: null,
    referenceRentMajored: null,
    baseRent: null,
    rentComplement: null,
    rentComplementReason: null,
    previousTenantRent: null,
    previousTenantLastPaidOn: null,
    previousTenantLastRevisionOn: null,
    chargeRecoveryMode: 'provisions',
    chargeRevisionNote: null,
    colocInsuranceEnabled: false,
    colocInsuranceAnnualAmount: null,
    firstPaymentTotal: null,
    reevaluatedRentAmount: null,
    reevaluatedRentMode: null,
    worksCompleted: null,
    worksRentIncrease: null,
    tenantWorksRentDecrease: null,
    solidarityClauseEnabled: false,
    resolutoryClauseEnabled: true,
    agencyFeesEnabled: false,
    agencyFeeVisitFileLeaseTenant: null,
    agencyFeeInventoryTenant: null,
    agencyFeeOtherTenant: null,
    agencyFeeVisitFileLeaseLandlord: null,
    agencyFeeInventoryLandlord: null,
    agencyFeeOtherLandlord: null,
    specialConditions: null,
    annexCoproExcerpt: false,
    annexDiagnostics: true,
    annexInformationNotice: true,
    annexInventory: true,
    annexPriorAuthorization: false,
    annexReferenceRents: false,
    annexAdditional: null,
    signingCity: null,
    signingDate: null,
  }
}

function coerceNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function coerceNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function coerceBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeLeaseContractDetails(input: unknown): LeaseContractDetails {
  const base = createDefaultLeaseContractDetails()
  if (!input || typeof input !== 'object') return base

  const candidate = input as Record<string, unknown>

  return {
    ...base,
    landlordType: candidate.landlordType === 'personne_morale' ? 'personne_morale' : 'personne_physique',
    landlordFamilySci: coerceBoolean(candidate.landlordFamilySci),
    landlordEmailOverride: coerceNullableString(candidate.landlordEmailOverride),
    representedByMandataire: coerceBoolean(candidate.representedByMandataire),
    mandataireName: coerceNullableString(candidate.mandataireName),
    mandataireAddress: coerceNullableString(candidate.mandataireAddress),
    mandataireActivity: coerceNullableString(candidate.mandataireActivity),
    professionalCardNumber: coerceNullableString(candidate.professionalCardNumber),
    professionalCardLocation: coerceNullableString(candidate.professionalCardLocation),
    guarantorNameOverride: coerceNullableString(candidate.guarantorNameOverride),
    guarantorAddressOverride: coerceNullableString(candidate.guarantorAddressOverride),
    secondTenantName: coerceNullableString(candidate.secondTenantName),
    secondTenantEmail: coerceNullableString(candidate.secondTenantEmail),
    unitDetails: coerceNullableString(candidate.unitDetails),
    taxId: coerceNullableString(candidate.taxId),
    habitatType: candidate.habitatType === 'collectif' || candidate.habitatType === 'individuel' ? candidate.habitatType : '',
    buildingRegime: candidate.buildingRegime === 'mono_propriete' || candidate.buildingRegime === 'copropriete' ? candidate.buildingRegime : '',
    constructionPeriod: (
      candidate.constructionPeriod === 'avant_1949'
      || candidate.constructionPeriod === '1949_1974'
      || candidate.constructionPeriod === '1975_1989'
      || candidate.constructionPeriod === '1989_2005'
      || candidate.constructionPeriod === 'depuis_2005'
    ) ? candidate.constructionPeriod : '',
    surfaceHabitableOverride: coerceNullableNumber(candidate.surfaceHabitableOverride),
    mainRoomCount: coerceNullableNumber(candidate.mainRoomCount),
    otherParts: Array.isArray(candidate.otherParts)
      ? candidate.otherParts.filter((entry): entry is string => typeof entry === 'string')
      : [],
    otherPartsOther: coerceNullableString(candidate.otherPartsOther),
    housingEquipment: coerceNullableString(candidate.housingEquipment),
    sanitaryInstallations: coerceNullableString(candidate.sanitaryInstallations),
    heatingMode: (
      candidate.heatingMode === 'individuel'
      || candidate.heatingMode === 'collectif'
      || candidate.heatingMode === 'autre'
    ) ? candidate.heatingMode : '',
    heatingDetails: coerceNullableString(candidate.heatingDetails),
    hotWaterMode: (
      candidate.hotWaterMode === 'individuelle'
      || candidate.hotWaterMode === 'collective'
      || candidate.hotWaterMode === 'autre'
    ) ? candidate.hotWaterMode : '',
    hotWaterDetails: coerceNullableString(candidate.hotWaterDetails),
    dpeClass: coerceNullableString(candidate.dpeClass),
    energyExpenseEstimate: coerceNullableString(candidate.energyExpenseEstimate),
    destination: candidate.destination === 'mixte' ? 'mixte' : 'habitation',
    privateAccessors: coerceNullableString(candidate.privateAccessors),
    commonAccessors: coerceNullableString(candidate.commonAccessors),
    ictAccess: coerceNullableString(candidate.ictAccess),
    studentLease: coerceBoolean(candidate.studentLease),
    durationMonths: coerceNullableNumber(candidate.durationMonths) ?? base.durationMonths,
    paymentFrequency: coerceNullableString(candidate.paymentFrequency) ?? base.paymentFrequency,
    paymentTiming: candidate.paymentTiming === 'terme_echu' ? 'terme_echu' : candidate.paymentTiming === 'echoir' ? 'echoir' : '',
    paymentPeriodText: coerceNullableString(candidate.paymentPeriodText),
    paymentPlace: coerceNullableString(candidate.paymentPlace),
    rentRelocationCap: coerceBoolean(candidate.rentRelocationCap),
    referenceRentApplies: coerceBoolean(candidate.referenceRentApplies),
    referenceRent: coerceNullableNumber(candidate.referenceRent),
    referenceRentMajored: coerceNullableNumber(candidate.referenceRentMajored),
    baseRent: coerceNullableNumber(candidate.baseRent),
    rentComplement: coerceNullableNumber(candidate.rentComplement),
    rentComplementReason: coerceNullableString(candidate.rentComplementReason),
    previousTenantRent: coerceNullableNumber(candidate.previousTenantRent),
    previousTenantLastPaidOn: coerceNullableString(candidate.previousTenantLastPaidOn),
    previousTenantLastRevisionOn: coerceNullableString(candidate.previousTenantLastRevisionOn),
    chargeRecoveryMode: (
      candidate.chargeRecoveryMode === 'provisions'
      || candidate.chargeRecoveryMode === 'paiement_periodique_sans_provision'
      || candidate.chargeRecoveryMode === 'forfait'
    ) ? candidate.chargeRecoveryMode : '',
    chargeRevisionNote: coerceNullableString(candidate.chargeRevisionNote),
    colocInsuranceEnabled: coerceBoolean(candidate.colocInsuranceEnabled),
    colocInsuranceAnnualAmount: coerceNullableNumber(candidate.colocInsuranceAnnualAmount),
    firstPaymentTotal: coerceNullableNumber(candidate.firstPaymentTotal),
    reevaluatedRentAmount: coerceNullableNumber(candidate.reevaluatedRentAmount),
    reevaluatedRentMode: coerceNullableString(candidate.reevaluatedRentMode),
    worksCompleted: coerceNullableString(candidate.worksCompleted),
    worksRentIncrease: coerceNullableString(candidate.worksRentIncrease),
    tenantWorksRentDecrease: coerceNullableString(candidate.tenantWorksRentDecrease),
    solidarityClauseEnabled: coerceBoolean(candidate.solidarityClauseEnabled),
    resolutoryClauseEnabled: typeof candidate.resolutoryClauseEnabled === 'boolean'
      ? candidate.resolutoryClauseEnabled
      : base.resolutoryClauseEnabled,
    agencyFeesEnabled: coerceBoolean(candidate.agencyFeesEnabled),
    agencyFeeVisitFileLeaseTenant: coerceNullableString(candidate.agencyFeeVisitFileLeaseTenant),
    agencyFeeInventoryTenant: coerceNullableString(candidate.agencyFeeInventoryTenant),
    agencyFeeOtherTenant: coerceNullableString(candidate.agencyFeeOtherTenant),
    agencyFeeVisitFileLeaseLandlord: coerceNullableString(candidate.agencyFeeVisitFileLeaseLandlord),
    agencyFeeInventoryLandlord: coerceNullableString(candidate.agencyFeeInventoryLandlord),
    agencyFeeOtherLandlord: coerceNullableString(candidate.agencyFeeOtherLandlord),
    specialConditions: coerceNullableString(candidate.specialConditions),
    annexCoproExcerpt: coerceBoolean(candidate.annexCoproExcerpt),
    annexDiagnostics: typeof candidate.annexDiagnostics === 'boolean' ? candidate.annexDiagnostics : base.annexDiagnostics,
    annexInformationNotice: typeof candidate.annexInformationNotice === 'boolean' ? candidate.annexInformationNotice : base.annexInformationNotice,
    annexInventory: typeof candidate.annexInventory === 'boolean' ? candidate.annexInventory : base.annexInventory,
    annexPriorAuthorization: coerceBoolean(candidate.annexPriorAuthorization),
    annexReferenceRents: coerceBoolean(candidate.annexReferenceRents),
    annexAdditional: coerceNullableString(candidate.annexAdditional),
    signingCity: coerceNullableString(candidate.signingCity),
    signingDate: coerceNullableString(candidate.signingDate),
  }
}

export function parseLeaseContractDetails(raw: string | null | undefined): LeaseContractDetails | null {
  if (!raw) return null
  try {
    return normalizeLeaseContractDetails(JSON.parse(raw))
  } catch {
    return null
  }
}

export function serializeLeaseContractDetails(details: LeaseContractDetails | null | undefined): string | null {
  if (!details) return null
  return JSON.stringify(normalizeLeaseContractDetails(details))
}
