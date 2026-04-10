// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import GenerateDocumentModal from '@/pages/Documents/GenerateDocumentModal'

function createLease(overrides: Partial<Lease> = {}): Lease {
  return {
    id: 11,
    property_id: 1,
    tenant_id: 2,
    type: 'vide',
    start_date: '2020-02-15',
    end_date: null,
    rent_amount: 900,
    charges_amount: 50,
    deposit_amount: 900,
    deposit_received_date: '2020-02-15',
    deposit_refund_date: null,
    deposit_retained_amount: 0,
    deposit_notes: null,
    irl_reference_index: 140.59,
    irl_reference_quarter: '2025-T1',
    contract_details: null,
    status: 'active',
    created_at: '2020-02-15',
    updated_at: '2025-01-01',
    property_name: 'Maison Bordeaux',
    property_address: '8 avenue des Fleurs',
    property_city: 'Bordeaux',
    property_zip: '33000',
    property_area_m2: 80,
    tenant_first_name: 'Paul',
    tenant_last_name: 'Durand',
    tenant_email: 'paul@example.com',
    tenant_phone: '0600000002',
    tenant_guarantor_name: null,
    tenant_guarantor_address: null,
    tenant_guarantor_email: null,
    tenant_guarantor_phone: null,
    ...overrides,
  }
}

function createPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 22,
    lease_id: 11,
    period_month: 3,
    period_year: 2026,
    rent_amount: 900,
    charges_amount: 50,
    payment_date: '2026-03-05',
    payment_method: 'virement',
    status: 'paid',
    notes: null,
    created_at: '2026-03-05',
    updated_at: '2026-03-05',
    property_name: 'Maison Bordeaux',
    property_address: '8 avenue des Fleurs',
    property_city: 'Bordeaux',
    property_zip: '33000',
    tenant_first_name: 'Paul',
    tenant_last_name: 'Durand',
    lease_rent_amount: 900,
    lease_charges_amount: 50,
    ...overrides,
  }
}

describe('GenerateDocumentModal', () => {
  it('reapplies the remembered payment selection before generating', async () => {
    const user = userEvent.setup()
    const onGenerate = vi.fn().mockResolvedValue(true)

    render(
      <GenerateDocumentModal
        profile={null}
        resolveLeaseProfile={() => null}
        payments={[createPayment()]}
        leases={[createLease()]}
        irlIndices={[]}
        onGenerate={onGenerate}
        onClose={vi.fn()}
        initialTemplate="payment_certificate"
        getTemplateParams={() => ({
          paymentId: 22,
        })}
      />,
    )

    await waitFor(() => {
      const select = document.querySelector('select') as HTMLSelectElement | null
      expect(select).not.toBeNull()
      expect(select!.value).toBe('22')
    })

    await user.click(screen.getByRole('button', { name: /generer le pdf/i }))

    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledWith({
        kind: 'payment_certificate',
        paymentId: 22,
      })
    })
  })
})
