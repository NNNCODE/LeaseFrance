import { app } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { NsisUpdater, type ProgressInfo, type UpdateDownloadedEvent, type UpdateInfo } from 'electron-updater'
import { resolveAutoUpdateRuntimeConfig } from './updateRuntimeConfig'

const AUTO_UPDATE_CONFIG_FILE = 'auto-update.json'
const STARTUP_CHECK_DELAY_MS = 7_500
const DEV_UPDATES_FLAG = 'RENTFLOW_ENABLE_DEV_UPDATES'
const UPDATE_URL_ENV = 'RENTFLOW_UPDATE_URL'
const UPDATE_CHANNEL_ENV = 'RENTFLOW_UPDATE_CHANNEL'

const updaterLogger = {
  info(message?: unknown) {
    console.info('[auto-update]', message)
  },
  warn(message?: unknown) {
    console.warn('[auto-update]', message)
  },
  error(message?: unknown) {
    console.error('[auto-update]', message)
  },
}

let updater: NsisUpdater | null = null
let onStateChanged: ((state: AutoUpdateState) => void) | null = null
let startupCheckTimer: NodeJS.Timeout | null = null

let state: AutoUpdateState = {
  enabled: false,
  status: 'disabled',
  currentVersion: app.getVersion(),
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

function cloneState(): AutoUpdateState {
  return {
    ...state,
    releaseNotes: [...state.releaseNotes],
  }
}

function publishState(): void {
  onStateChanged?.(cloneState())
}

function setState(next: Partial<AutoUpdateState>): void {
  state = {
    ...state,
    ...next,
  }
  publishState()
}

function isDevelopmentUpdateEnabled(): boolean {
  return process.env[DEV_UPDATES_FLAG] === '1'
}

function readUpdateConfigFile(): string | null {
  const configPath = app.isPackaged
    ? join(process.resourcesPath, AUTO_UPDATE_CONFIG_FILE)
    : join(process.cwd(), 'build', AUTO_UPDATE_CONFIG_FILE)

  if (!existsSync(configPath)) return null
  return readFileSync(configPath, 'utf8')
}

function normalizeReleaseNotes(releaseNotes: UpdateInfo['releaseNotes']): string[] {
  if (!releaseNotes) return []
  if (typeof releaseNotes === 'string') return [releaseNotes]
  return releaseNotes
    .map((entry) => entry.note?.trim() || '')
    .filter((entry) => entry.length > 0)
}

function applyUpdateInfo(info: UpdateInfo): Partial<AutoUpdateState> {
  return {
    availableVersion: info.version,
    releaseName: info.releaseName ?? null,
    releaseDate: info.releaseDate ?? null,
    releaseNotes: normalizeReleaseNotes(info.releaseNotes),
  }
}

function resolveDisabledState(reason: AutoUpdateDisabledReason, lastError: string | null = null): AutoUpdateState {
  return {
    enabled: false,
    status: 'disabled',
    currentVersion: app.getVersion(),
    availableVersion: null,
    releaseName: null,
    releaseDate: null,
    releaseNotes: [],
    downloadPercent: null,
    lastCheckedAt: null,
    lastError,
    feedUrl: null,
    channel: null,
    disabledReason: reason,
  }
}

function resolveRuntimeState(): AutoUpdateState {
  if (process.platform !== 'win32') {
    return resolveDisabledState('unsupported-platform')
  }

  if (!app.isPackaged && !isDevelopmentUpdateEnabled()) {
    return resolveDisabledState('development')
  }

  try {
    const config = resolveAutoUpdateRuntimeConfig({
      envUrl: process.env[UPDATE_URL_ENV] ?? null,
      envChannel: process.env[UPDATE_CHANNEL_ENV] ?? null,
      fileContents: readUpdateConfigFile(),
    })

    if (!config.enabled || !config.url) {
      return resolveDisabledState('not-configured')
    }

    return {
      enabled: true,
      status: 'idle',
      currentVersion: app.getVersion(),
      availableVersion: null,
      releaseName: null,
      releaseDate: null,
      releaseNotes: [],
      downloadPercent: null,
      lastCheckedAt: null,
      lastError: null,
      feedUrl: config.url,
      channel: config.channel,
      disabledReason: null,
    }
  } catch (error) {
    return resolveDisabledState('not-configured', error instanceof Error ? error.message : String(error))
  }
}

function ensureUpdater(): NsisUpdater | null {
  if (!state.enabled || !state.feedUrl) return null
  if (updater) return updater

  updater = new NsisUpdater({
    provider: 'generic',
    url: state.feedUrl,
    channel: state.channel ?? 'latest',
  })
  updater.autoDownload = false
  updater.autoInstallOnAppQuit = false
  updater.logger = updaterLogger

  updater.on('checking-for-update', () => {
    setState({
      status: 'checking',
      lastError: null,
      downloadPercent: null,
    })
  })

  updater.on('update-available', (info) => {
    setState({
      status: 'available',
      lastCheckedAt: new Date().toISOString(),
      lastError: null,
      downloadPercent: null,
      ...applyUpdateInfo(info),
    })
  })

  updater.on('update-not-available', () => {
    setState({
      status: 'up_to_date',
      lastCheckedAt: new Date().toISOString(),
      availableVersion: null,
      releaseName: null,
      releaseDate: null,
      releaseNotes: [],
      lastError: null,
      downloadPercent: null,
    })
  })

  updater.on('download-progress', (info: ProgressInfo) => {
    setState({
      status: 'downloading',
      downloadPercent: Math.max(0, Math.min(100, Math.round(info.percent))),
      lastError: null,
    })
  })

  updater.on('update-downloaded', (info: UpdateDownloadedEvent) => {
    setState({
      status: 'downloaded',
      downloadPercent: 100,
      lastError: null,
      ...applyUpdateInfo(info),
    })
  })

  updater.on('error', (error) => {
    setState({
      status: 'error',
      lastCheckedAt: new Date().toISOString(),
      lastError: error.message,
    })
  })

  return updater
}

function scheduleStartupCheck(): void {
  if (!state.enabled || startupCheckTimer) return
  startupCheckTimer = setTimeout(() => {
    startupCheckTimer = null
    void checkForUpdates().catch(() => {})
  }, STARTUP_CHECK_DELAY_MS)
}

export function initAutoUpdates(listener: (nextState: AutoUpdateState) => void): void {
  onStateChanged = listener
  state = resolveRuntimeState()
  publishState()

  if (!state.enabled) return
  ensureUpdater()
  scheduleStartupCheck()
}

export function getAutoUpdateState(): AutoUpdateState {
  return cloneState()
}

export async function checkForUpdates(): Promise<AutoUpdateState> {
  const activeUpdater = ensureUpdater()
  if (!activeUpdater) return getAutoUpdateState()

  await activeUpdater.checkForUpdates()
  return getAutoUpdateState()
}

export async function downloadUpdate(): Promise<AutoUpdateState> {
  const activeUpdater = ensureUpdater()
  if (!activeUpdater) return getAutoUpdateState()
  if (state.status !== 'available') {
    throw new Error('Aucune mise a jour disponible a telecharger.')
  }

  await activeUpdater.downloadUpdate()
  return getAutoUpdateState()
}

export async function installUpdate(): Promise<AutoUpdateState> {
  const activeUpdater = ensureUpdater()
  if (!activeUpdater) return getAutoUpdateState()
  if (state.status !== 'downloaded') {
    throw new Error('Aucune mise a jour telechargee n est prete a installer.')
  }

  activeUpdater.quitAndInstall(false, true)
  return getAutoUpdateState()
}
