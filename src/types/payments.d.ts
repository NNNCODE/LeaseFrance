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

interface BankImportEntry {
  fingerprint: string
  tx_date: string
  description: string
  amount: number
  payment_id: number | null
}
