import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { BellRing, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const CATEGORY_OPTIONS = [
  { value: 'insurance', labelKey: 'reminders.category.insurance' },
  { value: 'diagnostic', labelKey: 'reminders.category.diagnostic' },
  { value: 'tax', labelKey: 'reminders.category.tax' },
  { value: 'custom', labelKey: 'reminders.category.custom' },
] as const

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function ManualReminderModal({
  leases,
  initial,
  onSave,
  onClose,
}: {
  leases: Lease[]
  initial: ManualReminder | null
  onSave: (data: ManualReminderInput) => Promise<void>
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState<ManualReminderInput>({
    lease_id: initial?.lease_id ?? null,
    title: initial?.title ?? '',
    category: initial?.category ?? 'custom',
    due_date: initial?.due_date ?? today(),
    notes: initial?.notes ?? '',
    status: initial?.status ?? 'pending',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof ManualReminderInput>(field: K, value: ManualReminderInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (!form.title.trim()) return setError(t('reminders.manualForm.errors.titleRequired'))
    if (!form.due_date) return setError(t('reminders.manualForm.errors.dueDateRequired'))

    setSaving(true)
    try {
      await onSave({
        lease_id: form.lease_id || null,
        title: form.title.trim(),
        category: form.category,
        due_date: form.due_date,
        notes: form.notes?.trim() || null,
        status: form.status ?? 'pending',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
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
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-textPrimary">
              {initial ? t('reminders.editTitle') : t('reminders.addTitle')}
            </h2>
          </div>
          <button onClick={onClose} className="text-textMuted transition-colors hover:text-textPrimary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('reminders.manualForm.title')}</label>
              <Input
                value={form.title}
                onChange={(event) => set('title', event.target.value)}
                placeholder={t('reminders.manualForm.titlePlaceholder')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('reminders.manualForm.dueDate')}</label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(event) => set('due_date', event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('reminders.manualForm.category')}</label>
              <select
                value={form.category}
                onChange={(event) => set('category', event.target.value)}
                className="h-10 rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">
                {t('reminders.manualForm.linkedLease')} <span className="opacity-60">({t('common.optional')})</span>
              </label>
              <select
                value={form.lease_id ?? 0}
                onChange={(event) => set('lease_id', Number(event.target.value) || null)}
                className="h-10 rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={0}>{t('reminders.manualForm.noLease')}</option>
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {lease.tenant_first_name} {lease.tenant_last_name} | {lease.property_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{t('reminders.manualForm.notes')}</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(event) => set('notes', event.target.value)}
              rows={5}
              placeholder={t('reminders.manualForm.notesPlaceholder')}
              className="w-full resize-none rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving}>
              <Save className="w-3.5 h-3.5" />
              {saving ? t('common.saving') : initial ? t('reminders.manualForm.submitEdit') : t('reminders.manualForm.submitCreate')}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
