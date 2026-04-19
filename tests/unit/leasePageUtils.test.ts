import { describe, expect, it } from 'vitest'
import { formatLeaseErrorMessage, isLeaseDeleteBlockedError, leaseVersionToken } from '@/pages/Leases/leasePageUtils'

const baseLease: Lease = {
  id: 7,
  property_id: 1,
  tenant_id: 2,
  owner_profile_id: null,
  type: 'vide',
  start_date: '2026-04-01',
  end_date: null,
  rent_amount: 800,
  charges_amount: 80,
  deposit_amount: 800,
  deposit_received_date: null,
  deposit_refund_date: null,
  deposit_retained_amount: 0,
  deposit_notes: null,
  irl_reference_index: null,
  irl_reference_quarter: null,
  contract_details: null,
  status: 'active',
  created_at: '2026-04-01 09:00:00',
  updated_at: '2026-04-02 09:00:00',
  property_name: 'Appartement Paris',
  property_address: '12 rue de Paris',
  property_city: 'Paris',
  property_zip: '75001',
  property_area_m2: 42,
  property_owner_profile_id: null,
  tenant_first_name: 'Alice',
  tenant_last_name: 'Martin',
  tenant_email: 'alice@example.com',
  tenant_phone: '0600000000',
  tenant_guarantor_name: null,
  tenant_guarantor_address: null,
  tenant_guarantor_email: null,
  tenant_guarantor_phone: null,
}

describe('leasePageUtils', () => {
  it('strips the Electron IPC wrapper from lease errors', () => {
    const error = new Error("Error invoking remote method 'leases:delete': Error: Impossible de supprimer ce bail car des paiements, documents ou rappels y sont encore rattaches.")

    expect(formatLeaseErrorMessage(error)).toBe(
      'Impossible de supprimer ce bail car des paiements, documents ou rappels y sont encore rattaches.',
    )
  })

  it('falls back to created_at when updated_at is missing at runtime', () => {
    const legacyLease = {
      ...baseLease,
      updated_at: null,
    } as unknown as Lease

    expect(leaseVersionToken(legacyLease)).toBe('2026-04-01 09:00:00')
  })

  it('detects the blocked lease delete case from the cleaned message', () => {
    expect(
      isLeaseDeleteBlockedError(
        'Impossible de supprimer ce bail car des paiements, documents ou rappels y sont encore rattaches.',
      ),
    ).toBe(true)

    expect(isLeaseDeleteBlockedError("Le bail n'existe plus.")).toBe(false)
  })
})
