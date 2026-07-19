interface FiscalExpense {
  id: number
  property_id: number
  year: number
  category: 'taxe_fonciere' | 'travaux' | 'assurance_pno' | 'frais_gestion' | 'interets_emprunt' | 'autre'
  label: string
  amount: number
  notes: string | null
  created_at: string
  property_name: string
  property_city: string
}

interface FiscalExpenseInput {
  property_id: number
  year: number
  category: string
  label: string
  amount: number
  notes?: string | null
}
