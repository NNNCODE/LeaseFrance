export interface ParsedBankTransaction {
  id: string
  rowNumber: number
  date: string
  description: string
  amount: number
  direction: 'credit' | 'debit'
  fingerprint: string
}

export interface BankImportSuggestion {
  mode: 'ignore' | 'mark_existing' | 'create_new'
  paymentId?: number
  leaseId?: number
  periodMonth: number
  periodYear: number
  confidence: 'high' | 'medium' | 'low' | 'none'
  score: number
  reasons: MatchReason[]
}

export interface MatchReason {
  labelKey: string
  detailKey: string
  values?: Record<string, string | number>
  points: number
}

export interface BankPreset {
  id: string
  name: string
  separator: string
  dateHeaders: string[]
  descriptionHeaders: string[]
  amountHeaders: string[]
  creditHeaders: string[]
  debitHeaders: string[]
}

export const BANK_PRESETS: BankPreset[] = [
  {
    id: 'auto',
    name: 'auto',
    separator: '',
    dateHeaders: [],
    descriptionHeaders: [],
    amountHeaders: [],
    creditHeaders: [],
    debitHeaders: [],
  },
  {
    id: 'bnp',
    name: 'BNP Paribas',
    separator: ';',
    dateHeaders: ['date operation', 'date de comptabilisation'],
    descriptionHeaders: ['libelle', 'libelle operation'],
    amountHeaders: ['montant'],
    creditHeaders: ['credit'],
    debitHeaders: ['debit'],
  },
  {
    id: 'ca',
    name: 'Credit Agricole',
    separator: ';',
    dateHeaders: ['date', 'date operation'],
    descriptionHeaders: ['libelle', 'libelle operation', 'libelle simplifie'],
    amountHeaders: ['montant'],
    creditHeaders: ['credit'],
    debitHeaders: ['debit'],
  },
  {
    id: 'sg',
    name: 'Societe Generale',
    separator: ';',
    dateHeaders: ['date de l operation', 'date operation', 'date de comptabilisation'],
    descriptionHeaders: ['detail de l ecriture', 'libelle', 'libelle operation'],
    amountHeaders: ['montant'],
    creditHeaders: ['credit'],
    debitHeaders: ['debit'],
  },
  {
    id: 'lcl',
    name: 'LCL',
    separator: ';',
    dateHeaders: ['date de valeur', 'date', 'date operation'],
    descriptionHeaders: ['libelle', 'libelle operation'],
    amountHeaders: ['montant'],
    creditHeaders: ['credit'],
    debitHeaders: ['debit'],
  },
  {
    id: 'bp',
    name: 'La Banque Postale',
    separator: ';',
    dateHeaders: ['date comptable', 'date', 'date operation'],
    descriptionHeaders: ['libelle', 'libelle operation'],
    amountHeaders: ['montant eur', 'montant', 'montant operation'],
    creditHeaders: ['credit'],
    debitHeaders: ['debit'],
  },
  {
    id: 'boursorama',
    name: 'Boursorama',
    separator: ';',
    dateHeaders: ['dateop', 'date operation', 'date op', 'date'],
    descriptionHeaders: ['label', 'libelle', 'libelle operation'],
    amountHeaders: ['amount', 'montant'],
    creditHeaders: ['credit'],
    debitHeaders: ['debit'],
  },
  {
    id: 'cic',
    name: 'CIC / Credit Mutuel',
    separator: ';',
    dateHeaders: ['date operation', 'date', 'date de comptabilisation'],
    descriptionHeaders: ['libelle', 'libelle operation'],
    amountHeaders: ['montant'],
    creditHeaders: ['credit'],
    debitHeaders: ['debit'],
  },
  {
    id: 'fortuneo',
    name: 'Fortuneo',
    separator: ';',
    dateHeaders: ['date operation', 'date'],
    descriptionHeaders: ['libelle', 'libelle operation'],
    amountHeaders: ['montant'],
    creditHeaders: ['credit'],
    debitHeaders: ['debit'],
  },
]

const DEFAULT_DATE_HEADERS = [
  'date', 'date operation', 'date operation comptable', 'date comptable',
  'date de l operation', 'date de comptabilisation', 'date de valeur',
  'booking date', 'operation date', 'value date', 'dateop', 'date op',
]

const DEFAULT_DESCRIPTION_HEADERS = [
  'libelle', 'libelle operation', 'libelle detail', 'libelle simplifie',
  'detail de l ecriture', 'description', 'details', 'operation',
  'motif', 'narration', 'intitule', 'label',
]

const DEFAULT_AMOUNT_HEADERS = ['montant', 'amount', 'net amount', 'montant eur', 'montant operation']
const DEFAULT_CREDIT_HEADERS = ['credit', 'credits', 'montant credit']
const DEFAULT_DEBIT_HEADERS = ['debit', 'debits', 'montant debit']

export function parseBankCsv(text: string, presetId?: string): ParsedBankTransaction[] {
  const cleaned = text.replace(/^\uFEFF/, '').trim()
  if (!cleaned) return []

  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const preset = presetId ? BANK_PRESETS.find((entry) => entry.id === presetId) : null
  const isAuto = !preset || preset.id === 'auto'

  const separator = isAuto
    ? detectSeparator(lines.slice(0, 5))
    : (preset.separator || detectSeparator(lines.slice(0, 5)))

  const headerCells = splitCsvLine(lines[0], separator)
  const normalizedHeaders = headerCells.map(normalizeHeader)

  const dateHeaders = isAuto ? DEFAULT_DATE_HEADERS : [...preset.dateHeaders, ...DEFAULT_DATE_HEADERS]
  const descHeaders = isAuto ? DEFAULT_DESCRIPTION_HEADERS : [...preset.descriptionHeaders, ...DEFAULT_DESCRIPTION_HEADERS]
  const amtHeaders = isAuto ? DEFAULT_AMOUNT_HEADERS : [...preset.amountHeaders, ...DEFAULT_AMOUNT_HEADERS]
  const creditHeaders = isAuto ? DEFAULT_CREDIT_HEADERS : [...preset.creditHeaders, ...DEFAULT_CREDIT_HEADERS]
  const debitHeaders = isAuto ? DEFAULT_DEBIT_HEADERS : [...preset.debitHeaders, ...DEFAULT_DEBIT_HEADERS]

  const dateIndex = findHeaderIndex(normalizedHeaders, dateHeaders)
  const descriptionIndex = findHeaderIndex(normalizedHeaders, descHeaders)
  const amountIndex = findHeaderIndex(normalizedHeaders, amtHeaders)
  const creditIndex = findHeaderIndex(normalizedHeaders, creditHeaders)
  const debitIndex = findHeaderIndex(normalizedHeaders, debitHeaders)

  if (dateIndex < 0) throw new Error('payments.bankImport.errors.missingDateColumn')
  if (descriptionIndex < 0) throw new Error('payments.bankImport.errors.missingDescriptionColumn')
  if (amountIndex < 0 && creditIndex < 0 && debitIndex < 0) {
    throw new Error('payments.bankImport.errors.missingAmountColumn')
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

    const absAmount = round2(Math.abs(amount))
    transactions.push({
      id: `tx-${index}`,
      rowNumber: index + 1,
      date,
      description,
      amount: absAmount,
      direction: amount >= 0 ? 'credit' : 'debit',
      fingerprint: generateFingerprint(date, absAmount, description),
    })
  }

  return transactions
}

export function detectBankPreset(text: string): string {
  const cleaned = text.replace(/^\uFEFF/, '').trim()
  if (!cleaned) return 'auto'

  const firstLine = cleaned.split(/\r?\n/)[0] ?? ''
  const normalized = normalizeForMatch(firstLine)

  const scores: Array<{ id: string; score: number }> = []

  for (const preset of BANK_PRESETS) {
    if (preset.id === 'auto') continue

    let score = 0
    const allHeaders = [
      ...preset.dateHeaders,
      ...preset.descriptionHeaders,
      ...preset.amountHeaders,
      ...preset.creditHeaders,
      ...preset.debitHeaders,
    ]

    for (const header of allHeaders) {
      if (normalized.includes(header)) score += 1
    }

    scores.push({ id: preset.id, score })
  }

  scores.sort((left, right) => right.score - left.score)
  return scores[0] && scores[0].score >= 2 ? scores[0].id : 'auto'
}

export function generateFingerprint(date: string, amount: number, description: string): string {
  const normDesc = normalizeForMatch(description).substring(0, 60)
  return `${date}|${round2(amount)}|${normDesc}`
}

export function suggestBankImport(
  transaction: ParsedBankTransaction,
  payments: Payment[],
  leases: Lease[],
): BankImportSuggestion {
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
      score: bestPayment.score.total,
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
      score: bestLease.score.total,
      reasons: bestLease.score.reasons,
    }
  }

  return {
    mode: 'ignore',
    periodMonth,
    periodYear,
    confidence: 'none',
    score: 0,
    reasons: [{
      labelKey: 'payments.bankImport.reason.none.label',
      detailKey: 'payments.bankImport.reason.none.detail',
      points: 0,
    }],
  }
}

export function allocateImportedAmount(amount: number, leaseRent: number, leaseCharges: number) {
  const roundedAmount = round2(amount)
  const totalDue = leaseRent + leaseCharges

  if (totalDue <= 0 || leaseCharges <= 0) {
    return { rentAmount: roundedAmount, chargesAmount: 0 }
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
  return `[CSV ${rowNumber}] ${description}`
}

function scorePaymentMatch(transaction: ParsedBankTransaction, payment: Payment) {
  const reasons: MatchReason[] = []
  let total = 0

  const expected = payment.lease_rent_amount + payment.lease_charges_amount
  const diff = Math.abs(transaction.amount - expected)
  const amountScore = amountSimilarity(transaction.amount, expected)
  total += amountScore

  if (amountScore > 0) {
    reasons.push({
      labelKey: 'payments.bankImport.reason.amount.label',
      detailKey: diff < 0.01
        ? 'payments.bankImport.reason.amount.exact'
        : 'payments.bankImport.reason.amount.diff',
      values: diff < 0.01 ? { expected } : { diff, expected },
      points: amountScore,
    })
  }

  const textResult = textSimilarityDetailed(transaction.description, [
    { value: `${payment.tenant_first_name} ${payment.tenant_last_name}`, label: `${payment.tenant_first_name} ${payment.tenant_last_name}` },
    { value: payment.tenant_last_name, label: payment.tenant_last_name },
    { value: payment.property_name, label: payment.property_name },
  ])
  total += textResult.score

  if (textResult.score > 0) {
    reasons.push({
      labelKey: 'payments.bankImport.reason.description.label',
      detailKey: 'payments.bankImport.reason.description.match',
      values: { matched: textResult.matched },
      points: textResult.score,
    })
  }

  const txDate = new Date(transaction.date)
  if (payment.period_month === txDate.getMonth() + 1 && payment.period_year === txDate.getFullYear()) {
    total += 14
    reasons.push({
      labelKey: 'payments.bankImport.reason.period.label',
      detailKey: 'payments.bankImport.reason.period.sameMonth',
      points: 14,
    })
  }

  if (payment.status === 'late') {
    total += 8
    reasons.push({
      labelKey: 'payments.bankImport.reason.status.label',
      detailKey: 'payments.bankImport.reason.status.late',
      points: 8,
    })
  } else if (payment.status === 'pending') {
    total += 5
    reasons.push({
      labelKey: 'payments.bankImport.reason.status.label',
      detailKey: 'payments.bankImport.reason.status.pending',
      points: 5,
    })
  }

  return { total, reasons }
}

function scoreLeaseMatch(transaction: ParsedBankTransaction, lease: Lease) {
  const reasons: MatchReason[] = []
  let total = 0

  const expected = lease.rent_amount + lease.charges_amount
  const diff = Math.abs(transaction.amount - expected)
  const amountScore = amountSimilarity(transaction.amount, expected)
  total += amountScore

  if (amountScore > 0) {
    reasons.push({
      labelKey: 'payments.bankImport.reason.amount.label',
      detailKey: diff < 0.01
        ? 'payments.bankImport.reason.amount.exact'
        : 'payments.bankImport.reason.amount.diff',
      values: diff < 0.01 ? { expected } : { diff, expected },
      points: amountScore,
    })
  }

  const textResult = textSimilarityDetailed(transaction.description, [
    { value: `${lease.tenant_first_name} ${lease.tenant_last_name}`, label: `${lease.tenant_first_name} ${lease.tenant_last_name}` },
    { value: lease.tenant_last_name, label: lease.tenant_last_name },
    { value: lease.property_name, label: lease.property_name },
  ])
  total += textResult.score

  if (textResult.score > 0) {
    reasons.push({
      labelKey: 'payments.bankImport.reason.description.label',
      detailKey: 'payments.bankImport.reason.description.match',
      values: { matched: textResult.matched },
      points: textResult.score,
    })
  }

  return { total, reasons }
}

function amountSimilarity(left: number, right: number) {
  const diff = Math.abs(left - right)
  if (diff < 0.01) return 38
  if (diff <= 1) return 28
  if (diff <= 5) return 14
  return 0
}

function textSimilarityDetailed(
  rawText: string,
  candidates: Array<{ value: string; label: string }>,
): { score: number; matched: string } {
  const text = normalizeForMatch(rawText)
  let best = { score: 0, matched: '' }

  for (const candidate of candidates) {
    const normalized = normalizeForMatch(candidate.value)
    if (!normalized) continue

    if (text.includes(normalized)) {
      const points = normalized.includes(' ') ? 24 : 16
      if (points > best.score) best = { score: points, matched: candidate.label }
    } else {
      const parts = normalized.split(' ').filter(Boolean)
      const matchedParts = parts.filter((part) => text.includes(part))

      if (matchedParts.length >= 2 && 18 > best.score) {
        best = { score: 18, matched: candidate.label }
      } else if (matchedParts.length === 1 && 8 > best.score) {
        best = { score: 8, matched: matchedParts[0] }
      }
    }
  }

  return best
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

  const slashMatch = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
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
