import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

const TEST_DIR = join(tmpdir(), `baillio-app-runtime-test-${randomBytes(4).toString('hex')}`)

vi.mock('electron', () => ({
  app: {
    getPath: () => TEST_DIR,
  },
}))

import {
  getAppRuntimeLogPath,
  getAppRuntimeState,
  getAppRuntimeStatePath,
  initAppRuntimeTracking,
  markAppExitClean,
  markAppExitUnclean,
  normalizeRendererRuntimeEventPayload,
  recordMainUnhandledRejection,
  recordMainUncaughtException,
  recordRendererLoadFailure,
  recordRendererProcessGone,
  recordRendererRuntimeError,
} from '../../electron/appRuntime'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-04-07T10:15:00.000Z'))
  mkdirSync(TEST_DIR, { recursive: true })
})

afterEach(() => {
  vi.useRealTimers()
  rmSync(TEST_DIR, { recursive: true, force: true })
})

describe('app runtime tracking', () => {
  it('tracks the current run and records a clean exit', () => {
    initAppRuntimeTracking()

    const duringRun = getAppRuntimeState()
    expect(duringRun.currentRun?.startedAt).toBe('2026-04-07T10:15:00.000Z')
    expect(duringRun.currentRun?.pid).toBe(process.pid)

    markAppExitClean('before-quit')

    const afterExit = getAppRuntimeState()
    expect(afterExit.currentRun).toBeNull()
    expect(afterExit.lastExit).toEqual({
      wasClean: true,
      at: '2026-04-07T10:15:00.000Z',
      reason: 'before-quit',
    })
    expect(existsSync(getAppRuntimeLogPath())).toBe(true)
  })

  it('detects when the previous run did not exit cleanly', () => {
    writeFileSync(getAppRuntimeStatePath(), JSON.stringify({
      version: 1,
      currentRun: {
        startedAt: '2026-04-06T22:00:00.000Z',
        pid: 4242,
      },
      lastExit: {
        wasClean: true,
        at: '2026-04-06T21:55:00.000Z',
        reason: 'before-quit',
      },
      lastAbnormalExit: null,
      lastFatalError: null,
      recentIssues: [],
    }, null, 2), 'utf8')

    initAppRuntimeTracking()

    const state = getAppRuntimeState()
    expect(state.currentRun?.startedAt).toBe('2026-04-07T10:15:00.000Z')
    expect(state.lastAbnormalExit).toEqual({
      detectedAt: '2026-04-07T10:15:00.000Z',
      previousStartedAt: '2026-04-06T22:00:00.000Z',
      previousPid: 4242,
    })
    expect(state.recentIssues.at(-1)).toMatchObject({
      kind: 'previous-abnormal-exit',
      severity: 'warning',
      source: 'app',
    })
  })

  it('records main and renderer issues in state and log files', () => {
    initAppRuntimeTracking()
    recordMainUnhandledRejection(new Error('license refresh promise leaked'))
    recordMainUncaughtException(new Error('database bootstrap exploded'))
    recordRendererRuntimeError({
      payload: {
        kind: 'error',
        message: 'Cannot read properties of undefined',
        name: 'TypeError',
        stack: 'TypeError: Cannot read properties of undefined\n    at App (src/App.tsx:42:13)',
        source: 'file:///renderer/index.js',
        lineno: 42,
        colno: 13,
      },
      windowId: 1,
      webContentsId: 7,
      url: 'app://renderer/index.html',
    })
    recordRendererProcessGone({
      reason: 'crashed',
      exitCode: 139,
      windowId: 1,
      webContentsId: 7,
      url: 'app://renderer/index.html',
    })
    recordRendererLoadFailure({
      errorCode: -105,
      errorDescription: 'ERR_NAME_NOT_RESOLVED',
      validatedURL: 'app://renderer/index.html',
      windowId: 1,
      webContentsId: 7,
    })
    markAppExitUnclean('main-uncaughtException')

    const state = getAppRuntimeState()
    expect(state.lastFatalError).toMatchObject({
      source: 'renderer',
      kind: 'did-fail-load',
      message: 'ERR_NAME_NOT_RESOLVED',
    })
    expect(state.lastExit).toEqual({
      wasClean: false,
      at: '2026-04-07T10:15:00.000Z',
      reason: 'main-uncaughtException',
    })
    expect(state.recentIssues).toHaveLength(5)

    const logContents = readFileSync(getAppRuntimeLogPath(), 'utf8')
    expect(logContents).toContain('main:unhandledRejection license refresh promise leaked')
    expect(logContents).toContain('renderer:render-process-gone Renderer process exited unexpectedly (crashed).')
    expect(logContents).toContain('renderer:did-fail-load ERR_NAME_NOT_RESOLVED')
  })

  it('normalizes internal renderer payloads before main process logging', () => {
    expect(normalizeRendererRuntimeEventPayload({
      kind: 'unhandledrejection',
      message: 'boom',
      name: 'Error',
      stack: 'Error: boom',
      source: null,
      lineno: null,
      colno: null,
    })).toEqual({
      kind: 'unhandledrejection',
      message: 'boom',
      name: 'Error',
      stack: 'Error: boom',
      source: null,
      lineno: null,
      colno: null,
    })

    expect(normalizeRendererRuntimeEventPayload({ kind: 'warn' })).toBeNull()
  })
})
