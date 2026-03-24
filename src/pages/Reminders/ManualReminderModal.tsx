import { useState } from 'react'
import { motion } from 'framer-motion'
import { BellRing, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const CATEGORY_OPTIONS = [
  { value: 'insurance', label: 'Assurance' },
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'tax', label: 'Taxe / impots' },
  { value: 'custom', label: 'Libre' },
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

    if (!form.title.trim()) return setError('Renseignez un titre.')
    if (!form.due_date) return setError("Renseignez une date d'echeance.")

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
        className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-textPrimary">
              {initial ? 'Modifier le rappel' : 'Nouveau rappel'}
            </h2>
          </div>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Titre</label>
              <Input
                value={form.title}
                onChange={(event) => set('title', event.target.value)}
                placeholder="Demander attestation d'assurance"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Date d'echeance</label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(event) => set('due_date', event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Categorie</label>
              <select
                value={form.category}
                onChange={(event) => set('category', event.target.value)}
                className="h-10 rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Bail lie <span className="opacity-60">(optionnel)</span></label>
              <select
                value={form.lease_id ?? 0}
                onChange={(event) => set('lease_id', Number(event.target.value) || null)}
                className="h-10 rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value={0}>Aucun bail</option>
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {lease.tenant_first_name} {lease.tenant_last_name} · {lease.property_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">Notes</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(event) => set('notes', event.target.value)}
              rows={5}
              placeholder="Precisons, contact a relancer, document attendu..."
              className="w-full resize-none rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Enregistrement...' : initial ? 'Mettre a jour' : 'Creer le rappel'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
