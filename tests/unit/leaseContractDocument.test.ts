/// <reference path="../../src/env.d.ts" />

import { describe, expect, it } from 'vitest'
import {
  buildFurnishedLeaseContractPdfData,
  getFurnishedLeaseContractBlockingIssues,
  prepareLeaseContractDetails,
} from '../../src/lib/leaseContractDocument'
import { createDefaultLeaseContractDetails } from '../../src/shared/leaseContract'

function makeLease(overrides: Partial<Lease> = {}): Lease {
  return {
    id: 1,
    property_id: 10,
    tenant_id: 20,
    owner_profile_id: 'owner-primary',
    type: 'meuble',
    start_date: '2026-03-01',
    end_date: null,
    rent_amount: 820,
    charges_amount: 80,
    deposit_amount: 1640,
    deposit_received_date: null,
    deposit_refund_date: null,
    deposit_retained_amount: 0,
    deposit_notes: null,
    irl_reference_index: 145.47,
    irl_reference_quarter: '2025-T1',
    contract_details: null,
    status: 'active',
    created_at: '2026-03-01 10:00:00',
    updated_at: '2026-03-01 10:00:00',
    property_name: 'Studio Rivoli',
    property_address: '12 Rue de Rivoli',
    property_city: 'Paris',
    property_zip: '75001',
    property_area_m2: 28,
    property_owner_profile_id: 'owner-primary',
    tenant_first_name: 'Jean',
    tenant_last_name: 'Dupont',
    tenant_email: 'jean@example.com',
    tenant_phone: '0601020304',
    tenant_guarantor_name: 'Marie Dupont',
    tenant_guarantor_address: '1 Avenue de France, 75013 Paris',
    tenant_guarantor_email: 'marie@example.com',
    tenant_guarantor_phone: '0605060708',
    ...overrides,
  }
}

const profile: UserProfile = {
  name: 'Nina Martin',
  email: 'nina@example.com',
  address: '5 Rue Oberkampf',
  city: 'Paris',
  phone: '0600000000',
  signatureImage: '',
  createdAt: '2025-01-01T00:00:00.000Z',
}

describe('lease contract document helpers', () => {
  it('prepares sensible defaults from the lease and profile', () => {
    const details = prepareLeaseContractDetails(makeLease(), profile)

    expect(details.baseRent).toBe(820)
    expect(details.firstPaymentTotal).toBe(900)
    expect(details.paymentPeriodText).toBe('Avant le 5 de chaque mois')
    expect(details.paymentPlace).toBe('Virement bancaire')
    expect(details.signingCity).toBe('Paris')
    expect(details.signingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('flags missing mandatory contract mentions', () => {
    const lease = makeLease({ property_area_m2: null })
    const details = createDefaultLeaseContractDetails()
    details.mainRoomCount = null
    details.durationMonths = null
    details.paymentPeriodText = null
    details.signingCity = null
    details.signingDate = null

    const issues = getFurnishedLeaseContractBlockingIssues(lease, details, {
      ...profile,
      address: '',
      city: '',
    })

    expect(issues).toContain('Renseignez l adresse du bailleur dans le profil.')
    expect(issues).toContain('Renseignez la surface habitable du logement.')
    expect(issues).toContain('Renseignez le nombre de pieces principales.')
    expect(issues).toContain('Renseignez la duree du contrat.')
    expect(issues).toContain('Precisez la date ou periode de paiement.')
    expect(issues).toContain('Renseignez le lieu et la date de signature.')
  })

  it('builds PDF data by merging lease values and overrides', () => {
    const details = prepareLeaseContractDetails(makeLease(), profile)
    details.landlordType = 'personne_morale'
    details.landlordFamilySci = true
    details.representedByMandataire = true
    details.mandataireName = 'Agence Bleu'
    details.paymentTiming = 'terme_echu'
    details.mainRoomCount = 1
    details.taxId = 'AB-123'
    details.habitatType = 'collectif'
    details.buildingRegime = 'copropriete'
    details.constructionPeriod = '1989_2005'
    details.heatingMode = 'individuel'
    details.hotWaterMode = 'individuelle'
    details.dpeClass = 'D'
    details.specialConditions = 'Interdiction de sous-location sans accord ecrit.'

    const data = buildFurnishedLeaseContractPdfData(makeLease(), profile, details)

    expect(data.landlordTypeLabel).toBe('Personne morale')
    expect(data.landlordFamilySci).toBe(true)
    expect(data.representedByMandataire).toBe(true)
    expect(data.mandataireName).toBe('Agence Bleu')
    expect(data.propertyAddress).toBe('12 Rue de Rivoli')
    expect(data.surfaceHabitable).toBe(28)
    expect(data.paymentTimingLabel).toBe('A terme echu')
    expect(data.guarantorName).toBe('Marie Dupont')
    expect(data.taxId).toBe('AB-123')
    expect(data.specialConditions).toContain('Interdiction de sous-location')
  })
})
