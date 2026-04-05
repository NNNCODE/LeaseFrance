import { app, safeStorage } from 'electron'
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { disabledLicenseRuntimeConfig, resolveLicenseRuntimeConfig, type LicenseRuntimeConfig } from './licenseRuntimeConfig'

const LICENSE_CONFIG_FILE = 'license-runtime.json'
const LICENSE_STATE_FILE = 'license-state.json'
const LICENSE_URL_ENV = 'RENTFLOW_LICENSE_API_URL'
const NETWORK_TIMEOUT_MS = 15_000
const STARTUP_REFRESH_DELAY_MS = 5_000
const RETRY_AFTER_FAILURE_MS = 60 * 60_000
const MAX_TIMER_MS = 2_147_000_000

interface StoredLicenseRecord {
  version: 1
  billingEmail: string | null
  subscriptionStatus: string | null
  refreshAfterSeconds: number | null
  offlineGraceDays: number | null
  currentPeriodEndsAt: string | null
  trialEndsAt: string | null
  activatedAt: string | null
  lastValidatedAt: string | null
  lastRefreshAttemptAt: string | null
  lastErrorCode: string | null
  lastErrorMessage: string | null
  tokenCiphertext: string | null
  tokenPlaintext: string | null
}

interface LicenseApiSuccessResponse {
  ok: true
  billingEmail: string
  subscriptionStatus: string
  licenseToken: string
  refreshAfterSeconds: number
  offlineGraceDays: number
  currentPeriodEndsAt: string | null
  trialEndsAt: string | null
}

interface LicenseRequestFailure {
  code: string
  message: string
  transient: boolean
  subscriptionStatus: string | null
}

interface DecodedLicenseToken {
  email: string | null
  status: string
  refreshAt: number
  offlineGraceDays: number
  offlineGraceExpiresAt: number
}

let runtimeConfig: LicenseRuntimeConfig = disabledLicenseRuntimeConfig()
let onStateChanged: ((state: LicenseState) => void) | null = null
let refreshTimer: NodeJS.Timeout | null = null
let storedRecord: StoredLicenseRecord | null = null
let decryptedToken: string | null = null

let state: LicenseState = {
  enabled: false,
  status: 'disabled',
  accessGranted: true,
  hasStoredToken: false,
  billingEmail: null,
  subscriptionStatus: null,
  refreshAfterSeconds: null,
  offlineGraceDays: null,
  nextRefreshAt: null,
  offlineGraceUntil: null,
  currentPeriodEndsAt: null,
  trialEndsAt: null,
  lastValidatedAt: null,
  lastRefreshAttemptAt: null,
  lastErrorCode: null,
  lastErrorMessage: null,
  disabledReason: 'not-configured',
  supportLogPath: null,
  endpointBaseUrl: null,
}

function licenseStatePath(): string {
  return join(app.getPath('userData'), LICENSE_STATE_FILE)
}

function getLicenseLogPath(): string {
  return join(app.getPath('userData'), 'logs', 'license-runtime.log')
}

function logLicense(level: 'INFO' | 'WARN' | 'ERROR', message: string, context?: Record<string, unknown>): void {
  try {
    mkdirSync(join(app.getPath('userData'), 'logs'), { recursive: true })
    const suffix = context ? ` ${JSON.stringify(context)}` : ''
    appendFileSync(getLicenseLogPath(), `[${new Date().toISOString()}] [${level}] ${message}${suffix}\n`, 'utf8')
  } catch {
    // Ignore logger failures.
  }
}

function publishState(): void {
  onStateChanged?.({ ...state })
}

function setState(next: Partial<LicenseState>): void {
  state = { ...state, ...next }
  publishState()
}

function readConfigFile(): string | null {
  const configPath = app.isPackaged
    ? join(process.resourcesPath, LICENSE_CONFIG_FILE)
    : join(process.cwd(), 'build', LICENSE_CONFIG_FILE)
  if (!existsSync(configPath)) return null
  return readFileSync(configPath, 'utf8')
}

function normalizeStoredRecord(value: unknown): StoredLicenseRecord | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Partial<StoredLicenseRecord>
  return {
    version: 1,
    billingEmail: typeof record.billingEmail === 'string' ? record.billingEmail : null,
    subscriptionStatus: typeof record.subscriptionStatus === 'string' ? record.subscriptionStatus : null,
    refreshAfterSeconds: Number.isFinite(record.refreshAfterSeconds) ? Number(record.refreshAfterSeconds) : null,
    offlineGraceDays: Number.isFinite(record.offlineGraceDays) ? Number(record.offlineGraceDays) : null,
    currentPeriodEndsAt: typeof record.currentPeriodEndsAt === 'string' ? record.currentPeriodEndsAt : null,
    trialEndsAt: typeof record.trialEndsAt === 'string' ? record.trialEndsAt : null,
    activatedAt: typeof record.activatedAt === 'string' ? record.activatedAt : null,
    lastValidatedAt: typeof record.lastValidatedAt === 'string' ? record.lastValidatedAt : null,
    lastRefreshAttemptAt: typeof record.lastRefreshAttemptAt === 'string' ? record.lastRefreshAttemptAt : null,
    lastErrorCode: typeof record.lastErrorCode === 'string' ? record.lastErrorCode : null,
    lastErrorMessage: typeof record.lastErrorMessage === 'string' ? record.lastErrorMessage : null,
    tokenCiphertext: typeof record.tokenCiphertext === 'string' ? record.tokenCiphertext : null,
    tokenPlaintext: typeof record.tokenPlaintext === 'string' ? record.tokenPlaintext : null,
  }
}

function loadStoredRecord(): StoredLicenseRecord | null {
  try {
    if (!existsSync(licenseStatePath())) return null
    return normalizeStoredRecord(JSON.parse(readFileSync(licenseStatePath(), 'utf8')))
  } catch {
    logLicense('ERROR', 'Failed to parse persisted license state.')
    return null
  }
}

function saveStoredRecord(nextRecord: StoredLicenseRecord | null): void {
  storedRecord = nextRecord
  const filePath = licenseStatePath()
  mkdirSync(app.getPath('userData'), { recursive: true })

  if (!nextRecord) {
    rmSync(filePath, { force: true })
    return
  }

  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  try {
    writeFileSync(tempPath, `${JSON.stringify(nextRecord, null, 2)}\n`, 'utf8')
    renameSync(tempPath, filePath)
  } finally {
    if (existsSync(tempPath)) rmSync(tempPath, { force: true })
  }
}

function encryptPersistedToken(token: string): Pick<StoredLicenseRecord, 'tokenCiphertext' | 'tokenPlaintext'> {
  if (safeStorage.isEncryptionAvailable()) {
    return {
      tokenCiphertext: safeStorage.encryptString(token).toString('base64'),
      tokenPlaintext: null,
    }
  }
  return {
    tokenCiphertext: null,
    tokenPlaintext: token,
  }
}

function readPersistedToken(record: StoredLicenseRecord | null): string | null {
  if (!record) return null
  try {
    if (record.tokenCiphertext) return safeStorage.decryptString(Buffer.from(record.tokenCiphertext, 'base64'))
    return record.tokenPlaintext || null
  } catch (error) {
    logLicense('ERROR', 'Failed to decrypt persisted license token.', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

function parseBase64UrlJson<T>(value: string): T | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
    return JSON.parse(Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8')) as T
  } catch {
    return null
  }
}

function decodeLicenseToken(token: string): DecodedLicenseToken | null {
  const [, encodedPayload] = token.split('.')
  if (!encodedPayload) return null
  const payload = parseBase64UrlJson<Record<string, unknown>>(encodedPayload)
  if (!payload || !Number.isFinite(payload.refreshAt) || !Number.isFinite(payload.offlineGraceExpiresAt)) return null
  return {
    email: typeof payload.email === 'string' ? payload.email : null,
    status: typeof payload.status === 'string' ? payload.status : 'unknown',
    refreshAt: Number(payload.refreshAt),
    offlineGraceDays: Number.isFinite(payload.offlineGraceDays) ? Number(payload.offlineGraceDays) : 7,
    offlineGraceExpiresAt: Number(payload.offlineGraceExpiresAt),
  }
}

function toIsoFromSeconds(value: number | null): string | null {
  if (!value || !Number.isFinite(value)) return null
  return new Date(value * 1000).toISOString()
}

function deriveStateFromRecord(): LicenseState {
  const baseState: LicenseState = {
    enabled: runtimeConfig.enabled,
    status: runtimeConfig.enabled ? 'unlicensed' : 'disabled',
    accessGranted: !runtimeConfig.enabled,
    hasStoredToken: Boolean(decryptedToken),
    billingEmail: storedRecord?.billingEmail ?? null,
    subscriptionStatus: storedRecord?.subscriptionStatus ?? null,
    refreshAfterSeconds: storedRecord?.refreshAfterSeconds ?? null,
    offlineGraceDays: storedRecord?.offlineGraceDays ?? null,
    nextRefreshAt: null,
    offlineGraceUntil: null,
    currentPeriodEndsAt: storedRecord?.currentPeriodEndsAt ?? null,
    trialEndsAt: storedRecord?.trialEndsAt ?? null,
    lastValidatedAt: storedRecord?.lastValidatedAt ?? null,
    lastRefreshAttemptAt: storedRecord?.lastRefreshAttemptAt ?? null,
    lastErrorCode: storedRecord?.lastErrorCode ?? null,
    lastErrorMessage: storedRecord?.lastErrorMessage ?? null,
    disabledReason: runtimeConfig.enabled ? null : 'not-configured',
    supportLogPath: getLicenseLogPath(),
    endpointBaseUrl: runtimeConfig.baseUrl,
  }

  if (!runtimeConfig.enabled) return baseState

  if (!decryptedToken) {
    return {
      ...baseState,
      status: storedRecord?.lastErrorCode === 'SUBSCRIPTION_INACTIVE' ? 'inactive' : 'unlicensed',
      accessGranted: false,
    }
  }

  const decoded = decodeLicenseToken(decryptedToken)
  if (!decoded) {
    return {
      ...baseState,
      status: 'unlicensed',
      accessGranted: false,
      hasStoredToken: false,
      lastErrorCode: storedRecord?.lastErrorCode ?? 'LOCAL_LICENSE_CORRUPT',
      lastErrorMessage: storedRecord?.lastErrorMessage ?? 'Cached license token is unreadable.',
    }
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  return {
    ...baseState,
    status: nowSeconds > decoded.offlineGraceExpiresAt ? 'expired' : nowSeconds >= decoded.refreshAt ? 'grace' : 'active',
    accessGranted: nowSeconds <= decoded.offlineGraceExpiresAt,
    billingEmail: baseState.billingEmail ?? decoded.email,
    subscriptionStatus: baseState.subscriptionStatus ?? decoded.status,
    offlineGraceDays: baseState.offlineGraceDays ?? decoded.offlineGraceDays,
    nextRefreshAt: toIsoFromSeconds(decoded.refreshAt),
    offlineGraceUntil: toIsoFromSeconds(decoded.offlineGraceExpiresAt),
  }
}

function refreshDerivedState(): LicenseState {
  state = deriveStateFromRecord()
  publishState()
  return state
}

function clearRefreshTimer(): void {
  if (!refreshTimer) return
  clearTimeout(refreshTimer)
  refreshTimer = null
}

function scheduleRefresh(delayMs: number, reason: string): void {
  clearRefreshTimer()
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    void refreshLicense({ reason })
  }, Math.max(1_000, Math.min(delayMs, MAX_TIMER_MS)))
}

function scheduleRefreshFromToken(token: string): void {
  const decoded = decodeLicenseToken(token)
  if (!decoded) return
  const delay = decoded.refreshAt * 1000 - Date.now()
  if (delay > 0) scheduleRefresh(delay, 'scheduled-refresh')
}

function scheduleRetryWithinGrace(token: string): void {
  const decoded = decodeLicenseToken(token)
  if (!decoded) return
  const remainingMs = decoded.offlineGraceExpiresAt * 1000 - Date.now()
  if (remainingMs > 0) scheduleRefresh(Math.min(RETRY_AFTER_FAILURE_MS, remainingMs), 'retry-after-failure')
}

function scheduleStartupRefreshIfDue(): void {
  if (!decryptedToken) return
  const decoded = decodeLicenseToken(decryptedToken)
  if (!decoded) return
  if (Date.now() > decoded.offlineGraceExpiresAt * 1000) return
  if (Date.now() >= decoded.refreshAt * 1000) {
    scheduleRefresh(STARTUP_REFRESH_DELAY_MS, 'startup-refresh')
    return
  }
  scheduleRefreshFromToken(decryptedToken)
}

function persistFatalFailure(
  failure: LicenseRequestFailure,
  overrides: { billingEmail?: string | null; subscriptionStatus?: string | null } = {},
): void {
  saveStoredRecord({
    version: 1,
    billingEmail: overrides.billingEmail ?? storedRecord?.billingEmail ?? null,
    subscriptionStatus: overrides.subscriptionStatus ?? failure.subscriptionStatus ?? storedRecord?.subscriptionStatus ?? null,
    refreshAfterSeconds: null,
    offlineGraceDays: null,
    currentPeriodEndsAt: null,
    trialEndsAt: null,
    activatedAt: storedRecord?.activatedAt ?? null,
    lastValidatedAt: storedRecord?.lastValidatedAt ?? null,
    lastRefreshAttemptAt: new Date().toISOString(),
    lastErrorCode: failure.code,
    lastErrorMessage: failure.message,
    tokenCiphertext: null,
    tokenPlaintext: null,
  })
  decryptedToken = null
  clearRefreshTimer()
}

function persistTransientFailure(failure: LicenseRequestFailure): void {
  if (!storedRecord) return
  saveStoredRecord({
    ...storedRecord,
    lastRefreshAttemptAt: new Date().toISOString(),
    lastErrorCode: failure.code,
    lastErrorMessage: failure.message,
  })
}

function persistLicenseSuccess(payload: LicenseApiSuccessResponse): void {
  const nowIso = new Date().toISOString()
  saveStoredRecord({
    version: 1,
    billingEmail: payload.billingEmail,
    subscriptionStatus: payload.subscriptionStatus,
    refreshAfterSeconds: payload.refreshAfterSeconds,
    offlineGraceDays: payload.offlineGraceDays,
    currentPeriodEndsAt: payload.currentPeriodEndsAt,
    trialEndsAt: payload.trialEndsAt,
    activatedAt: storedRecord?.activatedAt ?? nowIso,
    lastValidatedAt: nowIso,
    lastRefreshAttemptAt: nowIso,
    lastErrorCode: null,
    lastErrorMessage: null,
    ...encryptPersistedToken(payload.licenseToken),
  })
  decryptedToken = payload.licenseToken
}

function normalizeFailureMessage(code: string, responseStatus: number): string {
  switch (code) {
    case 'LICENSE_NOT_FOUND': return 'License not found for the provided billing email and activation code.'
    case 'SUBSCRIPTION_INACTIVE': return 'The subscription attached to this license is inactive.'
    case 'LICENSE_TOKEN_REQUIRED': return 'A cached license token is required to refresh entitlement.'
    case 'INVALID_TOKEN_FORMAT':
    case 'INVALID_TOKEN_SIGNATURE':
    case 'UNSUPPORTED_TOKEN_VERSION':
      return 'The cached license token is invalid and must be reactivated.'
    default: return responseStatus >= 500 ? 'The license service is temporarily unavailable.' : `License request failed with status ${responseStatus}.`
  }
}

async function postLicenseRequest(
  endpointPath: 'api/licenses/activate' | 'api/licenses/refresh',
  body: Record<string, unknown>,
): Promise<{ ok: true; data: LicenseApiSuccessResponse } | { ok: false; error: LicenseRequestFailure }> {
  if (!runtimeConfig.enabled || !runtimeConfig.baseUrl) {
    return { ok: false, error: { code: 'LICENSE_NOT_CONFIGURED', message: 'The packaged app is missing a license API base URL.', transient: false, subscriptionStatus: null } }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS)

  try {
    const response = await fetch(new URL(endpointPath, `${runtimeConfig.baseUrl}/`).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    let parsedBody: Record<string, unknown> = {}
    try { parsedBody = await response.json() as Record<string, unknown> } catch { parsedBody = {} }

    if (!response.ok) {
      const code = typeof parsedBody.error === 'string' ? parsedBody.error : `HTTP_${response.status}`
      return {
        ok: false,
        error: {
          code,
          message: normalizeFailureMessage(code, response.status),
          transient: response.status >= 500,
          subscriptionStatus: typeof parsedBody.subscriptionStatus === 'string' ? parsedBody.subscriptionStatus : null,
        },
      }
    }

    if (
      parsedBody.ok !== true
      || typeof parsedBody.billingEmail !== 'string'
      || typeof parsedBody.subscriptionStatus !== 'string'
      || typeof parsedBody.licenseToken !== 'string'
      || !Number.isFinite(parsedBody.refreshAfterSeconds)
      || !Number.isFinite(parsedBody.offlineGraceDays)
    ) {
      return { ok: false, error: { code: 'INVALID_RESPONSE', message: 'The license service returned an incomplete payload.', transient: true, subscriptionStatus: null } }
    }

    return {
      ok: true,
      data: {
        ok: true,
        billingEmail: parsedBody.billingEmail,
        subscriptionStatus: parsedBody.subscriptionStatus,
        licenseToken: parsedBody.licenseToken,
        refreshAfterSeconds: Number(parsedBody.refreshAfterSeconds),
        offlineGraceDays: Number(parsedBody.offlineGraceDays),
        currentPeriodEndsAt: typeof parsedBody.currentPeriodEndsAt === 'string' ? parsedBody.currentPeriodEndsAt : null,
        trialEndsAt: typeof parsedBody.trialEndsAt === 'string' ? parsedBody.trialEndsAt : null,
      },
    }
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    return { ok: false, error: { code: aborted ? 'NETWORK_TIMEOUT' : 'NETWORK_ERROR', message: aborted ? 'The license service did not respond before the timeout.' : 'The app could not reach the license service.', transient: true, subscriptionStatus: null } }
  } finally {
    clearTimeout(timeout)
  }
}

function clearCorruptedStoredToken(): void {
  if (!storedRecord) return
  saveStoredRecord({
    ...storedRecord,
    tokenCiphertext: null,
    tokenPlaintext: null,
    lastErrorCode: 'LOCAL_LICENSE_CORRUPT',
    lastErrorMessage: 'Cached license token could not be read on this device.',
  })
  decryptedToken = null
}

export function initLicenseRuntime(listener: (nextState: LicenseState) => void): void {
  onStateChanged = listener
  runtimeConfig = resolveLicenseRuntimeConfig({ envUrl: process.env[LICENSE_URL_ENV] ?? null, fileContents: readConfigFile() })
  storedRecord = loadStoredRecord()
  decryptedToken = readPersistedToken(storedRecord)
  if (storedRecord && !decryptedToken && (storedRecord.tokenCiphertext || storedRecord.tokenPlaintext)) clearCorruptedStoredToken()
  refreshDerivedState()
  if (runtimeConfig.enabled && decryptedToken) scheduleStartupRefreshIfDue()
  logLicense('INFO', 'Initialized license runtime.', { enabled: runtimeConfig.enabled, status: state.status })
}

export function getLicenseState(): LicenseState {
  return { ...state }
}

export async function activateLicense(billingEmail: string, activationCode: string): Promise<LicenseState> {
  if (!runtimeConfig.enabled) return getLicenseState()

  const normalizedEmail = billingEmail.trim().toLowerCase()
  const normalizedCode = activationCode.trim().toUpperCase()
  setState({ status: 'activating', lastErrorCode: null, lastErrorMessage: null })
  logLicense('INFO', 'Attempting license activation.', { billingEmail: normalizedEmail })

  const result = await postLicenseRequest('api/licenses/activate', {
    billingEmail: normalizedEmail,
    activationCode: normalizedCode,
  })

  if (!result.ok) {
    persistFatalFailure(result.error, { billingEmail: normalizedEmail })
    const nextState = refreshDerivedState()
    logLicense(result.error.transient ? 'WARN' : 'ERROR', 'License activation failed.', { billingEmail: normalizedEmail, code: result.error.code })
    return nextState
  }

  persistLicenseSuccess(result.data)
  const nextState = refreshDerivedState()
  scheduleRefreshFromToken(result.data.licenseToken)
  logLicense('INFO', 'License activation succeeded.', { billingEmail: result.data.billingEmail, subscriptionStatus: result.data.subscriptionStatus })
  return nextState
}

export async function refreshLicense(options: { reason?: string } = {}): Promise<LicenseState> {
  if (!runtimeConfig.enabled || !decryptedToken) return getLicenseState()

  setState({ status: state.accessGranted ? 'refreshing' : 'checking', lastErrorCode: null, lastErrorMessage: null })
  logLicense('INFO', 'Refreshing cached license token.', { reason: options.reason ?? 'manual', billingEmail: storedRecord?.billingEmail ?? null })

  const result = await postLicenseRequest('api/licenses/refresh', { licenseToken: decryptedToken })
  if (!result.ok) {
    const shouldClearToken = !result.error.transient || result.error.code === 'LICENSE_NOT_FOUND'
    if (shouldClearToken) persistFatalFailure(result.error)
    else persistTransientFailure(result.error)

    const nextState = refreshDerivedState()
    if (!shouldClearToken && decryptedToken) scheduleRetryWithinGrace(decryptedToken)
    logLicense(result.error.transient ? 'WARN' : 'ERROR', 'License refresh failed.', { code: result.error.code, status: nextState.status })
    return nextState
  }

  persistLicenseSuccess(result.data)
  const nextState = refreshDerivedState()
  scheduleRefreshFromToken(result.data.licenseToken)
  logLicense('INFO', 'License refresh succeeded.', { billingEmail: result.data.billingEmail, subscriptionStatus: result.data.subscriptionStatus })
  return nextState
}
