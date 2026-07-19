import { Building2, Car, Home, Warehouse } from 'lucide-react'

export const PROPERTY_TYPES = [
  { value: 'appartement', labelKey: 'properties.typeAppartement', icon: Building2 },
  { value: 'maison',      labelKey: 'properties.typeMaison',      icon: Home      },
  { value: 'studio',      labelKey: 'properties.typeStudio',      icon: Building2 },
  { value: 'parking',     labelKey: 'properties.typeParking',     icon: Car       },
  { value: 'autre',       labelKey: 'properties.typeAutre',       icon: Warehouse },
] as const

export const emptyPropertyForm: PropertyInput = {
  name: '', address: '', city: '', zip: '', type: 'appartement', area_m2: null, owner_profile_id: null,
}

export const emptyDiagnosticsForm: PropertyDiagnosticsInput = {
  dpe_class: null,
  dpe_ges_class: null,
  dpe_performed_at: null,
  dpe_expires_at: null,
  dpe_ademe_number: null,
  dpe_energy_estimate: null,
  lead_performed_at: null,
  lead_expires_at: null,
  gas_performed_at: null,
  gas_expires_at: null,
  electricity_performed_at: null,
  electricity_expires_at: null,
  erp_performed_at: null,
  erp_expires_at: null,
  noise_performed_at: null,
  noise_expires_at: null,
  asbestos_available: false,
  notes: null,
}

export const DIAGNOSTIC_DATE_FIELDS = [
  { key: 'lead', performed: 'lead_performed_at', expires: 'lead_expires_at', labelKey: 'properties.diagnostics.fields.lead' },
  { key: 'gas', performed: 'gas_performed_at', expires: 'gas_expires_at', labelKey: 'properties.diagnostics.fields.gas' },
  { key: 'electricity', performed: 'electricity_performed_at', expires: 'electricity_expires_at', labelKey: 'properties.diagnostics.fields.electricity' },
  { key: 'erp', performed: 'erp_performed_at', expires: 'erp_expires_at', labelKey: 'properties.diagnostics.fields.erp' },
  { key: 'noise', performed: 'noise_performed_at', expires: 'noise_expires_at', labelKey: 'properties.diagnostics.fields.noise' },
] as const

export function normalizeDiagnosticsPayload(data: PropertyDiagnosticsInput): PropertyDiagnosticsInput {
  return {
    dpe_class: data.dpe_class ?? null,
    dpe_ges_class: data.dpe_ges_class ?? null,
    dpe_performed_at: data.dpe_performed_at ?? null,
    dpe_expires_at: data.dpe_expires_at ?? null,
    dpe_ademe_number: data.dpe_ademe_number?.trim() || null,
    dpe_energy_estimate: data.dpe_energy_estimate?.trim() || null,
    lead_performed_at: data.lead_performed_at ?? null,
    lead_expires_at: data.lead_expires_at ?? null,
    gas_performed_at: data.gas_performed_at ?? null,
    gas_expires_at: data.gas_expires_at ?? null,
    electricity_performed_at: data.electricity_performed_at ?? null,
    electricity_expires_at: data.electricity_expires_at ?? null,
    erp_performed_at: data.erp_performed_at ?? null,
    erp_expires_at: data.erp_expires_at ?? null,
    noise_performed_at: data.noise_performed_at ?? null,
    noise_expires_at: data.noise_expires_at ?? null,
    asbestos_available: Boolean(data.asbestos_available),
    notes: data.notes?.trim() || null,
  }
}
