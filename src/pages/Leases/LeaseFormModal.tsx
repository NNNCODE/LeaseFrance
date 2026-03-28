import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Save, TrendingUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatQuarter } from '@/lib/irl'
import { formatCurrency } from '@/lib/utils'
import { emptyLeaseForm, LEASE_TYPES } from './leasePageUtils'

interface LeaseFormModalProps {
  initial: Lease | null
  onSave: (data: LeaseInput) => Promise<void>
  onClose: () => void
}

export default function LeaseFormModal({
  initial,
  onSave,
  onClose,
}: LeaseFormModalProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [irlIndices, setIrlIndices] = useState<IrlIndex[]>([])
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
          deposit_received_date: initial.deposit_received_date,
          deposit_refund_date: initial.deposit_refund_date,
          deposit_retained_amount: initial.deposit_retained_amount,
          deposit_notes: initial.deposit_notes,
          irl_reference_index: initial.irl_reference_index,
          irl_reference_quarter: initial.irl_reference_quarter,
          contract_details: initial.contract_details,
          status: initial.status,
        }
      : emptyLeaseForm,
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      window.api.properties.getAll(),
      window.api.tenants.getAll(),
      window.api.irl.getAll(),
    ]).then(([nextProperties, nextTenants, nextIrl]) => {
      setProperties(nextProperties)
      setTenants(nextTenants)
      setIrlIndices(nextIrl)
      if (!initial) {
        if (nextProperties.length === 1) {
          setForm((current) => ({ ...current, property_id: nextProperties[0].id }))
        }
        if (nextTenants.length === 1) {
          setForm((current) => ({ ...current, tenant_id: nextTenants[0].id }))
        }
      }
    })
  }, [initial])

  const irlOptions = irlIndices.map((index) => ({
    label: formatQuarter(index.year, index.quarter),
    value: index.value,
  }))

  function setField<K extends keyof LeaseInput>(field: K, value: LeaseInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function computeMaxDeposit() {
    if (form.type === 'vide') return form.rent_amount
    if (form.type === 'meuble') return form.rent_amount * 2
    return 0
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (!form.property_id) return setError('Selectionnez un bien.')
    if (!form.tenant_id) return setError('Selectionnez un locataire.')
    if (!form.start_date) return setError('La date de debut est requise.')
    if (form.rent_amount <= 0) return setError('Le loyer doit etre superieur a 0.')
    if (form.type === 'mobilite' && !form.end_date) {
      return setError('Le bail mobilite requiert une date de fin.')
    }

    setSaving(true)
    try {
      await onSave(form)
    } catch (err) {
      setError(`Erreur lors de l'enregistrement : ${err instanceof Error ? err.message : String(err)}`)
      setSaving(false)
    }
  }

  const noProperties = properties.length === 0
  const noTenants = tenants.length === 0

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
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-textPrimary">
            {initial ? 'Modifier le bail' : 'Nouveau bail'}
          </h2>
          <button onClick={onClose} className="text-textMuted transition-colors hover:text-textPrimary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto p-6">
          {(noProperties || noTenants) && (
            <div className="flex flex-col gap-2">
              {noProperties && (
                <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                  Aucun bien disponible. Ajoutez d'abord un bien dans "Biens".
                </p>
              )}
              {noTenants && (
                <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                  Aucun locataire disponible. Ajoutez d'abord un locataire dans "Locataires".
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Bien immobilier</label>
            <select
              aria-label="Bien immobilier"
              value={form.property_id}
              onChange={(event) => setField('property_id', Number(event.target.value))}
              disabled={noProperties}
              className="w-full rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary transition-colors focus:border-primary focus:outline-none disabled:opacity-50"
            >
              <option value={0} disabled>
                Selectionnez un bien...
              </option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name} - {property.address}, {property.city}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Locataire</label>
            <select
              aria-label="Locataire"
              value={form.tenant_id}
              onChange={(event) => setField('tenant_id', Number(event.target.value))}
              disabled={noTenants}
              className="w-full rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary transition-colors focus:border-primary focus:outline-none disabled:opacity-50"
            >
              <option value={0} disabled>
                Selectionnez un locataire...
              </option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.first_name} {tenant.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Type de bail</label>
            <div className="grid grid-cols-3 gap-2">
              {LEASE_TYPES.map(({ value, label, description }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setField('type', value)}
                  className={`flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors ${
                    form.type === value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <span
                    className={`text-xs font-semibold ${
                      form.type === value ? 'text-primary' : 'text-textPrimary'
                    }`}
                  >
                    {label}
                  </span>
                  <span className="text-[10px] text-textMuted">{description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Date de debut</label>
              <Input
                aria-label="Date de debut"
                type="date"
                value={form.start_date}
                onChange={(event) => setField('start_date', event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">
                Date de fin {form.type !== 'mobilite' && <span className="opacity-50">(optionnel)</span>}
              </label>
              <Input
                aria-label="Date de fin"
                type="date"
                value={form.end_date ?? ''}
                onChange={(event) => setField('end_date', event.target.value || null)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Loyer HC (EUR/mois)</label>
              <Input
                aria-label="Loyer HC"
                type="number"
                min={0}
                step={0.01}
                value={form.rent_amount || ''}
                onChange={(event) => setField('rent_amount', parseFloat(event.target.value) || 0)}
                placeholder="800"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Charges (EUR/mois)</label>
              <Input
                aria-label="Charges"
                type="number"
                min={0}
                step={0.01}
                value={form.charges_amount || ''}
                onChange={(event) => setField('charges_amount', parseFloat(event.target.value) || 0)}
                placeholder="80"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex items-center justify-between text-xs font-medium text-textMuted">
              <span>Depot de garantie (EUR)</span>
              {form.rent_amount > 0 && form.type !== 'mobilite' && (
                <button
                  type="button"
                  onClick={() => setField('deposit_amount', computeMaxDeposit())}
                  className="text-[10px] text-primary hover:underline"
                >
                  Max legal : {formatCurrency(computeMaxDeposit())}
                </button>
              )}
            </label>
            <Input
              aria-label="Depot de garantie"
              type="number"
              min={0}
              step={0.01}
              value={form.deposit_amount || ''}
              onChange={(event) => setField('deposit_amount', parseFloat(event.target.value) || 0)}
              placeholder="800"
            />
          </div>

          {form.type !== 'mobilite' && (
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-textMuted">
                <TrendingUp className="h-3 w-3" />
                Indice IRL de reference
                <span className="opacity-50">(pour revision annuelle)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-textMuted">Trimestre</label>
                  <select
                    aria-label="Trimestre IRL"
                    value={form.irl_reference_quarter ?? ''}
                    onChange={(event) => {
                      const nextQuarter = event.target.value || null
                      setField('irl_reference_quarter', nextQuarter)
                      const matchingOption = irlOptions.find((option) => option.label === nextQuarter)
                      if (matchingOption) {
                        setField('irl_reference_index', matchingOption.value)
                      }
                    }}
                    className="w-full rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary transition-colors focus:border-primary focus:outline-none"
                  >
                    <option value="">Non defini</option>
                    {irlOptions.map((option) => (
                      <option key={option.label} value={option.label}>
                        {option.label} ({option.value})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-textMuted">Valeur IRL</label>
                  <Input
                    aria-label="Valeur IRL"
                    type="number"
                    step={0.01}
                    value={form.irl_reference_index ?? ''}
                    onChange={(event) =>
                      setField('irl_reference_index', parseFloat(event.target.value) || null)
                    }
                    placeholder="ex: 143.46"
                  />
                </div>
              </div>
            </div>
          )}

          {initial && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Statut</label>
              <select
                aria-label="Statut du bail"
                value={form.status}
                onChange={(event) => setField('status', event.target.value)}
                className="w-full rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary transition-colors focus:border-primary focus:outline-none"
              >
                <option value="active">En cours</option>
                <option value="ended">Termine</option>
                <option value="terminated">Resilie</option>
              </select>
            </div>
          )}

          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={saving || noProperties || noTenants} className="flex-1">
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Enregistrement...' : initial ? 'Modifier' : 'Creer le bail'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
