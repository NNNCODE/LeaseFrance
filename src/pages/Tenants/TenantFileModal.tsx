import { useState } from 'react'
import { motion } from 'framer-motion'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DOSSIER_ITEMS,
  getCompletedDossierCount,
  getDossierStatusVariant,
  hasEmergencyContact,
  hasGuarantor,
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
  onSave: (data: TenantFileForm) => Promise<void>
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

export default function TenantFileModal({ tenant, onSave, onClose }: TenantFileModalProps) {
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await onSave({
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
      })
      onClose()
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
              <h2 className="text-base font-semibold text-textPrimary">Dossier locatif</h2>
              <p className="text-xs text-textMuted mt-0.5">
                {tenant.first_name} {tenant.last_name}
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
              title="Pieces recues"
              value={`${completedCount}/${DOSSIER_ITEMS.length}`}
              badge={<Badge variant={dossierVariant}>{completedCount === DOSSIER_ITEMS.length ? 'Complet' : 'A completer'}</Badge>}
            />
            <SummaryCard
              icon={ShieldCheck}
              title="Garant"
              value={guarantorPresent ? 'Renseigne' : 'Non renseigne'}
              badge={<Badge variant={guarantorPresent ? 'success' : 'muted'}>{guarantorPresent ? 'Present' : 'Absent'}</Badge>}
            />
            <SummaryCard
              icon={Phone}
              title="Contact urgence"
              value={emergencyPresent ? 'Disponible' : 'Non renseigne'}
              badge={<Badge variant={emergencyPresent ? 'success' : 'muted'}>{emergencyPresent ? 'Present' : 'Absent'}</Badge>}
            />
          </div>

          <section className="rounded-2xl border border-border bg-surfaceHigh/40 p-4">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-textPrimary">Garant</p>
                <p className="text-xs text-textMuted">Informations du garant ou de la caution.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom du garant">
                <Input
                  value={form.guarantor_name ?? ''}
                  onChange={(event) => setField('guarantor_name', event.target.value)}
                  placeholder="Nom et prenom"
                />
              </Field>
              <Field label="Email du garant">
                <Input
                  type="email"
                  value={form.guarantor_email ?? ''}
                  onChange={(event) => setField('guarantor_email', event.target.value)}
                  placeholder="garant@email.fr"
                />
              </Field>
              <Field label="Telephone du garant">
                <Input
                  value={form.guarantor_phone ?? ''}
                  onChange={(event) => setField('guarantor_phone', event.target.value)}
                  placeholder="06 12 34 56 78"
                />
              </Field>
              <Field label="Adresse du garant">
                <Input
                  value={form.guarantor_address ?? ''}
                  onChange={(event) => setField('guarantor_address', event.target.value)}
                  placeholder="Adresse complete"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surfaceHigh/40 p-4">
            <div className="flex items-center gap-2 mb-4">
              <UserRound className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-textPrimary">Contact d'urgence</p>
                <p className="text-xs text-textMuted">Personne a prevenir ou a recontacter si besoin.</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Nom">
                <Input
                  value={form.emergency_contact_name ?? ''}
                  onChange={(event) => setField('emergency_contact_name', event.target.value)}
                  placeholder="Nom du contact"
                />
              </Field>
              <Field label="Lien">
                <Input
                  value={form.emergency_contact_relation ?? ''}
                  onChange={(event) => setField('emergency_contact_relation', event.target.value)}
                  placeholder="Parent, ami, collegue..."
                />
              </Field>
              <Field label="Telephone">
                <Input
                  value={form.emergency_contact_phone ?? ''}
                  onChange={(event) => setField('emergency_contact_phone', event.target.value)}
                  placeholder="06 12 34 56 78"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surfaceHigh/40 p-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-textPrimary">Pieces justificatives</p>
                <p className="text-xs text-textMuted">Cochez les pieces deja recues dans le dossier.</p>
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
                      <p className="text-sm font-medium text-textPrimary">{item.label}</p>
                      <p className="text-xs text-textMuted mt-1">
                        {checked ? 'Piece deja recue.' : 'Piece encore manquante.'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surfaceHigh/40 p-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-textPrimary">Notes</p>
                <p className="text-xs text-textMuted">Points a suivre, pieces attendues, commentaires libres.</p>
              </div>
            </div>

            <textarea
              value={form.dossier_notes ?? ''}
              onChange={(event) => setField('dossier_notes', event.target.value)}
              rows={4}
              placeholder="Precisions sur le dossier, documents a relancer, observations..."
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </section>

          {error && <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Annuler</Button>
            <Button type="submit" disabled={saving} className="flex-1">
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Enregistrement...' : 'Enregistrer le dossier'}
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
