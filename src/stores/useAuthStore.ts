import { create } from 'zustand'

type AuthStatus = 'loading' | 'setup' | 'locked' | 'unlocked'

interface AuthState {
  status:  AuthStatus
  profile: UserProfile | null
  error:   string | null

  init:          () => Promise<void>
  login:         (email: string, password: string, remember: boolean) => Promise<boolean>
  setup:         (password: string, name: string, email: string) => Promise<string | null>
  completeSetup: () => void
  lock:          () => Promise<void>
  updateProfile: (name: string, email: string, address?: string, city?: string, phone?: string, signatureImage?: string) => Promise<boolean>
  changePassword:(oldPwd: string, newPwd: string) => Promise<boolean>
  deleteAccount: (password: string) => Promise<boolean>
}

export const useAuthStore = create<AuthState>((set) => ({
  status:  'loading',
  profile: null,
  error:   null,

  init: async () => {
    const has = await window.api.auth.hasPassword()
    if (has) {
      const rememberedProfile = await window.api.auth.restoreRememberedSession()
      if (rememberedProfile) {
        set({ status: 'unlocked', profile: rememberedProfile, error: null })
        return
      }

      const profile = await window.api.auth.getProfile()
      set({ status: 'locked', profile, error: null })
    } else {
      set({ status: 'setup', profile: null, error: null })
    }
  },

  login: async (email, password, remember) => {
    const ok = await window.api.auth.verify(email, password, remember)
    if (ok) {
      const profile = await window.api.auth.getProfile()
      set({ status: 'unlocked', profile, error: null })
    } else {
      set({ error: "Adresse e-mail ou mot de passe incorrect." })
    }
    return ok
  },

  setup: async (password, name, email) => {
    const recoveryKey = await window.api.auth.setup(password, name, email)
    if (recoveryKey) {
      const profile = await window.api.auth.getProfile()
      set({ profile, error: null })
    }
    return recoveryKey
  },

  completeSetup: () => set((state) => ({
    status: state.profile ? 'locked' : 'setup',
    error: null,
  })),

  lock: async () => {
    await window.api.auth.lockSession()
    set({ status: 'locked', error: null })
  },

  updateProfile: async (name, email, address?, city?, phone?, signatureImage?) => {
    const ok = await window.api.auth.updateProfile(name, email, address, city, phone, signatureImage)
    if (ok) set((s) => ({
      profile: s.profile
        ? {
            ...s.profile, name, email: email.trim().toLowerCase(),
            ...(address !== undefined && { address }),
            ...(city !== undefined && { city }),
            ...(phone !== undefined && { phone }),
            ...(signatureImage !== undefined && { signatureImage }),
          }
        : null,
    }))
    return ok
  },

  changePassword: async (oldPwd, newPwd) => {
    return window.api.auth.change(oldPwd, newPwd)
  },

  /** Supprime le compte → retour à l'écran d'inscription */
  deleteAccount: async (password) => {
    const ok = await window.api.auth.delete(password)
    if (ok) {
      const hasAccounts = await window.api.auth.hasPassword()
      if (hasAccounts) {
        const profile = await window.api.auth.getProfile()
        set({ status: 'locked', profile, error: null })
      } else {
        set({ status: 'setup', profile: null, error: null })
      }
    }
    return ok
  },
}))
