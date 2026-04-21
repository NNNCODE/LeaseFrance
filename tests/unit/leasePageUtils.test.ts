import { describe, expect, it } from 'vitest'
import {
  formatLeaseErrorMessage,
  getLatestMoveInVideoByLease,
  isLeaseDeleteBlockedError,
  leaseVersionToken,
} from '@/pages/Leases/leasePageUtils'

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

function createInspection(overrides: Partial<Inspection> = {}): Inspection {
  return {
    id: 10,
    lease_id: 7,
    kind: 'entry',
    inspection_date: '2026-04-01',
    meter_readings: null,
    general_condition: null,
    notes: null,
    rooms: [],
    created_at: '2026-04-01 09:00:00',
    property_name: 'Appartement Paris',
    property_address: '12 rue de Paris',
    property_city: 'Paris',
    property_zip: '75001',
    tenant_first_name: 'Alice',
    tenant_last_name: 'Martin',
    lease_start_date: '2026-04-01',
    lease_end_date: null,
    ...overrides,
  }
}

function createAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: 20,
    entity_type: 'inspection',
    entity_id: 10,
    slot: 'move_in_video',
    file_name: 'video-entree.mp4',
    mime_type: 'video/mp4',
    file_size: 1024,
    stored_name: 'stored-video-entree.mp4',
    created_at: '2026-04-01 09:05:00',
    ...overrides,
  }
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

  it('finds the latest move-in video attachment per lease', () => {
    const inspections = [
      createInspection({ id: 10, lease_id: 7, inspection_date: '2026-04-01', created_at: '2026-04-01 09:00:00' }),
      createInspection({ id: 11, lease_id: 7, inspection_date: '2026-04-20', created_at: '2026-04-20 09:00:00' }),
      createInspection({ id: 12, lease_id: 7, kind: 'exit', inspection_date: '2026-04-25', created_at: '2026-04-25 09:00:00' }),
      createInspection({ id: 13, lease_id: 8, inspection_date: '2026-04-12', created_at: '2026-04-12 09:00:00' }),
    ]
    const attachments = [
      createAttachment({ id: 20, entity_id: 10, created_at: '2026-04-01 09:05:00' }),
      createAttachment({ id: 21, entity_id: 11, created_at: '2026-04-20 09:05:00' }),
      createAttachment({ id: 22, entity_id: 12, created_at: '2026-04-25 09:05:00' }),
      createAttachment({ id: 23, entity_id: 13, mime_type: 'application/pdf', file_name: 'etat.pdf', stored_name: 'etat.pdf' }),
      createAttachment({ id: 24, entity_id: 13, slot: null }),
    ]

    const result = getLatestMoveInVideoByLease(inspections, attachments)

    expect(result.get(7)?.id).toBe(21)
    expect(result.has(8)).toBe(false)
  })
})
