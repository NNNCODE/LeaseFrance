import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

const TEST_DIR = join(tmpdir(), `rentflow-diagnostics-test-${randomBytes(4).toString('hex')}`)

const mockShowSaveDialog = vi.fn()
const mockOpenPath = vi.fn().mockResolvedValue('')
const mockGetBackupSettings = vi.fn()
const mockGetCurrentAccountStorageDir = vi.fn()
const mockGetProfile = vi.fn()
const mockHasPassword = vi.fn()
const mockGetAutoUpdateState = vi.fn()
const mockGetAppRuntimeState = vi.fn()
const mockGetLicenseState = vi.fn()

vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    getVersion: () => '0.1.1',
    getPath: (name: string) => {
      if (name === 'userData') return TEST_DIR
      return TEST_DIR
    },
  },
  dialog: {
    showSaveDialog: (...args: unknown[]) => mockShowSaveDialog(...args),
  },
  shell: {
    openPath: (...args: unknown[]) => mockOpenPath(...args),
  },
}))

vi.mock('../../electron/backupManager', () => ({
  getBackupSettings: (...args: unknown[]) => mockGetBackupSettings(...args),
}))

vi.mock('../../electron/auth', () => ({
  getCurrentAccountStorageDir: (...args: unknown[]) => mockGetCurrentAccountStorageDir(...args),
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
  hasPassword: (...args: unknown[]) => mockHasPassword(...args),
}))

vi.mock('../../electron/autoUpdate', () => ({
  getAutoUpdateState: (...args: unknown[]) => mockGetAutoUpdateState(...args),
}))

vi.mock('../../electron/appRuntime', () => ({
  getAppRuntimeLogPath: () => join(TEST_DIR, 'logs', 'app-runtime.log'),
  getAppRuntimeStatePath: () => join(TEST_DIR, 'app-runtime-state.json'),
  getAppRuntimeState: (...args: unknown[]) => mockGetAppRuntimeState(...args),
}))

vi.mock('../../electron/license', () => ({
  getLicenseState: (...args: unknown[]) => mockGetLicenseState(...args),
}))

import { buildDiagnosticsReport, exportDiagnosticsReport, openLogsFolder } from '../../electron/diagnostics'

function makeLicenseState(overrides: Partial<LicenseState> = {}): LicenseState {
  return {
    enabled: true,
    status: 'active',
    accessGranted: true,
    hasStoredToken: true,
    billingEmail: 'buyer@example.com',
    subscriptionStatus: 'trialing',
    refreshAfterSeconds: 86400,
    offlineGraceDays: 7,
    nextRefreshAt: '2026-04-07T19:43:00.000Z',
    offlineGraceUntil: '2026-04-13T19:43:00.000Z',
    currentPeriodEndsAt: '2026-04-18T18:40:00.000Z',
    trialEndsAt: '2026-04-18T18:40:00.000Z',
    lastValidatedAt: '2026-04-06T19:43:00.000Z',
    lastRefreshAttemptAt: '2026-04-06T19:43:00.000Z',
    lastErrorCode: null,
    lastErrorMessage: null,
    disabledReason: null,
    supportLogPath: join(TEST_DIR, 'logs', 'license-runtime.log'),
    endpointBaseUrl: 'https://rentflowapp.eu',
    ...overrides,
  }
}

function makeUpdateState(): AutoUpdateState {
  return {
    enabled: false,
    status: 'disabled',
    currentVersion: '0.1.1',
    availableVersion: null,
    releaseName: null,
    releaseDate: null,
    releaseNotes: [],
    downloadPercent: null,
    lastCheckedAt: null,
    lastError: null,
    feedUrl: null,
    channel: null,
    disabledReason: 'not-configured',
  }
}

function makeAppRuntimeState() {
  return {
    version: 1 as const,
    currentRun: {
      startedAt: '2026-04-06T18:00:00.000Z',
      pid: 9012,
    },
    lastExit: {
      wasClean: false,
      at: '2026-04-06T17:55:00.000Z',
      reason: 'main-uncaughtException',
    },
    lastAbnormalExit: {
      detectedAt: '2026-04-06T18:00:00.000Z',
      previousStartedAt: '2026-04-06T17:45:00.000Z',
      previousPid: 8877,
    },
    lastFatalError: {
      at: '2026-04-06T17:54:59.000Z',
      severity: 'error' as const,
      source: 'renderer' as const,
      kind: 'render-process-gone',
      message: 'Renderer process exited unexpectedly (crashed).',
      stackPreview: [],
      details: {
        reason: 'crashed',
        exitCode: 139,
      },
    },
    recentIssues: [
      {
        at: '2026-04-06T17:54:59.000Z',
        severity: 'error' as const,
        source: 'renderer' as const,
        kind: 'render-process-gone',
        message: 'Renderer process exited unexpectedly (crashed).',
        stackPreview: [],
        details: {
          reason: 'crashed',
          exitCode: 139,
        },
      },
    ],
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-04-06T18:15:04.000Z'))
  mkdirSync(TEST_DIR, { recursive: true })
  mockShowSaveDialog.mockReset()
  mockOpenPath.mockReset()
  mockOpenPath.mockResolvedValue('')
  mockGetBackupSettings.mockReset()
  mockGetCurrentAccountStorageDir.mockReset()
  mockGetProfile.mockReset()
  mockHasPassword.mockReset()
  mockGetAutoUpdateState.mockReset()
  mockGetAppRuntimeState.mockReset()
  mockGetLicenseState.mockReset()

  mockGetBackupSettings.mockReturnValue({
    autoEnabled: true,
    intervalHours: 24,
    destinationFolder: 'D:\\Backups',
    maxBackups: 5,
    encryptionPassword: null,
    lastBackupAt: '2026-04-05T18:00:00.000Z',
    lastBackupPath: 'D:\\Backups\\rentflow_auto_2026-04-05.lfbackup',
    lastBackupSizeBytes: 4096,
  } satisfies BackupSettings)
  mockGetCurrentAccountStorageDir.mockReturnValue(join(TEST_DIR, 'accounts', 'acct_1'))
  mockGetProfile.mockReturnValue({ name: 'Alice Martin', email: 'alice@example.com' })
  mockHasPassword.mockReturnValue(true)
  mockGetAutoUpdateState.mockReturnValue(makeUpdateState())
  mockGetAppRuntimeState.mockReturnValue(makeAppRuntimeState())
  mockGetLicenseState.mockReturnValue(makeLicenseState())
})

afterEach(() => {
  vi.useRealTimers()
  rmSync(TEST_DIR, { recursive: true, force: true })
})

describe('diagnostics report', () => {
  it('builds a report with auth, license, backup, update, and log-tail details', () => {
    const logsDir = join(TEST_DIR, 'logs')
    mkdirSync(logsDir, { recursive: true })
    writeFileSync(
      join(logsDir, 'app-runtime.log'),
      '2026-04-06T18:10:00.000Z [ERROR] renderer:render-process-gone Renderer process exited unexpectedly (crashed).\n',
      'utf8',
    )
    writeFileSync(
      join(logsDir, 'license-runtime.log'),
      '2026-04-06T18:14:00.000Z [WARN] refresh failed\n2026-04-06T18:14:49.000Z [INFO] refresh succeeded\n',
      'utf8',
    )

    const report = buildDiagnosticsReport()

    expect(report.generatedAt).toBe('2026-04-06T18:15:04.000Z')
    expect(report.app.version).toBe('0.1.1')
    expect(report.auth.hasPassword).toBe(true)
    expect(report.auth.profileEmail).toBe('alice@example.com')
    expect(report.paths.userData).toBe(TEST_DIR)
    expect(report.paths.currentAccountStorageDir).toContain('acct_1')
    expect(report.paths.appRuntimeLogPath).toBe(join(TEST_DIR, 'logs', 'app-runtime.log'))
    expect(report.paths.appRuntimeStatePath).toBe(join(TEST_DIR, 'app-runtime-state.json'))
    expect(report.license.status).toBe('active')
    expect(report.updates.status).toBe('disabled')
    expect(report.backup?.destinationFolder).toBe('D:\\Backups')
    expect(report.appRuntime.lastFatalError?.kind).toBe('render-process-gone')
    expect(report.logs.appRuntime.exists).toBe(true)
    expect(report.logs.appRuntime.tail).toEqual([
      '2026-04-06T18:10:00.000Z [ERROR] renderer:render-process-gone Renderer process exited unexpectedly (crashed).',
    ])
    expect(report.logs.licenseRuntime.exists).toBe(true)
    expect(report.logs.licenseRuntime.tail).toEqual([
      '2026-04-06T18:14:00.000Z [WARN] refresh failed',
      '2026-04-06T18:14:49.000Z [INFO] refresh succeeded',
    ])
  })

  it('exports a JSON report without leaking a raw license token field', async () => {
    const targetPath = join(TEST_DIR, 'rentflow_diagnostics_2026-04-06T18-15-04.json')
    mockShowSaveDialog.mockResolvedValue({ canceled: false, filePath: targetPath })

    const result = await exportDiagnosticsReport()

    expect(result).toEqual({ saved: true, path: targetPath })
    expect(existsSync(targetPath)).toBe(true)

    const raw = readFileSync(targetPath, 'utf8')
    const parsed = JSON.parse(raw) as {
      generatedAt: string
      license: Record<string, unknown>
    }

    expect(parsed.generatedAt).toBe('2026-04-06T18:15:04.000Z')
    expect(parsed.license.billingEmail).toBe('buyer@example.com')
    expect(parsed.license.licenseToken).toBeUndefined()
    expect(raw.includes('licenseToken')).toBe(false)
  })

  it('creates the logs folder before asking the OS to open it', async () => {
    const logsDir = join(TEST_DIR, 'logs')

    await openLogsFolder()

    expect(existsSync(logsDir)).toBe(true)
    expect(mockOpenPath).toHaveBeenCalledWith(logsDir)
  })
})
