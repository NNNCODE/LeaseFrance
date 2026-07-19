import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Building2, MapPin, Ruler, Pencil, Trash2,
  X, Save, AlertTriangle, Home, Warehouse, Car, UserCircle2,
  ShieldCheck, CalendarClock,
} from 'lucide-react'
import AttachmentPanel from '@/components/AttachmentPanel'
import { Button } from '@/components/ui/button'
import DateInput from '@/components/ui/date-input'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatOwnerDisplayName, resolveOwnerProfileById } from '@/lib/ownerProfiles'
import { DPE_CLASSES, PROPERTY_DIAGNOSTIC_SLOTS, getDpeRule, inferDpeExpiry } from '@/lib/propertyDiagnostics'
import { useOwnerStore } from '@/stores/useOwnerStore'

// ── Types ─────────────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  { value: 'appartement', labelKey: 'properties.typeAppartement', icon: Building2 },
  { value: 'maison',      labelKey: 'properties.typeMaison',      icon: Home      },
  { value: 'studio',      labelKey: 'properties.typeStudio',      icon: Building2 },
  { value: 'parking',     labelKey: 'properties.typeParking',     icon: Car       },
  { value: 'autre',       labelKey: 'properties.typeAutre',       icon: Warehouse },
] as const


const emptyForm: PropertyInput = {
  name: '', address: '', city: '', zip: '', type: 'appartement', area_m2: null, owner_profile_id: null,
}

const emptyDiagnosticsForm: PropertyDiagnosticsInput = {
  dpe_class: null,
  dpe_ges_class: null,
  dpe_performed_at: null,
  dpe_expires_at: null,
  dpe_ademe_number: null,
  dpe_energy_estimate: null,
  lead_performed_at: null,
  lead_expires_at: null,
  gas_performed_at: null,
  gas_expires_at: null,
  electricity_performed_at: null,
  electricity_expires_at: null,
  erp_performed_at: null,
  erp_expires_at: null,
  noise_performed_at: null,
  noise_expires_at: null,
  asbestos_available: false,
  notes: null,
}

const DIAGNOSTIC_DATE_FIELDS = [
  { key: 'lead', performed: 'lead_performed_at', expires: 'lead_expires_at', labelKey: 'properties.diagnostics.fields.lead' },
  { key: 'gas', performed: 'gas_performed_at', expires: 'gas_expires_at', labelKey: 'properties.diagnostics.fields.gas' },
  { key: 'electricity', performed: 'electricity_performed_at', expires: 'electricity_expires_at', labelKey: 'properties.diagnostics.fields.electricity' },
  { key: 'erp', performed: 'erp_performed_at', expires: 'erp_expires_at', labelKey: 'properties.diagnostics.fields.erp' },
  { key: 'noise', performed: 'noise_performed_at', expires: 'noise_expires_at', labelKey: 'properties.diagnostics.fields.noise' },
] as const

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Properties() {
  const { t } = useTranslation()
  const owners = useOwnerStore((state) => state.owners)
  const activeOwner = useOwnerStore((state) => state.activeOwner)
  const [properties, setProperties] = useState<Property[]>([])
  const [diagnosticsByProperty, setDiagnosticsByProperty] = useState<Map<number, PropertyDiagnostics>>(new Map())
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<Property | null>(null)
  const [deleting, setDeleting]     = useState<Property | null>(null)
  const [managingDiagnostics, setManagingDiagnostics] = useState<Property | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function load() {
    setLoading(true)
    const [data, diagnostics] = await Promise.all([
      window.api.properties.getAll(),
      window.api.propertyDiagnostics.getAll(),
    ])
    setProperties(data)
    setDiagnosticsByProperty(new Map(diagnostics.map((entry) => [entry.property_id, entry])))
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
              diagnostics={diagnosticsByProperty.get(p.id) ?? null}
              ownerLabel={formatOwnerDisplayName(
                resolveOwnerProfileById(owners, p.owner_profile_id),
                t('properties.ownerDefaultNone'),
              )}
              onEdit={() => openEdit(p)}
              onDiagnostics={() => setManagingDiagnostics(p)}
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

      <AnimatePresence>
        {managingDiagnostics && (
          <PropertyDiagnosticsModal
            property={managingDiagnostics}
            initial={diagnosticsByProperty.get(managingDiagnostics.id) ?? null}
            onSave={async (propertyId, data) => {
              await window.api.propertyDiagnostics.upsert(propertyId, data)
              await load()
            }}
            onClose={() => setManagingDiagnostics(null)}
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
  property, diagnostics, ownerLabel, onEdit, onDiagnostics, onDelete,
}: {
  property: Property
  diagnostics: PropertyDiagnostics | null
  ownerLabel: string
  onEdit: () => void
  onDiagnostics: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const TypeIcon = PROPERTY_TYPES.find((pt) => pt.value === property.type)?.icon ?? Building2
  const typeLabelKey = PROPERTY_TYPES.find((pt) => pt.value === property.type)?.labelKey
  const dpeRule = getDpeRule(diagnostics, new Date().toISOString().slice(0, 10))
  const dpeBadgeVariant =
    dpeRule.severity === 'blocked'
      ? 'danger'
      : dpeRule.severity === 'warning' || dpeRule.severity === 'missing'
        ? 'warning'
        : 'success'

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
                <div className="mt-0.5 flex flex-wrap gap-1.5">
                  <Badge variant="muted" className="text-[10px]">{typeLabelKey ? t(typeLabelKey) : property.type}</Badge>
                  <Badge variant={dpeBadgeVariant} className="text-[10px]">
                    {diagnostics?.dpe_class ? t('properties.diagnostics.dpeBadge', { value: diagnostics.dpe_class }) : t('properties.diagnostics.missingBadge')}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onDiagnostics}
                title={t('properties.diagnostics.action')}
                className="p-1.5 rounded-lg hover:bg-primary/10 text-textMuted hover:text-primary transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </button>
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
            {diagnostics?.dpe_expires_at ? (
              <div className="flex items-center gap-1.5 text-xs text-textMuted">
                <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                <span>{t('properties.diagnostics.dpeExpires', { date: diagnostics.dpe_expires_at })}</span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function PropertyDiagnosticsModal({
  property, initial, onSave, onClose,
}: {
  property: Property
  initial: PropertyDiagnostics | null
  onSave: (propertyId: number, data: PropertyDiagnosticsInput) => Promise<void>
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState<PropertyDiagnosticsInput>(() => normalizeDiagnosticsPayload({
    ...emptyDiagnosticsForm,
    ...(initial ?? {}),
  }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const dpeRule = getDpeRule({ dpe_class: form.dpe_class ?? null }, new Date().toISOString().slice(0, 10))

  function setField<K extends keyof PropertyDiagnosticsInput>(field: K, value: PropertyDiagnosticsInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function setDpePerformedAt(value: string | null) {
    setForm((current) => ({
      ...current,
      dpe_performed_at: value,
      dpe_expires_at: inferDpeExpiry(value),
    }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      await onSave(property.id, normalizeDiagnosticsPayload(form))
      onClose()
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-textPrimary">{t('properties.diagnostics.title')}</h2>
            <p className="mt-1 text-xs text-textMuted">{property.name} | {property.address}</p>
          </div>
          <button onClick={onClose} className="text-textMuted transition-colors hover:text-textPrimary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 overflow-y-auto p-6">
          <section className="rounded-2xl border border-border bg-surfaceHigh/10 p-4">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-textPrimary">{t('properties.diagnostics.dpeTitle')}</h3>
                </div>
                <p className="mt-1 text-xs text-textMuted">{t('properties.diagnostics.dpeDesc')}</p>
              </div>
              <DpeRuleBadge rule={dpeRule} />
            </div>

            <DpeRuleNotice rule={dpeRule} />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label={t('properties.diagnostics.dpeClass')}>
                <select
                  value={form.dpe_class ?? ''}
                  onChange={(event) => setField('dpe_class', (event.target.value || null) as DpeClass | null)}
                  className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('properties.diagnostics.noDpeClass')}</option>
                  {DPE_CLASSES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </Field>

              <Field label={t('properties.diagnostics.gesClass')}>
                <select
                  value={form.dpe_ges_class ?? ''}
                  onChange={(event) => setField('dpe_ges_class', (event.target.value || null) as DpeClass | null)}
                  className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('properties.diagnostics.noDpeClass')}</option>
                  {DPE_CLASSES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </Field>

              <Field label={t('properties.diagnostics.performedAt')}>
                <DateInput value={form.dpe_performed_at ?? null} onChange={setDpePerformedAt} />
              </Field>

              <Field label={t('properties.diagnostics.expiresAt')}>
                <DateInput value={form.dpe_expires_at ?? null} onChange={(value) => setField('dpe_expires_at', value)} />
              </Field>

              <Field label={t('properties.diagnostics.ademeNumber')}>
                <Input
                  value={form.dpe_ademe_number ?? ''}
                  onChange={(event) => setField('dpe_ademe_number', event.target.value)}
                  placeholder={t('properties.diagnostics.ademePlaceholder')}
                />
              </Field>

              <Field label={t('properties.diagnostics.energyEstimate')}>
                <Input
                  value={form.dpe_energy_estimate ?? ''}
                  onChange={(event) => setField('dpe_energy_estimate', event.target.value)}
                  placeholder={t('properties.diagnostics.energyEstimatePlaceholder')}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surfaceHigh/10 p-4">
            <div className="mb-4 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-textPrimary">{t('properties.diagnostics.otherTitle')}</h3>
                <p className="mt-1 text-xs text-textMuted">{t('properties.diagnostics.otherDesc')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {DIAGNOSTIC_DATE_FIELDS.map((field) => (
                <div key={field.key} className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface/60 p-3">
                  <p className="col-span-2 text-xs font-semibold text-textPrimary">{t(field.labelKey)}</p>
                  <Field label={t('properties.diagnostics.performedAt')}>
                    <DateInput
                      value={form[field.performed] ?? null}
                      onChange={(value) => setField(field.performed, value)}
                    />
                  </Field>
                  <Field label={t('properties.diagnostics.expiresAt')}>
                    <DateInput
                      value={form[field.expires] ?? null}
                      onChange={(value) => setField(field.expires, value)}
                    />
                  </Field>
                </div>
              ))}
            </div>

            <label className="mt-4 flex items-center gap-2 text-xs font-medium text-textPrimary">
              <input
                type="checkbox"
                checked={Boolean(form.asbestos_available)}
                onChange={(event) => setField('asbestos_available', event.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              {t('properties.diagnostics.asbestosAvailable')}
            </label>
          </section>

          <AttachmentPanel
            entityType="property"
            entityId={property.id}
            title={t('properties.diagnostics.attachmentsTitle')}
            slots={PROPERTY_DIAGNOSTIC_SLOTS.map((slot) => ({
              key: slot.key,
              label: t(slot.labelKey),
            }))}
            generalSectionLabel={t('properties.diagnostics.otherAttachments')}
            alwaysShowGeneralSection
          />

          <Field label={t('properties.diagnostics.notes')}>
            <textarea
              value={form.notes ?? ''}
              onChange={(event) => setField('notes', event.target.value)}
              placeholder={t('properties.diagnostics.notesPlaceholder')}
              rows={4}
              className="w-full rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary outline-none transition-colors placeholder:text-textMuted focus:border-primary"
            />
          </Field>

          {error ? (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
          ) : null}

          <div className="flex shrink-0 gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              <Save className="h-3.5 w-3.5" />
              {saving ? t('common.saving') : t('properties.diagnostics.save')}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function DpeRuleBadge({ rule }: { rule: ReturnType<typeof getDpeRule> }) {
  const { t } = useTranslation()
  const variant =
    rule.severity === 'blocked'
      ? 'danger'
      : rule.severity === 'warning' || rule.severity === 'missing'
        ? 'warning'
        : 'success'

  return (
    <Badge variant={variant}>
      {t(`properties.diagnostics.rule.${rule.code}.badge`)}
    </Badge>
  )
}

function DpeRuleNotice({ rule }: { rule: ReturnType<typeof getDpeRule> }) {
  const { t } = useTranslation()
  if (rule.severity === 'none') return null

  const tone = rule.severity === 'blocked'
    ? 'border-danger/30 bg-danger/10 text-danger'
    : 'border-warning/30 bg-warning/10 text-warning'

  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-5 ${tone}`}>
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        {t(`properties.diagnostics.rule.${rule.code}.desc`, {
          date: rule.restrictionDate,
          dpeClass: rule.dpeClass,
        })}
      </span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-textMuted">{label}</label>
      {children}
    </div>
  )
}

function normalizeDiagnosticsPayload(data: PropertyDiagnosticsInput): PropertyDiagnosticsInput {
  return {
    dpe_class: data.dpe_class ?? null,
    dpe_ges_class: data.dpe_ges_class ?? null,
    dpe_performed_at: data.dpe_performed_at ?? null,
    dpe_expires_at: data.dpe_expires_at ?? null,
    dpe_ademe_number: data.dpe_ademe_number?.trim() || null,
    dpe_energy_estimate: data.dpe_energy_estimate?.trim() || null,
    lead_performed_at: data.lead_performed_at ?? null,
    lead_expires_at: data.lead_expires_at ?? null,
    gas_performed_at: data.gas_performed_at ?? null,
    gas_expires_at: data.gas_expires_at ?? null,
    electricity_performed_at: data.electricity_performed_at ?? null,
    electricity_expires_at: data.electricity_expires_at ?? null,
    erp_performed_at: data.erp_performed_at ?? null,
    erp_expires_at: data.erp_expires_at ?? null,
    noise_performed_at: data.noise_performed_at ?? null,
    noise_expires_at: data.noise_expires_at ?? null,
    asbestos_available: Boolean(data.asbestos_available),
    notes: data.notes?.trim() || null,
  }
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
