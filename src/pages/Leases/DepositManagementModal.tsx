import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, CheckCircle2, Euro, ShieldCheck, StickyNote, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getDepositReturnedAmount, getDepositStatus, getDepositStatusMeta } from './depositUtils'

export interface DepositManagementInput {
  deposit_received_date: string | null
  deposit_refund_date: string | null
  deposit_retained_amount: number
  deposit_notes: string | null
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function DepositManagementModal({
  lease,
  onSave,
  onClose,
}: {
  lease: Lease
  onSave: (data: DepositManagementInput) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<DepositManagementInput>({
    deposit_received_date: lease.deposit_received_date,
    deposit_refund_date: lease.deposit_refund_date,
    deposit_retained_amount: lease.deposit_retained_amount,
    deposit_notes: lease.deposit_notes,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof DepositManagementInput>(field: K, value: DepositManagementInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const previewLease = useMemo(() => ({
    deposit_amount: lease.deposit_amount,
    deposit_received_date: form.deposit_received_date,
    deposit_refund_date: form.deposit_refund_date,
    deposit_retained_amount: form.deposit_retained_amount,
  }), [form.deposit_received_date, form.deposit_refund_date, form.deposit_retained_amount, lease.deposit_amount])

  const status = getDepositStatus(previewLease)
  const statusMeta = getDepositStatusMeta(status)
  const returnedAmount = getDepositReturnedAmount(previewLease)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (lease.deposit_amount <= 0) {
      return setError("Ce bail n'a pas de depot de garantie a gerer.")
    }
    if (form.deposit_received_date && form.deposit_received_date < lease.start_date) {
      return setError("La date d'encaissement ne peut pas etre anterieure au debut du bail.")
    }
    if (form.deposit_refund_date && !form.deposit_received_date) {
      return setError("Enregistrez d'abord l'encaissement du depot avant sa restitution.")
    }
    if (form.deposit_refund_date && form.deposit_received_date && form.deposit_refund_date < form.deposit_received_date) {
      return setError('La date de restitution ne peut pas etre anterieure a la date d encaissement.')
    }
    if (form.deposit_retained_amount < 0) {
      return setError('Le montant retenu ne peut pas etre negatif.')
    }
    if (form.deposit_retained_amount > lease.deposit_amount) {
      return setError('Le montant retenu ne peut pas depasser le depot convenu.')
    }
    if (!form.deposit_refund_date && form.deposit_retained_amount > 0) {
      return setError('Renseignez une date de restitution pour enregistrer une retenue.')
    }

    setSaving(true)
    try {
      await onSave({
        deposit_received_date: form.deposit_received_date,
        deposit_refund_date: form.deposit_refund_date,
        deposit_retained_amount: form.deposit_refund_date ? form.deposit_retained_amount : 0,
        deposit_notes: form.deposit_notes?.trim() || null,
      })
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
        className="w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-textPrimary">Depot de garantie</h2>
                <p className="text-sm text-textMuted">
                  {lease.tenant_first_name} {lease.tenant_last_name} · {lease.property_name}
                </p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-5">
          <div className="grid grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-textMuted">Depot convenu</p>
                <p className="text-lg font-semibold text-textPrimary mt-1">{formatCurrency(lease.deposit_amount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-textMuted">Statut</p>
                <div className="mt-2">
                  <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-textMuted">A restituer</p>
                <p className="text-lg font-semibold text-textPrimary mt-1">{formatCurrency(returnedAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-textMuted">Retenu</p>
                <p className={`text-lg font-semibold mt-1 ${form.deposit_retained_amount > 0 ? 'text-danger' : 'text-textPrimary'}`}>
                  {formatCurrency(form.deposit_retained_amount)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-surfaceHigh/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-textPrimary">Encaissement</p>
                  <p className="text-xs text-textMuted mt-1">Renseignez la date a laquelle le depot a ete effectivement recu.</p>
                </div>
                {!form.deposit_received_date && (
                  <Button type="button" variant="outline" size="sm" onClick={() => set('deposit_received_date', today())}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Aujourd'hui
                  </Button>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-textMuted">Date d'encaissement</label>
                <Input
                  type="date"
                  value={form.deposit_received_date ?? ''}
                  onChange={(event) => set('deposit_received_date', event.target.value || null)}
                />
                {form.deposit_received_date && (
                  <p className="text-xs text-textMuted mt-1 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Enregistre le {formatDate(form.deposit_received_date)}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surfaceHigh/20 p-4">
              <div>
                <p className="text-sm font-semibold text-textPrimary">Restitution</p>
                <p className="text-xs text-textMuted mt-1">Lors de la sortie, indiquez la date de restitution et la part retenue.</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-textMuted">Date de restitution</label>
                  <Input
                    type="date"
                    value={form.deposit_refund_date ?? ''}
                    onChange={(event) => set('deposit_refund_date', event.target.value || null)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-textMuted">Montant retenu</label>
                  <Input
                    type="number"
                    min={0}
                    max={lease.deposit_amount}
                    step={0.01}
                    value={form.deposit_retained_amount || ''}
                    onChange={(event) => set('deposit_retained_amount', parseFloat(event.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
              {form.deposit_refund_date && (
                <div className="mt-3 text-xs text-textMuted flex items-center gap-1.5">
                  <Euro className="w-3.5 h-3.5" />
                  Restitution calculee : {formatCurrency(returnedAmount)}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5" />
              Commentaires et deductions
            </label>
            <textarea
              value={form.deposit_notes ?? ''}
              onChange={(event) => set('deposit_notes', event.target.value || null)}
              rows={5}
              placeholder="Etat des lieux, nettoyage, reparations, justificatifs, mode de restitution..."
              className="w-full resize-none bg-surfaceHigh border border-border rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer le depot'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
