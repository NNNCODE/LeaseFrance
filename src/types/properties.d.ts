interface Property {
  id: number
  name: string
  address: string
  city: string
  zip: string
  type: string
  area_m2: number | null
  owner_profile_id: string | null
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
  owner_profile_id?: string | null
}

type DpeClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

interface PropertyDiagnostics {
  id: number
  property_id: number
  dpe_class: DpeClass | null
  dpe_ges_class: DpeClass | null
  dpe_performed_at: string | null
  dpe_expires_at: string | null
  dpe_ademe_number: string | null
  dpe_energy_estimate: string | null
  lead_performed_at: string | null
  lead_expires_at: string | null
  gas_performed_at: string | null
  gas_expires_at: string | null
  electricity_performed_at: string | null
  electricity_expires_at: string | null
  erp_performed_at: string | null
  erp_expires_at: string | null
  noise_performed_at: string | null
  noise_expires_at: string | null
  asbestos_available: boolean
  notes: string | null
  created_at: string
  updated_at: string
  property_name: string
  property_city: string
}

interface PropertyDiagnosticsInput {
  dpe_class?: DpeClass | null
  dpe_ges_class?: DpeClass | null
  dpe_performed_at?: string | null
  dpe_expires_at?: string | null
  dpe_ademe_number?: string | null
  dpe_energy_estimate?: string | null
  lead_performed_at?: string | null
  lead_expires_at?: string | null
  gas_performed_at?: string | null
  gas_expires_at?: string | null
  electricity_performed_at?: string | null
  electricity_expires_at?: string | null
  erp_performed_at?: string | null
  erp_expires_at?: string | null
  noise_performed_at?: string | null
  noise_expires_at?: string | null
  asbestos_available?: boolean
  notes?: string | null
}
