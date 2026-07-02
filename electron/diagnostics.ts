import { app, dialog, shell } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getBackupSettings } from './backupManager'
import { getCurrentAccountStorageDir, getProfile, hasPassword } from './auth'
import { getAutoUpdateState } from './autoUpdate'
import { getAppRuntimeLogPath, getAppRuntimeState, getAppRuntimeStatePath } from './appRuntime'
import { getLicenseState } from './license'

type DiagnosticsBackupSettings = Omit<BackupSettings, 'encryptionPassword'> & {
  encryptionPasswordConfigured: boolean
}

interface DiagnosticsReport {
  generatedAt: string
  app: {
    version: string
    isPackaged: boolean
    platform: NodeJS.Platform
    arch: string
    electron: string
    chrome: string
    node: string
  }
  paths: {
    userData: string
    logsDir: string
    appRuntimeLogPath: string
    appRuntimeStatePath: string
    licenseLogPath: string
    currentAccountStorageDir: string | null
  }
  auth: {
    hasPassword: boolean
    profileEmail: string | null
    profileName: string | null
  }
  license: LicenseState
  updates: AutoUpdateState
  backup: DiagnosticsBackupSettings | null
  appRuntime: ReturnType<typeof getAppRuntimeState>
  logs: {
    appRuntime: {
      exists: boolean
      tail: string[]
    }
    licenseRuntime: {
      exists: boolean
      tail: string[]
    }
  }
}

function getLogsDir(): string {
  return join(app.getPath('userData'), 'logs')
}

function getLicenseLogPath(): string {
  return join(getLogsDir(), 'license-runtime.log')
}

function readLogTail(filePath: string, maxLines = 200): string[] {
  if (!existsSync(filePath)) return []
  const lines = readFileSync(filePath, 'utf8')
    .split(/\r?\n/g)
    .filter((line) => line.length > 0)
  return lines.slice(-maxLines)
}

function getCurrentAccountStorageDirSafe(): string | null {
  try {
    return getCurrentAccountStorageDir()
  } catch {
    return null
  }
}

function getBackupSettingsSafe(): BackupSettings | null {
  try {
    return getBackupSettings()
  } catch {
    return null
  }
}

function redactBackupSettings(settings: BackupSettings | null): DiagnosticsBackupSettings | null {
  if (!settings) return null
  const { encryptionPassword, ...safeSettings } = settings
  return {
    ...safeSettings,
    encryptionPasswordConfigured: Boolean(encryptionPassword),
  }
}

export function buildDiagnosticsReport(): DiagnosticsReport {
  const logsDir = getLogsDir()
  const appRuntimeLogPath = getAppRuntimeLogPath()
  const appRuntimeStatePath = getAppRuntimeStatePath()
  const licenseLogPath = getLicenseLogPath()
  const profile = getProfile()

  return {
    generatedAt: new Date().toISOString(),
    app: {
      version: app.getVersion(),
      isPackaged: app.isPackaged,
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
    },
    paths: {
      userData: app.getPath('userData'),
      logsDir,
      appRuntimeLogPath,
      appRuntimeStatePath,
      licenseLogPath,
      currentAccountStorageDir: getCurrentAccountStorageDirSafe(),
    },
    auth: {
      hasPassword: hasPassword(),
      profileEmail: profile?.email ?? null,
      profileName: profile?.name ?? null,
    },
    license: getLicenseState(),
    updates: getAutoUpdateState(),
    backup: redactBackupSettings(getBackupSettingsSafe()),
    appRuntime: getAppRuntimeState(),
    logs: {
      appRuntime: {
        exists: existsSync(appRuntimeLogPath),
        tail: readLogTail(appRuntimeLogPath),
      },
      licenseRuntime: {
        exists: existsSync(licenseLogPath),
        tail: readLogTail(licenseLogPath),
      },
    },
  }
}

export async function exportDiagnosticsReport(): Promise<{ saved: boolean; path: string | null }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Exporter le diagnostic',
    defaultPath: `baillio_diagnostics_${timestamp}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })

  if (canceled || !filePath) return { saved: false, path: null }

  const report = buildDiagnosticsReport()
  writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return { saved: true, path: filePath }
}

export async function openLogsFolder(): Promise<void> {
  const logsDir = getLogsDir()
  mkdirSync(logsDir, { recursive: true })
  await shell.openPath(logsDir)
}
