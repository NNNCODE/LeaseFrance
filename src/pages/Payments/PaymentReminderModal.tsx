import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { pdf } from '@react-pdf/renderer'
import {
  AlertCircle,
  CalendarDays,
  Info,
  ScrollText,
  Send,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import DateInput from '@/components/ui/date-input'
import { ReminderLetterPDF, type ReminderLetterData } from '@/lib/pdf/reminder'
import { formatCurrency, formatDate } from '@/lib/utils'
import { monthLabel, paymentVersionToken } from './paymentPageUtils'

type ReminderStage = 'relance_amiable' | 'mise_en_demeure' | 'proposition_echeancier'

const STAGE_META: Record<ReminderStage, {
  labelKey: string
  descriptionKey: string
  badge: 'default' | 'warning' | 'danger' | 'success'
}> = {
  relance_amiable: {
    labelKey: 'documents.type.relance_amiable',
    descriptionKey: 'payments.reminderModal.stage.relance_amiable.description',
    badge: 'warning',
  },
  mise_en_demeure: {
    labelKey: 'documents.type.mise_en_demeure',
    descriptionKey: 'payments.reminderModal.stage.mise_en_demeure.description',
    badge: 'danger',
  },
  proposition_echeancier: {
    labelKey: 'documents.type.proposition_echeancier',
    descriptionKey: 'payments.reminderModal.stage.proposition_echeancier.description',
    badge: 'success',
  },
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function nextStage(reminders: PaymentReminder[]): ReminderStage {
  if (reminders.some((reminder) => reminder.stage === 'mise_en_demeure')) return 'proposition_echeancier'
  if (reminders.some((reminder) => reminder.stage === 'relance_amiable')) return 'mise_en_demeure'
  return 'relance_amiable'
}

function fileSafePeriod(month: number, year: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export default function PaymentReminderModal({
  payment,
  profile,
  onClose,
  onSaved,
}: {
  payment: Payment
  profile: UserProfile | null
  onClose: () => void
  onSaved: () => Promise<void> | void
}) {
  const { t } = useTranslation()
  const [reminders, setReminders] = useState<PaymentReminder[]>([])
  const [stage, setStage] = useState<ReminderStage>('relance_amiable')
  const [sentAt, setSentAt] = useState(today())
  const [notes, setNotes] = useState(payment.notes ?? '')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      setLoading(true)
      setError('')
      try {
        const history = await window.api.paymentReminders.getByPayment(payment.id)
        if (!cancelled) {
          setReminders(history)
          setStage(nextStage(history))
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        }
      }
    }

    void loadHistory()
    return () => { cancelled = true }
  }, [payment.id])

  const totalAmount = payment.rent_amount + payment.charges_amount
  const currentStatusKey = payment.status === 'late' ? 'late' : 'pending'

  const reminderData = useMemo<ReminderLetterData>(() => ({
    landlordName: profile?.name ?? t('nav.profile'),
    landlordAddress: profile?.address,
    landlordCity: profile?.city,
    landlordPhone: profile?.phone,
    landlordSignature: profile?.signatureImage,
    tenantFirstName: payment.tenant_first_name,
    tenantLastName: payment.tenant_last_name,
    propertyAddress: payment.property_address,
    propertyCity: payment.property_city,
    propertyZip: payment.property_zip,
    periodMonth: payment.period_month,
    periodYear: payment.period_year,
    amountDue: totalAmount,
    reminderDate: sentAt,
    stage,
    notes,
  }), [notes, payment, profile, sentAt, stage, t, totalAmount])

  async function handleGenerate() {
    setSaving(true)
    setError('')

    try {
      const blob = await pdf(<ReminderLetterPDF data={reminderData} />).toBlob()
      const buffer = new Uint8Array(await blob.arrayBuffer())
      const fileName = `${stage}_${payment.tenant_last_name}_${fileSafePeriod(payment.period_month, payment.period_year)}.pdf`
      const result = await window.api.documents.savePdf(payment.lease_id, fileName, buffer, stage)
      if (!result.saved) {
        setSaving(false)
        return
      }

      await window.api.paymentReminders.create({
        payment_id: payment.id,
        stage,
        sent_at: sentAt,
        notes: notes.trim() || null,
      })

      if (payment.status === 'pending') {
        await window.api.payments.update(payment.id, { status: 'late' }, paymentVersionToken(payment))
      }

      await onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

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
        className="w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl max-h-[92vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 shrink-0">
                <ScrollText className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-textPrimary">{t('payments.reminderModal.title')}</h2>
                <p className="text-sm text-textMuted">
                  {payment.tenant_first_name} {payment.tenant_last_name} | {payment.property_name}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-textMuted">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>{monthLabel(payment.period_month, payment.period_year)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-danger" />
                <span>{t('payments.reminderModal.unpaidAmount', { amount: formatCurrency(totalAmount) })}</span>
              </div>
            </div>
          </div>

          <button onClick={onClose} className="shrink-0 text-textMuted transition-colors hover:text-textPrimary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-textMuted">{t('payments.reminderModal.trackedPayment')}</p>
                <p className="mt-1 text-base font-semibold text-textPrimary">{formatCurrency(totalAmount)}</p>
                <p className="mt-1 text-xs text-textMuted">
                  {t('payments.reminderModal.currentStatus', { status: t(`payments.status.${currentStatusKey}`) })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-textMuted">{t('payments.reminderModal.historyTitle')}</p>
                <p className="mt-1 text-base font-semibold text-textPrimary">{reminders.length}</p>
                <p className="mt-1 text-xs text-textMuted">
                  {reminders[0]
                    ? t('payments.reminderModal.lastSent', { date: formatDate(reminders[0].sent_at) })
                    : t('payments.reminderModal.noneSent')}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(STAGE_META) as ReminderStage[]).map((value) => {
              const meta = STAGE_META[value]
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStage(value)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    stage === value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-textPrimary">{t(meta.labelKey)}</p>
                    <Badge variant={meta.badge}>{t(meta.labelKey)}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-textMuted">{t(meta.descriptionKey)}</p>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-[220px_1fr] gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('payments.reminderModal.letterDate')}</label>
              <DateInput
                value={sentAt}
                onChange={(value) => setSentAt(value ?? '')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('payments.reminderModal.additionalMessage')}</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder={t('payments.reminderModal.messagePlaceholder')}
                className="w-full resize-none rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary transition-colors focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-warning mt-0.5" />
                <div className="text-xs leading-5 text-textMuted">
                  {t('payments.reminderModal.help', { status: t('payments.status.late') })}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-textPrimary">{t('payments.reminderModal.timeline')}</h3>
              <Badge variant="muted">{t('payments.reminderModal.itemCount', { count: reminders.length })}</Badge>
            </div>

            {error ? (
              <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            ) : loading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="h-12 rounded-xl border border-border bg-surfaceHigh/40 animate-pulse" />
                ))}
              </div>
            ) : reminders.length === 0 ? (
              <div className="rounded-xl border border-border bg-surfaceHigh/30 px-4 py-6 text-center">
                <p className="text-sm font-medium text-textPrimary">{t('payments.reminderModal.emptyHistoryTitle')}</p>
                <p className="mt-1 text-xs text-textMuted">{t('payments.reminderModal.emptyHistoryDesc')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="rounded-xl border border-border bg-surfaceHigh/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-textPrimary">{t(STAGE_META[reminder.stage].labelKey)}</p>
                        <p className="mt-0.5 text-xs text-textMuted">
                          {t('payments.reminderModal.sentOn', { date: formatDate(reminder.sent_at) })}
                        </p>
                      </div>
                      <Badge variant={STAGE_META[reminder.stage].badge}>{t(STAGE_META[reminder.stage].labelKey)}</Badge>
                    </div>
                    {reminder.notes ? (
                      <p className="mt-2 text-xs leading-5 text-textMuted">{reminder.notes}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            <Button onClick={handleGenerate} disabled={saving || loading}>
              {saving ? (
                <>{t('common.saving')}</>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  {t('payments.reminderModal.generatePdf')}
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
