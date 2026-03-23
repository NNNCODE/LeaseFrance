import { create } from 'zustand'

type AuthStatus = 'loading' | 'setup' | 'locked' | 'unlocked'

interface AuthState {
  status:  AuthStatus
  profile: UserProfile | null
  error:   string | null

  init:          () => Promise<void>
  login:         (password: string) => Promise<boolean>
  setup:         (password: string, name: string, email: string) => Promise<boolean>
  lock:          () => void
  updateProfile: (name: string, email: string, address?: string, phone?: string) => Promise<boolean>
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
      const profile = await window.api.auth.getProfile()
      set({ status: 'locked', profile, error: null })
    } else {
      set({ status: 'setup', profile: null, error: null })
    }
  },

  login: async (password) => {
    const ok = await window.api.auth.verify(password)
    if (ok) {
      const profile = await window.api.auth.getProfile()
      set({ status: 'unlocked', profile, error: null })
    } else {
      set({ error: 'Mot de passe incorrect.' })
    }
    return ok
  },

  setup: async (password, name, email) => {
    const ok = await window.api.auth.setup(password, name, email)
    if (ok) {
      const profile = await window.api.auth.getProfile()
      set({ status: 'unlocked', profile, error: null })
    }
    return ok
  },

  lock: () => set({ status: 'locked', error: null }),

  updateProfile: async (name, email, address?, phone?) => {
    const ok = await window.api.auth.updateProfile(name, email, address, phone)
    if (ok) set((s) => ({
      profile: s.profile
        ? { ...s.profile, name, email, ...(address !== undefined && { address }), ...(phone !== undefined && { phone }) }
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
    if (ok) set({ status: 'setup', profile: null, error: null })
    return ok
  },
}))
