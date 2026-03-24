/// <reference types="vite/client" />

interface UserProfile {
  name: string
  email: string
  address: string
  city: string
  phone: string
  signatureImage: string
  createdAt: string
}

interface Property {
  id: number
  name: string
  address: string
  city: string
  zip: string
  type: string
  area_m2: number | null
  created_at: string
}

interface PropertyInput {
  name: string
  address: string
  city: string
  zip: string
  type: string
  area_m2?: number | null
}

interface Lease {
  id: number
  property_id: number
  tenant_id: number
  type: 'vide' | 'meuble' | 'mobilite'
  start_date: string
  end_date: string | null
  rent_amount: number
  charges_amount: number
  deposit_amount: number
  irl_reference_index: number | null
  irl_reference_quarter: string | null
  status: 'active' | 'ended' | 'terminated'
  created_at: string
  property_name: string
  property_address: string
  property_city: string
  property_zip: string
  tenant_first_name: string
  tenant_last_name: string
}

interface LeaseInput {
  property_id: number
  tenant_id: number
  type: string
  start_date: string
  end_date?: string | null
  rent_amount: number
  charges_amount: number
  deposit_amount: number
  irl_reference_index?: number | null
  irl_reference_quarter?: string | null
  status?: string
}

interface Tenant {
  id: number
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  created_at: string
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
}

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

interface DocumentRecord {
  id: number
  lease_id: number
  type: string
  generated_at: string
  file_path: string | null
  property_name: string
  tenant_first_name: string
  tenant_last_name: string
}

interface IrlIndex {
  id: number
  year: number
  quarter: number
  value: number
  published_at: string | null
}

interface Window {
  api: {
    window: {
      minimize: () => void
      maximize: () => void
      close: () => void
    }
    auth: {
      hasPassword:   () => Promise<boolean>
      getProfile:    () => Promise<UserProfile | null>
      setup:         (pwd: string, name: string, email: string) => Promise<boolean>
      verify:        (pwd: string) => Promise<boolean>
      change:        (old: string, next: string) => Promise<boolean>
      updateProfile: (name: string, email: string, address?: string, city?: string, phone?: string, signatureImage?: string) => Promise<boolean>
      delete:        (pwd: string) => Promise<boolean>
    }
    properties: {
      getAll: () => Promise<Property[]>
      count:  () => Promise<number>
      create: (data: PropertyInput) => Promise<Property>
      update: (id: number, data: PropertyInput) => Promise<Property>
      delete: (id: number) => Promise<boolean>
    }
    tenants: {
      getAll: () => Promise<Tenant[]>
      count:  () => Promise<number>
      create: (data: TenantInput) => Promise<Tenant>
      update: (id: number, data: TenantInput) => Promise<Tenant>
      delete: (id: number) => Promise<boolean>
    }
    leases: {
      getAll: () => Promise<Lease[]>
      count:  () => Promise<number>
      create: (data: LeaseInput) => Promise<Lease>
      update: (id: number, data: LeaseInput) => Promise<Lease>
      delete: (id: number) => Promise<boolean>
    }
    payments: {
      getAll:     () => Promise<Payment[]>
      getByLease: (leaseId: number) => Promise<Payment[]>
      getSummary: () => Promise<PaymentSummary>
      create:     (data: PaymentInput) => Promise<Payment>
      update:     (id: number, data: Partial<PaymentInput>) => Promise<Payment>
      markPaid:   (id: number, date: string) => Promise<Payment>
      delete:     (id: number) => Promise<boolean>
    }
    documents: {
      getAll:   () => Promise<DocumentRecord[]>
      delete:   (id: number) => Promise<boolean>
      savePdf:  (leaseId: number, fileName: string, buffer: number[], docType?: string) => Promise<{ saved: boolean; path: string | null }>
      openFile: (filePath: string) => Promise<void>
    }
    irl: {
      getAll:              () => Promise<IrlIndex[]>
      getByQuarter:        (year: number, quarter: number) => Promise<IrlIndex | null>
      getLatestForQuarter: (quarter: number) => Promise<IrlIndex | null>
      upsert:              (year: number, quarter: number, value: number) => Promise<IrlIndex>
      delete:              (id: number) => Promise<boolean>
    }
  }
}
