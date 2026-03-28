import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'

export const MONTHS = [
  'Janvier',
  'Fevrier',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Aout',
  'Septembre',
  'Octobre',
  'Novembre',
  'Decembre',
]

export const METHODS = [
  { value: 'virement', label: 'Virement bancaire' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'especes', label: 'Especes' },
  { value: 'prelevement', label: 'Prelevement automatique' },
]

export const STATUS_CONFIG = {
  paid: { label: 'Paye', variant: 'success', icon: CheckCircle2 },
  pending: { label: 'En attente', variant: 'warning', icon: Clock },
  late: { label: 'En retard', variant: 'danger', icon: AlertCircle },
} as const

export function monthLabel(month: number, year: number) {
  return `${MONTHS[month - 1]} ${year}`
}

export function methodLabel(method: string) {
  return METHODS.find((entry) => entry.value === method)?.label ?? method
}

export function today() {
  return new Date().toISOString().split('T')[0]
}

export function createEmptyPaymentForm(): PaymentInput {
  const currentDate = new Date()
  return {
    lease_id: 0,
    period_month: currentDate.getMonth() + 1,
    period_year: currentDate.getFullYear(),
    rent_amount: 0,
    charges_amount: 0,
    payment_date: null,
    payment_method: 'virement',
    status: 'pending',
    notes: null,
  }
}
