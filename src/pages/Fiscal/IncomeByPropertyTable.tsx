import { useTranslation } from 'react-i18next'
import { Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { buildFiscalYearSummary } from './summary'

type FiscalSummary = ReturnType<typeof buildFiscalYearSummary>
type FiscalPropertySummary = FiscalSummary['properties'][number]

export default function IncomeByPropertyTable({
  loading,
  properties,
  activeProperties,
  summary,
  selectedYear,
}: {
  loading: boolean
  properties: Property[]
  activeProperties: FiscalPropertySummary[]
  summary: FiscalSummary
  selectedYear: number
}) {
  const { t } = useTranslation()

  return (
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
          <FiscalEmptyState
            title={t('fiscal.noPropertiesTitle')}
            description={t('fiscal.noPropertiesDesc')}
          />
        ) : activeProperties.length === 0 ? (
          <FiscalEmptyState
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
  )
}

function PropertyStatusBadge({ item }: { item: FiscalPropertySummary }) {
  const { t } = useTranslation()

  if (item.outstandingAmount > 0) {
    return <Badge variant="danger">{t('fiscal.status.outstanding')}</Badge>
  }

  if (item.receivedRent > 0 || item.receivedCharges > 0) {
    return <Badge variant="success">{t('fiscal.status.collected')}</Badge>
  }

  return <Badge variant="muted">{t('fiscal.status.noFlow')}</Badge>
}

function FiscalEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surfaceHigh/10 py-12 text-center">
      <Building2 className="w-7 h-7 text-textMuted mx-auto" />
      <p className="text-sm font-semibold text-textPrimary mt-3">{title}</p>
      <p className="text-xs text-textMuted mt-1">{description}</p>
    </div>
  )
}
