// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import {
  isFullPayment,
  canGenerateDepositReceipt,
  canGenerateDepositSettlement,
  canGenerateFurnishedLeaseContract,
  getDepositReturnedAmount,
} from '@/pages/Documents/documentTemplateHelpers'

/* ------------------------------------------------------------------ */
/*  Factories                                                         */
/* ------------------------------------------------------------------ */

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 1,
    lease_id: 10,
    period_month: 3,
    period_year: 2026,
    rent_amount: 800,
    charges_amount: 50,
    payment_date: '2026-03-05',
    payment_method: 'virement',
    status: 'paid',
    notes: null,
    created_at: '2026-03-05',
    updated_at: '2026-03-05',
    property_name: 'Apt A',
    property_address: '1 rue Test',
    property_city: 'Paris',
    property_zip: '75001',
    tenant_first_name: 'Jean',
    tenant_last_name: 'Dupont',
    lease_rent_amount: 800,
    lease_charges_amount: 50,
    ...overrides,
  }
}

function makeLease(overrides: Partial<Lease> = {}): Lease {
  return {
    id: 10,
    property_id: 1,
    tenant_id: 2,
    owner_profile_id: 'owner-primary',
    type: 'vide',
    start_date: '2024-01-01',
    end_date: null,
    rent_amount: 800,
    charges_amount: 50,
    deposit_amount: 800,
    deposit_received_date: '2024-01-01',
    deposit_refund_date: null,
    deposit_retained_amount: 0,
    deposit_notes: null,
    irl_reference_index: 142.06,
    irl_reference_quarter: '2024-T1',
    contract_details: null,
    status: 'active',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    property_name: 'Apt A',
    property_address: '1 rue Test',
    property_city: 'Paris',
    property_zip: '75001',
    property_area_m2: 35,
    property_owner_profile_id: 'owner-primary',
    tenant_first_name: 'Jean',
    tenant_last_name: 'Dupont',
    tenant_email: 'jean@example.com',
    tenant_phone: '0600000000',
    tenant_guarantor_name: null,
    tenant_guarantor_address: null,
    tenant_guarantor_email: null,
    tenant_guarantor_phone: null,
    ...overrides,
  }
}

/* ------------------------------------------------------------------ */
/*  isFullPayment                                                     */
/* ------------------------------------------------------------------ */

describe('isFullPayment', () => {
  it('returns true when rent and charges match the lease amounts exactly', () => {
    expect(isFullPayment(makePayment())).toBe(true)
  })

  it('returns true when rent and charges exceed the lease amounts', () => {
    expect(isFullPayment(makePayment({ rent_amount: 900, charges_amount: 60 }))).toBe(true)
  })

  it('returns false when rent is below the lease amount', () => {
    expect(isFullPayment(makePayment({ rent_amount: 500 }))).toBe(false)
  })

  it('returns false when charges are below the lease amount', () => {
    expect(isFullPayment(makePayment({ charges_amount: 30 }))).toBe(false)
  })

  it('returns false when both rent and charges are below', () => {
    expect(isFullPayment(makePayment({ rent_amount: 500, charges_amount: 30 }))).toBe(false)
  })

  it('returns false when rent matches but charges are partial', () => {
    expect(isFullPayment(makePayment({ rent_amount: 800, charges_amount: 0 }))).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/*  canGenerateDepositReceipt                                         */
/* ------------------------------------------------------------------ */

describe('canGenerateDepositReceipt', () => {
  it('returns true when deposit > 0 and received date is set', () => {
    expect(canGenerateDepositReceipt(makeLease())).toBe(true)
  })

  it('returns false when deposit is 0', () => {
    expect(canGenerateDepositReceipt(makeLease({ deposit_amount: 0 }))).toBe(false)
  })

  it('returns false when received date is null', () => {
    expect(canGenerateDepositReceipt(makeLease({ deposit_received_date: null }))).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/*  canGenerateDepositSettlement                                      */
/* ------------------------------------------------------------------ */

describe('canGenerateDepositSettlement', () => {
  it('returns true when deposit > 0 and refund date is set', () => {
    expect(canGenerateDepositSettlement(makeLease({ deposit_refund_date: '2026-06-01' }))).toBe(true)
  })

  it('returns false when refund date is null', () => {
    expect(canGenerateDepositSettlement(makeLease())).toBe(false)
  })

  it('returns false when deposit is 0 even with refund date', () => {
    expect(canGenerateDepositSettlement(makeLease({ deposit_amount: 0, deposit_refund_date: '2026-06-01' }))).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/*  canGenerateFurnishedLeaseContract                                 */
/* ------------------------------------------------------------------ */

describe('canGenerateFurnishedLeaseContract', () => {
  it('returns true for meuble leases', () => {
    expect(canGenerateFurnishedLeaseContract(makeLease({ type: 'meuble' }))).toBe(true)
  })

  it('returns false for vide leases', () => {
    expect(canGenerateFurnishedLeaseContract(makeLease({ type: 'vide' }))).toBe(false)
  })

  it('returns false for mobilite leases', () => {
    expect(canGenerateFurnishedLeaseContract(makeLease({ type: 'mobilite' }))).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/*  getDepositReturnedAmount                                          */
/* ------------------------------------------------------------------ */

describe('getDepositReturnedAmount', () => {
  it('returns deposit minus retained when refund date exists', () => {
    expect(getDepositReturnedAmount({
      deposit_amount: 800,
      deposit_refund_date: '2026-06-01',
      deposit_retained_amount: 200,
    })).toBe(600)
  })

  it('returns full deposit when nothing retained', () => {
    expect(getDepositReturnedAmount({
      deposit_amount: 800,
      deposit_refund_date: '2026-06-01',
      deposit_retained_amount: 0,
    })).toBe(800)
  })

  it('returns 0 when no refund date', () => {
    expect(getDepositReturnedAmount({
      deposit_amount: 800,
      deposit_refund_date: null,
      deposit_retained_amount: 0,
    })).toBe(0)
  })

  it('never returns negative even if retained exceeds deposit', () => {
    expect(getDepositReturnedAmount({
      deposit_amount: 500,
      deposit_refund_date: '2026-06-01',
      deposit_retained_amount: 700,
    })).toBe(0)
  })
})
