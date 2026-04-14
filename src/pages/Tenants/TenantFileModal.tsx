import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import AttachmentPanel from '@/components/AttachmentPanel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DOSSIER_ITEMS,
  DossierKey,
  getCompletedDossierCount,
  getDossierStatusVariant,
  hasEmergencyContact,
  hasGuarantor,
  isDossierKey,
} from './tenantFileHelpers'

type TenantFileForm = Pick<
  TenantInput,
  | 'guarantor_name'
  | 'guarantor_email'
  | 'guarantor_phone'
  | 'guarantor_address'
  | 'emergency_contact_name'
  | 'emergency_contact_phone'
  | 'emergency_contact_relation'
  | 'dossier_id_document'
  | 'dossier_income_proof'
  | 'dossier_employment_proof'
  | 'dossier_tax_notice'
  | 'dossier_bank_details'
  | 'dossier_notes'
>

interface TenantFileModalProps {
  tenant: Tenant
  onSave: (tenantId: number, data: TenantFileForm, expectedUpdatedAt: string) => Promise<Tenant>
  onClose: () => void
}

function createInitialForm(tenant: Tenant): TenantFileForm {
  return {
    guarantor_name: tenant.guarantor_name ?? '',
    guarantor_email: tenant.guarantor_email ?? '',
    guarantor_phone: tenant.guarantor_phone ?? '',
    guarantor_address: tenant.guarantor_address ?? '',
    emergency_contact_name: tenant.emergency_contact_name ?? '',
    emergency_contact_phone: tenant.emergency_contact_phone ?? '',
    emergency_contact_relation: tenant.emergency_contact_relation ?? '',
    dossier_id_document: tenant.dossier_id_document,
    dossier_income_proof: tenant.dossier_income_proof,
    dossier_employment_proof: tenant.dossier_employment_proof,
    dossier_tax_notice: tenant.dossier_tax_notice,
    dossier_bank_details: tenant.dossier_bank_details,
    dossier_notes: tenant.dossier_notes ?? '',
  }
}

function buildSavePayload(form: TenantFileForm): TenantFileForm {
  return {
    guarantor_name: form.guarantor_name?.toString().trim() || null,
    guarantor_email: form.guarantor_email?.toString().trim() || null,
    guarantor_phone: form.guarantor_phone?.toString().trim() || null,
    guarantor_address: form.guarantor_address?.toString().trim() || null,
    emergency_contact_name: form.emergency_contact_name?.toString().trim() || null,
    emergency_contact_phone: form.emergency_contact_phone?.toString().trim() || null,
    emergency_contact_relation: form.emergency_contact_relation?.toString().trim() || null,
    dossier_id_document: Boolean(form.dossier_id_document),
    dossier_income_proof: Boolean(form.dossier_income_proof),
    dossier_employment_proof: Boolean(form.dossier_employment_proof),
    dossier_tax_notice: Boolean(form.dossier_tax_notice),
    dossier_bank_details: Boolean(form.dossier_bank_details),
    dossier_notes: form.dossier_notes?.toString().trim() || null,
  }
}

export default function TenantFileModal({ tenant, onSave, onClose }: TenantFileModalProps) {
  const { t } = useTranslation()
  const [currentTenant, setCurrentTenant] = useState(tenant)
  const [form, setForm] = useState<TenantFileForm>(() => createInitialForm(tenant))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const completedCount = getCompletedDossierCount(form as Required<Pick<TenantInput, typeof DOSSIER_ITEMS[number]['key']>>)
  const dossierVariant = getDossierStatusVariant(form as Required<Pick<TenantInput, typeof DOSSIER_ITEMS[number]['key']>>)
  const guarantorPresent = hasGuarantor(form)
  const emergencyPresent = hasEmergencyContact(form)

  function setField<Key extends keyof TenantFileForm>(field: Key, value: TenantFileForm[Key]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function getVersionToken(current: Tenant) {
    return current.updated_at ?? current.created_at
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const updated = await onSave(currentTenant.id, buildSavePayload(form), getVersionToken(currentTenant))
      setCurrentTenant(updated)
      onClose()
    } catch (err) {
      setError(`${t('common.error')}: ${err instanceof Error ? err.message : String(err)}`)
      setSaving(false)
    }
  }

  async function handleAttachmentUploadComplete(slot: string | null) {
    if (!isDossierKey(slot) || form[slot]) return

    const dossierKey = slot as DossierKey
    setSaving(true)
    setError('')

    try {
      const updated = await onSave(
        currentTenant.id,
        buildSavePayload({
          ...createInitialForm(currentTenant),
          [dossierKey]: true,
        }),
        getVersionToken(currentTenant),
      )

      setCurrentTenant(updated)
      setForm((current) => ({ ...current, [dossierKey]: true }))
    } catch (err) {
      setError(`${t('common.error')}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
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
        className="w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <div>
              <h2 className="text-base font-semibold text-textPrimary">{t('tenants.dossier.title')}</h2>
              <p className="text-xs text-textMuted mt-0.5">
                {currentTenant.first_name} {currentTenant.last_name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 max-h-[85vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard
              icon={FileText}
              title={t('tenants.fileModal.receivedDocuments')}
              value={`${completedCount}/${DOSSIER_ITEMS.length}`}
              badge={<Badge variant={dossierVariant}>{completedCount === DOSSIER_ITEMS.length ? t('tenants.dossier.complete') : t('tenants.fileModal.toComplete')}</Badge>}
            />
            <SummaryCard
              icon={ShieldCheck}
              title={t('tenants.guarantor')}
              value={guarantorPresent ? t('tenants.fileModal.filled') : t('profile.notProvided')}
              badge={<Badge variant={guarantorPresent ? 'success' : 'muted'}>{guarantorPresent ? t('tenants.fileModal.present') : t('tenants.fileModal.absent')}</Badge>}
            />
            <SummaryCard
              icon={Phone}
              title={t('tenants.emergencyContact')}
              value={emergencyPresent ? t('tenants.fileModal.available') : t('profile.notProvided')}
              badge={<Badge variant={emergencyPresent ? 'success' : 'muted'}>{emergencyPresent ? t('tenants.fileModal.present') : t('tenants.fileModal.absent')}</Badge>}
            />
          </div>

          <section className="rounded-2xl border border-border bg-surfaceHigh/40 p-4">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-textPrimary">{t('tenants.guarantor')}</p>
                <p className="text-xs text-textMuted">{t('tenants.fileModal.guarantorDesc')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t('tenants.fileModal.guarantorName')}>
                <Input
                  value={form.guarantor_name ?? ''}
                  onChange={(event) => setField('guarantor_name', event.target.value)}
                  placeholder={t('tenants.fileModal.fullNamePlaceholder')}
                />
              </Field>
              <Field label={t('tenants.fileModal.guarantorEmail')}>
                <Input
                  type="email"
                  value={form.guarantor_email ?? ''}
                  onChange={(event) => setField('guarantor_email', event.target.value)}
                  placeholder="garant@email.fr"
                />
              </Field>
              <Field label={t('tenants.fileModal.guarantorPhone')}>
                <Input
                  value={form.guarantor_phone ?? ''}
                  onChange={(event) => setField('guarantor_phone', event.target.value)}
                  placeholder={t('profile.phonePlaceholder')}
                />
              </Field>
              <Field label={t('tenants.fileModal.guarantorAddress')}>
                <Input
                  value={form.guarantor_address ?? ''}
                  onChange={(event) => setField('guarantor_address', event.target.value)}
                  placeholder={t('tenants.fileModal.fullAddressPlaceholder')}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surfaceHigh/40 p-4">
            <div className="flex items-center gap-2 mb-4">
              <UserRound className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-textPrimary">{t('tenants.emergencyContact')}</p>
                <p className="text-xs text-textMuted">{t('tenants.fileModal.emergencyContactDesc')}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label={t('tenants.fileModal.contactName')}>
                <Input
                  value={form.emergency_contact_name ?? ''}
                  onChange={(event) => setField('emergency_contact_name', event.target.value)}
                  placeholder={t('tenants.fileModal.contactNamePlaceholder')}
                />
              </Field>
              <Field label={t('tenants.fileModal.relationship')}>
                <Input
                  value={form.emergency_contact_relation ?? ''}
                  onChange={(event) => setField('emergency_contact_relation', event.target.value)}
                  placeholder={t('tenants.fileModal.relationshipPlaceholder')}
                />
              </Field>
              <Field label={t('tenants.phone')}>
                <Input
                  value={form.emergency_contact_phone ?? ''}
                  onChange={(event) => setField('emergency_contact_phone', event.target.value)}
                  placeholder={t('profile.phonePlaceholder')}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surfaceHigh/40 p-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-textPrimary">{t('tenants.fileModal.supportingDocuments')}</p>
                <p className="text-xs text-textMuted">{t('tenants.fileModal.supportingDocumentsDesc')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {DOSSIER_ITEMS.map((item) => {
                const checked = Boolean(form[item.key])
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setField(item.key, !checked as TenantFileForm[typeof item.key])}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      checked
                        ? 'border-success/40 bg-success/10'
                        : 'border-border bg-surface hover:border-primary/30'
                    }`}
                  >
                    {checked ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-success shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mt-0.5 text-textMuted shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-textPrimary">{t(item.labelKey)}</p>
                      <p className="text-xs text-textMuted mt-1">
                        {checked ? t('tenants.fileModal.documentReceived') : t('tenants.fileModal.documentMissing')}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* ── Attachments ────────────────────────────────── */}
          <AttachmentPanel
            entityType="tenant"
            entityId={currentTenant.id}
            title={t('tenants.fileModal.attachments')}
            slots={DOSSIER_ITEMS.map((item) => ({ key: item.key, label: t(item.labelKey) }))}
            onUploadComplete={handleAttachmentUploadComplete}
          />

          <section className="rounded-2xl border border-border bg-surfaceHigh/40 p-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-textPrimary">{t('payments.notes')}</p>
                <p className="text-xs text-textMuted">{t('tenants.fileModal.notesDesc')}</p>
              </div>
            </div>

            <textarea
              value={form.dossier_notes ?? ''}
              onChange={(event) => setField('dossier_notes', event.target.value)}
              rows={4}
              placeholder={t('tenants.fileModal.notesPlaceholder')}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </section>

          {error && <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving} className="flex-1">
              <Save className="w-3.5 h-3.5" />
              {saving ? t('common.saving') : t('tenants.fileModal.save')}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  badge,
}: {
  icon: typeof FileText
  title: string
  value: string
  badge: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-surfaceHigh/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        {badge}
      </div>
      <p className="text-xs text-textMuted mt-4">{title}</p>
      <p className="text-sm font-semibold text-textPrimary mt-1">{value}</p>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-textMuted">{label}</label>
      {children}
    </div>
  )
}
