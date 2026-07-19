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

interface Lease {
  id: number
  property_id: number
  tenant_id: number
  owner_profile_id: string | null
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
  property_owner_profile_id: string | null
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
  owner_profile_id?: string | null
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

interface IrlIndex {
  id: number
  year: number
  quarter: number
  value: number
  published_at: string | null
}
