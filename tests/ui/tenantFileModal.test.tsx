// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TenantFileModal from '@/pages/Tenants/TenantFileModal'
import '@/i18n'

vi.mock('@/components/AttachmentPanel', () => ({
  default: ({
    onUploadComplete,
  }: {
    onUploadComplete?: (slot: string | null, uploaded: Attachment[]) => Promise<void> | void
  }) => (
    <button
      type="button"
      onClick={() => onUploadComplete?.('dossier_id_document', [{
        id: 1,
        entity_type: 'tenant',
        entity_id: 7,
        slot: 'dossier_id_document',
        file_name: 'piece-identite.pdf',
        mime_type: 'application/pdf',
        file_size: 128000,
        stored_name: 'stored-piece-identite.pdf',
        created_at: '2026-04-09 10:00:00',
      }])}
    >
      Simulate dossier upload
    </button>
  ),
}))

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

describe('TenantFileModal', () => {
  it('marks a dossier item as received when a slotted attachment is uploaded', async () => {
    const user = userEvent.setup()
    const tenant = createTenant()
    const onSave = vi.fn().mockResolvedValue(createTenant({
      dossier_id_document: true,
      updated_at: '2026-04-09 10:05:00',
    }))

    render(
      <TenantFileModal
        tenant={tenant}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('0/5')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Simulate dossier upload' }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          dossier_id_document: true,
          dossier_income_proof: false,
          dossier_employment_proof: false,
          dossier_tax_notice: false,
          dossier_bank_details: false,
        }),
        '2026-04-09 10:00:00',
      )
    })

    await waitFor(() => {
      expect(screen.getByText('1/5')).toBeTruthy()
    })
  })
})
