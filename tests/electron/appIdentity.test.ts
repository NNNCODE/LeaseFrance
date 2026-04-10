import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

const TEST_DIR = join(tmpdir(), `baillio-app-identity-${randomBytes(4).toString('hex')}`)
const setName = vi.fn()
const setPath = vi.fn()

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'appData') return TEST_DIR
      return TEST_DIR
    },
    setName,
    setPath,
  },
}))

describe('configureUserDataPath', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true })
    setName.mockClear()
    setPath.mockClear()
  })

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  it('migrates legacy lease-france data into the Baillio userData directory', async () => {
    const legacyDir = join(TEST_DIR, 'lease-france')
    mkdirSync(legacyDir, { recursive: true })
    writeFileSync(join(legacyDir, 'accounts.json'), JSON.stringify({
      accounts: [{ id: 'acc-1', email: 'user@example.com' }],
    }), 'utf-8')

    vi.resetModules()
    const { configureUserDataPath } = await import('../../electron/appIdentity')

    const userDataPath = configureUserDataPath()

    expect(userDataPath).toBe(join(TEST_DIR, 'Baillio'))
    expect(existsSync(join(TEST_DIR, 'Baillio', 'accounts.json'))).toBe(true)
    expect(readFileSync(join(TEST_DIR, 'Baillio', 'accounts.json'), 'utf-8')).toContain('user@example.com')
    expect(existsSync(legacyDir)).toBe(false)
    expect(setName).toHaveBeenCalledWith('Baillio')
    expect(setPath).toHaveBeenCalledWith('userData', join(TEST_DIR, 'Baillio'))
  })
})
