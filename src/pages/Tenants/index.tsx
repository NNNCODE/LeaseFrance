import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Users, Mail, Phone, Pencil, Trash2,
  X, Save, AlertTriangle, User, Building2,
  Euro, CalendarDays, CheckCircle2, AlertCircle, ScrollText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import TenantLedgerModal from './TenantLedgerModal'

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(t: Tenant) {
  return (t.first_name[0] ?? '') + (t.last_name[0] ?? '')
}

const emptyForm: TenantInput = { first_name: '', last_name: '', email: '', phone: '' }

const AVATAR_COLORS = [
  'bg-primary/20 text-primary',
  'bg-success/20 text-success',
  'bg-warning/20 text-warning',
  'bg-accent/20 text-accent',
]
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length] }

const LEASE_TYPE_LABELS: Record<string, string> = {
  vide:      'Bail vide',
  meuble:    'Bail meublé',
  mobilite:  'Bail mobilité',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<Tenant | null>(null)
  const [deleting, setDeleting]   = useState<Tenant | null>(null)
  const [ledgerTenant, setLedgerTenant] = useState<Tenant | null>(null)

  async function load() {
    setLoading(true)
    const data = await window.api.tenants.getAll()
    setTenants(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase()
    return (
      t.first_name.toLowerCase().includes(q) ||
      t.last_name.toLowerCase().includes(q) ||
      (t.email ?? '').toLowerCase().includes(q) ||
      (t.property_name ?? '').toLowerCase().includes(q)
    )
  })

  const withLease    = tenants.filter((t) => t.lease_id).length
  const withUnpaid   = tenants.filter((t) => t.unpaid_count > 0).length

  function openAdd()           { setEditing(null); setShowForm(true) }
  function openEdit(t: Tenant) { setEditing(t); setShowForm(true) }
  function closeForm()         { setShowForm(false); setEditing(null) }

  async function handleSave(data: TenantInput) {
    if (editing) {
      await window.api.tenants.update(editing.id, data)
    } else {
      await window.api.tenants.create(data)
    }
    closeForm()
    load()
  }

  async function handleDelete() {
    if (!deleting) return
    await window.api.tenants.delete(deleting.id)
    setDeleting(null)
    load()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">Locataires</h1>
          <p className="text-textMuted text-sm mt-1">
            {tenants.length} locataire{tenants.length !== 1 ? 's' : ''}
            {withLease > 0 && ` · ${withLease} avec bail actif`}
            {withUnpaid > 0 && ` · `}
            {withUnpaid > 0 && <span className="text-danger">{withUnpaid} impayé{withUnpaid !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" />
          Ajouter un locataire
        </Button>
      </div>

      {/* Search */}
      {tenants.length > 0 && (
        <div className="relative max-w-sm">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
          <Input
            className="pl-9"
            placeholder="Nom, email, bien…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-surface border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-textMuted">
          <User className="w-8 h-8 opacity-30" />
          <p className="text-sm">Aucun résultat pour « {search} »</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 gap-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {filtered.map((t) => (
            <TenantCard
              key={t.id}
              tenant={t}
              onEdit={() => openEdit(t)}
              onDelete={() => setDeleting(t)}
              onOpenLedger={() => setLedgerTenant(t)}
            />
          ))}
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <TenantFormModal initial={editing} onSave={handleSave} onClose={closeForm} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleting && (
          <DeleteModal tenant={deleting} onConfirm={handleDelete} onClose={() => setDeleting(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {ledgerTenant && (
          <TenantLedgerModal tenant={ledgerTenant} onClose={() => setLedgerTenant(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-success/10">
        <Users className="w-8 h-8 text-success" />
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">Aucun locataire enregistré</p>
        <p className="text-sm text-textMuted mt-1">
          Ajoutez vos locataires, puis créez un bail pour les associer à un bien.
        </p>
      </div>
      <Button onClick={onAdd}>
        <Plus className="w-4 h-4" />
        Ajouter un locataire
      </Button>
    </div>
  )
}

// ── Tenant card ────────────────────────────────────────────────────────────────

function TenantCard({ tenant: t, onEdit, onDelete, onOpenLedger }: {
  tenant: Tenant
  onEdit: () => void
  onDelete: () => void
  onOpenLedger: () => void
}) {
  const hasLease   = !!t.lease_id
  const hasUnpaid  = t.unpaid_count > 0
  const totalRent  = (t.rent_amount ?? 0) + (t.charges_amount ?? 0)

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        show:   { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
      }}
    >
      <Card className={`group h-full transition-colors duration-200 ${
        hasUnpaid ? 'border-danger/30 hover:border-danger/50' : 'hover:border-primary/40'
      }`}>
        <CardContent className="pt-5 flex flex-col gap-4">
          {/* Top : avatar + nom + actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-11 h-11 rounded-xl text-sm font-bold shrink-0 uppercase ${avatarColor(t.id)}`}>
                {initials(t)}
              </div>
              <div>
                <p className="text-sm font-semibold text-textPrimary">
                  {t.first_name} {t.last_name}
                </p>
                <p className="text-xs text-textMuted mt-0.5">
                  Depuis le {formatDate(t.created_at)}
                </p>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-surfaceHigh text-textMuted hover:text-textPrimary transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-danger/10 text-textMuted hover:text-danger transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-1.5">
            {t.email ? (
              <div className="flex items-center gap-1.5 text-xs text-textMuted">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t.email}</span>
              </div>
            ) : null}
            {t.phone ? (
              <div className="flex items-center gap-1.5 text-xs text-textMuted">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>{t.phone}</span>
              </div>
            ) : null}
            {!t.email && !t.phone && (
              <p className="text-xs text-textMuted italic opacity-50">Aucun contact renseigné</p>
            )}
          </div>

          {/* Séparateur */}
          <div className="border-t border-border" />

          {/* Bail actif ou non */}
          {hasLease ? (
            <div className="flex flex-col gap-2">
              {/* Bien */}
              <div className="flex items-center gap-1.5 text-xs">
                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-medium text-textPrimary truncate">{t.property_name}</span>
                <span className="text-textMuted shrink-0">{t.property_city}</span>
              </div>

              {/* Loyer + type */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-textMuted">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  <span>Depuis {formatDate(t.lease_start_date!)}</span>
                </div>
                <Badge variant="muted" className="text-[10px]">
                  {LEASE_TYPE_LABELS[t.lease_type ?? ''] ?? t.lease_type}
                </Badge>
              </div>

              {/* Montant + statut paiement */}
              <div className="flex items-center justify-between mt-0.5">
                <div className="flex items-center gap-1 text-sm font-semibold text-textPrimary">
                  <Euro className="w-3.5 h-3.5 text-primary" />
                  {formatCurrency(totalRent)} / mois
                </div>
                {hasUnpaid ? (
                  <div className="flex items-center gap-1 text-xs text-danger">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {t.unpaid_count} impayé{t.unpaid_count > 1 ? 's' : ''}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    À jour
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-textMuted">
              <div className="w-2 h-2 rounded-full bg-textMuted/30" />
              <span className="italic">Aucun bail actif</span>
            </div>
          )}

          {hasLease && (
            <Button variant="outline" size="sm" onClick={onOpenLedger} className="w-full">
              <ScrollText className="w-3.5 h-3.5" />
              Compte locataire
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Form modal ─────────────────────────────────────────────────────────────────

function TenantFormModal({ initial, onSave, onClose }: {
  initial: Tenant | null
  onSave: (data: TenantInput) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<TenantInput>(
    initial
      ? { first_name: initial.first_name, last_name: initial.last_name, email: initial.email ?? '', phone: initial.phone ?? '' }
      : emptyForm
  )
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  function set(field: keyof TenantInput, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.first_name.trim()) return setError('Le prénom est requis.')
    if (!form.last_name.trim())  return setError('Le nom est requis.')
    setSaving(true)
    try {
      await onSave({
        ...form,
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
      })
    } catch (err) {
      setError(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
      setSaving(false)
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-textPrimary">
            {initial ? 'Modifier le locataire' : 'Ajouter un locataire'}
          </h2>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Prénom</label>
              <Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="Jean" autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Nom</label>
              <Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="Dupont" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Adresse e-mail — optionnel</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <Input className="pl-9" type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} placeholder="jean.dupont@email.fr" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Téléphone — optionnel</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <Input className="pl-9" type="tel" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="06 12 34 56 78" />
            </div>
          </div>

          {error && <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Annuler</Button>
            <Button type="submit" disabled={saving} className="flex-1">
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Enregistrement...' : initial ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Delete modal ───────────────────────────────────────────────────────────────

function DeleteModal({ tenant, onConfirm, onClose }: {
  tenant: Tenant
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
            <p className="text-sm font-semibold text-textPrimary">Supprimer ce locataire ?</p>
            <p className="text-xs text-textMuted mt-0.5">
              « {tenant.first_name} {tenant.last_name} » sera supprimé définitivement.
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
