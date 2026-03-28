import { Ban, Clock, ShieldCheck } from 'lucide-react'

export const LEASE_TYPES = [
  { value: 'vide', label: 'Vide', description: 'Duree min. 3 ans' },
  { value: 'meuble', label: 'Meuble', description: 'Duree min. 1 an' },
  { value: 'mobilite', label: 'Mobilite', description: '1 a 10 mois' },
] as const

export const STATUS_CONFIG = {
  active: { label: 'En cours', variant: 'success', icon: ShieldCheck },
  ended: { label: 'Termine', variant: 'muted', icon: Clock },
  terminated: { label: 'Resilie', variant: 'danger', icon: Ban },
} as const

export function typeLabel(type: string) {
  return LEASE_TYPES.find((leaseType) => leaseType.value === type)?.label ?? type
}

export const emptyLeaseForm: LeaseInput = {
  property_id: 0,
  tenant_id: 0,
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
