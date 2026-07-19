// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import LeaseRow from '@/pages/Leases/LeaseRow'
import '@/i18n'

function createLease(overrides: Partial<Lease> = {}): Lease {
  return {
    id: 7,
    property_id: 1,
    tenant_id: 2,
    owner_profile_id: null,
    property_owner_profile_id: null,
    type: 'meuble',
    start_date: '2026-02-01',
    end_date: null,
    rent_amount: 950,
    charges_amount: 35,
    deposit_amount: 950,
    deposit_received_date: null,
    deposit_refund_date: null,
    deposit_retained_amount: 0,
    deposit_notes: null,
    irl_reference_index: 145.47,
    irl_reference_quarter: '2025-T3',
    contract_details: null,
    status: 'active',
    created_at: '2026-02-01',
    updated_at: '2026-04-13',
    property_name: 'Albert Camus',
    property_address: '1 rue Albert Camus',
    property_city: 'Bourg-la-Reine',
    property_zip: '92340',
    property_area_m2: 31,
    tenant_first_name: 'Minghui',
    tenant_last_name: 'Nie',
    tenant_email: 'minghui@example.com',
    tenant_phone: '0600000000',
    tenant_guarantor_name: null,
    tenant_guarantor_address: null,
    tenant_guarantor_email: null,
    tenant_guarantor_phone: null,
    ...overrides,
  }
}

describe('LeaseRow', () => {
  it('exposes contract actions from the lease row', async () => {
    const user = userEvent.setup()
    const onImportContract = vi.fn()
    const onOpenContract = vi.fn()

    render(
      <LeaseRow
        lease={createLease()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenContract={onOpenContract}
        onImportContract={onImportContract}
        onManageDeposit={vi.fn()}
        onManageCharges={vi.fn()}
        onRevise={vi.fn()}
      />,
    )

    await user.click(screen.getByTitle('Importer un contrat existant'))
    await user.click(screen.getByTitle('Ouvrir le contrat'))

    expect(onImportContract).toHaveBeenCalledTimes(1)
    expect(onOpenContract).toHaveBeenCalledTimes(1)
  })

  it('shows the move-in video action only when a video attachment exists', async () => {
    const user = userEvent.setup()
    const onOpenMoveInVideo = vi.fn()

    const { rerender } = render(
      <LeaseRow
        lease={createLease()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenContract={vi.fn()}
        onImportContract={vi.fn()}
        onManageDeposit={vi.fn()}
        onManageCharges={vi.fn()}
        onRevise={vi.fn()}
        moveInVideoAttachment={{
          id: 42,
          entity_type: 'inspection',
          entity_id: 12,
          slot: 'move_in_video',
          file_name: 'entree.mp4',
          mime_type: 'video/mp4',
          file_size: 1024,
          stored_name: 'stored-entree.mp4',
          created_at: '2026-04-21 10:00:00',
        }}
        onOpenMoveInVideo={onOpenMoveInVideo}
      />,
    )

    await user.click(screen.getByTitle("Ouvrir la video d'entree"))
    expect(onOpenMoveInVideo).toHaveBeenCalledTimes(1)

    rerender(
      <LeaseRow
        lease={createLease()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenContract={vi.fn()}
        onImportContract={vi.fn()}
        onManageDeposit={vi.fn()}
        onManageCharges={vi.fn()}
        onRevise={vi.fn()}
      />,
    )

    expect(screen.queryByTitle("Ouvrir la video d'entree")).toBeNull()
  })
})
