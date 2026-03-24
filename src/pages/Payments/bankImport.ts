export interface ParsedBankTransaction {
  id: string
  rowNumber: number
  date: string
  description: string
  amount: number
  direction: 'credit' | 'debit'
}

export interface BankImportSuggestion {
  mode: 'ignore' | 'mark_existing' | 'create_new'
  paymentId?: number
  leaseId?: number
  periodMonth: number
  periodYear: number
  confidence: 'high' | 'medium' | 'low' | 'none'
  reasons: string[]
}

const DATE_HEADERS = [
  'date',
  'date operation',
  'date operation comptable',
  'date comptable',
  'booking date',
  'operation date',
  'value date',
]

const DESCRIPTION_HEADERS = [
  'libelle',
  'libelle operation',
  'libelle detail',
  'description',
  'details',
  'operation',
  'motif',
  'narration',
  'intitule',
]

const AMOUNT_HEADERS = ['montant', 'amount', 'net amount']
const CREDIT_HEADERS = ['credit', 'credits', 'montant credit']
const DEBIT_HEADERS = ['debit', 'debits', 'montant debit']

export function parseBankCsv(text: string): ParsedBankTransaction[] {
  const cleaned = text.replace(/^\uFEFF/, '').trim()
  if (!cleaned) return []

  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const separator = detectSeparator(lines.slice(0, 5))
  const headerCells = splitCsvLine(lines[0], separator)
  const normalizedHeaders = headerCells.map(normalizeHeader)

  const dateIndex = findHeaderIndex(normalizedHeaders, DATE_HEADERS)
  const descriptionIndex = findHeaderIndex(normalizedHeaders, DESCRIPTION_HEADERS)
  const amountIndex = findHeaderIndex(normalizedHeaders, AMOUNT_HEADERS)
  const creditIndex = findHeaderIndex(normalizedHeaders, CREDIT_HEADERS)
  const debitIndex = findHeaderIndex(normalizedHeaders, DEBIT_HEADERS)

  if (dateIndex < 0) throw new Error('Colonne date introuvable dans le CSV.')
  if (descriptionIndex < 0) throw new Error('Colonne libelle/description introuvable dans le CSV.')
  if (amountIndex < 0 && creditIndex < 0 && debitIndex < 0) {
    throw new Error('Colonne montant introuvable dans le CSV.')
  }

  const transactions: ParsedBankTransaction[] = []

  for (let index = 1; index < lines.length; index += 1) {
    const cells = splitCsvLine(lines[index], separator)
    if (cells.length === 0) continue

    const date = parseCsvDate(cells[dateIndex] ?? '')
    if (!date) continue

    const description = (cells[descriptionIndex] ?? '').trim()
    if (!description) continue

    const amount = amountIndex >= 0
      ? parseCsvAmount(cells[amountIndex] ?? '')
      : buildSignedAmount(cells[creditIndex] ?? '', cells[debitIndex] ?? '')

    if (amount === null || amount === 0) continue

    transactions.push({
      id: `tx-${index}`,
      rowNumber: index + 1,
      date,
      description,
      amount: round2(Math.abs(amount)),
      direction: amount >= 0 ? 'credit' : 'debit',
    })
  }

  return transactions
}

export function suggestBankImport(transaction: ParsedBankTransaction, payments: Payment[], leases: Lease[]): BankImportSuggestion {
  const txDate = new Date(transaction.date)
  const periodMonth = txDate.getMonth() + 1
  const periodYear = txDate.getFullYear()

  const pendingCandidates = payments
    .filter((payment) => payment.status !== 'paid')
    .map((payment) => ({ payment, score: scorePaymentMatch(transaction, payment) }))
    .sort((left, right) => right.score.total - left.score.total)

  const bestPayment = pendingCandidates[0]
  if (bestPayment && bestPayment.score.total >= 42) {
    return {
      mode: 'mark_existing',
      paymentId: bestPayment.payment.id,
      periodMonth: bestPayment.payment.period_month,
      periodYear: bestPayment.payment.period_year,
      confidence: confidenceForScore(bestPayment.score.total),
      reasons: bestPayment.score.reasons,
    }
  }

  const leaseCandidates = leases
    .filter((lease) => lease.status === 'active')
    .map((lease) => ({ lease, score: scoreLeaseMatch(transaction, lease) }))
    .sort((left, right) => right.score.total - left.score.total)

  const bestLease = leaseCandidates[0]
  if (bestLease && bestLease.score.total >= 28) {
    return {
      mode: 'create_new',
      leaseId: bestLease.lease.id,
      periodMonth,
      periodYear,
      confidence: confidenceForScore(bestLease.score.total),
      reasons: bestLease.score.reasons,
    }
  }

  return {
    mode: 'ignore',
    periodMonth,
    periodYear,
    confidence: 'none',
    reasons: ['Aucune correspondance fiable detectee.'],
  }
}

export function allocateImportedAmount(amount: number, leaseRent: number, leaseCharges: number) {
  const roundedAmount = round2(amount)
  const totalDue = leaseRent + leaseCharges

  if (totalDue <= 0 || leaseCharges <= 0) {
    return {
      rentAmount: roundedAmount,
      chargesAmount: 0,
    }
  }

  if (roundedAmount >= totalDue) {
    return {
      rentAmount: round2(leaseRent + (roundedAmount - totalDue)),
      chargesAmount: round2(leaseCharges),
    }
  }

  const chargesRatio = leaseCharges / totalDue
  const chargesAmount = round2(roundedAmount * chargesRatio)

  return {
    rentAmount: round2(roundedAmount - chargesAmount),
    chargesAmount,
  }
}

export function buildImportedNote(description: string, rowNumber: number) {
  return `Import banque CSV ligne ${rowNumber}: ${description}`
}

function scorePaymentMatch(transaction: ParsedBankTransaction, payment: Payment) {
  const reasons: string[] = []
  let total = 0

  const amountScore = amountSimilarity(transaction.amount, payment.lease_rent_amount + payment.lease_charges_amount)
  total += amountScore
  if (amountScore >= 30) reasons.push('Montant proche du loyer attendu.')

  const textScore = textSimilarity(transaction.description, [
    `${payment.tenant_first_name} ${payment.tenant_last_name}`,
    payment.tenant_last_name,
    payment.property_name,
  ])
  total += textScore
  if (textScore > 0) reasons.push('Libelle proche du locataire ou du bien.')

  const txDate = new Date(transaction.date)
  if (payment.period_month === txDate.getMonth() + 1 && payment.period_year === txDate.getFullYear()) {
    total += 14
    reasons.push('Meme mois que la transaction.')
  }

  if (payment.status === 'late') {
    total += 8
    reasons.push('Paiement deja en retard.')
  } else if (payment.status === 'pending') {
    total += 5
  }

  return { total, reasons }
}

function scoreLeaseMatch(transaction: ParsedBankTransaction, lease: Lease) {
  const reasons: string[] = []
  let total = 0

  const amountScore = amountSimilarity(transaction.amount, lease.rent_amount + lease.charges_amount)
  total += amountScore
  if (amountScore >= 30) reasons.push('Montant proche du bail actif.')

  const textScore = textSimilarity(transaction.description, [
    `${lease.tenant_first_name} ${lease.tenant_last_name}`,
    lease.tenant_last_name,
    lease.property_name,
  ])
  total += textScore
  if (textScore > 0) reasons.push('Libelle proche du locataire ou du bien.')

  return { total, reasons }
}

function amountSimilarity(left: number, right: number) {
  const diff = Math.abs(left - right)
  if (diff < 0.01) return 38
  if (diff <= 1) return 28
  if (diff <= 5) return 14
  return 0
}

function textSimilarity(rawText: string, candidates: string[]) {
  const text = normalizeForMatch(rawText)
  let score = 0

  for (const candidate of candidates) {
    const normalized = normalizeForMatch(candidate)
    if (!normalized) continue

    if (text.includes(normalized)) {
      score = Math.max(score, normalized.includes(' ') ? 24 : 16)
    } else {
      const parts = normalized.split(' ').filter(Boolean)
      const matchedParts = parts.filter((part) => text.includes(part)).length
      if (matchedParts >= 2) score = Math.max(score, 18)
      else if (matchedParts === 1) score = Math.max(score, 8)
    }
  }

  return score
}

function confidenceForScore(score: number): BankImportSuggestion['confidence'] {
  if (score >= 60) return 'high'
  if (score >= 42) return 'medium'
  if (score >= 28) return 'low'
  return 'none'
}

function buildSignedAmount(creditValue: string, debitValue: string) {
  const credit = parseCsvAmount(creditValue)
  if (credit && credit > 0) return credit

  const debit = parseCsvAmount(debitValue)
  if (debit && debit > 0) return -debit

  return null
}

function parseCsvDate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const slashMatch = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/)
  if (!slashMatch) return null

  const day = slashMatch[1].padStart(2, '0')
  const month = slashMatch[2].padStart(2, '0')
  const year = slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3]
  return `${year}-${month}-${day}`
}

function parseCsvAmount(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const normalized = trimmed
    .replace(/\s/g, '')
    .replace(/[€]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(/,(?=\d{2}$)/, '.')
    .replace(/'/g, '')

  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : null
}

function detectSeparator(lines: string[]) {
  const separators = [';', ',', '\t']
  const counts = separators.map((separator) => ({
    separator,
    count: lines.reduce((total, line) => total + splitCsvLine(line, separator).length, 0),
  }))

  return counts.sort((left, right) => right.count - left.count)[0]?.separator ?? ';'
}

function splitCsvLine(line: string, separator: string) {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === separator && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

function findHeaderIndex(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.includes(header))
}

function normalizeHeader(value: string) {
  return normalizeForMatch(value).replace(/\s+/g, ' ').trim()
}

function normalizeForMatch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}
