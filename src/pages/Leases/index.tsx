import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, ScrollText, Building2, User, CalendarDays,
  Euro, Pencil, Trash2, X, Save, AlertTriangle,
  ShieldCheck, Clock, Ban, TrendingUp, ArrowRight,
  CheckCircle2, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  calculateRevision, isRevisionEligible, isAnniversaryWithinDays,
  parseQuarter, formatQuarter, QUARTER_LABELS,
  type RevisionResult,
} from '@/lib/irl'

// ── Config ────────────────────────────────────────────────────────────────────

const LEASE_TYPES = [
  { value: 'vide',      label: 'Vide',      description: 'Durée min. 3 ans' },
  { value: 'meuble',    label: 'Meublé',    description: 'Durée min. 1 an'  },
  { value: 'mobilite',  label: 'Mobilité',  description: '1 à 10 mois'      },
] as const

const STATUS_CONFIG = {
  active:     { label: 'En cours',   variant: 'success', icon: ShieldCheck },
  ended:      { label: 'Terminé',    variant: 'muted',   icon: Clock       },
  terminated: { label: 'Résilié',    variant: 'danger',  icon: Ban         },
} as const

function typeLabel(t: string) {
  return LEASE_TYPES.find((l) => l.value === t)?.label ?? t
}

const emptyForm: LeaseInput = {
  property_id: 0,
  tenant_id: 0,
  type: 'vide',
  start_date: '',
  end_date: null,
  rent_amount: 0,
  charges_amount: 0,
  deposit_amount: 0,
  status: 'active',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Leases() {
  const [leases, setLeases]       = useState<Lease[]>([])
  const [irlIndices, setIrlIndices] = useState<IrlIndex[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<Lease | null>(null)
  const [deleting, setDeleting]   = useState<Lease | null>(null)
  const [revising, setRevising]   = useState<Lease | null>(null)

  async function load() {
    setLoading(true)
    const [data, irl] = await Promise.all([
      window.api.leases.getAll(),
      window.api.irl.getAll(),
    ])
    setLeases(data)
    setIrlIndices(irl)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd()           { setEditing(null); setShowForm(true) }
  function openEdit(l: Lease)  { setEditing(l); setShowForm(true) }
  function closeForm()         { setShowForm(false); setEditing(null) }

  async function handleSave(data: LeaseInput) {
    if (editing) {
      await window.api.leases.update(editing.id, data)
    } else {
      await window.api.leases.create(data)
    }
    closeForm()
    load()
  }

  async function handleDelete() {
    if (!deleting) return
    await window.api.leases.delete(deleting.id)
    setDeleting(null)
    load()
  }

  async function handleApplyRevision(leaseId: number, newRent: number, newIrlValue: number, newIrlQuarter: string) {
    const lease = leases.find((l) => l.id === leaseId)
    if (!lease) return
    await window.api.leases.update(leaseId, {
      property_id: lease.property_id,
      tenant_id: lease.tenant_id,
      type: lease.type,
      start_date: lease.start_date,
      end_date: lease.end_date,
      rent_amount: newRent,
      charges_amount: lease.charges_amount,
      deposit_amount: lease.deposit_amount,
      irl_reference_index: newIrlValue,
      irl_reference_quarter: newIrlQuarter,
      status: lease.status,
    })
    setRevising(null)
    load()
  }

  const active  = leases.filter((l) => l.status === 'active').length
  const ended   = leases.filter((l) => l.status !== 'active').length

  // Baux éligibles à la révision IRL (anniversaire dans les 60 jours)
  const revisionEligible = leases.filter((l) =>
    l.status === 'active' &&
    isRevisionEligible(l.type, l.start_date, l.irl_reference_index, l.irl_reference_quarter) &&
    isAnniversaryWithinDays(l.start_date, 60)
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">Baux</h1>
          <p className="text-textMuted text-sm mt-1">
            {active} bail{active !== 1 ? 's' : ''} en cours
            {ended > 0 && ` · ${ended} terminé${ended !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" />
          Nouveau bail
        </Button>
      </div>

      {/* IRL revision alert */}
      {revisionEligible.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl"
        >
          <TrendingUp className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-textPrimary">
              {revisionEligible.length} bail{revisionEligible.length > 1 ? 's' : ''} éligible{revisionEligible.length > 1 ? 's' : ''} à la révision IRL
            </p>
            <p className="text-xs text-textMuted mt-0.5">
              La date anniversaire approche — vous pouvez réviser le loyer selon l'indice IRL de l'INSEE.
            </p>
          </div>
        </motion.div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-surface border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : leases.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <motion.div
          className="flex flex-col gap-3"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {leases.map((l) => (
            <LeaseRow
              key={l.id}
              lease={l}
              irlIndices={irlIndices}
              onEdit={() => openEdit(l)}
              onDelete={() => setDeleting(l)}
              onRevise={() => setRevising(l)}
            />
          ))}
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <LeaseFormModal initial={editing} onSave={handleSave} onClose={closeForm} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <DeleteModal lease={deleting} onConfirm={handleDelete} onClose={() => setDeleting(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {revising && (
          <RevisionModal
            lease={revising}
            irlIndices={irlIndices}
            onApply={handleApplyRevision}
            onClose={() => setRevising(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-warning/10">
        <ScrollText className="w-8 h-8 text-warning" />
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">Aucun bail enregistré</p>
        <p className="text-sm text-textMuted mt-1">
          Créez un bail pour associer un bien à un locataire.
        </p>
      </div>
      <Button onClick={onAdd}>
        <Plus className="w-4 h-4" />
        Nouveau bail
      </Button>
    </div>
  )
}

// ── Lease row ──────────────────────────────────────────────────────────────────

function LeaseRow({ lease, irlIndices, onEdit, onDelete, onRevise }: {
  lease: Lease
  irlIndices: IrlIndex[]
  onEdit: () => void
  onDelete: () => void
  onRevise: () => void
}) {
  const status = STATUS_CONFIG[lease.status]
  const StatusIcon = status.icon
  const canRevise = lease.status === 'active' &&
    isRevisionEligible(lease.type, lease.start_date, lease.irl_reference_index, lease.irl_reference_quarter)

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        show:   { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
      }}
    >
      <Card className="group hover:border-primary/40 transition-colors duration-200">
        <CardContent className="py-4 px-5 flex items-center gap-5">
          {/* Status icon */}
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
            lease.status === 'active' ? 'bg-success/10' : lease.status === 'terminated' ? 'bg-danger/10' : 'bg-surfaceHigh'
          }`}>
            <StatusIcon className={`w-4 h-4 ${
              lease.status === 'active' ? 'text-success' : lease.status === 'terminated' ? 'text-danger' : 'text-textMuted'
            }`} />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0 grid grid-cols-4 gap-4 items-center">
            {/* Bien + Locataire */}
            <div className="col-span-1 min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-textPrimary truncate">
                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{lease.property_name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-textMuted mt-0.5">
                <User className="w-3 h-3 shrink-0" />
                <span>{lease.tenant_first_name} {lease.tenant_last_name}</span>
              </div>
            </div>

            {/* Type + statut + IRL */}
            <div className="flex flex-col gap-1">
              <Badge variant="muted">{typeLabel(lease.type)}</Badge>
              <Badge variant={status.variant as 'success' | 'danger' | 'muted'}>
                {status.label}
              </Badge>
              {lease.irl_reference_quarter && (
                <span className="text-[10px] text-textMuted">
                  IRL : {lease.irl_reference_quarter}
                </span>
              )}
            </div>

            {/* Dates */}
            <div className="flex flex-col gap-1 text-xs text-textMuted">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                <span>Depuis le {formatDate(lease.start_date)}</span>
              </div>
              {lease.end_date && (
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0 opacity-0" />
                  <span>Jusqu'au {formatDate(lease.end_date)}</span>
                </div>
              )}
            </div>

            {/* Montants */}
            <div className="flex flex-col gap-1 text-right">
              <div className="flex items-center justify-end gap-1 text-sm font-semibold text-textPrimary">
                <Euro className="w-3.5 h-3.5 text-primary" />
                {formatCurrency(lease.rent_amount)} / mois
              </div>
              {lease.charges_amount > 0 && (
                <p className="text-xs text-textMuted">+ {formatCurrency(lease.charges_amount)} charges</p>
              )}
              {lease.deposit_amount > 0 && (
                <p className="text-xs text-textMuted">Dépôt : {formatCurrency(lease.deposit_amount)}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {canRevise && (
              <button
                onClick={onRevise}
                title="Réviser le loyer (IRL)"
                className="p-1.5 rounded-lg hover:bg-primary/10 text-textMuted hover:text-primary transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" />
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

function LeaseFormModal({
  initial, onSave, onClose,
}: {
  initial: Lease | null
  onSave: (data: LeaseInput) => Promise<void>
  onClose: () => void
}) {
  const [properties, setProperties]   = useState<Property[]>([])
  const [tenants, setTenants]         = useState<Tenant[]>([])
  const [irlIndices, setIrlIndices]   = useState<IrlIndex[]>([])
  const [form, setForm] = useState<LeaseInput>(
    initial
      ? {
          property_id: initial.property_id,
          tenant_id: initial.tenant_id,
          type: initial.type,
          start_date: initial.start_date,
          end_date: initial.end_date,
          rent_amount: initial.rent_amount,
          charges_amount: initial.charges_amount,
          deposit_amount: initial.deposit_amount,
          irl_reference_index: initial.irl_reference_index,
          irl_reference_quarter: initial.irl_reference_quarter,
          status: initial.status,
        }
      : emptyForm
  )
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      window.api.properties.getAll(),
      window.api.tenants.getAll(),
      window.api.irl.getAll(),
    ]).then(([props, tens, irl]) => {
      setProperties(props)
      setTenants(tens)
      setIrlIndices(irl)
      // Pré-sélectionner si un seul choix
      if (!initial) {
        if (props.length === 1) setForm((f) => ({ ...f, property_id: props[0].id }))
        if (tens.length === 1)  setForm((f) => ({ ...f, tenant_id: tens[0].id }))
      }
    })
  }, [initial])

  // Options IRL triées pour le dropdown (ex: "2025-T1 (145.40)")
  const irlOptions = irlIndices.map((idx) => ({
    label: formatQuarter(idx.year, idx.quarter),
    value: idx.value,
  }))

  function set<K extends keyof LeaseInput>(field: K, value: LeaseInput[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  // Calcul automatique du dépôt de garantie selon la loi ALUR
  function computeMaxDeposit() {
    if (form.type === 'vide')     return form.rent_amount * 1
    if (form.type === 'meuble')   return form.rent_amount * 2
    return 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.property_id)     return setError('Sélectionnez un bien.')
    if (!form.tenant_id)       return setError('Sélectionnez un locataire.')
    if (!form.start_date)      return setError('La date de début est requise.')
    if (form.rent_amount <= 0) return setError('Le loyer doit être supérieur à 0.')
    if (form.type === 'mobilite' && !form.end_date)
      return setError('Le bail mobilité requiert une date de fin.')
    setSaving(true)
    try {
      await onSave(form)
    } catch (err) {
      setError(`Erreur lors de l'enregistrement : ${err instanceof Error ? err.message : String(err)}`)
      setSaving(false)
    }
  }

  const noProperties = properties.length === 0
  const noTenants    = tenants.length === 0

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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-textPrimary">
            {initial ? 'Modifier le bail' : 'Nouveau bail'}
          </h2>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 overflow-y-auto">

          {/* Alertes si données manquantes */}
          {(noProperties || noTenants) && (
            <div className="flex flex-col gap-2">
              {noProperties && (
                <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2">
                  Aucun bien disponible — ajoutez d'abord un bien dans "Biens".
                </p>
              )}
              {noTenants && (
                <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2">
                  Aucun locataire disponible — ajoutez d'abord un locataire dans "Locataires".
                </p>
              )}
            </div>
          )}

          {/* Bien */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Bien immobilier</label>
            <select
              value={form.property_id}
              onChange={(e) => set('property_id', Number(e.target.value))}
              disabled={noProperties}
              className="w-full bg-surfaceHigh border border-border rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
            >
              <option value={0} disabled>Sélectionnez un bien…</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.address}, {p.city}
                </option>
              ))}
            </select>
          </div>

          {/* Locataire */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Locataire</label>
            <select
              value={form.tenant_id}
              onChange={(e) => set('tenant_id', Number(e.target.value))}
              disabled={noTenants}
              className="w-full bg-surfaceHigh border border-border rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
            >
              <option value={0} disabled>Sélectionnez un locataire…</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Type de bail */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Type de bail</label>
            <div className="grid grid-cols-3 gap-2">
              {LEASE_TYPES.map(({ value, label, description }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('type', value)}
                  className={`flex flex-col items-start gap-0.5 p-3 rounded-lg border text-left transition-colors ${
                    form.type === value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <span className={`text-xs font-semibold ${form.type === value ? 'text-primary' : 'text-textPrimary'}`}>{label}</span>
                  <span className="text-[10px] text-textMuted">{description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Date de début</label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => set('start_date', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">
                Date de fin {form.type !== 'mobilite' && <span className="opacity-50">(optionnel)</span>}
              </label>
              <Input
                type="date"
                value={form.end_date ?? ''}
                onChange={(e) => set('end_date', e.target.value || null)}
              />
            </div>
          </div>

          {/* Loyer + Charges */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Loyer HC (€/mois)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.rent_amount || ''}
                onChange={(e) => set('rent_amount', parseFloat(e.target.value) || 0)}
                placeholder="800"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Charges (€/mois)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.charges_amount || ''}
                onChange={(e) => set('charges_amount', parseFloat(e.target.value) || 0)}
                placeholder="80"
              />
            </div>
          </div>

          {/* Dépôt de garantie */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted flex items-center justify-between">
              <span>Dépôt de garantie (€)</span>
              {form.rent_amount > 0 && form.type !== 'mobilite' && (
                <button
                  type="button"
                  onClick={() => set('deposit_amount', computeMaxDeposit())}
                  className="text-primary hover:underline text-[10px]"
                >
                  Max légal : {formatCurrency(computeMaxDeposit())}
                </button>
              )}
            </label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.deposit_amount || ''}
              onChange={(e) => set('deposit_amount', parseFloat(e.target.value) || 0)}
              placeholder="800"
            />
          </div>

          {/* IRL reference (pour baux vide/meublé) */}
          {form.type !== 'mobilite' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" />
                Indice IRL de référence
                <span className="opacity-50">(pour révision annuelle)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-textMuted">Trimestre</label>
                  <select
                    value={form.irl_reference_quarter ?? ''}
                    onChange={(e) => {
                      const val = e.target.value || null
                      set('irl_reference_quarter', val)
                      const match = irlOptions.find((o) => o.label === val)
                      if (match) set('irl_reference_index', match.value)
                    }}
                    className="w-full bg-surfaceHigh border border-border rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="">Non défini</option>
                    {irlOptions.map((opt) => (
                      <option key={opt.label} value={opt.label}>{opt.label} ({opt.value})</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-textMuted">Valeur IRL</label>
                  <Input
                    type="number"
                    step={0.01}
                    value={form.irl_reference_index ?? ''}
                    onChange={(e) => set('irl_reference_index', parseFloat(e.target.value) || null)}
                    placeholder="ex: 143.46"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Statut (si modification) */}
          {initial && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Statut</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full bg-surfaceHigh border border-border rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
              >
                <option value="active">En cours</option>
                <option value="ended">Terminé</option>
                <option value="terminated">Résilié</option>
              </select>
            </div>
          )}

          {error && (
            <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Annuler</Button>
            <Button type="submit" disabled={saving || noProperties || noTenants} className="flex-1">
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Enregistrement...' : initial ? 'Modifier' : 'Créer le bail'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Revision modal ────────────────────────────────────────────────────────────

function RevisionModal({ lease, irlIndices, onApply, onClose }: {
  lease: Lease
  irlIndices: IrlIndex[]
  onApply: (leaseId: number, newRent: number, newIrlValue: number, newIrlQuarter: string) => Promise<void>
  onClose: () => void
}) {
  const [applying, setApplying] = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  // Parse le trimestre de référence du bail
  const refParsed = lease.irl_reference_quarter ? parseQuarter(lease.irl_reference_quarter) : null
  const refValue  = lease.irl_reference_index

  // Chercher le dernier IRL disponible pour le même trimestre
  const latestIrl = refParsed
    ? irlIndices
        .filter((idx) => idx.quarter === refParsed.quarter && idx.year > refParsed.year)
        .sort((a, b) => b.year - a.year)[0]
    : null

  // Calculer la révision
  const revision: RevisionResult | null =
    refValue && latestIrl && refParsed
      ? calculateRevision(
          lease.rent_amount,
          refValue,
          latestIrl.value,
          lease.irl_reference_quarter!,
          formatQuarter(latestIrl.year, latestIrl.quarter),
        )
      : null

  async function handleApply() {
    if (!revision || !latestIrl) return
    setApplying(true)
    setError('')
    try {
      await onApply(
        lease.id,
        revision.newRent,
        latestIrl.value,
        formatQuarter(latestIrl.year, latestIrl.quarter),
      )
      setDone(true)
    } catch (err) {
      setError(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
      setApplying(false)
    }
  }

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
        className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-textPrimary">Révision IRL du loyer</h2>
          </div>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-success/10">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
            <p className="text-base font-semibold text-textPrimary">Loyer révisé !</p>
            <p className="text-sm text-textMuted text-center">
              Le nouveau loyer de {formatCurrency(revision!.newRent)} a été appliqué.
            </p>
            <Button onClick={onClose} className="mt-2">Fermer</Button>
          </div>
        ) : !revision ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-warning/10">
              <AlertTriangle className="w-7 h-7 text-warning" />
            </div>
            <p className="text-base font-semibold text-textPrimary">Révision impossible</p>
            <p className="text-sm text-textMuted text-center">
              {!refParsed
                ? 'Le trimestre IRL de référence n\'est pas défini pour ce bail.'
                : !refValue
                  ? 'La valeur IRL de référence n\'est pas définie pour ce bail.'
                  : 'Aucun indice IRL plus récent n\'est disponible pour ce trimestre.'}
            </p>
            <p className="text-xs text-textMuted">
              Modifiez le bail pour définir l'IRL de référence, ou ajoutez un indice IRL plus récent.
            </p>
            <Button variant="secondary" onClick={onClose} className="mt-2">Fermer</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-6">
            {/* Lease info */}
            <div className="bg-surfaceHigh rounded-lg p-3 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between text-textMuted">
                <span>Bien</span>
                <span className="text-textPrimary font-medium">{lease.property_name}</span>
              </div>
              <div className="flex justify-between text-textMuted">
                <span>Locataire</span>
                <span className="text-textPrimary font-medium">{lease.tenant_first_name} {lease.tenant_last_name}</span>
              </div>
              <div className="flex justify-between text-textMuted">
                <span>Type</span>
                <span className="text-textPrimary font-medium">{typeLabel(lease.type)}</span>
              </div>
            </div>

            {/* IRL comparison */}
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-surfaceHigh rounded-lg p-3 text-center">
                <p className="text-[10px] text-textMuted uppercase tracking-wide">IRL référence</p>
                <p className="text-lg font-bold text-textPrimary mt-1">{revision.referenceIrl}</p>
                <p className="text-xs text-textMuted">{revision.referenceLabel}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                <p className="text-[10px] text-primary uppercase tracking-wide">Nouvel IRL</p>
                <p className="text-lg font-bold text-primary mt-1">{revision.newIrl}</p>
                <p className="text-xs text-textMuted">{revision.newLabel}</p>
              </div>
            </div>

            {/* Rent comparison */}
            <div className="bg-surfaceHigh rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-textMuted">Loyer actuel</span>
                <span className="text-textPrimary font-medium">{formatCurrency(revision.oldRent)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-textMuted">Nouveau loyer</span>
                <span className="text-primary font-bold text-base">{formatCurrency(revision.newRent)}</span>
              </div>
              <div className="border-t border-border mt-3 pt-3 flex items-center justify-between text-xs">
                <span className="text-textMuted">Augmentation</span>
                <span className="text-success font-semibold">
                  +{formatCurrency(revision.difference)} (+{revision.percentChange}%)
                </span>
              </div>
            </div>

            <p className="text-[10px] text-textMuted leading-relaxed">
              Formule : loyer × (nouvel IRL / IRL de référence) = {revision.oldRent} × ({revision.newIrl} / {revision.referenceIrl}) = {revision.newRent} €
            </p>

            {error && <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Annuler</Button>
              <Button onClick={handleApply} disabled={applying} className="flex-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {applying ? 'Application...' : 'Appliquer la révision'}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Delete modal ───────────────────────────────────────────────────────────────

function DeleteModal({ lease, onConfirm, onClose }: { lease: Lease; onConfirm: () => void; onClose: () => void }) {
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
            <p className="text-sm font-semibold text-textPrimary">Supprimer ce bail ?</p>
            <p className="text-xs text-textMuted mt-0.5">
              {lease.property_name} · {lease.tenant_first_name} {lease.tenant_last_name}
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
