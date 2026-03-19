/// <reference types="vite/client" />

interface UserProfile {
  name: string
  email: string
  createdAt: string
}

interface Property {
  id: number
  name: string
  address: string
  city: string
  zip: string
  type: string
  area_m2: number | null
  created_at: string
}

interface PropertyInput {
  name: string
  address: string
  city: string
  zip: string
  type: string
  area_m2?: number | null
}

interface Window {
  api: {
    window: {
      minimize: () => void
      maximize: () => void
      close: () => void
    }
    auth: {
      hasPassword:   () => Promise<boolean>
      getProfile:    () => Promise<UserProfile | null>
      setup:         (pwd: string, name: string, email: string) => Promise<boolean>
      verify:        (pwd: string) => Promise<boolean>
      change:        (old: string, next: string) => Promise<boolean>
      updateProfile: (name: string, email: string) => Promise<boolean>
      delete:        (pwd: string) => Promise<boolean>
    }
    properties: {
      getAll: () => Promise<Property[]>
      count:  () => Promise<number>
      create: (data: PropertyInput) => Promise<Property>
      update: (id: number, data: PropertyInput) => Promise<Property>
      delete: (id: number) => Promise<boolean>
    }
  }
}
