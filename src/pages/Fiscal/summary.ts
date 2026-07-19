// ── Expense Categories ───────────────────────────────────────────────────────

import type { TFunction } from 'i18next'

export const EXPENSE_CATEGORIES: Array<{ value: string; label: string; labelKey: string }> = [
  { value: 'taxe_fonciere', label: 'Taxe fonciere', labelKey: 'fiscal.expenseCategory.taxe_fonciere' },
  { value: 'travaux', label: 'Travaux', labelKey: 'fiscal.expenseCategory.travaux' },
  { value: 'assurance_pno', label: 'Assurance PNO', labelKey: 'fiscal.expenseCategory.assurance_pno' },
  { value: 'frais_gestion', label: 'Frais de gestion / syndic', labelKey: 'fiscal.expenseCategory.frais_gestion' },
  { value: 'interets_emprunt', label: "Interets d'emprunt", labelKey: 'fiscal.expenseCategory.interets_emprunt' },
  { value: 'autre', label: 'Autre charge deductible', labelKey: 'fiscal.expenseCategory.autre' },
]

export function categoryLabel(value: string, t?: TFunction) {
  const category = EXPENSE_CATEGORIES.find((entry) => entry.value === value)
  if (!category) return value
  return t ? t(category.labelKey) : category.label
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface FiscalPropertySummary {
  propertyId: number
  propertyName: string
  propertyCity: string
  occupiedMonths: number
  vacantMonths: number
  leaseCount: number
  receivedRent: number
  receivedCharges: number
  totalReceived: number
  outstandingAmount: number
  paidPaymentCount: number
  expenses: FiscalExpenseSummary
}

export interface FiscalExpenseSummary {
  taxe_fonciere: number
  travaux: number
  assurance_pno: number
  frais_gestion: number
  interets_emprunt: number
  autre: number
  total: number
}

export interface FiscalYearSummary {
  year: number
  propertyCount: number
  receivedRent: number
  receivedCharges: number
  totalReceived: number
  outstandingAmount: number
  occupiedMonths: number
  vacantMonths: number
  expenses: FiscalExpenseSummary
  netResult: number
  properties: FiscalPropertySummary[]
}

// ── Builders ─────────────────────────────────────────────────────────────────

export function buildFiscalYearSummary(
  year: number,
  properties: Property[],
  leases: Lease[],
  payments: Payment[],
  expenses: FiscalExpense[],
): FiscalYearSummary {
  const leaseById = new Map(leases.map((lease) => [lease.id, lease]))
  const yearExpenses = expenses.filter((e) => e.year === year)
  const summaries = properties
    .map((property) => buildPropertySummary(property, year, leases, payments, leaseById, yearExpenses))
    .sort((left, right) => left.propertyName.localeCompare(right.propertyName))

  const totalExpenses = aggregateExpenses(summaries.map((s) => s.expenses))
  const totalReceived = round2(sumBy(summaries, 'totalReceived'))

  return {
    year,
    propertyCount: summaries.length,
    receivedRent: round2(sumBy(summaries, 'receivedRent')),
    receivedCharges: round2(sumBy(summaries, 'receivedCharges')),
    totalReceived,
    outstandingAmount: round2(sumBy(summaries, 'outstandingAmount')),
    occupiedMonths: summaries.reduce((sum, item) => sum + item.occupiedMonths, 0),
    vacantMonths: summaries.reduce((sum, item) => sum + item.vacantMonths, 0),
    expenses: totalExpenses,
    netResult: round2(totalReceived - totalExpenses.total),
    properties: summaries,
  }
}

export function availableFiscalYears(
  properties: Property[],
  leases: Lease[],
  payments: Payment[],
  expenses: FiscalExpense[],
) {
  const years = new Set<number>()
  years.add(new Date().getFullYear())

  for (const payment of payments) {
    years.add(payment.period_year)
    if (payment.payment_date) years.add(new Date(payment.payment_date).getFullYear())
  }

  for (const lease of leases) {
    years.add(new Date(lease.start_date).getFullYear())
    if (lease.end_date) years.add(new Date(lease.end_date).getFullYear())
  }

  for (const property of properties) {
    years.add(new Date(property.created_at).getFullYear())
  }

  for (const expense of expenses) {
    years.add(expense.year)
  }

  return Array.from(years).sort((left, right) => right - left)
}

// ── CSV ──────────────────────────────────────────────────────────────────────

export function buildFiscalCsv(summary: FiscalYearSummary) {
  const lines = [
    [
      'Bien', 'Ville', 'Mois occupes', 'Mois vacants', 'Baux actifs dans l annee',
      'Loyers encaisses', 'Charges recuperees', 'Total encaisse', 'Impayes / restant du',
      'Taxe fonciere', 'Travaux', 'Assurance PNO', 'Frais gestion/syndic', 'Interets emprunt', 'Autres charges',
      'Total charges deductibles', 'Resultat net',
      'Paiements encaisses',
    ],
    ...summary.properties.map((item) => [
      item.propertyName,
      item.propertyCity,
      String(item.occupiedMonths),
      String(item.vacantMonths),
      String(item.leaseCount),
      formatNumberCsv(item.receivedRent),
      formatNumberCsv(item.receivedCharges),
      formatNumberCsv(item.totalReceived),
      formatNumberCsv(item.outstandingAmount),
      formatNumberCsv(item.expenses.taxe_fonciere),
      formatNumberCsv(item.expenses.travaux),
      formatNumberCsv(item.expenses.assurance_pno),
      formatNumberCsv(item.expenses.frais_gestion),
      formatNumberCsv(item.expenses.interets_emprunt),
      formatNumberCsv(item.expenses.autre),
      formatNumberCsv(item.expenses.total),
      formatNumberCsv(item.totalReceived - item.expenses.total),
      String(item.paidPaymentCount),
    ]),
    [
      'TOTAL', '', String(summary.occupiedMonths), String(summary.vacantMonths), '',
      formatNumberCsv(summary.receivedRent),
      formatNumberCsv(summary.receivedCharges),
      formatNumberCsv(summary.totalReceived),
      formatNumberCsv(summary.outstandingAmount),
      formatNumberCsv(summary.expenses.taxe_fonciere),
      formatNumberCsv(summary.expenses.travaux),
      formatNumberCsv(summary.expenses.assurance_pno),
      formatNumberCsv(summary.expenses.frais_gestion),
      formatNumberCsv(summary.expenses.interets_emprunt),
      formatNumberCsv(summary.expenses.autre),
      formatNumberCsv(summary.expenses.total),
      formatNumberCsv(summary.netResult),
      '',
    ],
  ]

  return lines.map((row) => row.map(escapeCsvCell).join(';')).join('\n')
}

// ── Internal ─────────────────────────────────────────────────────────────────

function buildPropertySummary(
  property: Property,
  year: number,
  leases: Lease[],
  payments: Payment[],
  leaseById: Map<number, Lease>,
  yearExpenses: FiscalExpense[],
): FiscalPropertySummary {
  const propertyLeases = leases.filter((lease) => lease.property_id === property.id)
  const coveredMonths = monthsCoveredForYear(propertyLeases, year)
  const paidPayments = payments.filter((payment) => (
    leaseById.get(payment.lease_id)?.property_id === property.id
    && payment.status === 'paid'
    && effectiveYearForPayment(payment) === year
  ))
  const outstandingPayments = payments.filter((payment) => (
    leaseById.get(payment.lease_id)?.property_id === property.id
    && payment.status !== 'paid'
    && payment.period_year === year
  ))

  const receivedRent = round2(paidPayments.reduce((sum, payment) => sum + payment.rent_amount, 0))
  const receivedCharges = round2(paidPayments.reduce((sum, payment) => sum + payment.charges_amount, 0))

  const propertyExpenses = yearExpenses.filter((e) => e.property_id === property.id)
  const expenseSummary = buildExpenseSummary(propertyExpenses)

  return {
    propertyId: property.id,
    propertyName: property.name,
    propertyCity: property.city,
    occupiedMonths: coveredMonths.length,
    vacantMonths: 12 - coveredMonths.length,
    leaseCount: propertyLeases.filter((lease) => leaseOverlapsYear(lease, year)).length,
    receivedRent,
    receivedCharges,
    totalReceived: round2(receivedRent + receivedCharges),
    outstandingAmount: round2(outstandingPayments.reduce((sum, payment) => sum + payment.rent_amount + payment.charges_amount, 0)),
    paidPaymentCount: paidPayments.length,
    expenses: expenseSummary,
  }
}

function buildExpenseSummary(expenses: FiscalExpense[]): FiscalExpenseSummary {
  const result: FiscalExpenseSummary = {
    taxe_fonciere: 0,
    travaux: 0,
    assurance_pno: 0,
    frais_gestion: 0,
    interets_emprunt: 0,
    autre: 0,
    total: 0,
  }

  for (const expense of expenses) {
    const cat = expense.category as string
    if (cat in result && cat !== 'total') {
      const key = cat as keyof Omit<FiscalExpenseSummary, 'total'>
      result[key] = round2(result[key] + expense.amount)
    } else {
      result.autre = round2(result.autre + expense.amount)
    }
  }

  result.total = round2(
    result.taxe_fonciere + result.travaux + result.assurance_pno
    + result.frais_gestion + result.interets_emprunt + result.autre
  )

  return result
}

function aggregateExpenses(items: FiscalExpenseSummary[]): FiscalExpenseSummary {
  const result: FiscalExpenseSummary = {
    taxe_fonciere: 0, travaux: 0, assurance_pno: 0,
    frais_gestion: 0, interets_emprunt: 0, autre: 0, total: 0,
  }

  for (const item of items) {
    result.taxe_fonciere = round2(result.taxe_fonciere + item.taxe_fonciere)
    result.travaux = round2(result.travaux + item.travaux)
    result.assurance_pno = round2(result.assurance_pno + item.assurance_pno)
    result.frais_gestion = round2(result.frais_gestion + item.frais_gestion)
    result.interets_emprunt = round2(result.interets_emprunt + item.interets_emprunt)
    result.autre = round2(result.autre + item.autre)
  }

  result.total = round2(
    result.taxe_fonciere + result.travaux + result.assurance_pno
    + result.frais_gestion + result.interets_emprunt + result.autre
  )

  return result
}

function monthsCoveredForYear(leases: Lease[], year: number) {
  const covered = new Set<number>()

  for (const lease of leases) {
    for (let month = 1; month <= 12; month += 1) {
      if (leaseOverlapsMonth(lease, year, month)) {
        covered.add(month)
      }
    }
  }

  return Array.from(covered).sort((left, right) => left - right)
}

function leaseOverlapsYear(lease: Lease, year: number) {
  return Array.from({ length: 12 }, (_, index) => index + 1).some((month) => leaseOverlapsMonth(lease, year, month))
}

function leaseOverlapsMonth(lease: Lease, year: number, month: number) {
  const leaseStart = startOfDay(lease.start_date)
  const leaseEnd = lease.end_date ? endOfDay(lease.end_date) : endOfDay(`${year}-12-31`)
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)

  return leaseStart <= monthEnd && leaseEnd >= monthStart
}

function effectiveYearForPayment(payment: Payment) {
  return payment.payment_date ? new Date(payment.payment_date).getFullYear() : payment.period_year
}

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00`)
}

function endOfDay(value: string) {
  return new Date(`${value}T23:59:59`)
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function sumBy(items: FiscalPropertySummary[], key: keyof FiscalPropertySummary) {
  return items.reduce((sum, item) => sum + (typeof item[key] === 'number' ? (item[key] as number) : 0), 0)
}

function formatNumberCsv(value: number) {
  return value.toFixed(2).replace('.', ',')
}

function escapeCsvCell(value: string) {
  if (/[;"\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
