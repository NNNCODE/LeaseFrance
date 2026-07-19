interface UserProfile {
  name: string
  email: string
  address: string
  city: string
  phone: string
  signatureImage: string
  createdAt: string
  legalType?: 'personne_physique' | 'personne_morale'
  familySci?: boolean
  updatedAt?: string
}

interface OwnerProfile extends UserProfile {
  id: string
  legalType: 'personne_physique' | 'personne_morale'
  familySci: boolean
  updatedAt: string
  isPrimary: boolean
}

interface OwnerProfileDraft {
  name?: string
  email?: string
  address?: string
  city?: string
  phone?: string
  signatureImage?: string
  legalType?: 'personne_physique' | 'personne_morale'
  familySci?: boolean
}
