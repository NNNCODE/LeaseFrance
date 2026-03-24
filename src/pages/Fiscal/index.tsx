import { useEffect, useMemo, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Download,
  Euro,
  FileSpreadsheet,
  FileText,
  ReceiptText,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FiscalSummaryPDF } from '@/lib/pdf/fiscalSummary'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'
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
  const { profile } = useAuthStore()
  const [properties, setProperties] = useState<Property[]>([])
  const [leases, setLeases] = useState<Lease[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [selectedYear, setSelectedYear] = useState(currentYear())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [exporting, setExporting] = useState<ExportKind>(null)

  async function load() {
    setLoading(true)
    setError('')

    try {
      const [propertyRows, leaseRows, paymentRows] = await Promise.all([
        window.api.properties.getAll(),
        window.api.leases.getAll(),
        window.api.payments.getAll(),
      ])

      setProperties(propertyRows)
      setLeases(leaseRows)
      setPayments(paymentRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const years = useMemo(
    () => availableFiscalYears(properties, leases, payments),
    [properties, leases, payments]
  )

  useEffect(() => {
    if (years.length === 0) return
    if (!years.includes(selectedYear)) {
      setSelectedYear(years[0])
    }
  }, [selectedYear, years])

  const summary = useMemo(
    () => buildFiscalYearSummary(selectedYear, properties, leases, payments),
    [leases, payments, properties, selectedYear]
  )

  const activeProperties = useMemo(
    () => summary.properties.filter((item) => (
      item.leaseCount > 0
      || item.receivedRent > 0
      || item.receivedCharges > 0
      || item.outstandingAmount > 0
    )),
    [summary.properties]
  )

  async function handleExportCsv() {
    setExporting('csv')
    setError('')
    setNotice('')

    try {
      const csv = `\uFEFF${buildFiscalCsv(summary)}`
      const buffer = Array.from(new TextEncoder().encode(csv))
      const result = await window.api.exports.saveFile(
        exportFileName('csv', selectedYear),
        buffer,
        [{ name: 'CSV', extensions: ['csv'] }]
      )

      if (result.saved) {
        setNotice('Export CSV enregistre.')
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
            landlordName: profile?.name ?? 'Proprietaire',
            landlordAddress: profile?.address,
            landlordCity: profile?.city,
            landlordPhone: profile?.phone,
            landlordSignature: profile?.signatureImage,
            summary,
          }}
        />
      ).toBlob()

      const buffer = Array.from(new Uint8Array(await blob.arrayBuffer()))
      const result = await window.api.exports.saveFile(
        exportFileName('pdf', selectedYear),
        buffer,
        [{ name: 'PDF', extensions: ['pdf'] }]
      )

      if (result.saved) {
        setNotice('Export PDF enregistre.')
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
          <h1 className="text-2xl font-semibold text-textPrimary">Fiscal annuel</h1>
          <p className="text-sm text-textMuted mt-1">
            Synthese par annee des loyers encaisses, charges recuperees, vacance estimee et impayes encore saisis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-border bg-surfaceHigh px-3 py-2">
            <label className="text-[11px] font-medium text-textMuted block mb-1">Exercice</label>
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
            {exporting === 'csv' ? 'Export CSV...' : 'Exporter CSV'}
          </Button>
          <Button onClick={handleExportPdf} disabled={loading || exporting !== null}>
            <Download className="w-4 h-4" />
            {exporting === 'pdf' ? 'Export PDF...' : 'Exporter PDF'}
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

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Biens suivis"
          value={summary.propertyCount}
          detail={`${summary.occupiedMonths} mois occupes`}
          icon={Building2}
          tone="primary"
        />
        <StatCard
          label="Loyers encaisses"
          value={formatCurrency(summary.receivedRent)}
          detail={`${summary.totalReceived > 0 ? Math.round((summary.receivedRent / summary.totalReceived) * 100) : 0}% du total encaisse`}
          icon={Euro}
          tone="success"
        />
        <StatCard
          label="Charges recuperees"
          value={formatCurrency(summary.receivedCharges)}
          detail={`${summary.vacantMonths} mois vacants estimes`}
          icon={ReceiptText}
          tone="warning"
        />
        <StatCard
          label="Impayes suivis"
          value={formatCurrency(summary.outstandingAmount)}
          detail={`${payments.filter((payment) => payment.status !== 'paid' && payment.period_year === selectedYear).length} lignes ouvertes`}
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-textPrimary">Synthese par bien</h2>
              <p className="text-sm text-textMuted mt-1">
                Vue annuelle utile pour la preparation declarative. Les exportations se font hors du centre Documents.
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
              title="Aucun bien enregistre"
              description="Ajoutez au moins un bien puis un bail pour pouvoir produire une synthese fiscale annuelle."
            />
          ) : activeProperties.length === 0 ? (
            <EmptyState
              title="Aucune activite sur cet exercice"
              description="L annee selectionnee ne contient ni bail couvrant la periode ni paiement rapproche pour vos biens."
            />
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="grid grid-cols-[1.7fr_110px_110px_140px_140px_140px] gap-3 px-4 py-3 bg-surfaceHigh/60 border-b border-border text-[11px] font-medium uppercase tracking-wide text-textMuted">
                <span>Bien</span>
                <span className="text-right">Occupes</span>
                <span className="text-right">Vacants</span>
                <span className="text-right">Loyers</span>
                <span className="text-right">Charges</span>
                <span className="text-right">Impayes</span>
              </div>

              <div className="flex flex-col divide-y divide-border">
                {activeProperties.map((item) => (
                  <div key={item.propertyId} className="grid grid-cols-[1.7fr_110px_110px_140px_140px_140px] gap-3 px-4 py-4 bg-surfaceHigh/10 items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-textPrimary truncate">{item.propertyName}</p>
                        <PropertyStatusBadge item={item} />
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-textMuted">
                        <span>{item.propertyCity || 'Ville non renseignee'}</span>
                        <span>{item.leaseCount} bail{item.leaseCount !== 1 ? 's' : ''} sur l annee</span>
                        <span>{item.paidPaymentCount} paiement{item.paidPaymentCount !== 1 ? 's' : ''} encaisses</span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-textPrimary">{item.occupiedMonths}</div>
                    <div className="text-right text-sm text-textPrimary">{item.vacantMonths}</div>
                    <div className="text-right text-sm font-medium text-textPrimary">{formatCurrency(item.receivedRent)}</div>
                    <div className="text-right text-sm font-medium text-textPrimary">{formatCurrency(item.receivedCharges)}</div>
                    <div className={`text-right text-sm font-medium ${item.outstandingAmount > 0 ? 'text-danger' : 'text-textPrimary'}`}>
                      {formatCurrency(item.outstandingAmount)}
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-[1.7fr_110px_110px_140px_140px_140px] gap-3 px-4 py-4 bg-surface border-t border-border items-center">
                  <div>
                    <p className="text-sm font-semibold text-textPrimary">Total exercice {selectedYear}</p>
                    <p className="text-xs text-textMuted mt-1">Total encaisse : {formatCurrency(summary.totalReceived)}</p>
                  </div>
                  <div className="text-right text-sm font-semibold text-textPrimary">{summary.occupiedMonths}</div>
                  <div className="text-right text-sm font-semibold text-textPrimary">{summary.vacantMonths}</div>
                  <div className="text-right text-sm font-semibold text-textPrimary">{formatCurrency(summary.receivedRent)}</div>
                  <div className="text-right text-sm font-semibold text-textPrimary">{formatCurrency(summary.receivedCharges)}</div>
                  <div className={`text-right text-sm font-semibold ${summary.outstandingAmount > 0 ? 'text-danger' : 'text-textPrimary'}`}>
                    {formatCurrency(summary.outstandingAmount)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-[1.1fr_1fr] gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-textPrimary">Perimetre du calcul</h2>
            </div>
            <div className="space-y-2 text-sm text-textMuted leading-6">
              <p>Les loyers et charges encaisses proviennent uniquement des paiements avec statut `paid`.</p>
              <p>Les impayes reprennent les lignes `pending` et `late` sur l exercice choisi.</p>
              <p>La vacance est estimee a partir des dates de debut et de fin de bail connues pour chaque bien.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-textPrimary">Limites de ce MVP</h2>
            </div>
            <div className="space-y-2 text-sm text-textMuted leading-6">
              <p>Cette synthese ne suit pas encore les depenses, travaux, interets d emprunt ou taxe fonciere.</p>
              <p>Le PDF et le CSV servent de base de travail pour un bailleur particulier, pas de declaration fiscale automatique.</p>
              <p>Si votre historique de paiements est incomplet, les totaux encaissements ou impayes resteront partiels.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PropertyStatusBadge({
  item,
}: {
  item: ReturnType<typeof buildFiscalYearSummary>['properties'][number]
}) {
  if (item.outstandingAmount > 0) {
    return <Badge variant="danger">Impayes</Badge>
  }

  if (item.receivedRent > 0 || item.receivedCharges > 0) {
    return <Badge variant="success">Encaissements</Badge>
  }

  return <Badge variant="muted">Sans flux</Badge>
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
            <p className="text-2xl font-semibold text-textPrimary mt-1">{value}</p>
            <p className="text-xs text-textMuted mt-2">{detail}</p>
          </div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${style.bg}`}>
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
