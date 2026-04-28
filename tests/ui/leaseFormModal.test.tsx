// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import LeaseFormModal from '@/pages/Leases/LeaseFormModal'

function createProperty(): Property {
  return {
    id: 1,
    name: 'Studio Centre',
    address: '3 rue Victor Hugo',
    city: 'Lyon',
    zip: '69001',
    type: 'appartement',
    area_m2: 25,
    owner_profile_id: null,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  }
}

function createTenant(): Tenant {
  return {
    id: 2,
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
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    lease_id: null,
    lease_type: null,
    property_name: null,
    property_city: null,
    rent_amount: null,
    charges_amount: null,
    lease_start_date: null,
    unpaid_count: 0,
  }
}

describe('LeaseFormModal', () => {
  it('auto-selects the only property and tenant, then blocks mobility leases without an end date', async () => {
    ;(window as any).api = {
      properties: { getAll: vi.fn().mockResolvedValue([createProperty()]) },
      propertyDiagnostics: { getAll: vi.fn().mockResolvedValue([]) },
      tenants: { getAll: vi.fn().mockResolvedValue([createTenant()]) },
      irl: { getAll: vi.fn().mockResolvedValue([]) },
    }

    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)

    render(<LeaseFormModal initial={null} onSave={onSave} onClose={vi.fn()} />)

    await waitFor(() => {
      expect((screen.getByLabelText('Bien') as HTMLSelectElement).value).toBe('1')
      expect((screen.getByLabelText('Locataire') as HTMLSelectElement).value).toBe('2')
    })

    await user.click(screen.getByRole('button', { name: /mobilite/i }))
    await user.type(screen.getByLabelText('Date de debut'), '2026-04-01')
    await user.type(screen.getByLabelText(/Loyer HC/i), '650')
    await user.click(screen.getByRole('button', { name: /creer un bail/i }))

    expect(await screen.findByText(/bail mobilite requiert une date de fin/i)).not.toBeNull()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('blocks saving a lease when the selected property is DPE G after the rental ban date', async () => {
    ;(window as any).api = {
      properties: { getAll: vi.fn().mockResolvedValue([createProperty()]) },
      propertyDiagnostics: {
        getAll: vi.fn().mockResolvedValue([{
          id: 1,
          property_id: 1,
          dpe_class: 'G',
          dpe_ges_class: null,
          dpe_performed_at: '2024-01-01',
          dpe_expires_at: '2034-01-01',
          dpe_ademe_number: null,
          dpe_energy_estimate: null,
          lead_performed_at: null,
          lead_expires_at: null,
          gas_performed_at: null,
          gas_expires_at: null,
          electricity_performed_at: null,
          electricity_expires_at: null,
          erp_performed_at: null,
          erp_expires_at: null,
          noise_performed_at: null,
          noise_expires_at: null,
          asbestos_available: false,
          notes: null,
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          property_name: 'Studio Centre',
          property_city: 'Lyon',
        } satisfies PropertyDiagnostics]),
      },
      tenants: { getAll: vi.fn().mockResolvedValue([createTenant()]) },
      irl: { getAll: vi.fn().mockResolvedValue([]) },
    }

    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)

    render(<LeaseFormModal initial={null} onSave={onSave} onClose={vi.fn()} />)

    await waitFor(() => {
      expect((screen.getByLabelText('Bien') as HTMLSelectElement).value).toBe('1')
      expect((screen.getByLabelText('Locataire') as HTMLSelectElement).value).toBe('2')
    })

    await user.type(screen.getByLabelText('Date de debut'), '2026-04-01')
    await user.type(screen.getByLabelText(/Loyer HC/i), '650')
    await user.click(screen.getByRole('button', { name: /creer un bail/i }))

    expect(await screen.findByText(/location DPE G est bloquee depuis le 2025-01-01/i)).not.toBeNull()
    expect(onSave).not.toHaveBeenCalled()
  })
})
