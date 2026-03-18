/// <reference types="vite/client" />

interface UserProfile {
  name: string
  email: string
  createdAt: string
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
  }
}
