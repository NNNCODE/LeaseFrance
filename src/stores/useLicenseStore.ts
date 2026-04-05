import { create } from 'zustand'

interface LicenseStoreState {
  status: 'loading' | 'ready'
  license: LicenseState | null
  init: () => Promise<void>
  activate: (billingEmail: string, activationCode: string) => Promise<LicenseState>
  refresh: () => Promise<LicenseState>
}

let initPromise: Promise<void> | null = null
let unsubscribeLicenseState: (() => void) | null = null

export const useLicenseStore = create<LicenseStoreState>((set) => ({
  status: 'loading',
  license: null,

  init: async () => {
    if (initPromise) return initPromise

    initPromise = (async () => {
      const current = await window.api.license.getState()
      if (!unsubscribeLicenseState) {
        unsubscribeLicenseState = window.api.license.onStateChanged((_event, nextState) => {
          set({ license: nextState, status: 'ready' })
        })
      }
      set({ license: current, status: 'ready' })
    })()

    return initPromise
  },

  activate: async (billingEmail, activationCode) => {
    const nextState = await window.api.license.activate(billingEmail, activationCode)
    set({ license: nextState, status: 'ready' })
    return nextState
  },

  refresh: async () => {
    const nextState = await window.api.license.refresh()
    set({ license: nextState, status: 'ready' })
    return nextState
  },
}))
