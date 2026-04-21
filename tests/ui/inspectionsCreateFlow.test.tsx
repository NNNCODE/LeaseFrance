// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Inspections from '@/pages/Inspections'
import '@/i18n'
import { useAuthStore } from '@/stores/useAuthStore'
import { useOwnerStore } from '@/stores/useOwnerStore'

vi.mock('@react-pdf/renderer', () => ({
  pdf: vi.fn(),
}))

vi.mock('@/lib/pdf/inspection', () => ({
  InspectionPDF: () => null,
}))

vi.mock('@/pages/Inspections/InspectionModal', () => ({
  default: ({
    inspection,
    onSave,
  }: {
    inspection: Inspection | null
    onSave: (data: InspectionInput) => Promise<void>
  }) => (
    <div data-testid="inspection-modal">
      <p>{inspection ? `mode:edit:${inspection.id}` : 'mode:create'}</p>
      <p>{inspection ? 'attachments-visible' : 'attachments-hidden'}</p>
      <button
        type="button"
        onClick={() => onSave({
          lease_id: 4,
          kind: 'entry',
          inspection_date: '2026-04-20',
          meter_readings: null,
          general_condition: null,
          notes: null,
          rooms: [{ area: 'Sejour', condition: 'Bon etat', notes: '' }],
        })}
      >
        save inspection
      </button>
    </div>
  ),
}))

function createLease(): Lease {
  return {
    id: 4,
    property_id: 1,
    tenant_id: 2,
    owner_profile_id: null,
    type: 'vide',
    start_date: '2026-04-01',
    end_date: null,
    rent_amount: 1200,
    charges_amount: 50,
    deposit_amount: 1200,
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
    property_name: 'Appartement Centre',
    property_address: '14 rue de Rivoli',
    property_city: 'Paris',
    property_zip: '75001',
    property_area_m2: 42,
    tenant_first_name: 'Julie',
    tenant_last_name: 'Bernard',
    tenant_email: 'julie@example.com',
    tenant_phone: '0600000000',
    tenant_guarantor_name: null,
    tenant_guarantor_address: null,
    tenant_guarantor_email: null,
    tenant_guarantor_phone: null,
  }
}

function createInspection(): Inspection {
  return {
    id: 22,
    lease_id: 4,
    kind: 'entry',
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

function createAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: 41,
    entity_type: 'inspection',
    entity_id: 22,
    slot: null,
    file_name: 'inspection-photo.jpg',
    mime_type: 'image/jpeg',
    file_size: 120000,
    stored_name: 'stored-inspection-photo.jpg',
    created_at: '2026-04-20 09:00:00',
    ...overrides,
  }
}

describe('Inspections create flow', () => {
  beforeEach(() => {
    useAuthStore.setState({
      ...useAuthStore.getState(),
      status: 'unlocked',
      profile: null,
      error: null,
    })

    useOwnerStore.setState({
      ...useOwnerStore.getState(),
      status: 'ready',
      owners: [],
      activeOwner: null,
    })
  })

  it('stays in the inspection flow and switches to edit mode after the first save', async () => {
    const user = userEvent.setup()
    const createdInspection = createInspection()
    const getAllInspections = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([createdInspection])

    ;(window as Window & typeof globalThis & { api: any }).api = {
      inspections: {
        getAll: getAllInspections,
        create: vi.fn().mockResolvedValue(createdInspection),
        update: vi.fn(),
        delete: vi.fn(),
      },
      leases: {
        getAll: vi.fn().mockResolvedValue([createLease()]),
      },
      attachments: {
        getAll: vi.fn().mockResolvedValue([]),
      },
    }

    render(<Inspections />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nouvel etat des lieux/i })).toBeTruthy()
    })

    await user.click(screen.getByRole('button', { name: /nouvel etat des lieux/i }))

    expect(screen.getByTestId('inspection-modal')).toBeTruthy()
    expect(screen.getByText('mode:create')).toBeTruthy()
    expect(screen.getByText('attachments-hidden')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'save inspection' }))

    await waitFor(() => {
      expect(screen.getByText('mode:edit:22')).toBeTruthy()
    })

    expect(screen.getByText('attachments-visible')).toBeTruthy()
    expect(window.api.inspections.create).toHaveBeenCalledTimes(1)
    expect(getAllInspections).toHaveBeenCalledTimes(2)
  })

  it('shows a compact attachment summary on inspection rows', async () => {
    const inspection = createInspection()

    ;(window as Window & typeof globalThis & { api: any }).api = {
      inspections: {
        getAll: vi.fn().mockResolvedValue([inspection]),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      leases: {
        getAll: vi.fn().mockResolvedValue([createLease()]),
      },
      attachments: {
        getAll: vi.fn().mockResolvedValue([
          createAttachment({ id: 41, file_name: 'inspection-photo.jpg' }),
          createAttachment({
            id: 42,
            slot: 'move_in_video',
            file_name: 'video-entree.mp4',
            mime_type: 'video/mp4',
            stored_name: 'stored-video-entree.mp4',
          }),
          createAttachment({
            id: 43,
            entity_type: 'lease',
            entity_id: 4,
            file_name: 'lease-file.pdf',
            mime_type: 'application/pdf',
          }),
        ]),
      },
    }

    render(<Inspections />)

    await waitFor(() => {
      expect(screen.getByText('Julie Bernard')).toBeTruthy()
    })

    expect(screen.getByText('2 fichiers')).toBeTruthy()
    expect(screen.getByText("Video d'entree")).toBeTruthy()
    expect(screen.queryByText('3 fichiers')).toBeNull()
  })
})
