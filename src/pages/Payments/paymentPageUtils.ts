import i18n from '@/i18n'
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'

export const MONTHS = Array.from({ length: 12 }, (_, i) => `payments.month.${i + 1}`)

function translatedLabel(labelKey: string) {
  return i18n.t(labelKey) as string
}

export const METHODS = [
  {
    value: 'virement',
    labelKey: 'payments.method.virement',
    get label() { return translatedLabel('payments.method.virement') },
  },
  {
    value: 'cheque',
    labelKey: 'payments.method.cheque',
    get label() { return translatedLabel('payments.method.cheque') },
  },
  {
    value: 'especes',
    labelKey: 'payments.method.especes',
    get label() { return translatedLabel('payments.method.especes') },
  },
  {
    value: 'prelevement',
    labelKey: 'payments.method.prelevement',
    get label() { return translatedLabel('payments.method.prelevement') },
  },
]

export const STATUS_CONFIG = {
  paid: {
    labelKey: 'payments.status.paid',
    get label() { return translatedLabel('payments.status.paid') },
    variant: 'success',
    icon: CheckCircle2,
  },
  pending: {
    labelKey: 'payments.status.pending',
    get label() { return translatedLabel('payments.status.pending') },
    variant: 'warning',
    icon: Clock,
  },
  late: {
    labelKey: 'payments.status.late',
    get label() { return translatedLabel('payments.status.late') },
    variant: 'danger',
    icon: AlertCircle,
  },
} as const

export function monthLabelKey(month: number) {
  return `payments.month.${month}`
}

export function monthLabel(month: number, year?: number) {
  const monthText = translatedLabel(monthLabelKey(month))
  return year ? `${monthText} ${year}` : monthText
}

export function methodLabelKey(method: string) {
  return METHODS.find((entry) => entry.value === method)?.labelKey ?? method
}

export function methodLabel(method: string) {
  return translatedLabel(methodLabelKey(method))
}

export function today() {
  return new Date().toISOString().split('T')[0]
}

export function paymentVersionToken(payment: Payment) {
  return payment.updated_at ?? payment.created_at
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
