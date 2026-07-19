import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatOwnerDisplayName } from '@/lib/ownerProfiles'
import { PROPERTY_TYPES, emptyPropertyForm } from './propertyPageUtils'

export default function PropertyFormModal({
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
      : { ...emptyPropertyForm, owner_profile_id: defaultOwnerId }
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
