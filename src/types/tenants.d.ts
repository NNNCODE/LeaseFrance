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
