import { describe, it, expect } from 'vitest'
import {
  parseBankCsv,
  detectBankPreset,
  generateFingerprint,
  allocateImportedAmount,
  suggestBankImport,
  buildImportedNote,
  BANK_PRESETS,
  type ParsedBankTransaction,
} from '../../src/pages/Payments/bankImport'

// ── parseBankCsv ─────────────────────────────────────────────────────────────

describe('parseBankCsv', () => {
  it('parses a basic semicolon-separated CSV', () => {
    const csv = [
      'date;libelle;montant',
      '15/01/2025;LOYER DUPONT;850.00',
      '20/01/2025;VIREMENT MARTIN;-120.50',
    ].join('\n')

    const result = parseBankCsv(csv)
    expect(result).toHaveLength(2)

    expect(result[0].date).toBe('2025-01-15')
    expect(result[0].description).toBe('LOYER DUPONT')
    expect(result[0].amount).toBe(850)
    expect(result[0].direction).toBe('credit')

    expect(result[1].date).toBe('2025-01-20')
    expect(result[1].amount).toBe(120.5)
    expect(result[1].direction).toBe('debit')
  })

  it('parses ISO date format (YYYY-MM-DD)', () => {
    const csv = 'date;libelle;montant\n2025-03-01;TEST;100.00'
    const result = parseBankCsv(csv)
    expect(result[0].date).toBe('2025-03-01')
  })

  it('parses credit/debit split columns', () => {
    const csv = [
      'date;libelle;credit;debit',
      '01/02/2025;LOYER;750.00;',
      '05/02/2025;PRELEVEMENT;;45.00',
    ].join('\n')

    const result = parseBankCsv(csv)
    expect(result).toHaveLength(2)
    expect(result[0].direction).toBe('credit')
    expect(result[0].amount).toBe(750)
    expect(result[1].direction).toBe('debit')
    expect(result[1].amount).toBe(45)
  })

  it('handles French number format (comma as decimal separator)', () => {
    const csv = 'date;libelle;montant\n01/01/2025;TEST;1250,75'
    const result = parseBankCsv(csv)
    expect(result[0].amount).toBe(1250.75)
  })

  it('handles BOM character', () => {
    const csv = '\uFEFFdate;libelle;montant\n01/01/2025;TEST;100'
    const result = parseBankCsv(csv)
    expect(result).toHaveLength(1)
  })

  it('skips rows with missing date', () => {
    const csv = 'date;libelle;montant\n;TEST;100\n01/01/2025;VALID;200'
    const result = parseBankCsv(csv)
    expect(result).toHaveLength(1)
    expect(result[0].description).toBe('VALID')
  })

  it('skips rows with zero amount', () => {
    const csv = 'date;libelle;montant\n01/01/2025;ZERO;0\n01/01/2025;OK;50'
    const result = parseBankCsv(csv)
    expect(result).toHaveLength(1)
  })

  it('returns empty array for empty input', () => {
    expect(parseBankCsv('')).toEqual([])
  })

  it('returns empty array for header-only CSV', () => {
    expect(parseBankCsv('date;libelle;montant')).toEqual([])
  })

  it('throws when date column is missing', () => {
    expect(() => parseBankCsv('foo;bar;montant\n01/01/2025;X;100')).toThrow(
      'payments.bankImport.errors.missingDateColumn',
    )
  })

  it('throws when amount column is missing', () => {
    expect(() => parseBankCsv('date;libelle;foo\n01/01/2025;X;100')).toThrow(
      'payments.bankImport.errors.missingAmountColumn',
    )
  })

  it('generates unique fingerprints per row', () => {
    const csv = [
      'date;libelle;montant',
      '01/01/2025;LOYER A;800',
      '01/01/2025;LOYER B;800',
    ].join('\n')

    const result = parseBankCsv(csv)
    expect(result[0].fingerprint).not.toBe(result[1].fingerprint)
  })

  it('handles quoted fields with separator inside', () => {
    const csv = 'date;libelle;montant\n01/01/2025;"LOYER;DUPONT";500'
    const result = parseBankCsv(csv)
    expect(result[0].description).toBe('LOYER;DUPONT')
  })

  it('accepts a specific bank preset', () => {
    const csv = [
      'date operation;libelle;montant',
      '15/03/2025;VIR LOYER;950',
    ].join('\n')

    const result = parseBankCsv(csv, 'bnp')
    expect(result).toHaveLength(1)
    expect(result[0].amount).toBe(950)
  })
})

// ── detectBankPreset ─────────────────────────────────────────────────────────

describe('detectBankPreset', () => {
  it('detects Boursorama from unique header', () => {
    // 'dateop' and 'label' are specific to Boursorama
    const csv = 'dateop;label;amount;credit;debit\n01/01/2025;TEST;100;;'
    expect(detectBankPreset(csv)).toBe('boursorama')
  })

  it('returns a bank preset for common French banking headers', () => {
    const csv = 'date operation;libelle;montant;credit;debit\n01/01/2025;TEST;100;;'
    const result = detectBankPreset(csv)
    expect(result).not.toBe('auto')
  })

  it('returns auto for unrecognized headers', () => {
    const csv = 'col1;col2;col3\nfoo;bar;baz'
    expect(detectBankPreset(csv)).toBe('auto')
  })

  it('returns auto for empty input', () => {
    expect(detectBankPreset('')).toBe('auto')
  })
})

// ── generateFingerprint ──────────────────────────────────────────────────────

describe('generateFingerprint', () => {
  it('produces a deterministic fingerprint', () => {
    const fp1 = generateFingerprint('2025-01-15', 850, 'LOYER DUPONT')
    const fp2 = generateFingerprint('2025-01-15', 850, 'LOYER DUPONT')
    expect(fp1).toBe(fp2)
  })

  it('different inputs produce different fingerprints', () => {
    const fp1 = generateFingerprint('2025-01-15', 850, 'LOYER DUPONT')
    const fp2 = generateFingerprint('2025-01-16', 850, 'LOYER DUPONT')
    expect(fp1).not.toBe(fp2)
  })

  it('normalizes description accents', () => {
    const fp1 = generateFingerprint('2025-01-15', 100, 'Regu paiement')
    const fp2 = generateFingerprint('2025-01-15', 100, 'REGU PAIEMENT')
    expect(fp1).toBe(fp2)
  })
})

// ── allocateImportedAmount ───────────────────────────────────────────────────

describe('allocateImportedAmount', () => {
  it('allocates full payment correctly', () => {
    const result = allocateImportedAmount(850, 750, 100)
    expect(result.rentAmount).toBe(750)
    expect(result.chargesAmount).toBe(100)
  })

  it('allocates overpayment to rent', () => {
    const result = allocateImportedAmount(900, 750, 100)
    expect(result.rentAmount).toBe(800) // 750 + 50 overpayment
    expect(result.chargesAmount).toBe(100)
  })

  it('allocates partial payment proportionally', () => {
    const result = allocateImportedAmount(425, 750, 100)
    // charges ratio = 100/850 ~ 11.76%
    expect(result.rentAmount + result.chargesAmount).toBeCloseTo(425, 2)
    expect(result.chargesAmount).toBeCloseTo(50, 0)
  })

  it('puts all in rent when charges are 0', () => {
    const result = allocateImportedAmount(800, 800, 0)
    expect(result.rentAmount).toBe(800)
    expect(result.chargesAmount).toBe(0)
  })

  it('puts all in rent when total due is 0', () => {
    const result = allocateImportedAmount(500, 0, 0)
    expect(result.rentAmount).toBe(500)
    expect(result.chargesAmount).toBe(0)
  })
})

// ── buildImportedNote ────────────────────────────────────────────────────────

describe('buildImportedNote', () => {
  it('formats note with row number and description', () => {
    const note = buildImportedNote('VIR LOYER DUPONT', 5)
    expect(note).toBe('[CSV 5] VIR LOYER DUPONT')
  })
})

// ── suggestBankImport ────────────────────────────────────────────────────────

describe('suggestBankImport', () => {
  const makeTransaction = (overrides: Partial<ParsedBankTransaction> = {}): ParsedBankTransaction => ({
    id: 'tx-1',
    rowNumber: 2,
    date: '2025-01-15',
    description: 'VIR LOYER DUPONT',
    amount: 850,
    direction: 'credit',
    fingerprint: '2025-01-15|850|vir loyer dupont',
    ...overrides,
  })

  const pendingPayment = {
    id: 1,
    lease_id: 10,
    period_month: 1,
    period_year: 2025,
    rent_amount: 750,
    charges_amount: 100,
    payment_date: null,
    payment_method: 'virement',
    status: 'pending' as const,
    notes: null,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    property_name: 'Appt Rue de Rivoli',
    property_address: '12 Rue de Rivoli',
    property_city: 'Paris',
    property_zip: '75001',
    tenant_first_name: 'Jean',
    tenant_last_name: 'Dupont',
    lease_rent_amount: 750,
    lease_charges_amount: 100,
  }

  const activeLease = {
    id: 10,
    property_id: 1,
    tenant_id: 1,
    type: 'vide' as const,
    start_date: '2023-01-01',
    end_date: null,
    rent_amount: 750,
    charges_amount: 100,
    deposit_amount: 750,
    deposit_received_date: null,
    deposit_refund_date: null,
    deposit_retained_amount: 0,
    deposit_notes: null,
    irl_reference_index: null,
    irl_reference_quarter: null,
    status: 'active' as const,
    created_at: '2023-01-01',
    property_name: 'Appt Rue de Rivoli',
    property_address: '12 Rue de Rivoli',
    property_city: 'Paris',
    property_zip: '75001',
    tenant_first_name: 'Jean',
    tenant_last_name: 'Dupont',
    owner_profile_id: null,
    contract_details: null,
    updated_at: '2023-01-01',
    property_area_m2: null,
    property_owner_profile_id: null,
    tenant_email: null,
    tenant_phone: null,
    tenant_guarantor_name: null,
    tenant_guarantor_address: null,
    tenant_guarantor_email: null,
    tenant_guarantor_phone: null,
  }

  it('suggests mark_existing when amount and name match a pending payment', () => {
    const tx = makeTransaction()
    const result = suggestBankImport(tx, [pendingPayment], [activeLease])
    expect(result.mode).toBe('mark_existing')
    expect(result.paymentId).toBe(1)
    expect(result.confidence).not.toBe('none')
  })

  it('suggests create_new when no pending payment matches but lease does', () => {
    const tx = makeTransaction({ description: 'VIR DUPONT FEV', date: '2025-02-15' })
    const result = suggestBankImport(tx, [], [activeLease])
    expect(result.mode).toBe('create_new')
    expect(result.leaseId).toBe(10)
  })

  it('suggests ignore when nothing matches', () => {
    const tx = makeTransaction({
      description: 'ACHAT BOULANGERIE',
      amount: 3.5,
    })
    const result = suggestBankImport(tx, [pendingPayment], [activeLease])
    expect(result.mode).toBe('ignore')
    expect(result.confidence).toBe('none')
  })

  it('prioritizes late payments with bonus score', () => {
    const latePayment = { ...pendingPayment, id: 2, status: 'late' as const }
    const tx = makeTransaction()
    const result = suggestBankImport(tx, [pendingPayment, latePayment], [activeLease])
    expect(result.paymentId).toBe(2) // late payment gets higher score
  })
})

// ── BANK_PRESETS ─────────────────────────────────────────────────────────────

describe('BANK_PRESETS', () => {
  it('includes auto preset', () => {
    expect(BANK_PRESETS.find((p) => p.id === 'auto')).toBeDefined()
  })

  it('includes major French banks', () => {
    const ids = BANK_PRESETS.map((p) => p.id)
    expect(ids).toContain('bnp')
    expect(ids).toContain('ca')
    expect(ids).toContain('sg')
    expect(ids).toContain('lcl')
    expect(ids).toContain('bp')
    expect(ids).toContain('boursorama')
  })

  it('all presets have required fields', () => {
    for (const preset of BANK_PRESETS) {
      expect(preset.id).toBeTruthy()
      expect(preset.name).toBeTruthy()
    }
  })
})
