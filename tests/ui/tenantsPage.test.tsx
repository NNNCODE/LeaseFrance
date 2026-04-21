// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Tenants from '@/pages/Tenants'
import '@/i18n'

function createTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 7,
    first_name: 'Julie',
    last_name: 'Bernard',
    email: 'julie@example.com',
    phone: '0600000001',
    guarantor_name: null,
    guarantor_email: null,
    guarantor_phone: null,
    guarantor_address: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    emergency_contact_relation: null,
    dossier_id_document: false,
    dossier_income_proof: false,
    dossier_employment_proof: false,
    dossier_tax_notice: false,
    dossier_bank_details: false,
    dossier_notes: null,
    created_at: '2026-04-01 09:00:00',
    updated_at: '2026-04-09 10:00:00',
    lease_id: null,
    lease_type: null,
    property_name: null,
    property_city: null,
    rent_amount: null,
    charges_amount: null,
    lease_start_date: null,
    unpaid_count: 0,
    ...overrides,
  }
}

function createLease(overrides: Partial<Lease> = {}): Lease {
  return {
    id: 30,
    property_id: 1,
    tenant_id: 7,
    owner_profile_id: null,
    type: 'meuble',
    start_date: '2025-04-01',
    end_date: '2026-03-31',
    rent_amount: 950,
    charges_amount: 35,
    deposit_amount: 950,
    deposit_received_date: null,
    deposit_refund_date: null,
    deposit_retained_amount: 0,
    deposit_notes: null,
    irl_reference_index: null,
    irl_reference_quarter: null,
    contract_details: null,
    status: 'ended',
    created_at: '2025-04-01 09:00:00',
    updated_at: '2026-04-01 09:00:00',
    property_name: 'Albert Camus',
    property_address: '1 rue Albert Camus',
    property_city: 'Bourg-la-Reine',
    property_zip: '92340',
    property_area_m2: 31,
    property_owner_profile_id: null,
    tenant_first_name: 'Julie',
    tenant_last_name: 'Bernard',
    tenant_email: 'julie@example.com',
    tenant_phone: '0600000001',
    tenant_guarantor_name: null,
    tenant_guarantor_address: null,
    tenant_guarantor_email: null,
    tenant_guarantor_phone: null,
    ...overrides,
  }
}

function createInspection(overrides: Partial<Inspection> = {}): Inspection {
  return {
    id: 40,
    lease_id: 30,
    kind: 'entry',
    inspection_date: '2025-04-01',
    meter_readings: null,
    general_condition: null,
    notes: null,
    rooms: [],
    created_at: '2025-04-01 09:00:00',
    property_name: 'Albert Camus',
    property_address: '1 rue Albert Camus',
    property_city: 'Bourg-la-Reine',
    property_zip: '92340',
    tenant_first_name: 'Julie',
    tenant_last_name: 'Bernard',
    lease_start_date: '2025-04-01',
    lease_end_date: '2026-03-31',
    ...overrides,
  }
}

function createAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: 42,
    entity_type: 'inspection',
    entity_id: 40,
    slot: 'move_in_video',
    file_name: 'entree.mp4',
    mime_type: 'video/mp4',
    file_size: 1024,
    stored_name: 'stored-entree.mp4',
    created_at: '2025-04-01 09:05:00',
    ...overrides,
  }
}

describe('Tenants page', () => {
  it('opens the latest move-in video from a tenant card, including past leases', async () => {
    const user = userEvent.setup()
    const openAttachment = vi.fn().mockResolvedValue(undefined)

    ;(window as Window & typeof globalThis & { api: any }).api = {
      tenants: {
        getAll: vi.fn().mockResolvedValue([
          createTenant(),
          createTenant({ id: 8, first_name: 'Marc', last_name: 'Petit', email: null }),
        ]),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      leases: {
        getAll: vi.fn().mockResolvedValue([
          createLease(),
        ]),
      },
      inspections: {
        getAll: vi.fn().mockResolvedValue([
          createInspection(),
        ]),
      },
      attachments: {
        getAll: vi.fn().mockResolvedValue([
          createAttachment(),
        ]),
        open: openAttachment,
      },
    }

    render(<Tenants />)

    await waitFor(() => {
      expect(screen.getByText('Julie Bernard')).toBeTruthy()
    })

    const videoButtons = screen.getAllByRole('button', { name: "Video d'entree" })
    expect(videoButtons).toHaveLength(1)

    await user.click(videoButtons[0])
    expect(openAttachment).toHaveBeenCalledWith(42)
  })
})
