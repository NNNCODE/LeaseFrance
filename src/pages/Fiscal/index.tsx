import { useCallback, useEffect, useMemo, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Download,
  Euro,
  FileSpreadsheet,
  FileText,
  Minus,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  TrendingDown,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FiscalSummaryPDF } from '@/lib/pdf/fiscalSummary'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'
import { useOwnerStore } from '@/stores/useOwnerStore'
import {
  availableFiscalYears,
  buildFiscalCsv,
  buildFiscalYearSummary,
  categoryLabel,
  EXPENSE_CATEGORIES,
} from './summary'

type ExportKind = 'csv' | 'pdf' | null

function currentYear() {
  return new Date().getFullYear()
}

function exportFileName(kind: 'csv' | 'pdf', year: number) {
  return kind === 'csv'
    ? `Synthese_fiscale_${year}.csv`
    : `Synthese_fiscale_${year}.pdf`
}

export default function Fiscal() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  const activeOwner = useOwnerStore((state) => state.activeOwner)
  const ownerProfile = activeOwner ?? profile
  const [properties, setProperties] = useState<Property[]>([])
  const [leases, setLeases] = useState<Lease[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<FiscalExpense[]>([])
  const [selectedYear, setSelectedYear] = useState(currentYear())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [exporting, setExporting] = useState<ExportKind>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [propertyRows, leaseRows, paymentRows, expenseRows] = await Promise.all([
        window.api.properties.getAll(),
        window.api.leases.getAll(),
        window.api.payments.getAll(),
        window.api.fiscalExpenses.getAll(),
      ])

      setProperties(propertyRows)
      setLeases(leaseRows)
      setPayments(paymentRows)
      setExpenses(expenseRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const years = useMemo(
    () => availableFiscalYears(properties, leases, payments, expenses),
    [properties, leases, payments, expenses]
  )

  useEffect(() => {
    if (years.length === 0) return
    if (!years.includes(selectedYear)) {
      setSelectedYear(years[0])
    }
  }, [selectedYear, years])

  const summary = useMemo(
    () => buildFiscalYearSummary(selectedYear, properties, leases, payments, expenses),
    [leases, payments, properties, selectedYear, expenses]
  )

  const activeProperties = useMemo(
    () => summary.properties.filter((item) => (
      item.leaseCount > 0
      || item.receivedRent > 0
      || item.receivedCharges > 0
      || item.outstandingAmount > 0
      || item.expenses.total > 0
    )),
    [summary.properties]
  )

  async function handleExportCsv() {
    setExporting('csv')
    setError('')
    setNotice('')

    try {
      const csv = `\uFEFF${buildFiscalCsv(summary)}`
      const buffer = new TextEncoder().encode(csv)
      const result = await window.api.exports.saveFile(
        exportFileName('csv', selectedYear),
        buffer,
        [{ name: 'CSV', extensions: ['csv'] }]
      )

      if (result.saved) {
        setNotice(t('fiscal.csvSaved'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setExporting(null)
    }
  }

  async function handleExportPdf() {
    setExporting('pdf')
    setError('')
    setNotice('')

    try {
      const blob = await pdf(
        <FiscalSummaryPDF
          data={{
            landlordName: ownerProfile?.name ?? 'Proprietaire',
            landlordAddress: ownerProfile?.address,
            landlordCity: ownerProfile?.city,
            landlordPhone: ownerProfile?.phone,
            landlordSignature: ownerProfile?.signatureImage,
            summary,
          }}
        />
      ).toBlob()

      const buffer = new Uint8Array(await blob.arrayBuffer())
      const result = await window.api.exports.saveFile(
        exportFileName('pdf', selectedYear),
        buffer,
        [{ name: 'PDF', extensions: ['pdf'] }]
      )

      if (result.saved) {
        setNotice(t('fiscal.pdfSaved'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">{t('fiscal.title')}</h1>
          <p className="text-sm text-textMuted mt-1">
            {t('fiscal.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-border bg-surfaceHigh px-3 py-2">
            <label className="text-[11px] font-medium text-textMuted block mb-1">{t('fiscal.year')}</label>
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="bg-transparent text-sm text-textPrimary focus:outline-none"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <Button variant="secondary" onClick={handleExportCsv} disabled={loading || exporting !== null}>
            <FileSpreadsheet className="w-4 h-4" />
            {exporting === 'csv' ? t('fiscal.exporting') : t('fiscal.exportCsv')}
          </Button>
          <Button onClick={handleExportPdf} disabled={loading || exporting !== null}>
            <Download className="w-4 h-4" />
            {exporting === 'pdf' ? t('fiscal.exporting') : t('fiscal.exportPdf')}
          </Button>
        </div>
      </div>

      {notice ? (
        <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {/* ── Stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          label={t('fiscal.propertiesTracked')}
          value={summary.propertyCount}
          detail={t('fiscal.propertiesTrackedDetail', { count: summary.occupiedMonths })}
          icon={Building2}
          tone="primary"
        />
        <StatCard
          label={t('fiscal.receivedRent')}
          value={formatCurrency(summary.receivedRent)}
          detail={t('fiscal.receivedRentDetail', {
            percent: summary.totalReceived > 0 ? Math.round((summary.receivedRent / summary.totalReceived) * 100) : 0,
          })}
          icon={Euro}
          tone="success"
        />
        <StatCard
          label={t('fiscal.receivedCharges')}
          value={formatCurrency(summary.receivedCharges)}
          detail={t('fiscal.receivedChargesDetail', { count: summary.vacantMonths })}
          icon={ReceiptText}
          tone="warning"
        />
        <StatCard
          label={t('fiscal.totalExpenses')}
          value={formatCurrency(summary.expenses.total)}
          detail={t('fiscal.expensesDetail', { count: expenses.filter((e) => e.year === selectedYear).length })}
          icon={TrendingDown}
          tone="danger"
        />
        <StatCard
          label={t('fiscal.netResult')}
          value={formatCurrency(summary.netResult)}
          detail={summary.netResult >= 0 ? t('fiscal.netResultPositive') : t('fiscal.netResultNegative')}
          icon={Euro}
          tone={summary.netResult >= 0 ? 'success' : 'danger'}
        />
      </div>

      {/* ── Property income table ──────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-textPrimary">{t('fiscal.incomeByPropertyTitle')}</h2>
              <p className="text-sm text-textMuted mt-1">
                {t('fiscal.incomeByPropertyDesc')}
              </p>
            </div>
            <Badge variant="muted">{selectedYear}</Badge>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((index) => (
                <div key={index} className="h-20 rounded-2xl border border-border bg-surfaceHigh/20 animate-pulse" />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <EmptyState
              title={t('fiscal.noPropertiesTitle')}
              description={t('fiscal.noPropertiesDesc')}
            />
          ) : activeProperties.length === 0 ? (
            <EmptyState
              title={t('fiscal.noActivityTitle')}
              description={t('fiscal.noActivityDesc')}
            />
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="grid grid-cols-[1.5fr_80px_80px_120px_120px_120px_120px_120px] gap-2 px-4 py-3 bg-surfaceHigh/60 border-b border-border text-[11px] font-medium uppercase tracking-wide text-textMuted">
                <span>{t('fiscal.property')}</span>
                <span className="text-right">{t('fiscal.tableOccupied')}</span>
                <span className="text-right">{t('fiscal.tableVacant')}</span>
                <span className="text-right">{t('fiscal.tableRent')}</span>
                <span className="text-right">{t('fiscal.tableCharges')}</span>
                <span className="text-right">{t('fiscal.tableOutstanding')}</span>
                <span className="text-right">{t('fiscal.tableDeductible')}</span>
                <span className="text-right">{t('fiscal.tableNet')}</span>
              </div>

              <div className="flex flex-col divide-y divide-border">
                {activeProperties.map((item) => {
                  const netProperty = item.totalReceived - item.expenses.total
                  return (
                    <div key={item.propertyId} className="grid grid-cols-[1.5fr_80px_80px_120px_120px_120px_120px_120px] gap-2 px-4 py-4 bg-surfaceHigh/10 items-center">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-textPrimary truncate">{item.propertyName}</p>
                          <PropertyStatusBadge item={item} />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-textMuted">
                          <span>{item.propertyCity || t('fiscal.cityMissing')}</span>
                          <span>{t('fiscal.leaseCount', { count: item.leaseCount })}</span>
                          <span>{t('fiscal.paymentCount', { count: item.paidPaymentCount })}</span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-textPrimary">{item.occupiedMonths}</div>
                      <div className="text-right text-sm text-textPrimary">{item.vacantMonths}</div>
                      <div className="text-right text-sm font-medium text-textPrimary">{formatCurrency(item.receivedRent)}</div>
                      <div className="text-right text-sm font-medium text-textPrimary">{formatCurrency(item.receivedCharges)}</div>
                      <div className={`text-right text-sm font-medium ${item.outstandingAmount > 0 ? 'text-danger' : 'text-textPrimary'}`}>
                        {formatCurrency(item.outstandingAmount)}
                      </div>
                      <div className="text-right text-sm font-medium text-danger">
                        {item.expenses.total > 0 ? `- ${formatCurrency(item.expenses.total)}` : formatCurrency(0)}
                      </div>
                      <div className={`text-right text-sm font-semibold ${netProperty >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(netProperty)}
                      </div>
                    </div>
                  )
                })}

                <div className="grid grid-cols-[1.5fr_80px_80px_120px_120px_120px_120px_120px] gap-2 px-4 py-4 bg-surface border-t border-border items-center">
                  <div>
                    <p className="text-sm font-semibold text-textPrimary">{t('fiscal.yearTotal', { year: selectedYear })}</p>
                    <p className="text-xs text-textMuted mt-1">{t('fiscal.totalCollectedLabel', { amount: formatCurrency(summary.totalReceived) })}</p>
                  </div>
                  <div className="text-right text-sm font-semibold text-textPrimary">{summary.occupiedMonths}</div>
                  <div className="text-right text-sm font-semibold text-textPrimary">{summary.vacantMonths}</div>
                  <div className="text-right text-sm font-semibold text-textPrimary">{formatCurrency(summary.receivedRent)}</div>
                  <div className="text-right text-sm font-semibold text-textPrimary">{formatCurrency(summary.receivedCharges)}</div>
                  <div className={`text-right text-sm font-semibold ${summary.outstandingAmount > 0 ? 'text-danger' : 'text-textPrimary'}`}>
                    {formatCurrency(summary.outstandingAmount)}
                  </div>
                  <div className="text-right text-sm font-semibold text-danger">
                    {summary.expenses.total > 0 ? `- ${formatCurrency(summary.expenses.total)}` : formatCurrency(0)}
                  </div>
                  <div className={`text-right text-sm font-semibold ${summary.netResult >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(summary.netResult)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Expense section ────────────────────────────────────────── */}
      <ExpenseSection
        year={selectedYear}
        properties={properties}
        expenses={expenses}
        onChanged={load}
      />

      {/* ── Info cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-[1.1fr_1fr] gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-textPrimary">{t('fiscal.scopeTitle')}</h2>
            </div>
            <div className="space-y-2 text-sm text-textMuted leading-6">
              <p>{t('fiscal.scopeLine1')}</p>
              <p>{t('fiscal.scopeLine2')}</p>
              <p>{t('fiscal.scopeLine3')}</p>
              <p>{t('fiscal.scopeLine4')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-textPrimary">{t('fiscal.notesTitle')}</h2>
            </div>
            <div className="space-y-2 text-sm text-textMuted leading-6">
              <p>{t('fiscal.notesLine1')}</p>
              <p>{t('fiscal.notesLine2')}</p>
              <p>{t('fiscal.notesLine3')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Expense Management Section ────────────────────────────────────────────────

function ExpenseSection({
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

// ── Shared Components ─────────────────────────────────────────────────────────

function PropertyStatusBadge({
  item,
}: {
  item: ReturnType<typeof buildFiscalYearSummary>['properties'][number]
}) {
  const { t } = useTranslation()

  if (item.outstandingAmount > 0) {
    return <Badge variant="danger">{t('fiscal.status.outstanding')}</Badge>
  }

  if (item.receivedRent > 0 || item.receivedCharges > 0) {
    return <Badge variant="success">{t('fiscal.status.collected')}</Badge>
  }

  return <Badge variant="muted">{t('fiscal.status.noFlow')}</Badge>
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  detail: string
  icon: React.ElementType
  tone: 'primary' | 'success' | 'warning' | 'danger'
}) {
  const tones = {
    primary: { bg: 'bg-primary/10', text: 'text-primary' },
    success: { bg: 'bg-success/10', text: 'text-success' },
    warning: { bg: 'bg-warning/10', text: 'text-warning' },
    danger: { bg: 'bg-danger/10', text: 'text-danger' },
  }
  const style = tones[tone]

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-textMuted">{label}</p>
            <p className="text-xl font-semibold text-textPrimary mt-1">{value}</p>
            <p className="text-xs text-textMuted mt-2">{detail}</p>
          </div>
          <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${style.bg}`}>
            <Icon className={`w-4 h-4 ${style.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surfaceHigh/10 py-12 text-center">
      <Building2 className="w-7 h-7 text-textMuted mx-auto" />
      <p className="text-sm font-semibold text-textPrimary mt-3">{title}</p>
      <p className="text-xs text-textMuted mt-1">{description}</p>
    </div>
  )
}
