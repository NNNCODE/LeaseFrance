import { create } from 'zustand'

interface OwnerState {
  status: 'idle' | 'loading' | 'ready'
  owners: OwnerProfile[]
  activeOwner: OwnerProfile | null
  init: () => Promise<void>
  refresh: () => Promise<void>
  createOwner: (draft?: OwnerProfileDraft) => Promise<OwnerProfile>
  updateOwner: (id: string, patch: OwnerProfileDraft) => Promise<OwnerProfile | null>
  setActiveOwner: (id: string) => Promise<OwnerProfile | null>
  deleteOwner: (id: string) => Promise<boolean>
  clear: () => void
}

let initPromise: Promise<void> | null = null

async function loadOwnersIntoStore(
  set: (partial: Partial<OwnerState>) => void,
): Promise<void> {
  const [owners, activeOwner] = await Promise.all([
    window.api.owners.list(),
    window.api.owners.getActive(),
  ])
  set({ owners, activeOwner, status: 'ready' })
}

export const useOwnerStore = create<OwnerState>((set) => ({
  status: 'idle',
  owners: [],
  activeOwner: null,

  init: async () => {
    if (initPromise) return initPromise

    set({ status: 'loading' })
    initPromise = loadOwnersIntoStore(set).finally(() => {
      initPromise = null
    })
    return initPromise
  },

  refresh: async () => {
    set({ status: 'loading' })
    await loadOwnersIntoStore(set)
  },

  createOwner: async (draft) => {
    const created = draft === undefined
      ? await window.api.owners.create()
      : await window.api.owners.create(draft)
    const owners = await window.api.owners.list()
    set({ owners, activeOwner: created, status: 'ready' })
    return created
  },

  updateOwner: async (id, patch) => {
    const updated = await window.api.owners.update(id, patch)
    const owners = await window.api.owners.list()
    const activeOwner = await window.api.owners.getActive()
    set({ owners, activeOwner, status: 'ready' })
    return updated
  },

  setActiveOwner: async (id) => {
    const activeOwner = await window.api.owners.setActive(id)
    const owners = await window.api.owners.list()
    set({ owners, activeOwner, status: 'ready' })
    return activeOwner
  },

  deleteOwner: async (id) => {
    const deleted = await window.api.owners.delete(id)
    if (deleted) {
      const owners = await window.api.owners.list()
      const activeOwner = await window.api.owners.getActive()
      set({ owners, activeOwner, status: 'ready' })
    }
    return deleted
  },

  clear: () => {
    initPromise = null
    set({ status: 'idle', owners: [], activeOwner: null })
  },
}))
