import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  ScrollText,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils'

type LedgerStatus = 'settled' | 'partial' | 'late' | 'pending' | 'review'
type BadgeVariant = 'success' | 'warning' | 'danger' | 'muted'

interface LedgerRow {
  periodKey: string
  periodLabel: string
  dueAmount: number
  paidAmount: number
  deltaAmount: number
  runningBalance: number
  status: LedgerStatus
  paymentDate: string | null
  hasTrackedPayment: boolean
}

interface LedgerSummary {
  monthlyAmount: number
  totalDue: number
  totalPaid: number
  currentBalance: number
  regularizationCount: number
  lastPaymentDate: string | null
  rows: LedgerRow[]
}

const LEDGER_STATUS_CONFIG: Record<LedgerStatus, {
  label: string
  variant: BadgeVariant
  icon: typeof CheckCircle2
}> = {
  settled: { label: 'Regle',         variant: 'success', icon: CheckCircle2 },
  partial: { label: 'Partiel',       variant: 'warning', icon: Clock },
  late:    { label: 'En retard',     variant: 'danger',  icon: AlertCircle },
  pending: { label: 'En attente',    variant: 'warning', icon: Clock },
  review:  { label: 'A regulariser', variant: 'muted',   icon: ScrollText },
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1)
}

function formatSignedCurrency(amount: number) {
  if (amount === 0) return formatCurrency(0)
  return `${amount > 0 ? '+' : '-'}${formatCurrency(Math.abs(amount))}`
}

function getLedgerStatus(periodPayments: Payment[], paidAmount: number, dueAmount: number, isCurrentMonth: boolean): LedgerStatus {
  if (paidAmount >= dueAmount && dueAmount > 0) return 'settled'
  if (paidAmount > 0) return 'partial'
  if (periodPayments.some((payment) => payment.status === 'late')) return 'late'
  if (periodPayments.some((payment) => payment.status === 'pending')) return 'pending'
  if (isCurrentMonth) return 'pending'
  return 'review'
}

function buildLedgerSummary(tenant: Tenant, payments: Payment[]): LedgerSummary {
  const monthlyAmount = (tenant.rent_amount ?? 0) + (tenant.charges_amount ?? 0)
  if (!tenant.lease_id || !tenant.lease_start_date || monthlyAmount <= 0) {
    return {
      monthlyAmount,
      totalDue: 0,
      totalPaid: 0,
      currentBalance: 0,
      regularizationCount: 0,
      lastPaymentDate: null,
      rows: [],
    }
  }

  const byPeriod = new Map<string, Payment[]>()
  for (const payment of payments) {
    const key = `${payment.period_year}-${String(payment.period_month).padStart(2, '0')}`
    const group = byPeriod.get(key)
    if (group) {
      group.push(payment)
    } else {
      byPeriod.set(key, [payment])
    }
  }

  const start = startOfMonth(new Date(tenant.lease_start_date))
  const end = startOfMonth(new Date())
  const rows: LedgerRow[] = []
  let runningBalance = 0

  for (let cursor = new Date(start); cursor <= end; cursor = addMonths(cursor, 1)) {
    const periodMonth = cursor.getMonth() + 1
    const periodYear = cursor.getFullYear()
    const periodKey = `${periodYear}-${String(periodMonth).padStart(2, '0')}`
    const periodPayments = byPeriod.get(periodKey) ?? []
    const paidRows = periodPayments.filter((payment) => payment.status === 'paid')
    const paidAmount = paidRows.reduce((sum, payment) => sum + payment.rent_amount + payment.charges_amount, 0)
    const dueAmount = monthlyAmount
    const deltaAmount = paidAmount - dueAmount
    runningBalance += dueAmount - paidAmount

    const paymentDate = [...paidRows]
      .filter((payment) => !!payment.payment_date)
      .sort((left, right) => new Date(right.payment_date!).getTime() - new Date(left.payment_date!).getTime())[0]?.payment_date ?? null

    rows.push({
      periodKey,
      periodLabel: formatMonth(cursor),
      dueAmount,
      paidAmount,
      deltaAmount,
      runningBalance,
      status: getLedgerStatus(periodPayments, paidAmount, dueAmount, cursor.getTime() === end.getTime()),
      paymentDate,
      hasTrackedPayment: periodPayments.length > 0,
    })
  }

  const totalDue = rows.reduce((sum, row) => sum + row.dueAmount, 0)
  const totalPaid = rows.reduce((sum, row) => sum + row.paidAmount, 0)
  const currentBalance = rows.at(-1)?.runningBalance ?? 0
  const regularizationCount = rows.filter((row) => row.status === 'partial' || row.status === 'late' || row.status === 'review').length
  const lastPaymentDate = payments
    .filter((payment) => payment.status === 'paid' && payment.payment_date)
    .sort((left, right) => new Date(right.payment_date!).getTime() - new Date(left.payment_date!).getTime())[0]?.payment_date ?? null

  return {
    monthlyAmount,
    totalDue,
    totalPaid,
    currentBalance,
    regularizationCount,
    lastPaymentDate,
    rows: [...rows].reverse(),
  }
}

function balanceLabel(balance: number) {
  if (balance > 0) return 'Reste du'
  if (balance < 0) return 'Credit'
  return 'A jour'
}

function balanceTone(balance: number) {
  if (balance > 0) return 'text-danger'
  if (balance < 0) return 'text-success'
  return 'text-textPrimary'
}

export default function TenantLedgerModal({
  tenant,
  onClose,
}: {
  tenant: Tenant
  onClose: () => void
}) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadLedger() {
      if (!tenant.lease_id) {
        setPayments([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const result = await window.api.payments.getByLease(tenant.lease_id)
        if (!cancelled) {
          setPayments(result)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        }
      }
    }

    loadLedger()
    return () => { cancelled = true }
  }, [tenant])

  const summary = useMemo(() => buildLedgerSummary(tenant, payments), [tenant, payments])

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
        className="w-full max-w-6xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0">
                <ScrollText className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-textPrimary">Compte locataire</h2>
                <p className="text-sm text-textMuted truncate">
                  {tenant.first_name} {tenant.last_name}
                  {tenant.property_name ? ` · ${tenant.property_name}` : ''}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-textMuted">
              {tenant.property_name && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span>{tenant.property_name}{tenant.property_city ? `, ${tenant.property_city}` : ''}</span>
                </div>
              )}
              {tenant.lease_start_date && (
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Suivi depuis {formatDate(tenant.lease_start_date)}</span>
                </div>
              )}
              {summary.lastPaymentDate && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span>Dernier reglement le {formatDate(summary.lastPaymentDate)}</span>
                </div>
              )}
            </div>
          </div>

          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-5">
          <div className="grid grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-textMuted">Loyer mensuel suivi</p>
                <p className="text-lg font-semibold text-textPrimary mt-1">{formatCurrency(summary.monthlyAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-textMuted">Total regle</p>
                <p className="text-lg font-semibold text-textPrimary mt-1">{formatCurrency(summary.totalPaid)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-textMuted">Solde actuel</p>
                <p className={`text-lg font-semibold mt-1 ${balanceTone(summary.currentBalance)}`}>
                  {formatCurrency(Math.abs(summary.currentBalance))}
                </p>
                <p className="text-xs text-textMuted mt-1">{balanceLabel(summary.currentBalance)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-textMuted">Periodes a regulariser</p>
                <p className="text-lg font-semibold text-textPrimary mt-1">{summary.regularizationCount}</p>
              </CardContent>
            </Card>
          </div>

          {error ? (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              Impossible de charger le compte locataire : {error}
            </div>
          ) : loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="h-14 rounded-xl border border-border bg-surfaceHigh/40 animate-pulse" />
              ))}
            </div>
          ) : summary.rows.length === 0 ? (
            <div className="rounded-xl border border-border bg-surfaceHigh/30 px-5 py-10 text-center">
              <p className="text-sm font-medium text-textPrimary">Aucune ligne de compte disponible</p>
              <p className="text-xs text-textMuted mt-1">
                Le bail actif doit comporter un loyer mensuel pour reconstruire le compte locataire.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[980px]">
                  <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr_1.1fr_0.9fr] gap-3 px-4 py-3 bg-surfaceHigh/40 text-[11px] font-medium uppercase tracking-wide text-textMuted">
                    <span>Periode</span>
                    <span className="text-right">A payer</span>
                    <span className="text-right">Regle</span>
                    <span className="text-right">Ecart</span>
                    <span className="text-right">Solde cumule</span>
                    <span className="text-right">Statut</span>
                  </div>

                  {summary.rows.map((row) => {
                    const status = LEDGER_STATUS_CONFIG[row.status]
                    return (
                      <div
                        key={row.periodKey}
                        className="grid grid-cols-[1.8fr_1fr_1fr_1fr_1.1fr_0.9fr] gap-3 px-4 py-3 border-t border-border items-center"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-textPrimary capitalize">{row.periodLabel}</p>
                          <p className="text-[11px] text-textMuted mt-0.5">
                            {row.paymentDate
                              ? `Regle le ${formatDate(row.paymentDate)}`
                              : row.hasTrackedPayment
                                ? 'Echeance saisie dans les paiements'
                                : 'Estime depuis le bail actif'}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-medium text-textPrimary">{formatCurrency(row.dueAmount)}</p>
                        </div>

                        <div className="text-right">
                          <p className={`text-sm font-medium ${row.paidAmount > 0 ? 'text-success' : 'text-textPrimary'}`}>
                            {formatCurrency(row.paidAmount)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className={`text-sm font-medium ${
                            row.deltaAmount > 0 ? 'text-success' : row.deltaAmount < 0 ? 'text-danger' : 'text-textPrimary'
                          }`}>
                            {formatSignedCurrency(row.deltaAmount)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className={`text-sm font-semibold ${balanceTone(row.runningBalance)}`}>
                            {formatCurrency(Math.abs(row.runningBalance))}
                          </p>
                          <p className="text-[11px] text-textMuted mt-0.5">{balanceLabel(row.runningBalance)}</p>
                        </div>

                        <div className="flex justify-end">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surfaceHigh/20 px-4 py-3">
            <div className="text-xs text-textMuted leading-5">
              <p>
                Le compte est reconstruit a partir du bail actif et des paiements saisis dans l'application.
                Les montants ne sont comptabilises comme encaisses que lorsque la ligne est au statut <span className="text-textPrimary font-medium">paid</span>.
              </p>
              <p className="mt-1">
                Les periodes sans ligne de paiement sont marquees <span className="text-textPrimary font-medium">A regulariser</span>.
              </p>
            </div>
            <Button variant="secondary" onClick={onClose} className="shrink-0">
              Fermer
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
