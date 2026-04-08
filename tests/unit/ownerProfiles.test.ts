import { describe, expect, it } from 'vitest'
import {
  formatOwnerDisplayName,
  resolveOwnerProfileById,
  resolveOwnerProfileForLease,
} from '@/lib/ownerProfiles'

const owners: OwnerProfile[] = [
  {
    id: 'owner-primary',
    name: 'Nina Martin',
    email: 'nina@example.com',
    address: '1 rue Oberkampf',
    city: 'Paris',
    phone: '0600000000',
    signatureImage: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    legalType: 'personne_physique',
    familySci: false,
    isPrimary: true,
  },
  {
    id: 'owner-sci',
    name: 'SCI du Canal',
    email: 'contact@sci.local',
    address: '10 quai de Jemmapes',
    city: 'Paris',
    phone: '0611111111',
    signatureImage: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    legalType: 'personne_morale',
    familySci: true,
    isPrimary: false,
  },
]

const fallbackProfile: UserProfile = {
  name: 'Fallback Owner',
  email: 'fallback@example.com',
  address: '20 rue du Test',
  city: 'Lyon',
  phone: '0622222222',
  signatureImage: '',
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('ownerProfiles helpers', () => {
  it('formats empty names with a fallback label', () => {
    expect(formatOwnerDisplayName({ name: '  ' }, 'Owner')).toBe('Owner')
  })

  it('resolves an owner directly by id', () => {
    expect(resolveOwnerProfileById(owners, 'owner-sci')?.name).toBe('SCI du Canal')
  })

  it('prefers the lease owner binding over the property default', () => {
    const profile = resolveOwnerProfileForLease(owners, {
      owner_profile_id: 'owner-sci',
      property_owner_profile_id: 'owner-primary',
    }, fallbackProfile)

    expect(profile?.name).toBe('SCI du Canal')
  })

  it('falls back to the property owner binding when the lease is unbound', () => {
    const profile = resolveOwnerProfileForLease(owners, {
      owner_profile_id: null,
      property_owner_profile_id: 'owner-primary',
    }, fallbackProfile)

    expect(profile?.name).toBe('Nina Martin')
  })

  it('falls back to the auth profile when no owner binding exists', () => {
    const profile = resolveOwnerProfileForLease(owners, {
      owner_profile_id: null,
      property_owner_profile_id: null,
    }, fallbackProfile)

    expect(profile?.name).toBe('Fallback Owner')
  })
})
