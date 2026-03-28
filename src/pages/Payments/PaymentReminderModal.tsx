import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { pdf } from '@react-pdf/renderer'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Info,
  ScrollText,
  Send,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ReminderLetterPDF, type ReminderLetterData } from '@/lib/pdf/reminder'
import { formatCurrency, formatDate } from '@/lib/utils'

type ReminderStage = 'relance_amiable' | 'mise_en_demeure' | 'proposition_echeancier'

const MONTHS = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
]

const STAGE_META: Record<ReminderStage, {
  label: string
  description: string
  badge: 'default' | 'warning' | 'danger' | 'success'
}> = {
  relance_amiable: {
    label: 'Relance amiable',
    description: 'Premier rappel cordial du loyer impaye.',
    badge: 'warning',
  },
  mise_en_demeure: {
    label: 'Mise en demeure',
    description: 'Demande plus formelle de regularisation, toujours en voie amiable.',
    badge: 'danger',
  },
  proposition_echeancier: {
    label: "Proposition d'echeancier",
    description: "Proposer un plan d'apurement pour regulariser l'impaye.",
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

function fileSafeMonth(month: number, year: number) {
  return `${MONTHS[month - 1]}_${year}`
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

    loadHistory()
    return () => { cancelled = true }
  }, [payment.id])

  const totalAmount = payment.rent_amount + payment.charges_amount
  const stageMeta = STAGE_META[stage]

  const reminderData = useMemo<ReminderLetterData>(() => ({
    landlordName: profile?.name ?? 'Proprietaire',
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
  }), [notes, payment, profile, sentAt, stage, totalAmount])

  async function handleGenerate() {
    setSaving(true)
    setError('')

    try {
      const blob = await pdf(<ReminderLetterPDF data={reminderData} />).toBlob()
      const buffer = new Uint8Array(await blob.arrayBuffer())
      const fileName = `${stage}_${payment.tenant_last_name}_${fileSafeMonth(payment.period_month, payment.period_year)}.pdf`
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
        await window.api.payments.update(payment.id, { status: 'late' }, payment.updated_at)
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
        className="w-full max-w-4xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-warning/10 shrink-0">
                <ScrollText className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-textPrimary">Relance impaye</h2>
                <p className="text-sm text-textMuted">
                  {payment.tenant_first_name} {payment.tenant_last_name} · {payment.property_name}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-textMuted">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>{MONTHS[payment.period_month - 1]} {payment.period_year}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-danger" />
                <span>Montant impaye : {formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-textMuted">Paiement suivi</p>
                <p className="text-base font-semibold text-textPrimary mt-1">{formatCurrency(totalAmount)}</p>
                <p className="text-xs text-textMuted mt-1">
                  Statut actuel : {payment.status === 'late' ? 'En retard' : 'En attente'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-textMuted">Historique des relances</p>
                <p className="text-base font-semibold text-textPrimary mt-1">{reminders.length}</p>
                <p className="text-xs text-textMuted mt-1">
                  {reminders[0] ? `Derniere le ${formatDate(reminders[0].sent_at)}` : 'Aucune relance enregistree'}
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
                  className={`text-left rounded-xl border p-4 transition-colors ${
                    stage === value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-textPrimary">{meta.label}</p>
                    <Badge variant={meta.badge}>{meta.label}</Badge>
                  </div>
                  <p className="text-xs text-textMuted mt-2 leading-5">{meta.description}</p>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-[220px_1fr] gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Date du courrier</label>
              <input
                type="date"
                value={sentAt}
                onChange={(event) => setSentAt(event.target.value)}
                className="w-full bg-surfaceHigh border border-border rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Message complementaire</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Precisions, proposition d'appel, consignes de regularisation..."
                className="w-full resize-none bg-surfaceHigh border border-border rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <div className="text-xs text-textMuted leading-5">
                  Le PDF genere ici reste dans un cadre amiable. Il ne remplace pas un commandement de payer delivre par un commissaire de justice.
                  Si le paiement est encore en attente, l'envoi d'une relance le fera passer automatiquement en statut <span className="text-textPrimary font-medium">late</span>.
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-textPrimary">Historique</h3>
              <Badge variant="muted">{reminders.length} element{reminders.length !== 1 ? 's' : ''}</Badge>
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
                <p className="text-sm font-medium text-textPrimary">Aucune relance enregistree</p>
                <p className="text-xs text-textMuted mt-1">Le premier PDF genere apparaitra ici avec sa date et ses notes.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="rounded-xl border border-border px-4 py-3 bg-surfaceHigh/20">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-textPrimary">{STAGE_META[reminder.stage].label}</p>
                        <p className="text-xs text-textMuted mt-0.5">Envoyee le {formatDate(reminder.sent_at)}</p>
                      </div>
                      <Badge variant={STAGE_META[reminder.stage].badge}>{STAGE_META[reminder.stage].label}</Badge>
                    </div>
                    {reminder.notes ? (
                      <p className="text-xs text-textMuted mt-2 leading-5">{reminder.notes}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button onClick={handleGenerate} disabled={saving || loading}>
              {saving ? (
                <>Enregistrement...</>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Generer le PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
