import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { join } from 'path'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { randomBytes } from 'crypto'
import { tmpdir } from 'os'

const TEST_DIR = join(tmpdir(), `rentflow-license-test-${randomBytes(4).toString('hex')}`)
let secureStorageAvailable = false
let secureStorageDecryptFails = false

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: () => TEST_DIR,
    getVersion: () => '0.1.0',
  },
  safeStorage: {
    isEncryptionAvailable: () => secureStorageAvailable,
    encryptString: (value: string) => Buffer.from(`enc:${value}`, 'utf8'),
    decryptString: (value: Buffer) => {
      if (secureStorageDecryptFails) throw new Error('decrypt failed')
      return value.toString('utf8').replace(/^enc:/, '')
    },
  },
}))

function toBase64Url(value: object): string {
  return Buffer.from(JSON.stringify(value), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function makeToken(overrides: Partial<Record<string, unknown>> = {}): string {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const payload = {
    v: 1,
    sid: 'sub_test',
    tid: 'txn_test',
    email: 'buyer@example.com',
    status: 'active',
    entitled: true,
    productId: 'prod_test',
    priceId: 'price_test',
    issuedAt: nowSeconds,
    refreshAt: nowSeconds + 3600,
    offlineGraceDays: 7,
    offlineGraceExpiresAt: nowSeconds + 7 * 24 * 60 * 60,
    currentPeriodEndsAt: null,
    trialEndsAt: null,
    ...overrides,
  }

  return `${toBase64Url({ alg: 'HS256', typ: 'JWT' })}.${toBase64Url(payload)}.signature`
}

describe('license runtime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-05T09:00:00.000Z'))
    mkdirSync(TEST_DIR, { recursive: true })
    process.env.RENTFLOW_LICENSE_API_URL = 'https://licenses.example.com'
    secureStorageAvailable = false
    secureStorageDecryptFails = false
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    rmSync(TEST_DIR, { recursive: true, force: true })
    delete process.env.RENTFLOW_LICENSE_API_URL
  })

  it('persists a successful activation and grants access', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      billingEmail: 'buyer@example.com',
      subscriptionStatus: 'active',
      licenseToken: makeToken(),
      refreshAfterSeconds: 86400,
      offlineGraceDays: 7,
      currentPeriodEndsAt: '2026-04-30T10:00:00.000Z',
      trialEndsAt: null,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))

    vi.resetModules()
    const license = await import('../../electron/license')

    license.initLicenseRuntime(() => {})
    const state = await license.activateLicense('buyer@example.com', 'ABCD2345EF')

    expect(state.status).toBe('active')
    expect(state.accessGranted).toBe(true)
    expect(state.hasStoredToken).toBe(true)
    expect(state.billingEmail).toBe('buyer@example.com')
  })

  it('keeps the token readable across restart even if secure storage is unavailable later', async () => {
    secureStorageAvailable = true
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      billingEmail: 'buyer@example.com',
      subscriptionStatus: 'active',
      licenseToken: makeToken(),
      refreshAfterSeconds: 86400,
      offlineGraceDays: 7,
      currentPeriodEndsAt: '2026-04-30T10:00:00.000Z',
      trialEndsAt: null,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))

    vi.resetModules()
    const firstRun = await import('../../electron/license')
    firstRun.initLicenseRuntime(() => {})
    await firstRun.activateLicense('buyer@example.com', 'ABCD2345EF')

    const persisted = JSON.parse(readFileSync(join(TEST_DIR, 'license-state.json'), 'utf8')) as {
      tokenPlaintext: string | null
      tokenCiphertext: string | null
    }

    expect(persisted.tokenPlaintext).toBeTruthy()
    expect(persisted.tokenCiphertext).toBeNull()

    secureStorageDecryptFails = true
    vi.resetModules()
    const secondRun = await import('../../electron/license')
    secondRun.initLicenseRuntime(() => {})
    const nextState = secondRun.getLicenseState()

    expect(nextState.status).toBe('active')
    expect(nextState.accessGranted).toBe(true)
    expect(nextState.hasStoredToken).toBe(true)
  })

  it('keeps access in grace mode when refresh fails offline', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        billingEmail: 'buyer@example.com',
        subscriptionStatus: 'active',
        licenseToken: makeToken({
          refreshAt: Math.floor(Date.now() / 1000) - 10,
          offlineGraceExpiresAt: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        }),
        refreshAfterSeconds: 86400,
        offlineGraceDays: 7,
        currentPeriodEndsAt: null,
        trialEndsAt: null,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockRejectedValue(new TypeError('fetch failed')))

    vi.resetModules()
    const license = await import('../../electron/license')

    license.initLicenseRuntime(() => {})
    await license.activateLicense('buyer@example.com', 'ABCD2345EF')
    const state = await license.refreshLicense()

    expect(state.status).toBe('grace')
    expect(state.accessGranted).toBe(true)
    expect(state.lastErrorCode).toBe('NETWORK_ERROR')
  })

  it('clears cached access when refresh reports an inactive subscription', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        billingEmail: 'buyer@example.com',
        subscriptionStatus: 'active',
        licenseToken: makeToken(),
        refreshAfterSeconds: 86400,
        offlineGraceDays: 7,
        currentPeriodEndsAt: null,
        trialEndsAt: null,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: 'SUBSCRIPTION_INACTIVE',
        subscriptionStatus: 'canceled',
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })))

    vi.resetModules()
    const license = await import('../../electron/license')

    license.initLicenseRuntime(() => {})
    await license.activateLicense('buyer@example.com', 'ABCD2345EF')
    const state = await license.refreshLicense()

    expect(state.status).toBe('inactive')
    expect(state.accessGranted).toBe(false)
    expect(state.hasStoredToken).toBe(false)
    expect(state.lastErrorCode).toBe('SUBSCRIPTION_INACTIVE')
  })

  it('marks an overdue cached token as expired on startup', async () => {
    const expiredToken = makeToken({
      refreshAt: Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60,
      offlineGraceExpiresAt: Math.floor(Date.now() / 1000) - 60,
    })

    writeFileSync(join(TEST_DIR, 'license-state.json'), JSON.stringify({
      version: 1,
      billingEmail: 'buyer@example.com',
      subscriptionStatus: 'active',
      refreshAfterSeconds: 86400,
      offlineGraceDays: 7,
      currentPeriodEndsAt: null,
      trialEndsAt: null,
      activatedAt: '2026-04-01T09:00:00.000Z',
      lastValidatedAt: '2026-04-01T09:00:00.000Z',
      lastRefreshAttemptAt: '2026-04-04T09:00:00.000Z',
      lastErrorCode: 'NETWORK_ERROR',
      lastErrorMessage: 'The app could not reach the license service.',
      tokenCiphertext: null,
      tokenPlaintext: expiredToken,
    }), 'utf8')

    vi.stubGlobal('fetch', vi.fn())
    vi.resetModules()
    const license = await import('../../electron/license')

    license.initLicenseRuntime(() => {})
    const state = license.getLicenseState()

    expect(state.status).toBe('expired')
    expect(state.accessGranted).toBe(false)
    expect(state.hasStoredToken).toBe(true)
    expect(state.offlineGraceUntil).toBeTruthy()
  })

  it('migrates a legacy encrypted token record to plaintext storage on startup', async () => {
    secureStorageAvailable = true
    const encryptedToken = Buffer.from(`enc:${makeToken()}`, 'utf8').toString('base64')

    writeFileSync(join(TEST_DIR, 'license-state.json'), JSON.stringify({
      version: 1,
      billingEmail: 'buyer@example.com',
      subscriptionStatus: 'active',
      refreshAfterSeconds: 86400,
      offlineGraceDays: 7,
      currentPeriodEndsAt: null,
      trialEndsAt: null,
      activatedAt: '2026-04-01T09:00:00.000Z',
      lastValidatedAt: '2026-04-05T09:00:00.000Z',
      lastRefreshAttemptAt: '2026-04-05T09:00:00.000Z',
      lastErrorCode: null,
      lastErrorMessage: null,
      tokenCiphertext: encryptedToken,
      tokenPlaintext: null,
    }), 'utf8')

    vi.stubGlobal('fetch', vi.fn())
    vi.resetModules()
    const license = await import('../../electron/license')
    license.initLicenseRuntime(() => {})

    const nextState = license.getLicenseState()
    const persisted = JSON.parse(readFileSync(join(TEST_DIR, 'license-state.json'), 'utf8')) as {
      tokenPlaintext: string | null
      tokenCiphertext: string | null
    }

    expect(nextState.status).toBe('active')
    expect(persisted.tokenPlaintext).toBeTruthy()
    expect(persisted.tokenCiphertext).toBeNull()
  })
})
