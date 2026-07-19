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
