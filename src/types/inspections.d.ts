interface InspectionRoom {
  area: string
  condition: string
  notes: string
}

interface Inspection {
  id: number
  lease_id: number
  kind: 'entry' | 'exit'
  inspection_date: string
  meter_readings: string | null
  general_condition: string | null
  notes: string | null
  rooms: InspectionRoom[]
  created_at: string
  property_name: string
  property_address: string
  property_city: string
  property_zip: string
  tenant_first_name: string
  tenant_last_name: string
  lease_start_date: string
  lease_end_date: string | null
}

interface InspectionInput {
  lease_id: number
  kind: 'entry' | 'exit'
  inspection_date: string
  meter_readings?: string | null
  general_condition?: string | null
  notes?: string | null
  rooms: InspectionRoom[]
}
