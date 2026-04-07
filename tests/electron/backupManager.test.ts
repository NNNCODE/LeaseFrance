import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

const TEST_DIR = join(tmpdir(), `rentflow-backup-test-${randomBytes(4).toString('hex')}`)

vi.mock('electron', () => ({
  app: {
    getPath: () => TEST_DIR,
  },
  BrowserWindow: {
    getAllWindows: () => [],
  },
}))

vi.mock('../../electron/auth', () => ({
  getCurrentAccountStorageDir: () => TEST_DIR,
  exportCurrentAccountAuth: () => JSON.stringify({
    hash: 'hash',
    salt: 'salt',
    name: 'Alice Martin',
    email: 'alice@example.com',
  }),
}))

vi.mock('../../electron/db/database', () => ({
  getDb: () => ({
    backup: vi.fn(),
  }),
}))

import {
  BACKUP_EXTENSION,
  isEncryptedBackup,
  parseBackupArchive,
  readRestorePayload,
  serializeArchive,
  verifyBackupFile,
} from '../../electron/backupManager'

function makeSqliteStubBuffer(): Buffer {
  return Buffer.concat([
    Buffer.from('SQLite format 3\0', 'utf8'),
    Buffer.alloc(64, 0),
  ])
}

function makeArchive() {
  return {
    version: 1 as const,
    createdAt: '2026-04-06T18:15:04.000Z',
    dbBase64: makeSqliteStubBuffer().toString('base64'),
    authBase64: Buffer.from(JSON.stringify({
      hash: 'hash',
      salt: 'salt',
      name: 'Alice Martin',
      email: 'alice@example.com',
    }), 'utf8').toString('base64'),
  }
}

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
})

describe('backup archive format', () => {
  it('round-trips an unencrypted archive', () => {
    const archive = makeArchive()
    const serialized = serializeArchive(archive)
    const parsed = parseBackupArchive(serialized)

    expect(isEncryptedBackup(serialized)).toBe(false)
    expect(parsed.dbBuffer.equals(Buffer.from(archive.dbBase64, 'base64'))).toBe(true)
    expect(parsed.authBuffer.equals(Buffer.from(archive.authBase64, 'base64'))).toBe(true)
  })

  it('round-trips an encrypted archive with the correct password', () => {
    const archive = makeArchive()
    const serialized = serializeArchive(archive, 'correct horse battery staple')
    const parsed = parseBackupArchive(serialized, 'correct horse battery staple')

    expect(isEncryptedBackup(serialized)).toBe(true)
    expect(parsed.dbBuffer.equals(Buffer.from(archive.dbBase64, 'base64'))).toBe(true)
    expect(parsed.authBuffer.equals(Buffer.from(archive.authBase64, 'base64'))).toBe(true)
  })

  it('rejects an encrypted archive when the password is wrong', () => {
    const archive = makeArchive()
    const serialized = serializeArchive(archive, 'correct-password')

    expect(() => parseBackupArchive(serialized, 'wrong-password')).toThrow(
      'Mot de passe incorrect ou sauvegarde corrompue.',
    )
  })
})

describe('backup verification and restore payloads', () => {
  it('verifies an encrypted backup file and flags a wrong password', () => {
    const archive = makeArchive()
    const encryptedPath = join(TEST_DIR, `sample${BACKUP_EXTENSION}`)
    writeFileSync(encryptedPath, serializeArchive(archive, 's3cret'), 'utf8')

    const success = verifyBackupFile(encryptedPath, 's3cret')
    const failure = verifyBackupFile(encryptedPath, 'bad-password')

    expect(success.valid).toBe(true)
    expect(success.encrypted).toBe(true)
    expect(failure.valid).toBe(false)
    expect(failure.errors).toContain('Mot de passe incorrect ou sauvegarde corrompue.')
  })

  it('reads a legacy sqlite restore payload when the companion auth file exists', () => {
    const legacyDbPath = join(TEST_DIR, 'legacy.db')
    const authPath = join(TEST_DIR, 'legacy_auth.json')
    const dbBuffer = makeSqliteStubBuffer()
    const authJson = JSON.stringify({
      hash: 'hash',
      salt: 'salt',
      name: 'Alice Martin',
      email: 'alice@example.com',
    })

    writeFileSync(legacyDbPath, dbBuffer)
    writeFileSync(authPath, authJson, 'utf8')

    const payload = readRestorePayload(legacyDbPath)

    expect(payload.dbBuffer.equals(dbBuffer)).toBe(true)
    expect(payload.authBuffer.toString('utf8')).toBe(authJson)
  })

  it('rejects a legacy sqlite restore payload when the companion auth file is missing', () => {
    const legacyDbPath = join(TEST_DIR, 'legacy.db')
    writeFileSync(legacyDbPath, makeSqliteStubBuffer())

    expect(() => readRestorePayload(legacyDbPath)).toThrow(
      'Cette sauvegarde legacy est incomplete : le fichier companion _auth.json est introuvable.',
    )
  })

  it('persists a plain v1 backup file that remains human-inspectable JSON', () => {
    const archive = makeArchive()
    const filePath = join(TEST_DIR, `plain${BACKUP_EXTENSION}`)
    writeFileSync(filePath, serializeArchive(archive), 'utf8')

    const raw = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as { version: number; createdAt: string }

    expect(parsed.version).toBe(1)
    expect(parsed.createdAt).toBe('2026-04-06T18:15:04.000Z')
  })
})
