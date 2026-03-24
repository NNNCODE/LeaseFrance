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
  properties: FiscalPropertySummary[]
}

export function buildFiscalYearSummary(year: number, properties: Property[], leases: Lease[], payments: Payment[]): FiscalYearSummary {
  const leaseById = new Map(leases.map((lease) => [lease.id, lease]))
  const summaries = properties
    .map((property) => buildPropertySummary(property, year, leases, payments, leaseById))
    .sort((left, right) => left.propertyName.localeCompare(right.propertyName))

  return {
    year,
    propertyCount: summaries.length,
    receivedRent: round2(sumBy(summaries, 'receivedRent')),
    receivedCharges: round2(sumBy(summaries, 'receivedCharges')),
    totalReceived: round2(sumBy(summaries, 'totalReceived')),
    outstandingAmount: round2(sumBy(summaries, 'outstandingAmount')),
    occupiedMonths: summaries.reduce((sum, item) => sum + item.occupiedMonths, 0),
    vacantMonths: summaries.reduce((sum, item) => sum + item.vacantMonths, 0),
    properties: summaries,
  }
}

export function availableFiscalYears(properties: Property[], leases: Lease[], payments: Payment[]) {
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

  return Array.from(years).sort((left, right) => right - left)
}

export function buildFiscalCsv(summary: FiscalYearSummary) {
  const lines = [
    [
      'Bien',
      'Ville',
      'Mois occupes',
      'Mois vacants',
      'Baux actifs dans l annee',
      'Loyers encaisses',
      'Charges recuperees',
      'Total encaisse',
      'Impayes / restant du',
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
      String(item.paidPaymentCount),
    ]),
    [
      'TOTAL',
      '',
      String(summary.occupiedMonths),
      String(summary.vacantMonths),
      '',
      formatNumberCsv(summary.receivedRent),
      formatNumberCsv(summary.receivedCharges),
      formatNumberCsv(summary.totalReceived),
      formatNumberCsv(summary.outstandingAmount),
      '',
    ],
  ]

  return lines.map((row) => row.map(escapeCsvCell).join(';')).join('\n')
}

function buildPropertySummary(
  property: Property,
  year: number,
  leases: Lease[],
  payments: Payment[],
  leaseById: Map<number, Lease>
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
  }
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
