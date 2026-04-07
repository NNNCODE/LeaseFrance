import { app } from 'electron'
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'

const APP_RUNTIME_LOG_FILE = 'app-runtime.log'
const APP_RUNTIME_STATE_FILE = 'app-runtime-state.json'
const MAX_RECENT_ISSUES = 10

type AppRuntimeSeverity = 'warning' | 'error'
type AppRuntimeSource = 'app' | 'main' | 'renderer'

interface AppRuntimeRunMarker {
  startedAt: string
  pid: number
}

interface AppRuntimeExitState {
  wasClean: boolean
  at: string | null
  reason: string | null
}

interface AppRuntimeAbnormalExit {
  detectedAt: string
  previousStartedAt: string | null
  previousPid: number | null
}

export interface AppRuntimeIssueSummary {
  at: string
  severity: AppRuntimeSeverity
  source: AppRuntimeSource
  kind: string
  message: string
  stackPreview: string[]
  details: Record<string, string | number | boolean | null>
}

interface AppRuntimeState {
  version: 1
  currentRun: AppRuntimeRunMarker | null
  lastExit: AppRuntimeExitState | null
  lastAbnormalExit: AppRuntimeAbnormalExit | null
  lastFatalError: AppRuntimeIssueSummary | null
  recentIssues: AppRuntimeIssueSummary[]
}

export interface RendererRuntimeEventPayload {
  kind: 'error' | 'unhandledrejection'
  message: string
  name: string | null
  stack: string | null
  source: string | null
  lineno: number | null
  colno: number | null
}

function getLogsDir(): string {
  return join(app.getPath('userData'), 'logs')
}

export function getAppRuntimeLogPath(): string {
  return join(getLogsDir(), APP_RUNTIME_LOG_FILE)
}

export function getAppRuntimeStatePath(): string {
  return join(app.getPath('userData'), APP_RUNTIME_STATE_FILE)
}

function ensureRuntimeDirs(): void {
  mkdirSync(getLogsDir(), { recursive: true })
  mkdirSync(app.getPath('userData'), { recursive: true })
}

function appendRuntimeLog(
  level: 'INFO' | 'WARN' | 'ERROR',
  message: string,
  context?: Record<string, unknown>,
): void {
  try {
    ensureRuntimeDirs()
    const suffix = context ? ` ${JSON.stringify(context)}` : ''
    appendFileSync(getAppRuntimeLogPath(), `[${new Date().toISOString()}] [${level}] ${message}${suffix}\n`, 'utf8')
  } catch {
    // Ignore logger failures because diagnostics must never crash startup.
  }
}

function normalizeRunMarker(value: unknown): AppRuntimeRunMarker | null {
  if (!value || typeof value !== 'object') return null
  const marker = value as Partial<AppRuntimeRunMarker>
  return {
    startedAt: typeof marker.startedAt === 'string' ? marker.startedAt : new Date().toISOString(),
    pid: Number.isInteger(marker.pid) ? Number(marker.pid) : 0,
  }
}

function normalizeExitState(value: unknown): AppRuntimeExitState | null {
  if (!value || typeof value !== 'object') return null
  const exitState = value as Partial<AppRuntimeExitState>
  if (typeof exitState.wasClean !== 'boolean') return null
  return {
    wasClean: exitState.wasClean,
    at: typeof exitState.at === 'string' ? exitState.at : null,
    reason: typeof exitState.reason === 'string' ? exitState.reason : null,
  }
}

function normalizeAbnormalExit(value: unknown): AppRuntimeAbnormalExit | null {
  if (!value || typeof value !== 'object') return null
  const abnormalExit = value as Partial<AppRuntimeAbnormalExit>
  return {
    detectedAt: typeof abnormalExit.detectedAt === 'string' ? abnormalExit.detectedAt : new Date().toISOString(),
    previousStartedAt: typeof abnormalExit.previousStartedAt === 'string' ? abnormalExit.previousStartedAt : null,
    previousPid: Number.isInteger(abnormalExit.previousPid) ? Number(abnormalExit.previousPid) : null,
  }
}

function normalizeIssue(value: unknown): AppRuntimeIssueSummary | null {
  if (!value || typeof value !== 'object') return null
  const issue = value as Partial<AppRuntimeIssueSummary>
  const severity = issue.severity === 'warning' ? 'warning' : issue.severity === 'error' ? 'error' : null
  const source = issue.source === 'app' || issue.source === 'main' || issue.source === 'renderer' ? issue.source : null
  const detailsSource = issue.details && typeof issue.details === 'object' ? issue.details as Record<string, unknown> : {}
  if (!severity || !source || typeof issue.kind !== 'string' || typeof issue.message !== 'string') return null

  const details: Record<string, string | number | boolean | null> = {}
  for (const [key, entry] of Object.entries(detailsSource)) {
    if (
      typeof entry === 'string'
      || typeof entry === 'number'
      || typeof entry === 'boolean'
      || entry === null
    ) {
      details[key] = entry
    }
  }

  return {
    at: typeof issue.at === 'string' ? issue.at : new Date().toISOString(),
    severity,
    source,
    kind: issue.kind,
    message: issue.message,
    stackPreview: Array.isArray(issue.stackPreview)
      ? issue.stackPreview.filter((line): line is string => typeof line === 'string').slice(0, 8)
      : [],
    details,
  }
}

function defaultRuntimeState(): AppRuntimeState {
  return {
    version: 1,
    currentRun: null,
    lastExit: null,
    lastAbnormalExit: null,
    lastFatalError: null,
    recentIssues: [],
  }
}

function readRuntimeState(): AppRuntimeState {
  try {
    if (!existsSync(getAppRuntimeStatePath())) return defaultRuntimeState()
    const raw = JSON.parse(readFileSync(getAppRuntimeStatePath(), 'utf8')) as Partial<AppRuntimeState>
    return {
      version: 1,
      currentRun: normalizeRunMarker(raw.currentRun),
      lastExit: normalizeExitState(raw.lastExit),
      lastAbnormalExit: normalizeAbnormalExit(raw.lastAbnormalExit),
      lastFatalError: normalizeIssue(raw.lastFatalError),
      recentIssues: Array.isArray(raw.recentIssues)
        ? raw.recentIssues
          .map((entry) => normalizeIssue(entry))
          .filter((entry): entry is AppRuntimeIssueSummary => entry !== null)
          .slice(-MAX_RECENT_ISSUES)
        : [],
    }
  } catch (error) {
    appendRuntimeLog('ERROR', 'Failed to parse app runtime state.', {
      error: error instanceof Error ? error.message : String(error),
    })
    return defaultRuntimeState()
  }
}

function writeRuntimeState(nextState: AppRuntimeState): void {
  ensureRuntimeDirs()
  const targetPath = getAppRuntimeStatePath()
  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`
  try {
    writeFileSync(tempPath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8')
    renameSync(tempPath, targetPath)
  } finally {
    if (existsSync(tempPath)) rmSync(tempPath, { force: true })
  }
}

function stackPreviewFromStack(stack: string | null): string[] {
  if (!stack) return []
  return stack
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 8)
}

function normalizeUnknownError(error: unknown): { name: string | null; message: string; stack: string | null } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message || error.name || 'Unknown error',
      stack: typeof error.stack === 'string' ? error.stack : null,
    }
  }

  if (typeof error === 'string') {
    return { name: null, message: error, stack: null }
  }

  try {
    return {
      name: null,
      message: JSON.stringify(error) || String(error),
      stack: null,
    }
  } catch {
    return { name: null, message: String(error), stack: null }
  }
}

function pushIssue(
  currentState: AppRuntimeState,
  issue: AppRuntimeIssueSummary,
  options: { markFatal?: boolean } = {},
): AppRuntimeState {
  const recentIssues = [...currentState.recentIssues, issue].slice(-MAX_RECENT_ISSUES)
  return {
    ...currentState,
    lastFatalError: options.markFatal ? issue : currentState.lastFatalError,
    recentIssues,
  }
}

function recordIssue(
  issue: AppRuntimeIssueSummary,
  logLevel: 'WARN' | 'ERROR',
  logContext?: Record<string, unknown>,
  options: { markFatal?: boolean } = {},
): AppRuntimeIssueSummary {
  const currentState = readRuntimeState()
  const nextState = pushIssue(currentState, issue, options)
  writeRuntimeState(nextState)
  appendRuntimeLog(logLevel, `${issue.source}:${issue.kind} ${issue.message}`, logContext)
  return issue
}

function buildIssue(
  severity: AppRuntimeSeverity,
  source: AppRuntimeSource,
  kind: string,
  message: string,
  stack: string | null,
  details: Record<string, string | number | boolean | null> = {},
): AppRuntimeIssueSummary {
  return {
    at: new Date().toISOString(),
    severity,
    source,
    kind,
    message,
    stackPreview: stackPreviewFromStack(stack),
    details,
  }
}

export function initAppRuntimeTracking(): void {
  const nowIso = new Date().toISOString()
  const currentState = readRuntimeState()
  const nextState: AppRuntimeState = {
    ...currentState,
    currentRun: {
      startedAt: nowIso,
      pid: process.pid,
    },
  }

  if (currentState.currentRun) {
    nextState.lastAbnormalExit = {
      detectedAt: nowIso,
      previousStartedAt: currentState.currentRun.startedAt,
      previousPid: currentState.currentRun.pid || null,
    }

    const abnormalIssue = buildIssue(
      'warning',
      'app',
      'previous-abnormal-exit',
      'Detected a previous run that did not exit cleanly.',
      null,
      {
        previousPid: currentState.currentRun.pid || null,
        previousStartedAt: currentState.currentRun.startedAt,
      },
    )
    const normalizedState = pushIssue(nextState, abnormalIssue)
    writeRuntimeState(normalizedState)
    appendRuntimeLog('WARN', 'Detected a previous run that did not exit cleanly.', {
      previousPid: currentState.currentRun.pid || null,
      previousStartedAt: currentState.currentRun.startedAt,
    })
    return
  }

  writeRuntimeState(nextState)
  appendRuntimeLog('INFO', 'Initialized app runtime tracking.', { pid: process.pid })
}

export function markAppExitClean(reason = 'app-quit'): void {
  const currentState = readRuntimeState()
  writeRuntimeState({
    ...currentState,
    currentRun: null,
    lastExit: {
      wasClean: true,
      at: new Date().toISOString(),
      reason,
    },
  })
  appendRuntimeLog('INFO', 'Marked app exit as clean.', { reason })
}

export function markAppExitUnclean(reason: string): void {
  const currentState = readRuntimeState()
  writeRuntimeState({
    ...currentState,
    currentRun: null,
    lastExit: {
      wasClean: false,
      at: new Date().toISOString(),
      reason,
    },
  })
  appendRuntimeLog('ERROR', 'Marked app exit as unclean.', { reason })
}

export function recordMainUnhandledRejection(reason: unknown): AppRuntimeIssueSummary {
  const normalized = normalizeUnknownError(reason)
  const issue = buildIssue(
    'error',
    'main',
    'unhandledRejection',
    normalized.message,
    normalized.stack,
    {
      name: normalized.name,
    },
  )
  return recordIssue(issue, 'ERROR', {
    name: normalized.name,
    message: normalized.message,
    stack: normalized.stack,
  })
}

export function recordMainUncaughtException(error: unknown): AppRuntimeIssueSummary {
  const normalized = normalizeUnknownError(error)
  const issue = buildIssue(
    'error',
    'main',
    'uncaughtException',
    normalized.message,
    normalized.stack,
    {
      name: normalized.name,
    },
  )
  return recordIssue(issue, 'ERROR', {
    name: normalized.name,
    message: normalized.message,
    stack: normalized.stack,
  }, { markFatal: true })
}

export function recordAppBootstrapFailure(error: unknown): AppRuntimeIssueSummary {
  const normalized = normalizeUnknownError(error)
  const issue = buildIssue(
    'error',
    'app',
    'bootstrap-failure',
    normalized.message,
    normalized.stack,
    {
      name: normalized.name,
    },
  )
  return recordIssue(issue, 'ERROR', {
    name: normalized.name,
    message: normalized.message,
    stack: normalized.stack,
  }, { markFatal: true })
}

export function recordRendererProcessGone(details: {
  reason: string
  exitCode: number
  windowId: number | null
  webContentsId: number
  url: string | null
}): AppRuntimeIssueSummary {
  const issue = buildIssue(
    'error',
    'renderer',
    'render-process-gone',
    `Renderer process exited unexpectedly (${details.reason}).`,
    null,
    {
      reason: details.reason,
      exitCode: details.exitCode,
      windowId: details.windowId,
      webContentsId: details.webContentsId,
      url: details.url,
    },
  )
  return recordIssue(issue, 'ERROR', details, { markFatal: true })
}

export function recordRendererLoadFailure(details: {
  errorCode: number
  errorDescription: string
  validatedURL: string
  windowId: number | null
  webContentsId: number
}): AppRuntimeIssueSummary {
  const issue = buildIssue(
    'error',
    'renderer',
    'did-fail-load',
    details.errorDescription || 'Renderer failed to load the application shell.',
    null,
    {
      errorCode: details.errorCode,
      windowId: details.windowId,
      webContentsId: details.webContentsId,
      validatedURL: details.validatedURL,
    },
  )
  return recordIssue(issue, 'ERROR', details, { markFatal: true })
}

export function recordPreloadError(details: {
  preloadPath: string
  error: unknown
  windowId: number | null
  webContentsId: number
  url: string | null
}): AppRuntimeIssueSummary {
  const normalized = normalizeUnknownError(details.error)
  const issue = buildIssue(
    'error',
    'renderer',
    'preload-error',
    normalized.message,
    normalized.stack,
    {
      name: normalized.name,
      preloadPath: details.preloadPath,
      windowId: details.windowId,
      webContentsId: details.webContentsId,
      url: details.url,
    },
  )
  return recordIssue(issue, 'ERROR', {
    preloadPath: details.preloadPath,
    name: normalized.name,
    message: normalized.message,
    stack: normalized.stack,
    windowId: details.windowId,
    webContentsId: details.webContentsId,
    url: details.url,
  }, { markFatal: true })
}

export function normalizeRendererRuntimeEventPayload(payload: unknown): RendererRuntimeEventPayload | null {
  if (!payload || typeof payload !== 'object') return null
  const raw = payload as Partial<RendererRuntimeEventPayload>
  if ((raw.kind !== 'error' && raw.kind !== 'unhandledrejection') || typeof raw.message !== 'string') return null
  return {
    kind: raw.kind,
    message: raw.message,
    name: typeof raw.name === 'string' ? raw.name : null,
    stack: typeof raw.stack === 'string' ? raw.stack : null,
    source: typeof raw.source === 'string' ? raw.source : null,
    lineno: Number.isFinite(raw.lineno) ? Number(raw.lineno) : null,
    colno: Number.isFinite(raw.colno) ? Number(raw.colno) : null,
  }
}

export function recordRendererRuntimeError(details: {
  payload: RendererRuntimeEventPayload
  windowId: number | null
  webContentsId: number
  url: string | null
}): AppRuntimeIssueSummary {
  const issue = buildIssue(
    'error',
    'renderer',
    details.payload.kind,
    details.payload.message,
    details.payload.stack,
    {
      name: details.payload.name,
      source: details.payload.source,
      lineno: details.payload.lineno,
      colno: details.payload.colno,
      windowId: details.windowId,
      webContentsId: details.webContentsId,
      url: details.url,
    },
  )
  return recordIssue(issue, 'ERROR', {
    name: details.payload.name,
    source: details.payload.source,
    lineno: details.payload.lineno,
    colno: details.payload.colno,
    windowId: details.windowId,
    webContentsId: details.webContentsId,
    url: details.url,
    stack: details.payload.stack,
  })
}

export function getAppRuntimeState(): AppRuntimeState {
  return readRuntimeState()
}
