import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Building2, MapPin, Ruler, Pencil, Trash2,
  X, Save, AlertTriangle, Home, Warehouse, Car, UserCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatOwnerDisplayName, resolveOwnerProfileById } from '@/lib/ownerProfiles'
import { useOwnerStore } from '@/stores/useOwnerStore'

// ── Types ─────────────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  { value: 'appartement', labelKey: 'properties.typeAppartement', icon: Building2 },
  { value: 'maison',      labelKey: 'properties.typeMaison',      icon: Home      },
  { value: 'studio',      labelKey: 'properties.typeStudio',      icon: Building2 },
  { value: 'parking',     labelKey: 'properties.typeParking',     icon: Car       },
  { value: 'autre',       labelKey: 'properties.typeAutre',       icon: Warehouse },
] as const

type PropertyType = typeof PROPERTY_TYPES[number]['value']

const emptyForm: PropertyInput = {
  name: '', address: '', city: '', zip: '', type: 'appartement', area_m2: null, owner_profile_id: null,
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Properties() {
  const { t } = useTranslation()
  const owners = useOwnerStore((state) => state.owners)
  const activeOwner = useOwnerStore((state) => state.activeOwner)
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<Property | null>(null)
  const [deleting, setDeleting]     = useState<Property | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

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
  function closeDelete() {
    setDeleting(null)
    setDeleteError('')
    setDeleteLoading(false)
  }

  async function handleSave(data: PropertyInput) {
    if (editing) {
      await window.api.properties.update(editing.id, data, editing.updated_at)
    } else {
      await window.api.properties.create(data)
    }
    closeForm()
    load()
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await window.api.properties.delete(deleting.id)
      closeDelete()
      load()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err))
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">{t('properties.title')}</h1>
          <p className="text-textMuted text-sm mt-1">
            {t('properties.count', { count: properties.length })}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" />
          {t('properties.add')}
        </Button>
      </div>

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
              ownerLabel={formatOwnerDisplayName(
                resolveOwnerProfileById(owners, p.owner_profile_id),
                t('properties.ownerDefaultNone'),
              )}
              onEdit={() => openEdit(p)}
              onDelete={() => setDeleting(p)}
            />
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {showForm && (
          <PropertyFormModal
            initial={editing}
            owners={owners}
            defaultOwnerId={activeOwner?.id ?? null}
            onSave={handleSave}
            onClose={closeForm}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <DeleteModal
            property={deleting}
            onConfirm={handleDelete}
            onClose={closeDelete}
            error={deleteError}
            loading={deleteLoading}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
        <Building2 className="w-8 h-8 text-primary" />
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">{t('properties.empty')}</p>
        <p className="text-sm text-textMuted mt-1">{t('properties.emptyDesc')}</p>
      </div>
      <Button onClick={onAdd}>
        <Plus className="w-4 h-4" />
        {t('properties.add')}
      </Button>
    </div>
  )
}

function PropertyCard({
  property, ownerLabel, onEdit, onDelete,
}: {
  property: Property
  ownerLabel: string
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const TypeIcon = PROPERTY_TYPES.find((pt) => pt.value === property.type)?.icon ?? Building2
  const typeLabelKey = PROPERTY_TYPES.find((pt) => pt.value === property.type)?.labelKey

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        show:   { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
      }}
    >
      <Card className="group hover:border-primary/40 transition-colors duration-200">
        <CardContent className="pt-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                <TypeIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-textPrimary truncate">{property.name}</p>
                <Badge variant="muted" className="mt-0.5 text-[10px]">{typeLabelKey ? t(typeLabelKey) : property.type}</Badge>
              </div>
            </div>
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

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-textMuted">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{property.address}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-textMuted">
              <MapPin className="w-3.5 h-3.5 shrink-0 opacity-0" />
              <span>{property.zip} {property.city}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-textMuted">
              <UserCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{t('properties.ownerDefaultLabel', { owner: ownerLabel })}</span>
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

function PropertyFormModal({
  initial, owners, defaultOwnerId, onSave, onClose,
}: {
  initial: Property | null
  owners: OwnerProfile[]
  defaultOwnerId: string | null
  onSave: (data: PropertyInput) => Promise<void>
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState<PropertyInput>(
    initial
      ? {
          name: initial.name,
          address: initial.address,
          city: initial.city,
          zip: initial.zip,
          type: initial.type,
          area_m2: initial.area_m2,
          owner_profile_id: initial.owner_profile_id,
        }
      : { ...emptyForm, owner_profile_id: defaultOwnerId }
  )
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  function set(field: keyof PropertyInput, value: string | number | null) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim())    return setError(t('properties.nameRequired'))
    if (!form.address.trim()) return setError(t('properties.addressRequired'))
    if (!form.city.trim())    return setError(t('properties.cityRequired'))
    if (!form.zip.trim())     return setError(t('properties.zipRequired'))
    setSaving(true)
    try {
      await onSave(form)
    } catch (err) {
      setError(`${t('common.error')} : ${err instanceof Error ? err.message : String(err)}`)
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
            {initial ? t('properties.editTitle') : t('properties.addTitle')}
          </h2>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{t('properties.name')}</label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={t('properties.namePlaceholder')} autoFocus />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{t('properties.type')}</label>
            <div className="grid grid-cols-5 gap-1.5">
              {PROPERTY_TYPES.map(({ value, labelKey, icon: Icon }) => (
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
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{t('properties.address')}</label>
            <Input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder={t('properties.addressPlaceholder')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('properties.zip')}</label>
              <Input value={form.zip} onChange={(e) => set('zip', e.target.value)} placeholder={t('properties.zipPlaceholder')} maxLength={5} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('properties.city')}</label>
              <Input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder={t('properties.cityPlaceholder')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{t('properties.areaLabel')}</label>
            <Input
              type="number"
              min={1}
              value={form.area_m2 ?? ''}
              onChange={(e) => set('area_m2', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder={t('properties.areaPlaceholder')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{t('properties.ownerDefault')}</label>
            <select
              value={form.owner_profile_id ?? ''}
              onChange={(e) => set('owner_profile_id', e.target.value || null)}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t('properties.ownerDefaultNone')}</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {formatOwnerDisplayName(owner, t('profile.unnamedOwner'))}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-textMuted">{t('properties.ownerDefaultHelp')}</p>
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              <Save className="w-3.5 h-3.5" />
              {saving ? t('common.saving') : initial ? t('common.edit') : t('common.add')}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function DeleteModal({
  property, onConfirm, onClose, error, loading,
}: {
  property: Property
  onConfirm: () => void
  onClose: () => void
  error: string
  loading: boolean
}) {
  const { t } = useTranslation()
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
            <p className="text-sm font-semibold text-textPrimary">{t('properties.deleteTitle')}</p>
            <p className="text-xs text-textMuted mt-0.5">{t('properties.deleteDesc', { name: property.name })}</p>
          </div>
        </div>
        {error ? (
          <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
        ) : null}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>{t('common.cancel')}</Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1" disabled={loading}>
            <Trash2 className="w-3.5 h-3.5" />
            {loading ? t('common.deleting') : t('common.delete')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
