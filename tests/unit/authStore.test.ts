// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useAuthStore } from '@/stores/useAuthStore'

/* ------------------------------------------------------------------ */
/*  Mock window.api.auth                                              */
/* ------------------------------------------------------------------ */

const mockAuth = {
  hasPassword: vi.fn(),
  getProfile: vi.fn(),
  restoreRememberedSession: vi.fn(),
  setup: vi.fn(),
  verify: vi.fn(),
  change: vi.fn(),
  updateProfile: vi.fn(),
  delete: vi.fn(),
  lockSession: vi.fn(),
  hasRecoveryKey: vi.fn(),
  verifyRecoveryKey: vi.fn(),
  resetWithRecoveryKey: vi.fn(),
  regenerateRecoveryKey: vi.fn(),
}

;(window as any).api = { auth: mockAuth }

const PROFILE: UserProfile = {
  name: 'Alice Martin',
  email: 'alice@example.com',
  address: '12 rue de Paris',
  city: 'Paris',
  phone: '0600000000',
  signatureImage: null,
}

beforeEach(() => {
  vi.resetAllMocks()
  // Reset store state between tests
  useAuthStore.setState({ status: 'loading', profile: null, error: null })
})

/* ------------------------------------------------------------------ */
/*  init                                                              */
/* ------------------------------------------------------------------ */

describe('init', () => {
  it('transitions to setup when no account exists', async () => {
    mockAuth.hasPassword.mockResolvedValue(false)

    await useAuthStore.getState().init()

    expect(useAuthStore.getState().status).toBe('setup')
    expect(useAuthStore.getState().profile).toBeNull()
  })

  it('transitions to unlocked when a remembered session exists', async () => {
    mockAuth.hasPassword.mockResolvedValue(true)
    mockAuth.restoreRememberedSession.mockResolvedValue(PROFILE)

    await useAuthStore.getState().init()

    expect(useAuthStore.getState().status).toBe('unlocked')
    expect(useAuthStore.getState().profile).toEqual(PROFILE)
  })

  it('transitions to locked when account exists but no remembered session', async () => {
    mockAuth.hasPassword.mockResolvedValue(true)
    mockAuth.restoreRememberedSession.mockResolvedValue(null)
    mockAuth.getProfile.mockResolvedValue(PROFILE)

    await useAuthStore.getState().init()

    expect(useAuthStore.getState().status).toBe('locked')
    expect(useAuthStore.getState().profile).toEqual(PROFILE)
  })
})

/* ------------------------------------------------------------------ */
/*  login                                                             */
/* ------------------------------------------------------------------ */

describe('login', () => {
  it('transitions to unlocked on successful login', async () => {
    mockAuth.verify.mockResolvedValue(true)
    mockAuth.getProfile.mockResolvedValue(PROFILE)

    const ok = await useAuthStore.getState().login('alice@example.com', 'pass123', false)

    expect(ok).toBe(true)
    expect(useAuthStore.getState().status).toBe('unlocked')
    expect(useAuthStore.getState().profile).toEqual(PROFILE)
    expect(useAuthStore.getState().error).toBeNull()
  })

  it('sets error on failed login', async () => {
    mockAuth.verify.mockResolvedValue(false)

    const ok = await useAuthStore.getState().login('alice@example.com', 'wrong', false)

    expect(ok).toBe(false)
    expect(useAuthStore.getState().status).toBe('loading')
    expect(useAuthStore.getState().error).toBeTruthy()
  })
})

/* ------------------------------------------------------------------ */
/*  setup                                                             */
/* ------------------------------------------------------------------ */

describe('setup', () => {
  it('returns recovery key and sets profile on success', async () => {
    const recoveryKey = 'ABCD-EFGH-1234-5678'
    mockAuth.setup.mockResolvedValue(recoveryKey)
    mockAuth.getProfile.mockResolvedValue(PROFILE)

    const key = await useAuthStore.getState().setup('pass123', 'Alice Martin', 'alice@example.com')

    expect(key).toBe(recoveryKey)
    expect(useAuthStore.getState().profile).toEqual(PROFILE)
  })

  it('returns null when setup fails', async () => {
    mockAuth.setup.mockResolvedValue(null)

    const key = await useAuthStore.getState().setup('pass', 'Alice', 'alice@example.com')

    expect(key).toBeNull()
    expect(useAuthStore.getState().profile).toBeNull()
  })
})

/* ------------------------------------------------------------------ */
/*  completeSetup                                                     */
/* ------------------------------------------------------------------ */

describe('completeSetup', () => {
  it('transitions to locked when profile exists', () => {
    useAuthStore.setState({ profile: PROFILE })

    useAuthStore.getState().completeSetup()

    expect(useAuthStore.getState().status).toBe('locked')
  })

  it('transitions to setup when no profile', () => {
    useAuthStore.setState({ profile: null })

    useAuthStore.getState().completeSetup()

    expect(useAuthStore.getState().status).toBe('setup')
  })
})

/* ------------------------------------------------------------------ */
/*  lock                                                              */
/* ------------------------------------------------------------------ */

describe('lock', () => {
  it('transitions to locked and clears error', async () => {
    useAuthStore.setState({ status: 'unlocked', error: 'old error' })
    mockAuth.lockSession.mockResolvedValue(undefined)

    await useAuthStore.getState().lock()

    expect(useAuthStore.getState().status).toBe('locked')
    expect(useAuthStore.getState().error).toBeNull()
    expect(mockAuth.lockSession).toHaveBeenCalled()
  })
})

/* ------------------------------------------------------------------ */
/*  updateProfile                                                     */
/* ------------------------------------------------------------------ */

describe('updateProfile', () => {
  it('updates profile in state on success', async () => {
    useAuthStore.setState({ profile: PROFILE })
    mockAuth.updateProfile.mockResolvedValue(true)

    const ok = await useAuthStore.getState().updateProfile('Bob', 'bob@example.com', '5 rue Neuve', 'Lyon', '0611111111')

    expect(ok).toBe(true)
    const p = useAuthStore.getState().profile!
    expect(p.name).toBe('Bob')
    expect(p.email).toBe('bob@example.com')
    expect(p.address).toBe('5 rue Neuve')
    expect(p.city).toBe('Lyon')
    expect(p.phone).toBe('0611111111')
  })

  it('does not update state on failure', async () => {
    useAuthStore.setState({ profile: PROFILE })
    mockAuth.updateProfile.mockResolvedValue(false)

    const ok = await useAuthStore.getState().updateProfile('Bob', 'bob@example.com')

    expect(ok).toBe(false)
    expect(useAuthStore.getState().profile!.name).toBe('Alice Martin')
  })
})

/* ------------------------------------------------------------------ */
/*  deleteAccount                                                     */
/* ------------------------------------------------------------------ */

describe('deleteAccount', () => {
  it('transitions to setup when last account is deleted', async () => {
    useAuthStore.setState({ status: 'unlocked', profile: PROFILE })
    mockAuth.delete.mockResolvedValue(true)
    mockAuth.hasPassword.mockResolvedValue(false)

    const ok = await useAuthStore.getState().deleteAccount('pass123')

    expect(ok).toBe(true)
    expect(useAuthStore.getState().status).toBe('setup')
    expect(useAuthStore.getState().profile).toBeNull()
  })

  it('transitions to locked when other accounts remain', async () => {
    useAuthStore.setState({ status: 'unlocked', profile: PROFILE })
    mockAuth.delete.mockResolvedValue(true)
    mockAuth.hasPassword.mockResolvedValue(true)
    mockAuth.getProfile.mockResolvedValue({ ...PROFILE, name: 'Other User' })

    const ok = await useAuthStore.getState().deleteAccount('pass123')

    expect(ok).toBe(true)
    expect(useAuthStore.getState().status).toBe('locked')
  })

  it('returns false on wrong password', async () => {
    useAuthStore.setState({ status: 'unlocked', profile: PROFILE })
    mockAuth.delete.mockResolvedValue(false)

    const ok = await useAuthStore.getState().deleteAccount('wrong')

    expect(ok).toBe(false)
    expect(useAuthStore.getState().status).toBe('unlocked')
  })
})
