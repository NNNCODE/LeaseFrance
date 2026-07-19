import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Minus, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { categoryLabel, EXPENSE_CATEGORIES } from './summary'

export default function ExpenseSection({
  year,
  properties,
  expenses,
  onChanged,
}: {
  year: number
  properties: Property[]
  expenses: FiscalExpense[]
  onChanged: () => void
}) {
  const { t } = useTranslation()
  const yearExpenses = useMemo(
    () => expenses.filter((e) => e.year === year),
    [expenses, year]
  )

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<FiscalExpenseInput>({
    property_id: 0,
    year,
    category: 'taxe_fonciere',
    label: '',
    amount: 0,
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setFormData((prev) => ({ ...prev, year }))
  }, [year])

  function openNew() {
    setEditingId(null)
    setFormData({
      property_id: properties[0]?.id ?? 0,
      year,
      category: 'taxe_fonciere',
      label: '',
      amount: 0,
      notes: '',
    })
    setError('')
    setShowForm(true)
  }

  function openEdit(expense: FiscalExpense) {
    setEditingId(expense.id)
    setFormData({
      property_id: expense.property_id,
      year: expense.year,
      category: expense.category,
      label: expense.label,
      amount: expense.amount,
      notes: expense.notes ?? '',
    })
    setError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setError('')
  }

  async function handleSave() {
    if (!formData.property_id) return setError(t('fiscal.errors.selectProperty'))
    if (!formData.label.trim()) return setError(t('fiscal.errors.labelRequired'))
    if (formData.amount <= 0) return setError(t('fiscal.errors.amountPositive'))

    setSaving(true)
    setError('')
    try {
      const data = { ...formData, label: formData.label.trim(), notes: formData.notes || null }
      if (editingId) {
        await window.api.fiscalExpenses.update(editingId, data)
      } else {
        await window.api.fiscalExpenses.create(data)
      }
      closeForm()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    await window.api.fiscalExpenses.delete(id)
    onChanged()
  }

  // Group by category
  const byCategory = useMemo(() => {
    const map = new Map<string, FiscalExpense[]>()
    for (const e of yearExpenses) {
      const list = map.get(e.category) || []
      list.push(e)
      map.set(e.category, list)
    }
    return map
  }, [yearExpenses])

  const totalAmount = useMemo(
    () => yearExpenses.reduce((sum, e) => sum + e.amount, 0),
    [yearExpenses]
  )

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-textPrimary">{t('fiscal.expensesTitle', { year })}</h2>
            <p className="text-sm text-textMuted mt-1">
              {t('fiscal.expensesDesc')}
            </p>
          </div>
          <Button size="sm" onClick={openNew} disabled={properties.length === 0}>
            <Plus className="w-3.5 h-3.5" />
            {t('fiscal.addExpense')}
          </Button>
        </div>

        {/* ── Inline form ───────────────────────────────────────── */}
        {showForm && (
          <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-textPrimary">
                {editingId ? t('fiscal.editExpenseInline') : t('fiscal.newExpense')}
              </p>
              <button onClick={closeForm} className="text-textMuted hover:text-textPrimary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-[1fr_1fr_1fr_120px] gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-textMuted">{t('fiscal.property')}</label>
                <select
                  value={formData.property_id}
                  onChange={(e) => setFormData({ ...formData, property_id: Number(e.target.value) })}
                  className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-textMuted">{t('fiscal.category')}</label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    const cat = e.target.value
                    setFormData({
                      ...formData,
                      category: cat,
                      label: formData.label || categoryLabel(cat, t),
                    })
                  }}
                  className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{t(c.labelKey)}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-textMuted">{t('fiscal.label')}</label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder={t('fiscal.labelPlaceholder')}
                  className="h-9"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-textMuted">{t('fiscal.amount')}</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0,00"
                  className="h-9"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-1">
              <label className="text-[11px] font-medium text-textMuted">{t('fiscal.notesOptional')}</label>
              <Input
                value={formData.notes ?? ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('fiscal.notesPlaceholder')}
                className="h-9"
              />
            </div>

            {error && (
              <p className="mt-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="mt-3 flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={closeForm}>
                {t('common.cancel')}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? t('common.saving') : editingId ? t('fiscal.editExpense') : t('fiscal.addExpense')}
              </Button>
            </div>
          </div>
        )}

        {/* ── Expense list by category ──────────────────────────── */}
        {yearExpenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surfaceHigh/10 py-10 text-center">
            <Minus className="w-6 h-6 text-textMuted mx-auto" />
            <p className="text-sm font-semibold text-textPrimary mt-3">{t('fiscal.noExpensesTitle', { year })}</p>
            <p className="text-xs text-textMuted mt-1">
              {t('fiscal.noExpensesDesc')}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1.2fr_1fr_1.3fr_110px_60px] gap-2 px-4 py-2.5 bg-surfaceHigh/60 border-b border-border text-[11px] font-medium uppercase tracking-wide text-textMuted">
              <span>{t('fiscal.property')}</span>
              <span>{t('fiscal.category')}</span>
              <span>{t('fiscal.label')}</span>
              <span className="text-right">{t('fiscal.amount')}</span>
              <span />
            </div>

            <div className="flex flex-col divide-y divide-border">
              {EXPENSE_CATEGORIES.map((cat) => {
                const items = byCategory.get(cat.value)
                if (!items || items.length === 0) return null
                const catTotal = items.reduce((sum, e) => sum + e.amount, 0)

                return items.map((expense, idx) => (
                  <div
                    key={expense.id}
                    className="grid grid-cols-[1.2fr_1fr_1.3fr_110px_60px] gap-2 px-4 py-3 bg-surfaceHigh/10 items-center group"
                  >
                    <div className="text-sm text-textPrimary truncate">{expense.property_name}</div>
                    <div className="flex items-center gap-2">
                      {idx === 0 && (
                        <Badge variant="muted" className="text-[10px]">{t(cat.labelKey)}</Badge>
                      )}
                      {idx === 0 && items.length > 1 && (
                        <span className="text-[10px] text-textMuted">
                          ({formatCurrency(catTotal)})
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-textPrimary truncate">{expense.label}</p>
                      {expense.notes ? (
                        <p className="text-xs text-textMuted truncate mt-0.5">{expense.notes}</p>
                      ) : null}
                    </div>
                    <div className="text-right text-sm font-medium text-danger">
                      {formatCurrency(expense.amount)}
                    </div>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(expense)}
                        className="p-1 rounded-lg text-textMuted hover:text-primary hover:bg-primary/10 transition-colors"
                        title={t('common.edit')}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="p-1 rounded-lg text-textMuted hover:text-danger hover:bg-danger/10 transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              })}

              {/* Total row */}
              <div className="grid grid-cols-[1.2fr_1fr_1.3fr_110px_60px] gap-2 px-4 py-3 bg-surface border-t border-border items-center">
                <div className="text-sm font-semibold text-textPrimary">
                  {t('fiscal.totalExpenses')}
                </div>
                <div />
                <div className="text-xs text-textMuted">
                  {t('fiscal.lineCount', { count: yearExpenses.length })}
                </div>
                <div className="text-right text-sm font-semibold text-danger">
                  {formatCurrency(totalAmount)}
                </div>
                <div />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
