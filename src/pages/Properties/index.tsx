import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Building2, MapPin, Ruler, Pencil, Trash2,
  X, Save, AlertTriangle, Home, Warehouse, Car,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ── Types ─────────────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  { value: 'appartement', label: 'Appartement', icon: Building2 },
  { value: 'maison',      label: 'Maison',       icon: Home      },
  { value: 'studio',      label: 'Studio',       icon: Building2 },
  { value: 'parking',     label: 'Parking',      icon: Car       },
  { value: 'autre',       label: 'Autre',        icon: Warehouse },
] as const

type PropertyType = typeof PROPERTY_TYPES[number]['value']

const typeLabel = (t: string) => PROPERTY_TYPES.find((p) => p.value === t)?.label ?? t

const emptyForm: PropertyInput = {
  name: '', address: '', city: '', zip: '', type: 'appartement', area_m2: null,
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<Property | null>(null)
  const [deleting, setDeleting]     = useState<Property | null>(null)

  async function load() {
    setLoading(true)
    const data = await window.api.properties.getAll()
    setProperties(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() { setEditing(null); setShowForm(true) }
  function openEdit(p: Property) { setEditing(p); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditing(null) }

  async function handleSave(data: PropertyInput) {
    if (editing) {
      await window.api.properties.update(editing.id, data)
    } else {
      await window.api.properties.create(data)
    }
    closeForm()
    load()
  }

  async function handleDelete() {
    if (!deleting) return
    await window.api.properties.delete(deleting.id)
    setDeleting(null)
    load()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">Biens immobiliers</h1>
          <p className="text-textMuted text-sm mt-1">
            {properties.length} bien{properties.length !== 1 ? 's' : ''} enregistré{properties.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" />
          Ajouter un bien
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-surface border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <motion.div
          className="grid grid-cols-3 gap-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        >
          {properties.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              onEdit={() => openEdit(p)}
              onDelete={() => setDeleting(p)}
            />
          ))}
        </motion.div>
      )}

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <PropertyFormModal
            initial={editing}
            onSave={handleSave}
            onClose={closeForm}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleting && (
          <DeleteModal
            property={deleting}
            onConfirm={handleDelete}
            onClose={() => setDeleting(null)}
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
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
        <Building2 className="w-8 h-8 text-primary" />
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">Aucun bien enregistré</p>
        <p className="text-sm text-textMuted mt-1">Ajoutez votre premier bien pour commencer.</p>
      </div>
      <Button onClick={onAdd}>
        <Plus className="w-4 h-4" />
        Ajouter un bien
      </Button>
    </div>
  )
}

// ── Property card ──────────────────────────────────────────────────────────────

function PropertyCard({
  property, onEdit, onDelete,
}: {
  property: Property
  onEdit: () => void
  onDelete: () => void
}) {
  const TypeIcon = PROPERTY_TYPES.find((t) => t.value === property.type)?.icon ?? Building2

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        show:   { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
      }}
    >
      <Card className="group hover:border-primary/40 transition-colors duration-200">
        <CardContent className="pt-5 flex flex-col gap-3">
          {/* Top */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                <TypeIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-textPrimary truncate">{property.name}</p>
                <Badge variant="muted" className="mt-0.5 text-[10px]">{typeLabel(property.type)}</Badge>
              </div>
            </div>
            {/* Actions — visible on hover */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg hover:bg-surfaceHigh text-textMuted hover:text-textPrimary transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg hover:bg-danger/10 text-textMuted hover:text-danger transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-textMuted">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{property.address}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-textMuted">
              <MapPin className="w-3.5 h-3.5 shrink-0 opacity-0" />
              <span>{property.zip} {property.city}</span>
            </div>
            {property.area_m2 && (
              <div className="flex items-center gap-1.5 text-xs text-textMuted">
                <Ruler className="w-3.5 h-3.5 shrink-0" />
                <span>{property.area_m2} m²</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Form modal ─────────────────────────────────────────────────────────────────

function PropertyFormModal({
  initial, onSave, onClose,
}: {
  initial: Property | null
  onSave: (data: PropertyInput) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<PropertyInput>(
    initial
      ? { name: initial.name, address: initial.address, city: initial.city, zip: initial.zip, type: initial.type, area_m2: initial.area_m2 }
      : emptyForm
  )
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  function set(field: keyof PropertyInput, value: string | number | null) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim())    return setError('Le nom est requis.')
    if (!form.address.trim()) return setError("L'adresse est requise.")
    if (!form.city.trim())    return setError('La ville est requise.')
    if (!form.zip.trim())     return setError('Le code postal est requis.')
    setSaving(true)
    try {
      await onSave(form)
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
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-textPrimary">
            {initial ? 'Modifier le bien' : 'Ajouter un bien'}
          </h2>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {/* Nom */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Nom du bien</label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Apt. Marais 3P" autoFocus />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Type</label>
            <div className="grid grid-cols-5 gap-1.5">
              {PROPERTY_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('type', value)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs transition-colors ${
                    form.type === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-textMuted hover:border-primary/40 hover:text-textPrimary'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Adresse */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Adresse</label>
            <Input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="12 rue de Rivoli" />
          </div>

          {/* Ville + CP */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Code postal</label>
              <Input value={form.zip} onChange={(e) => set('zip', e.target.value)} placeholder="75004" maxLength={5} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Ville</label>
              <Input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Paris" />
            </div>
          </div>

          {/* Surface */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Surface (m²) — optionnel</label>
            <Input
              type="number"
              min={1}
              value={form.area_m2 ?? ''}
              onChange={(e) => set('area_m2', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="45"
            />
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Annuler
            </Button>
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

function DeleteModal({
  property, onConfirm, onClose,
}: {
  property: Property
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
            <p className="text-sm font-semibold text-textPrimary">Supprimer ce bien ?</p>
            <p className="text-xs text-textMuted mt-0.5">« {property.name} » sera supprimé définitivement.</p>
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
