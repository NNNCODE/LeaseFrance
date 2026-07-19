// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Documents from '@/pages/Documents'
import '@/i18n'
import { useAuthStore } from '@/stores/useAuthStore'
import { useOwnerStore } from '@/stores/useOwnerStore'

vi.mock('@/pages/Documents/GenerateDocumentModal', () => ({
  default: ({ initialTemplate, getTemplateParams }: { initialTemplate: string | null; getTemplateParams: (kind: any) => Record<string, unknown> | null }) => {
    const params = initialTemplate ? getTemplateParams(initialTemplate) : null
    return (
      <div data-testid="generate-document-modal">
        {initialTemplate}:{String(params?.leaseId ?? '')}
      </div>
    )
  },
}))

vi.mock('@/pages/Documents/DocumentRow', () => ({
  default: () => null,
}))

vi.mock('@/pages/Documents/DocumentsEmptyState', () => ({
  default: () => <div>No documents yet</div>,
}))

vi.mock('@/pages/Documents/DocumentDeleteModal', () => ({
  default: () => null,
}))

vi.mock('@/pages/Documents/PdfPreviewModal', () => ({
  default: () => null,
}))

function createLease(overrides: Partial<Lease> = {}): Lease {
  return {
    id: 11,
    property_id: 1,
    tenant_id: 2,
    owner_profile_id: null,
    property_owner_profile_id: null,
    type: 'meuble',
    start_date: '2026-02-01',
    end_date: null,
    rent_amount: 980,
    charges_amount: 40,
    deposit_amount: 980,
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

describe('Documents route entry', () => {
  beforeEach(() => {
    localStorage.clear()

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

    ;(window as Window & typeof globalThis & { api: any }).api = {
      documents: {
        getAll: vi.fn().mockResolvedValue([]),
        getGenerationAvailability: vi.fn().mockResolvedValue({
          paymentCertificates: 0,
          rentRevisionNotices: 0,
          furnishedLeaseContracts: 1,
          depositReceipts: 0,
          depositSettlements: 0,
          canGenerateAny: true,
        }),
        getGenerationSources: vi.fn().mockResolvedValue({
          payments: [],
          leases: [createLease()],
          irlIndices: [],
        }),
      },
    }
  })

  it('opens the lease contract generator when arriving from a lease shortcut', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/documents',
            state: {
              initialTemplate: 'furnished_lease_contract',
              templateParams: { leaseId: 11 },
            },
          },
        ]}
      >
        <Routes>
          <Route path="/documents" element={<Documents />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('generate-document-modal').textContent).toBe('furnished_lease_contract:11')
    })
  })
})
