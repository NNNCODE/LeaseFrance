// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import InspectionModal from '@/pages/Inspections/InspectionModal'
import '@/i18n'

vi.mock('@/components/AttachmentPanel', () => ({
  default: ({
    title,
    slots,
    generalSectionLabel,
  }: {
    title?: string
    slots?: Array<{ key: string; label: string }>
    generalSectionLabel?: string
  }) => (
    <div>
      <span>{title ?? 'Attachment panel'}</span>
      {generalSectionLabel ? <span>{generalSectionLabel}</span> : null}
      {slots?.map((slot) => (
        <span key={slot.key}>{slot.label}</span>
      ))}
    </div>
  ),
}))

function createLease(): Lease {
  return {
    id: 4,
    property_id: 9,
    tenant_id: 12,
    owner_profile_id: null,
    type: 'vide',
    start_date: '2026-04-01',
    end_date: null,
    rent_amount: 1100,
    charges_amount: 90,
    deposit_amount: 1100,
    deposit_received_date: null,
    deposit_refund_date: null,
    deposit_retained_amount: 0,
    deposit_notes: null,
    irl_reference_index: null,
    irl_reference_quarter: null,
    contract_details: null,
    status: 'active',
    created_at: '2026-04-01 09:00:00',
    updated_at: '2026-04-01 09:00:00',
    tenant_first_name: 'Julie',
    tenant_last_name: 'Bernard',
    property_name: 'Appartement Centre',
    property_city: 'Paris',
  }
}

function createInspection(kind: Inspection['kind'] = 'entry'): Inspection {
  return {
    id: 22,
    lease_id: 4,
    kind,
    inspection_date: '2026-04-20',
    meter_readings: null,
    general_condition: null,
    notes: null,
    rooms: [{ area: 'Sejour', condition: 'Bon etat', notes: '' }],
    created_at: '2026-04-20 08:00:00',
    property_name: 'Appartement Centre',
    property_address: '14 rue de Rivoli',
    property_city: 'Paris',
    property_zip: '75001',
    tenant_first_name: 'Julie',
    tenant_last_name: 'Bernard',
    lease_start_date: '2026-04-01',
    lease_end_date: null,
  }
}

describe('InspectionModal', () => {
  it('shows the move-in video slot only while the inspection kind is entry', async () => {
    const user = userEvent.setup()

    render(
      <InspectionModal
        inspection={createInspection('entry')}
        leases={[createLease()]}
        inspections={[createInspection('entry')]}
        initialLeaseId={4}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Fichiers du constat')).toBeTruthy()
    expect(screen.getByText("Video d'entree d'origine")).toBeTruthy()
    expect(screen.getByText('Autres fichiers du constat')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Sortie' }))
    expect(screen.queryByText("Video d'entree d'origine")).toBeNull()
    expect(screen.queryByText('Autres fichiers du constat')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Entree' }))
    expect(screen.getByText("Video d'entree d'origine")).toBeTruthy()
  })
})
