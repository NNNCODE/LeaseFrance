import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  CalendarDays,
  Download,
  Euro,
  FileSpreadsheet,
  FileText,
  ReceiptText,
  TrendingDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useApiQuery, useLeases, usePayments, useProperties } from '@/hooks'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'
import { useOwnerStore } from '@/stores/useOwnerStore'
import ExpenseSection from './ExpenseSection'
import FiscalStatCard from './FiscalStatCard'
import IncomeByPropertyTable from './IncomeByPropertyTable'
import {
  availableFiscalYears,
  buildFiscalCsv,
  buildFiscalYearSummary,
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
  const propertiesQuery = useProperties()
  const leasesQuery = useLeases()
  const paymentsQuery = usePayments()
  const expensesQuery = useApiQuery(() => window.api.fiscalExpenses.getAll(), { initial: [] as FiscalExpense[] })
  const [selectedYear, setSelectedYear] = useState(currentYear())
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [exporting, setExporting] = useState<ExportKind>(null)

  const properties = propertiesQuery.data
  const leases = leasesQuery.data
  const payments = paymentsQuery.data
  const expenses = expensesQuery.data
  const loading = propertiesQuery.loading || leasesQuery.loading
    || paymentsQuery.loading || expensesQuery.loading
  const error = actionError || propertiesQuery.error || leasesQuery.error
    || paymentsQuery.error || expensesQuery.error

  function reloadAll() {
    void propertiesQuery.reload()
    void leasesQuery.reload()
    void paymentsQuery.reload()
    void expensesQuery.reload()
  }

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
    setActionError('')
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
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setExporting(null)
    }
  }

  async function handleExportPdf() {
    setExporting('pdf')
    setActionError('')
    setNotice('')

    try {
      const [{ pdf }, { FiscalSummaryPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/lib/pdf/fiscalSummary'),
      ])
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
      setActionError(err instanceof Error ? err.message : String(err))
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
        <FiscalStatCard
          label={t('fiscal.propertiesTracked')}
          value={summary.propertyCount}
          detail={t('fiscal.propertiesTrackedDetail', { count: summary.occupiedMonths })}
          icon={Building2}
          tone="primary"
        />
        <FiscalStatCard
          label={t('fiscal.receivedRent')}
          value={formatCurrency(summary.receivedRent)}
          detail={t('fiscal.receivedRentDetail', {
            percent: summary.totalReceived > 0 ? Math.round((summary.receivedRent / summary.totalReceived) * 100) : 0,
          })}
          icon={Euro}
          tone="success"
        />
        <FiscalStatCard
          label={t('fiscal.receivedCharges')}
          value={formatCurrency(summary.receivedCharges)}
          detail={t('fiscal.receivedChargesDetail', { count: summary.vacantMonths })}
          icon={ReceiptText}
          tone="warning"
        />
        <FiscalStatCard
          label={t('fiscal.totalExpenses')}
          value={formatCurrency(summary.expenses.total)}
          detail={t('fiscal.expensesDetail', { count: expenses.filter((e) => e.year === selectedYear).length })}
          icon={TrendingDown}
          tone="danger"
        />
        <FiscalStatCard
          label={t('fiscal.netResult')}
          value={formatCurrency(summary.netResult)}
          detail={summary.netResult >= 0 ? t('fiscal.netResultPositive') : t('fiscal.netResultNegative')}
          icon={Euro}
          tone={summary.netResult >= 0 ? 'success' : 'danger'}
        />
      </div>

      <IncomeByPropertyTable
        loading={loading}
        properties={properties}
        activeProperties={activeProperties}
        summary={summary}
        selectedYear={selectedYear}
      />

      <ExpenseSection
        year={selectedYear}
        properties={properties}
        expenses={expenses}
        onChanged={reloadAll}
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
