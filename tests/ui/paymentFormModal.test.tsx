// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PaymentFormModal from '@/pages/Payments/PaymentFormModal'
import '@/i18n'

function createLease(overrides: Partial<Lease> = {}): Lease {
  return {
    id: 7,
    property_id: 1,
    tenant_id: 2,
    type: 'vide',
    start_date: '2025-01-01',
    end_date: null,
    rent_amount: 820,
    charges_amount: 45,
    deposit_amount: 820,
    deposit_received_date: null,
    deposit_refund_date: null,
    deposit_retained_amount: 0,
    deposit_notes: null,
    irl_reference_index: 145.47,
    irl_reference_quarter: '2025-T1',
    contract_details: null,
    status: 'active',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    property_name: 'Appartement Paris',
    property_address: '12 rue de Paris',
    property_city: 'Paris',
    property_zip: '75001',
    property_area_m2: 42,
    tenant_first_name: 'Alice',
    tenant_last_name: 'Martin',
    tenant_email: 'alice@example.com',
    tenant_phone: '0600000000',
    tenant_guarantor_name: null,
    tenant_guarantor_address: null,
    tenant_guarantor_email: null,
    tenant_guarantor_phone: null,
    ...overrides,
  }
}

describe('PaymentFormModal', () => {
  it('autofills lease amounts and injects today when saving a paid payment without a date', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)
    const expectedToday = new Date().toISOString().split('T')[0]

    render(
      <PaymentFormModal
        initial={null}
        leases={[createLease()]}
        payments={[]}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Bail'), '7')

    await waitFor(() => {
      expect((screen.getByLabelText(/Loyer HC/i) as HTMLInputElement).value).toBe('820')
      expect((screen.getByLabelText(/Charges/i) as HTMLInputElement).value).toBe('45')
    })

    await user.click(screen.getByRole('button', { name: /paye/i }))
    await user.click(screen.getByRole('button', { name: /creer/i }))

    await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            lease_id: 7,
            rent_amount: 820,
            charges_amount: 45,
            status: 'paid',
            payment_date: expectedToday,
          }),
        )
      })
  })

  it('blocks creating a duplicate payment for the same lease and period before calling IPC', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)

    render(
      <PaymentFormModal
        initial={null}
        leases={[createLease()]}
        payments={[{
          id: 99,
          lease_id: 7,
          period_month: 4,
          period_year: 2026,
          rent_amount: 820,
          charges_amount: 45,
          payment_date: null,
          payment_method: 'virement',
          status: 'pending',
          notes: null,
          created_at: '2026-04-01',
          updated_at: '2026-04-01',
          property_name: 'Appartement Paris',
          property_address: '12 rue de Paris',
          property_city: 'Paris',
          property_zip: '75001',
          tenant_first_name: 'Alice',
          tenant_last_name: 'Martin',
          lease_rent_amount: 820,
          lease_charges_amount: 45,
        }]}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Bail'), '7')
    await user.selectOptions(screen.getByLabelText('Mois'), '4')
    await user.selectOptions(screen.getByLabelText('Annee'), '2026')
    await user.type(screen.getByLabelText(/Loyer HC/i), '820')
    await user.click(screen.getByRole('button', { name: /creer/i }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('Un paiement existe deja pour ce bail et cette periode. Modifiez le paiement existant.')).toBeTruthy()
  })

  it('strips the Electron IPC wrapper from save errors', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockRejectedValue(
      new Error("Error invoking remote method 'payments:create': Error: Un paiement existe deja pour ce bail et cette periode. Modifiez le paiement existant."),
    )

    render(
      <PaymentFormModal
        initial={null}
        leases={[createLease()]}
        payments={[]}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Bail'), '7')
    await waitFor(() => {
      expect((screen.getByLabelText(/Loyer HC/i) as HTMLInputElement).value).toBe('820')
    })

    await user.click(screen.getByRole('button', { name: /creer/i }))

    await waitFor(() => {
      expect(screen.getByText('Erreur : Un paiement existe deja pour ce bail et cette periode. Modifiez le paiement existant.')).toBeTruthy()
    })
  })
})
