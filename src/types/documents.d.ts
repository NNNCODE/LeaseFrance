interface DocumentRecord {
  id: number
  lease_id: number
  type: string
  generated_at: string
  file_path: string | null
  status: 'generated' | 'sent' | 'archived'
  property_name: string
  property_city: string
  tenant_first_name: string
  tenant_last_name: string
}

interface DocumentGenerationAvailability {
  paymentCertificates: number
  rentRevisionNotices: number
  furnishedLeaseContracts: number
  depositReceipts: number
  depositSettlements: number
  canGenerateAny: boolean
}

interface DocumentGenerationSources {
  payments: Payment[]
  leases: Lease[]
  irlIndices: IrlIndex[]
}

interface Attachment {
  id: number
  entity_type: 'tenant' | 'lease' | 'inspection' | 'property'
  entity_id: number
  slot: string | null
  file_name: string
  mime_type: string
  file_size: number
  stored_name: string
  created_at: string
}
