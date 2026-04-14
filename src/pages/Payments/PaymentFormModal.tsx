import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ChevronDown, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DateInput from '@/components/ui/date-input'
import { Input } from '@/components/ui/input'
import {
  createEmptyPaymentForm,
  METHODS,
  MONTHS,
  STATUS_CONFIG,
  today,
} from './paymentPageUtils'

interface PaymentFormModalProps {
  initial: Payment | null
  leases: Lease[]
  payments: Payment[]
  onSave: (data: PaymentInput) => Promise<void>
  onClose: () => void
}

export default function PaymentFormModal({
  initial,
  leases,
  payments,
  onSave,
  onClose,
}: PaymentFormModalProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState<PaymentInput>(() => {
    if (initial) {
      return {
        lease_id: initial.lease_id,
        period_month: initial.period_month,
        period_year: initial.period_year,
        rent_amount: initial.rent_amount,
        charges_amount: initial.charges_amount,
        payment_date: initial.payment_date,
        payment_method: initial.payment_method,
        status: initial.status,
        notes: initial.notes,
      }
    }
    return createEmptyPaymentForm()
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function setField<K extends keyof PaymentInput>(field: K, value: PaymentInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function formatErrorMessage(err: unknown) {
    let message = err instanceof Error ? err.message : String(err)

    message = message.replace(/^Error invoking remote method '[^']+':\s*/i, '').trim()
    while (message.startsWith('Error: ')) {
      message = message.slice('Error: '.length).trim()
    }

    return message
  }

  useEffect(() => {
    if (!form.lease_id || initial) return
    const selectedLease = leases.find((lease) => lease.id === form.lease_id)
    if (selectedLease) {
      setForm((current) => ({
        ...current,
        rent_amount: selectedLease.rent_amount,
        charges_amount: selectedLease.charges_amount,
      }))
    }
  }, [form.lease_id, leases, initial])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (!form.lease_id) return setError(t('payments.form.errors.leaseRequired'))
    if (form.rent_amount <= 0) return setError(t('payments.form.errors.rentRequired'))

    const nextForm =
      form.status === 'paid' && !form.payment_date
        ? { ...form, payment_date: today() }
        : form

    const duplicatePayment = payments.find((payment) => (
      payment.lease_id === nextForm.lease_id
      && payment.period_month === nextForm.period_month
      && payment.period_year === nextForm.period_year
      && payment.id !== initial?.id
    ))

    if (duplicatePayment) {
      setError(t('payments.form.errors.duplicatePeriod'))
      return
    }

    if (nextForm !== form) {
      setForm(nextForm)
    }

    setSaving(true)
    try {
      await onSave(nextForm)
    } catch (err) {
      setError(t('payments.form.errors.save', { error: formatErrorMessage(err) }))
      setSaving(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, index) => currentYear - 2 + index)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-textPrimary">
            {initial ? t('payments.editTitle') : t('payments.addTitle')}
          </h2>
          <button onClick={onClose} className="text-textMuted transition-colors hover:text-textPrimary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto p-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{t('payments.lease')}</label>
            <div className="relative">
              <select
                aria-label={t('payments.lease')}
                value={form.lease_id}
                onChange={(event) => setField('lease_id', Number(event.target.value))}
                disabled={Boolean(initial)}
                className="w-full appearance-none rounded-lg border border-border bg-surfaceHigh px-3 py-2 pr-8 text-sm text-textPrimary transition-colors focus:border-primary focus:outline-none disabled:opacity-50"
              >
                <option value={0} disabled>
                  {t('payments.form.leasePlaceholder')}
                </option>
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {lease.property_name} | {lease.tenant_first_name} {lease.tenant_last_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('payments.form.month')}</label>
              <div className="relative">
                <select
                  aria-label={t('payments.form.month')}
                  value={form.period_month}
                  onChange={(event) => setField('period_month', Number(event.target.value))}
                  className="w-full appearance-none rounded-lg border border-border bg-surfaceHigh px-3 py-2 pr-8 text-sm text-textPrimary transition-colors focus:border-primary focus:outline-none"
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index + 1}>
                      {t(month)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('payments.form.year')}</label>
              <div className="relative">
                <select
                  aria-label={t('payments.form.year')}
                  value={form.period_year}
                  onChange={(event) => setField('period_year', Number(event.target.value))}
                  className="w-full appearance-none rounded-lg border border-border bg-surfaceHigh px-3 py-2 pr-8 text-sm text-textPrimary transition-colors focus:border-primary focus:outline-none"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('payments.form.rentExclCharges')}</label>
              <Input
                aria-label={t('payments.form.rentExclCharges')}
                type="number"
                min={0}
                step={0.01}
                value={form.rent_amount || ''}
                onChange={(event) => setField('rent_amount', parseFloat(event.target.value) || 0)}
                placeholder="800"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('payments.form.charges')}</label>
              <Input
                aria-label={t('payments.form.charges')}
                type="number"
                min={0}
                step={0.01}
                value={form.charges_amount || ''}
                onChange={(event) => setField('charges_amount', parseFloat(event.target.value) || 0)}
                placeholder="80"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{t('payments.statusLabel')}</label>
            <div className="grid grid-cols-3 gap-2">
              {(['pending', 'paid', 'late'] as const).map((statusKey) => {
                const status = STATUS_CONFIG[statusKey]
                const StatusIcon = status.icon
                return (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => setField('status', statusKey)}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-left transition-colors ${
                      form.status === statusKey
                        ? statusKey === 'paid'
                          ? 'border-success bg-success/10'
                          : statusKey === 'late'
                            ? 'border-danger bg-danger/10'
                            : 'border-warning bg-warning/10'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <StatusIcon
                      className={`h-3.5 w-3.5 shrink-0 ${
                        form.status === statusKey
                          ? statusKey === 'paid'
                            ? 'text-success'
                            : statusKey === 'late'
                              ? 'text-danger'
                              : 'text-warning'
                          : 'text-textMuted'
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        form.status === statusKey ? 'text-textPrimary' : 'text-textMuted'
                      }`}
                    >
                      {status.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">
                {t('payments.paymentDate')} {form.status !== 'paid' && <span className="opacity-50">({t('common.optional')})</span>}
              </label>
              <DateInput
                aria-label={t('payments.paymentDate')}
                value={form.payment_date ?? ''}
                onChange={(value) => setField('payment_date', value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('payments.paymentMethod')}</label>
              <div className="relative">
                <select
                  aria-label={t('payments.paymentMethod')}
                  value={form.payment_method ?? 'virement'}
                  onChange={(event) => setField('payment_method', event.target.value)}
                  className="w-full appearance-none rounded-lg border border-border bg-surfaceHigh px-3 py-2 pr-8 text-sm text-textPrimary transition-colors focus:border-primary focus:outline-none"
                >
                  {METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">
              {t('payments.notes')} ({t('common.optional')})
            </label>
            <textarea
              aria-label={t('payments.notes')}
              value={form.notes ?? ''}
              onChange={(event) => setField('notes', event.target.value || null)}
              placeholder={t('payments.form.notesPlaceholder')}
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary transition-colors placeholder:text-textMuted focus:border-primary focus:outline-none"
            />
          </div>

          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              <Save className="h-3.5 w-3.5" />
              {saving ? t('common.saving') : initial ? t('payments.form.submitEdit') : t('payments.form.submitCreate')}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
