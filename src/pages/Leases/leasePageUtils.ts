import { Ban, Clock, ShieldCheck } from 'lucide-react'
import type { TFunction } from 'i18next'

export const LEASE_TYPES = [
  { value: 'vide', label: 'Vide', labelKey: 'leases.typeVide', description: 'Duree min. 3 ans', descriptionKey: 'leases.typeVideDesc' },
  { value: 'meuble', label: 'Meuble', labelKey: 'leases.typeMeuble', description: 'Duree min. 1 an', descriptionKey: 'leases.typeMeubleDesc' },
  { value: 'mobilite', label: 'Mobilite', labelKey: 'leases.typeMobilite', description: '1 a 10 mois', descriptionKey: 'leases.typeMobiliteDesc' },
] as const

export const STATUS_CONFIG = {
  active: { label: 'En cours', labelKey: 'leases.statusActive', variant: 'success', icon: ShieldCheck },
  ended: { label: 'Termine', labelKey: 'leases.statusEnded', variant: 'muted', icon: Clock },
  terminated: { label: 'Resilie', labelKey: 'leases.statusTerminated', variant: 'danger', icon: Ban },
} as const

export function typeLabel(type: string, t?: TFunction) {
  const leaseType = LEASE_TYPES.find((entry) => entry.value === type)
  if (!leaseType) return type
  return t ? t(leaseType.labelKey) : leaseType.label
}

export function statusLabel(status: keyof typeof STATUS_CONFIG, t?: TFunction) {
  const meta = STATUS_CONFIG[status]
  return t ? t(meta.labelKey) : meta.label
}

export const emptyLeaseForm: LeaseInput = {
  property_id: 0,
  tenant_id: 0,
  owner_profile_id: null,
  type: 'vide',
  start_date: '',
  end_date: null,
  rent_amount: 0,
  charges_amount: 0,
  deposit_amount: 0,
  deposit_received_date: null,
  deposit_refund_date: null,
  deposit_retained_amount: 0,
  deposit_notes: null,
  contract_details: null,
  status: 'active',
}
