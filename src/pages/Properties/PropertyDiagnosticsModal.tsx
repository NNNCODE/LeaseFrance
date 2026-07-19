import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { AlertTriangle, CalendarClock, Save, ShieldCheck, X } from 'lucide-react'
import AttachmentPanel from '@/components/AttachmentPanel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import DateInput from '@/components/ui/date-input'
import { Input } from '@/components/ui/input'
import { DPE_CLASSES, PROPERTY_DIAGNOSTIC_SLOTS, getDpeRule, inferDpeExpiry } from '@/lib/propertyDiagnostics'
import {
  DIAGNOSTIC_DATE_FIELDS,
  emptyDiagnosticsForm,
  normalizeDiagnosticsPayload,
} from './propertyPageUtils'

export default function PropertyDiagnosticsModal({
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
