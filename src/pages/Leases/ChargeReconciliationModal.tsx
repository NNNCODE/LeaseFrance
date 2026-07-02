import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  Download,
  Euro,
  Pencil,
  ReceiptText,
  ScrollText,
  Trash2,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { resolveOwnerProfileForLease } from '@/lib/ownerProfiles'
import type { ChargeReconciliationPdfData } from '@/lib/pdf/chargeReconciliation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'
import { useOwnerStore } from '@/stores/useOwnerStore'

interface ChargeReconciliationFormState {
  year: number
  actual_charges: number
  provisions_collected_override: string
  notes: string
}

function currentYear() {
  return new Date().getFullYear()
}

function buildDefaultForm(): ChargeReconciliationFormState {
  return {
    year: currentYear(),
    actual_charges: 0,
    provisions_collected_override: '',
    notes: '',
  }
}

function parseOverride(value: string): number | null {
  if (!value.trim()) return null
  return parseFloat(value) || 0
}

function autoCollectedForYear(payments: Payment[], year: number) {
  return payments
    .filter((payment) => payment.status === 'paid' && payment.period_year === year)
    .reduce((sum, payment) => sum + payment.charges_amount, 0)
}

function paidMonthsForYear(payments: Payment[], year: number) {
  return payments.filter((payment) => payment.status === 'paid' && payment.period_year === year && payment.charges_amount > 0).length
}

function effectiveCollected(item: { provisions_collected_override: number | null; year: number }, payments: Payment[]) {
  return item.provisions_collected_override ?? autoCollectedForYear(payments, item.year)
}

function balanceFor(actualCharges: number, collected: number) {
  return actualCharges - collected
}

function outcomeMeta(balance: number) {
  if (balance > 0) return { label: 'Complement a demander', variant: 'warning' as const }
  if (balance < 0) return { label: 'Trop-percu a rembourser', variant: 'default' as const }
  return { label: 'Solde', variant: 'success' as const }
}

function fileNameFor(tenantLastName: string, year: number) {
  return `Regularisation_charges_${tenantLastName}_${year}.pdf`
}

function buildPdfData(
  lease: Lease,
  row: ChargeReconciliation,
  payments: Payment[],
  profile: UserProfile | null
): ChargeReconciliationPdfData {
  const autoCollectedProvisions = autoCollectedForYear(payments, row.year)
  const effectiveCollectedProvisions = effectiveCollected(row, payments)
  const balance = balanceFor(row.actual_charges, effectiveCollectedProvisions)

  return {
    landlordName: profile?.name ?? 'Proprietaire',
    landlordAddress: profile?.address,
    landlordCity: profile?.city,
    landlordPhone: profile?.phone,
    landlordSignature: profile?.signatureImage,
    tenantFirstName: lease.tenant_first_name,
    tenantLastName: lease.tenant_last_name,
    propertyName: lease.property_name,
    propertyAddress: lease.property_address,
    propertyCity: lease.property_city,
    propertyZip: lease.property_zip,
    leaseStartDate: lease.start_date,
    leaseEndDate: lease.end_date,
    year: row.year,
    monthlyProvision: lease.charges_amount,
    autoCollectedProvisions,
    effectiveCollectedProvisions,
    usedManualOverride: row.provisions_collected_override !== null,
    actualCharges: row.actual_charges,
    balance,
    notes: row.notes,
  }
}

export default function ChargeReconciliationModal({
  lease,
  onClose,
}: {
  lease: Lease
  onClose: () => void
}) {
  const { profile } = useAuthStore()
  const owners = useOwnerStore((state) => state.owners)
  const activeOwner = useOwnerStore((state) => state.activeOwner)
  const ownerProfile = resolveOwnerProfileForLease(owners, lease, activeOwner ?? profile)
  const [rows, setRows] = useState<ChargeReconciliation[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [form, setForm] = useState<ChargeReconciliationFormState>(buildDefaultForm())
  const [editing, setEditing] = useState<ChargeReconciliation | null>(null)
  const [deleting, setDeleting] = useState<ChargeReconciliation | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [history, leasePayments] = await Promise.all([
        window.api.chargeReconciliations.getByLease(lease.id),
        window.api.payments.getByLease(lease.id),
      ])
      setRows(history)
      setPayments(leasePayments)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [lease.id])

  const autoCollected = useMemo(
    () => autoCollectedForYear(payments, form.year),
    [payments, form.year]
  )

  const effectiveCollectedPreview = useMemo(() => {
    const override = parseOverride(form.provisions_collected_override)
    return override ?? autoCollected
  }, [autoCollected, form.provisions_collected_override])

  const balancePreview = useMemo(
    () => balanceFor(form.actual_charges, effectiveCollectedPreview),
    [effectiveCollectedPreview, form.actual_charges]
  )

  const paidMonths = useMemo(
    () => paidMonthsForYear(payments, form.year),
    [payments, form.year]
  )

  function resetForm(nextYear?: number) {
    setEditing(null)
    setForm({
      year: nextYear ?? rows[0]?.year ?? currentYear(),
      actual_charges: 0,
      provisions_collected_override: '',
      notes: '',
    })
  }

  function set<K extends keyof ChargeReconciliationFormState>(field: K, value: ChargeReconciliationFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function startEdit(row: ChargeReconciliation) {
    setEditing(row)
    setForm({
      year: row.year,
      actual_charges: row.actual_charges,
      provisions_collected_override: row.provisions_collected_override?.toString() ?? '',
      notes: row.notes ?? '',
    })
    setError('')
    setNotice('')
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (lease.charges_amount <= 0) {
      return setError("Ce bail n'a pas de provisions sur charges a regulariser.")
    }
    if (!Number.isInteger(form.year) || form.year < 2000 || form.year > currentYear() + 1) {
      return setError("Renseignez une annee valide.")
    }
    if (form.actual_charges < 0) {
      return setError('Les charges reelles ne peuvent pas etre negatives.')
    }

    const override = parseOverride(form.provisions_collected_override)
    if (override !== null && override < 0) {
      return setError('Les provisions collectees ne peuvent pas etre negatives.')
    }

    const duplicate = rows.find((row) => row.year === form.year && row.id !== editing?.id)
    if (duplicate) {
      return setError(`Une regularisation existe deja pour ${form.year}. Modifiez-la au lieu d'en creer une nouvelle.`)
    }

    setSaving(true)
    try {
      const payload: ChargeReconciliationInput = {
        lease_id: lease.id,
        year: form.year,
        actual_charges: form.actual_charges,
        provisions_collected_override: override,
        notes: form.notes.trim() || null,
      }

      if (editing) {
        await window.api.chargeReconciliations.update(editing.id, payload)
        setNotice('Regularisation mise a jour.')
      } else {
        await window.api.chargeReconciliations.create(payload)
        setNotice('Regularisation enregistree.')
      }

      await load()
      resetForm(form.year)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setBusyId(deleting.id)
    setError('')
    try {
      await window.api.chargeReconciliations.delete(deleting.id)
      setNotice('Regularisation supprimee.')
      if (editing?.id === deleting.id) resetForm(deleting.year)
      setDeleting(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  async function handleGeneratePdf(row: ChargeReconciliation) {
    setBusyId(row.id)
    setError('')

    try {
      const [{ pdf }, { ChargeReconciliationPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/lib/pdf/chargeReconciliation'),
      ])
      const blob = await pdf(<ChargeReconciliationPDF data={buildPdfData(lease, row, payments, ownerProfile)} />).toBlob()
      const buffer = new Uint8Array(await blob.arrayBuffer())
      const result = await window.api.documents.savePdf(
        lease.id,
        fileNameFor(lease.tenant_last_name, row.year),
        buffer,
        'regularisation_charges'
      )

      if (result.saved) {
        setNotice('PDF de regularisation enregistre.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
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
        className="w-full max-w-6xl max-h-[92vh] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-warning/10 shrink-0">
                <ReceiptText className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-textPrimary">Regularisation annuelle des charges</h2>
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

        <div className="p-6 overflow-y-auto flex flex-col gap-5">
          {notice ? (
            <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-textMuted">Provision mensuelle</p>
                <p className="text-lg font-semibold text-textPrimary mt-1">{formatCurrency(lease.charges_amount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-textMuted">Provisions encaissees ({form.year})</p>
                <p className="text-lg font-semibold text-textPrimary mt-1">{formatCurrency(effectiveCollectedPreview)}</p>
                <p className="text-xs text-textMuted mt-1">{paidMonths} mois paye{paidMonths !== 1 ? 's' : ''} retrouves</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-textMuted">Charges reelles</p>
                <p className="text-lg font-semibold text-textPrimary mt-1">{formatCurrency(form.actual_charges)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-textMuted">Solde</p>
                <p className={`text-lg font-semibold mt-1 ${balancePreview > 0 ? 'text-warning' : balancePreview < 0 ? 'text-primary' : 'text-success'}`}>
                  {formatCurrency(Math.abs(balancePreview))}
                </p>
                <div className="mt-2">
                  <Badge variant={outcomeMeta(balancePreview).variant}>{outcomeMeta(balancePreview).label}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((index) => (
                <div key={index} className="h-24 rounded-2xl border border-border bg-surfaceHigh/20 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-[1.1fr_1fr] gap-5">
              <form onSubmit={handleSave} className="flex flex-col gap-4 rounded-2xl border border-border p-5 bg-surfaceHigh/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-textPrimary">{editing ? 'Modifier la regularisation' : 'Nouvelle regularisation'}</p>
                    <p className="text-xs text-textMuted mt-1">Comparez les provisions sur charges encaisses avec les charges reelles de l'exercice.</p>
                  </div>
                  {editing ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => resetForm(form.year)}>
                      Nouvelle saisie
                    </Button>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-textMuted">Annee</label>
                    <Input
                      type="number"
                      min={2000}
                      max={currentYear() + 1}
                      value={form.year}
                      onChange={(event) => set('year', parseInt(event.target.value, 10) || currentYear())}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-textMuted">Charges reelles annuelles</label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.actual_charges || ''}
                      onChange={(event) => set('actual_charges', parseFloat(event.target.value) || 0)}
                      placeholder="1450"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-textPrimary">Provisions retrouvees</p>
                      <p className="text-xs text-textMuted mt-1">Calcule automatiquement a partir des paiements `paid` de l'annee selectionnee.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-textPrimary">{formatCurrency(autoCollected)}</p>
                      <p className="text-xs text-textMuted mt-1">{paidMonths} mois paye{paidMonths !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-textMuted">Valeur manuelle optionnelle</label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.provisions_collected_override}
                      onChange={(event) => set('provisions_collected_override', event.target.value)}
                      placeholder={`Laisser vide pour utiliser ${autoCollected.toFixed(2)}`}
                    />
                    <p className="text-[11px] text-textMuted">
                      Utilisez ce champ si l'historique des paiements est incomplet ou si vous regularisez une annee anterieure importee partiellement.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-textMuted">Commentaires</label>
                  <textarea
                    value={form.notes}
                    onChange={(event) => set('notes', event.target.value)}
                    rows={5}
                    placeholder="Factures, relev e de copropriete, complement demande, remboursement prevu..."
                    className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-textMuted leading-5">
                  Solde calcule : <span className="text-textPrimary font-medium">{outcomeMeta(balancePreview).label}</span> pour <span className="text-textPrimary font-medium">{formatCurrency(Math.abs(balancePreview))}</span>.
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" onClick={onClose}>Fermer</Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Enregistrement...' : editing ? 'Mettre a jour' : 'Enregistrer'}
                  </Button>
                </div>
              </form>

              <div className="rounded-2xl border border-border p-5 bg-surfaceHigh/10 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-textPrimary">Historique</p>
                    <p className="text-xs text-textMuted mt-1">Les regularisations deja enregistrees pour ce bail.</p>
                  </div>
                  <Badge variant="muted">{rows.length} element{rows.length !== 1 ? 's' : ''}</Badge>
                </div>

                {rows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center">
                    <ScrollText className="w-6 h-6 text-textMuted mx-auto" />
                    <p className="text-sm font-medium text-textPrimary mt-3">Aucune regularisation</p>
                    <p className="text-xs text-textMuted mt-1">La premiere annee regularisee apparaitra ici avec son PDF exportable.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {rows.map((row) => {
                      const collected = effectiveCollected(row, payments)
                      const balance = balanceFor(row.actual_charges, collected)
                      const meta = outcomeMeta(balance)

                      return (
                        <div key={row.id} className="rounded-xl border border-border bg-surface px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-textPrimary">{row.year}</p>
                                <Badge variant={meta.variant}>{meta.label}</Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-textMuted">
                                <div className="flex items-center gap-1.5">
                                  <Euro className="w-3.5 h-3.5" />
                                  <span>Charges reelles : {formatCurrency(row.actual_charges)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <CalendarDays className="w-3.5 h-3.5" />
                                  <span>Provisions retenues : {formatCurrency(collected)}</span>
                                </div>
                              </div>
                              <p className="text-xs text-textMuted mt-2">
                                Solde : {formatCurrency(Math.abs(balance))} · {row.provisions_collected_override !== null ? 'Valeur manuelle' : 'Paiements suivis'}
                              </p>
                              {row.notes ? (
                                <p className="text-xs text-textMuted mt-2 leading-5">{row.notes}</p>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleGeneratePdf(row)}
                                disabled={busyId === row.id}
                                title="Generer le PDF"
                                className="p-1.5 rounded-lg hover:bg-primary/10 text-textMuted hover:text-primary transition-colors disabled:opacity-40"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => startEdit(row)}
                                disabled={busyId === row.id}
                                title="Modifier"
                                className="p-1.5 rounded-lg hover:bg-surfaceHigh text-textMuted hover:text-textPrimary transition-colors disabled:opacity-40"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleting(row)}
                                disabled={busyId === row.id}
                                title="Supprimer"
                                className="p-1.5 rounded-lg hover:bg-danger/10 text-textMuted hover:text-danger transition-colors disabled:opacity-40"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {deleting ? (
          <DeletePrompt
            row={deleting}
            deleting={busyId === deleting.id}
            onClose={() => setDeleting(null)}
            onConfirm={handleDelete}
          />
        ) : null}
      </motion.div>
    </motion.div>
  )
}

function DeletePrompt({
  row,
  deleting,
  onConfirm,
  onClose,
}: {
  row: ChargeReconciliation
  deleting: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-danger/30 bg-surface p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-danger/10 shrink-0">
            <Trash2 className="w-5 h-5 text-danger" />
          </div>
          <div>
            <p className="text-sm font-semibold text-textPrimary">Supprimer cette regularisation ?</p>
            <p className="text-xs text-textMuted mt-1">Exercice {row.year} · charges reelles {formatCurrency(row.actual_charges)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={deleting}>Annuler</Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1" disabled={deleting}>
            {deleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </div>
      </div>
    </div>
  )
}
