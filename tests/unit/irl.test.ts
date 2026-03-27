import { describe, it, expect } from 'vitest'
import {
  calculateRevision,
  isRevisionEligible,
  isAnniversaryWithinDays,
  getRelevantAnniversaryDate,
  parseQuarter,
  formatQuarter,
  QUARTER_LABELS,
} from '../../src/lib/irl'

// ── calculateRevision ────────────────────────────────────────────────────────

describe('calculateRevision', () => {
  it('computes new rent based on IRL ratio', () => {
    // IRL went from 140.59 to 143.46
    // 800 * (143.46 / 140.59) = 816.331... => rounds to 816.33
    const result = calculateRevision(800, 140.59, 143.46, '2023-T2', '2024-T2')
    expect(result.oldRent).toBe(800)
    expect(result.newRent).toBeCloseTo(816.33, 2)
    expect(result.difference).toBeCloseTo(16.33, 2)
    expect(result.percentChange).toBeCloseTo(2.04, 1)
    expect(result.referenceIrl).toBe(140.59)
    expect(result.newIrl).toBe(143.46)
    expect(result.referenceLabel).toBe('2023-T2')
    expect(result.newLabel).toBe('2024-T2')
  })

  it('returns zero difference when IRL is unchanged', () => {
    const result = calculateRevision(1000, 140, 140, '2023-T1', '2024-T1')
    expect(result.newRent).toBe(1000)
    expect(result.difference).toBe(0)
    expect(result.percentChange).toBe(0)
  })

  it('handles IRL decrease (negative revision)', () => {
    const result = calculateRevision(1000, 140, 138, '2023-T3', '2024-T3')
    expect(result.newRent).toBeLessThan(1000)
    expect(result.difference).toBeLessThan(0)
    expect(result.percentChange).toBeLessThan(0)
  })

  it('rounds to two decimal places', () => {
    // 750 * (143.46 / 140.59) = 765.31... should round properly
    const result = calculateRevision(750, 140.59, 143.46, '2023-T2', '2024-T2')
    const decimalPlaces = (result.newRent.toString().split('.')[1] || '').length
    expect(decimalPlaces).toBeLessThanOrEqual(2)
  })
})

// ── isRevisionEligible ───────────────────────────────────────────────────────

describe('isRevisionEligible', () => {
  it('returns true for vide lease with IRL data', () => {
    expect(isRevisionEligible('vide', '2022-01-01', 140.59, '2023-T2')).toBe(true)
  })

  it('returns true for meuble lease with IRL data', () => {
    expect(isRevisionEligible('meuble', '2022-06-01', 140.59, '2023-T2')).toBe(true)
  })

  it('returns false for mobilite lease', () => {
    expect(isRevisionEligible('mobilite', '2022-01-01', 140.59, '2023-T2')).toBe(false)
  })

  it('returns false when IRL reference index is null', () => {
    expect(isRevisionEligible('vide', '2022-01-01', null, '2023-T2')).toBe(false)
  })

  it('returns false when IRL reference quarter is null', () => {
    expect(isRevisionEligible('vide', '2022-01-01', 140.59, null)).toBe(false)
  })

  it('returns false when IRL reference index is 0', () => {
    expect(isRevisionEligible('vide', '2022-01-01', 0, '2023-T2')).toBe(false)
  })
})

// ── isAnniversaryWithinDays ──────────────────────────────────────────────────

describe('isAnniversaryWithinDays', () => {
  it('returns true when anniversary is today', () => {
    const today = new Date()
    const startDate = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate())
    expect(isAnniversaryWithinDays(startDate.toISOString().slice(0, 10), 30)).toBe(true)
  })

  it('returns true when anniversary is in the near future', () => {
    const future = new Date()
    future.setDate(future.getDate() + 10)
    const startDate = new Date(future.getFullYear() - 1, future.getMonth(), future.getDate())
    expect(isAnniversaryWithinDays(startDate.toISOString().slice(0, 10), 30)).toBe(true)
  })

  it('returns false when anniversary is far away', () => {
    const far = new Date()
    far.setDate(far.getDate() + 100)
    const startDate = new Date(far.getFullYear() - 1, far.getMonth(), far.getDate())
    expect(isAnniversaryWithinDays(startDate.toISOString().slice(0, 10), 30)).toBe(false)
  })
})

// ── getRelevantAnniversaryDate ───────────────────────────────────────────────

describe('getRelevantAnniversaryDate', () => {
  it('returns anniversary in the same year when it has not passed', () => {
    const now = new Date(2025, 0, 15) // Jan 15
    const result = getRelevantAnniversaryDate('2022-06-01', now)
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(5) // June
    expect(result.getDate()).toBe(1)
  })

  it('returns anniversary in the same year when it has passed', () => {
    const now = new Date(2025, 8, 15) // Sep 15
    const result = getRelevantAnniversaryDate('2022-06-01', now)
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(5) // June (already passed)
  })
})

// ── parseQuarter ─────────────────────────────────────────────────────────────

describe('parseQuarter', () => {
  it('parses valid quarter string', () => {
    expect(parseQuarter('2024-T2')).toEqual({ year: 2024, quarter: 2 })
  })

  it('parses all four quarters', () => {
    expect(parseQuarter('2023-T1')).toEqual({ year: 2023, quarter: 1 })
    expect(parseQuarter('2023-T3')).toEqual({ year: 2023, quarter: 3 })
    expect(parseQuarter('2023-T4')).toEqual({ year: 2023, quarter: 4 })
  })

  it('returns null for invalid format', () => {
    expect(parseQuarter('2024-Q2')).toBeNull()
    expect(parseQuarter('T2-2024')).toBeNull()
    expect(parseQuarter('invalid')).toBeNull()
    expect(parseQuarter('')).toBeNull()
  })
})

// ── formatQuarter ────────────────────────────────────────────────────────────

describe('formatQuarter', () => {
  it('formats year and quarter into standard string', () => {
    expect(formatQuarter(2024, 2)).toBe('2024-T2')
    expect(formatQuarter(2023, 1)).toBe('2023-T1')
    expect(formatQuarter(2025, 4)).toBe('2025-T4')
  })
})

// ── QUARTER_LABELS ───────────────────────────────────────────────────────────

describe('QUARTER_LABELS', () => {
  it('has labels for all four quarters', () => {
    expect(QUARTER_LABELS[1]).toBe('1er trimestre')
    expect(QUARTER_LABELS[2]).toBe('2e trimestre')
    expect(QUARTER_LABELS[3]).toBe('3e trimestre')
    expect(QUARTER_LABELS[4]).toBe('4e trimestre')
  })
})
