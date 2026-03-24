import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, CreditCard, CheckCircle2, Clock, AlertCircle,
  Building2, User, Euro, CalendarDays, X, Save,
  Trash2, AlertTriangle, Pencil, ChevronDown, StickyNote, Receipt,
} from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { QuittancePDF, type QuittanceData } from '@/lib/pdf/quittance'
import { RecuPDF, type RecuData } from '@/lib/pdf/recu'
import { useAuthStore } from '@/stores/useAuthStore'

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

const METHODS = [
  { value: 'virement',    label: 'Virement bancaire' },
  { value: 'cheque',      label: 'Chèque' },
  { value: 'especes',     label: 'Espèces' },
  { value: 'prelevement', label: 'Prélèvement automatique' },
]

const STATUS_CONFIG = {
  paid:    { label: 'Payé',     variant: 'success', icon: CheckCircle2 },
  pending: { label: 'En attente', variant: 'warning', icon: Clock      },
  late:    { label: 'En retard',  variant: 'danger',  icon: AlertCircle },
} as const

const currentYear  = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

function monthLabel(m: number, y: number) {
  return `${MONTHS[m - 1]} ${y}`
}

function methodLabel(v: string) {
  return METHODS.find((m) => m.value === v)?.label ?? v
}

function today() {
  return new Date().toISOString().split('T')[0]
}

const emptyForm = (): PaymentInput => ({
  lease_id:       0,
  period_month:   currentMonth,
  period_year:    currentYear,
  rent_amount:    0,
  charges_amount: 0,
  payment_date:   null,
  payment_method: 'virement',
  status:         'pending',
  notes:          null,
})

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Payments() {
  const { profile } = useAuthStore()
  const [payments, setPayments] = useState<Payment[]>([])
  const [leases,   setLeases]   = useState<Lease[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<'all' | 'paid' | 'pending' | 'late'>('all')
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState<Payment | null>(null)
  const [deleting,  setDeleting]  = useState<Payment | null>(null)

  async function load() {
    setLoading(true)
    const [pays, leas] = await Promise.all([
      window.api.payments.getAll(),
      window.api.leases.getAll(),
    ])
    setPayments(pays)
    setLeases(leas)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Regrouper par mois/année
  const filtered = useMemo(() => {
    return filter === 'all' ? payments : payments.filter((p) => p.status === filter)
  }, [payments, filter])

  const grouped = useMemo(() => {
    const map = new Map<string, Payment[]>()
    for (const p of filtered) {
      const key = `${p.period_year}-${String(p.period_month).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const summary = useMemo(() => ({
    paid:    payments.filter((p) => p.status === 'paid').length,
    pending: payments.filter((p) => p.status === 'pending').length,
    late:    payments.filter((p) => p.status === 'late').length,
    totalPaid: payments.filter((p) => p.status === 'paid')
      .reduce((s, p) => s + p.rent_amount + p.charges_amount, 0),
  }), [payments])

  async function handleSave(data: PaymentInput) {
    try {
      if (editing) {
        await window.api.payments.update(editing.id, data)
      } else {
        await window.api.payments.create(data)
      }
      setShowForm(false)
      setEditing(null)
      load()
    } catch (err) {
      throw err
    }
  }

  async function handleMarkPaid(payment: Payment) {
    await window.api.payments.markPaid(payment.id, today())
    load()
  }

  async function handleDelete() {
    if (!deleting) return
    await window.api.payments.delete(deleting.id)
    setDeleting(null)
    load()
  }

  async function handleGenerateDocument(payment: Payment) {
    const lease = leases.find((l) => l.id === payment.lease_id)
    if (!lease) return

    const full = payment.rent_amount >= payment.lease_rent_amount
      && payment.charges_amount >= payment.lease_charges_amount

    const baseData = {
      landlordName:    profile?.name ?? 'Propriétaire',
      landlordAddress: profile?.address,
      landlordCity:    profile?.city,
      landlordPhone:   profile?.phone,
      landlordSignature: profile?.signatureImage,
      tenantFirstName: payment.tenant_first_name,
      tenantLastName:  payment.tenant_last_name,
      propertyName:    payment.property_name,
      propertyAddress: lease.property_address,
      propertyCity:    payment.property_city,
      propertyZip:     lease.property_zip ?? '',
      periodMonth:     payment.period_month,
      periodYear:      payment.period_year,
      rentAmount:      payment.rent_amount,
      chargesAmount:   payment.charges_amount,
      paymentDate:     payment.payment_date,
      paymentMethod:   payment.payment_method,
      leaseType:       lease.type,
    }

    const month = MONTHS[payment.period_month - 1]
    let blob: Blob, fileName: string, docType: string

    if (full) {
      blob     = await pdf(<QuittancePDF data={baseData as QuittanceData} />).toBlob()
      fileName = `Quittance_${payment.tenant_last_name}_${month}_${payment.period_year}.pdf`
      docType  = 'quittance'
    } else {
      blob     = await pdf(<RecuPDF data={baseData as RecuData} />).toBlob()
      fileName = `Recu_${payment.tenant_last_name}_${month}_${payment.period_year}.pdf`
      docType  = 'recu'
    }

    const buffer = Array.from(new Uint8Array(await blob.arrayBuffer()))
    await window.api.documents.savePdf(payment.lease_id, fileName, buffer, docType)
  }

  const noLeases = leases.filter((l) => l.status === 'active').length === 0

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">Paiements</h1>
          <p className="text-textMuted text-sm mt-1">
            {summary.paid} payé{summary.paid !== 1 ? 's' : ''}
            {summary.pending > 0 && ` · ${summary.pending} en attente`}
            {summary.late > 0 && <span className="text-danger"> · {summary.late} en retard</span>}
            {summary.totalPaid > 0 && ` · ${formatCurrency(summary.totalPaid)} encaissés`}
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true) }} disabled={noLeases}>
          <Plus className="w-4 h-4" />
          Nouveau paiement
        </Button>
      </div>

      {noLeases && payments.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Filtres */}
          <div className="flex gap-2">
            {(['all', 'paid', 'pending', 'late'] as const).map((f) => {
              const labels = { all: 'Tous', paid: 'Payés', pending: 'En attente', late: 'En retard' }
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === f
                      ? 'bg-primary text-white'
                      : 'bg-surface border border-border text-textMuted hover:text-textPrimary'
                  }`}
                >
                  {labels[f]}
                  {f !== 'all' && (
                    <span className="ml-1.5 opacity-70">
                      {f === 'paid' ? summary.paid : f === 'pending' ? summary.pending : summary.late}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Liste groupée */}
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-surface border border-border rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-textMuted">
              <CreditCard className="w-8 h-8 opacity-30" />
              <p className="text-sm">Aucun paiement dans cette catégorie</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {grouped.map(([key, group]) => {
                const [year, month] = key.split('-').map(Number)
                const groupTotal = group.reduce((s, p) => s + p.rent_amount + p.charges_amount, 0)
                return (
                  <div key={key}>
                    {/* En-tête de groupe */}
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold text-textMuted uppercase tracking-wider">
                        {monthLabel(month, year)}
                      </h2>
                      <span className="text-xs text-textMuted">{formatCurrency(groupTotal)}</span>
                    </div>
                    <motion.div
                      className="flex flex-col gap-2"
                      initial="hidden"
                      animate="show"
                      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                    >
                      {group.map((p) => (
                        <PaymentRow
                          key={p.id}
                          payment={p}
                          onMarkPaid={() => handleMarkPaid(p)}
                          onEdit={() => { setEditing(p); setShowForm(true) }}
                          onDelete={() => setDeleting(p)}
                          onGenerateDocument={() => handleGenerateDocument(p)}
                        />
                      ))}
                    </motion.div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <PaymentFormModal
            initial={editing}
            leases={leases.filter((l) => l.status === 'active')}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditing(null) }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleting && (
          <DeleteModal payment={deleting} onConfirm={handleDelete} onClose={() => setDeleting(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
        <CreditCard className="w-8 h-8 text-primary" />
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">Aucun paiement enregistré</p>
        <p className="text-sm text-textMuted mt-1">
          Créez d'abord un bail actif, puis enregistrez les paiements mensuels.
        </p>
      </div>
    </div>
  )
}

// ── Payment row ────────────────────────────────────────────────────────────────

function PaymentRow({ payment: p, onMarkPaid, onEdit, onDelete, onGenerateDocument }: {
  payment: Payment
  onMarkPaid: () => void
  onEdit: () => void
  onDelete: () => void
  onGenerateDocument: () => void
}) {
  const cfg = STATUS_CONFIG[p.status]
  const Icon = cfg.icon
  const total = p.rent_amount + p.charges_amount

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: -8 },
        show:   { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' } },
      }}
    >
      <Card className={`group transition-colors duration-200 ${
        p.status === 'late' ? 'border-danger/30 hover:border-danger/50' : 'hover:border-primary/30'
      }`}>
        <CardContent className="py-3 px-4 flex items-center gap-4">
          {/* Status icon */}
          <div className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
            p.status === 'paid' ? 'bg-success/10' : p.status === 'late' ? 'bg-danger/10' : 'bg-warning/10'
          }`}>
            <Icon className={`w-4 h-4 ${
              p.status === 'paid' ? 'text-success' : p.status === 'late' ? 'text-danger' : 'text-warning'
            }`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 grid grid-cols-3 gap-3 items-center">
            {/* Bien + Locataire */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-medium text-textPrimary truncate">
                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{p.property_name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-textMuted mt-0.5">
                <User className="w-3 h-3 shrink-0" />
                {p.tenant_first_name} {p.tenant_last_name}
              </div>
            </div>

            {/* Méthode + date */}
            <div className="text-xs text-textMuted flex flex-col gap-0.5">
              <span>{methodLabel(p.payment_method)}</span>
              {p.payment_date && (
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  {formatDate(p.payment_date)}
                </div>
              )}
              {p.notes && (
                <div className="flex items-center gap-1 text-accent">
                  <StickyNote className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{p.notes}</span>
                </div>
              )}
            </div>

            {/* Montant + statut */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-sm font-semibold text-textPrimary">
                <Euro className="w-3.5 h-3.5 text-primary" />
                {formatCurrency(total)}
              </div>
              <Badge variant={cfg.variant as 'success' | 'warning' | 'danger'}>
                {cfg.label}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {p.status !== 'paid' && (
              <button
                onClick={onMarkPaid}
                title="Marquer comme payé"
                className="p-1.5 rounded-lg hover:bg-success/10 text-textMuted hover:text-success transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}
            {p.status === 'paid' && (
              <button
                onClick={onGenerateDocument}
                title="Générer quittance ou reçu"
                className="p-1.5 rounded-lg hover:bg-accent/10 text-textMuted hover:text-accent transition-colors"
              >
                <Receipt className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-surfaceHigh text-textMuted hover:text-textPrimary transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-danger/10 text-textMuted hover:text-danger transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Form modal ─────────────────────────────────────────────────────────────────

function PaymentFormModal({ initial, leases, onSave, onClose }: {
  initial: Payment | null
  leases: Lease[]
  onSave: (data: PaymentInput) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<PaymentInput>(() => {
    if (initial) {
      return {
        lease_id:       initial.lease_id,
        period_month:   initial.period_month,
        period_year:    initial.period_year,
        rent_amount:    initial.rent_amount,
        charges_amount: initial.charges_amount,
        payment_date:   initial.payment_date,
        payment_method: initial.payment_method,
        status:         initial.status,
        notes:          initial.notes,
      }
    }
    return emptyForm()
  })
  const [error,  setError]  = useState('')
  const [saving, setSaving] = useState(false)

  function set<K extends keyof PaymentInput>(field: K, value: PaymentInput[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  // Auto-remplir loyer depuis le bail sélectionné
  useEffect(() => {
    if (!form.lease_id || initial) return
    const lease = leases.find((l) => l.id === form.lease_id)
    if (lease) {
      setForm((f) => ({
        ...f,
        rent_amount:    lease.rent_amount,
        charges_amount: lease.charges_amount,
      }))
    }
  }, [form.lease_id, leases, initial])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.lease_id)          return setError('Sélectionnez un bail.')
    if (form.rent_amount <= 0)   return setError('Le loyer doit être supérieur à 0.')
    if (form.status === 'paid' && !form.payment_date) {
      set('payment_date', today())
    }
    setSaving(true)
    try {
      await onSave(form)
    } catch (err) {
      setError(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
      setSaving(false)
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-textPrimary">
            {initial ? 'Modifier le paiement' : 'Nouveau paiement'}
          </h2>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 overflow-y-auto">
          {/* Bail */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Bail</label>
            <div className="relative">
              <select
                value={form.lease_id}
                onChange={(e) => set('lease_id', Number(e.target.value))}
                disabled={!!initial}
                className="w-full appearance-none bg-surfaceHigh border border-border rounded-lg px-3 py-2 pr-8 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
              >
                <option value={0} disabled>Sélectionnez un bail…</option>
                {leases.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.property_name} · {l.tenant_first_name} {l.tenant_last_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted pointer-events-none" />
            </div>
          </div>

          {/* Période */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Mois</label>
              <div className="relative">
                <select
                  value={form.period_month}
                  onChange={(e) => set('period_month', Number(e.target.value))}
                  className="w-full appearance-none bg-surfaceHigh border border-border rounded-lg px-3 py-2 pr-8 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Année</label>
              <div className="relative">
                <select
                  value={form.period_year}
                  onChange={(e) => set('period_year', Number(e.target.value))}
                  className="w-full appearance-none bg-surfaceHigh border border-border rounded-lg px-3 py-2 pr-8 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
                >
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Montants */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Loyer HC (€)</label>
              <Input
                type="number" min={0} step={0.01}
                value={form.rent_amount || ''}
                onChange={(e) => set('rent_amount', parseFloat(e.target.value) || 0)}
                placeholder="800"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Charges (€)</label>
              <Input
                type="number" min={0} step={0.01}
                value={form.charges_amount || ''}
                onChange={(e) => set('charges_amount', parseFloat(e.target.value) || 0)}
                placeholder="80"
              />
            </div>
          </div>

          {/* Statut */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Statut</label>
            <div className="grid grid-cols-3 gap-2">
              {(['pending', 'paid', 'late'] as const).map((s) => {
                const cfg = STATUS_CONFIG[s]
                const Icon = cfg.icon
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('status', s)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors ${
                      form.status === s
                        ? s === 'paid'    ? 'border-success bg-success/10'
                        : s === 'late'    ? 'border-danger bg-danger/10'
                        : 'border-warning bg-warning/10'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${
                      form.status === s
                        ? s === 'paid' ? 'text-success' : s === 'late' ? 'text-danger' : 'text-warning'
                        : 'text-textMuted'
                    }`} />
                    <span className={`text-xs font-medium ${form.status === s ? 'text-textPrimary' : 'text-textMuted'}`}>
                      {cfg.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date de paiement + méthode */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">
                Date de paiement {form.status !== 'paid' && <span className="opacity-50">(optionnel)</span>}
              </label>
              <Input
                type="date"
                value={form.payment_date ?? ''}
                onChange={(e) => set('payment_date', e.target.value || null)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Mode de paiement</label>
              <div className="relative">
                <select
                  value={form.payment_method ?? 'virement'}
                  onChange={(e) => set('payment_method', e.target.value)}
                  className="w-full appearance-none bg-surfaceHigh border border-border rounded-lg px-3 py-2 pr-8 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
                >
                  {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Notes — optionnel</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value || null)}
              placeholder="Ex : paiement partiel, virement reçu en deux fois…"
              rows={2}
              className="w-full bg-surfaceHigh border border-border rounded-lg px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {error && <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Annuler</Button>
            <Button type="submit" disabled={saving} className="flex-1">
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Enregistrement...' : initial ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Delete modal ───────────────────────────────────────────────────────────────

function DeleteModal({ payment, onConfirm, onClose }: {
  payment: Payment
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm bg-surface border border-danger/30 rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-danger/10 shrink-0">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div>
            <p className="text-sm font-semibold text-textPrimary">Supprimer ce paiement ?</p>
            <p className="text-xs text-textMuted mt-0.5">
              {monthLabel(payment.period_month, payment.period_year)} · {payment.property_name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Annuler</Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1">
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
