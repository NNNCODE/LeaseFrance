import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

// Create a unique temp dir for each test run
const TEST_DIR = join(tmpdir(), `leasefrance-auth-test-${randomBytes(4).toString('hex')}`)

// Mock electron before importing auth module
vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData') return TEST_DIR
      return TEST_DIR
    },
  },
}))

// Dynamic import after mock is set up
let auth: typeof import('../../electron/auth')

beforeEach(async () => {
  mkdirSync(TEST_DIR, { recursive: true })
  // Re-import to get fresh module state
  vi.resetModules()
  auth = await import('../../electron/auth')
})

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
})

// ── Account Setup ────────────────────────────────────────────────────────────

describe('setupPassword', () => {
  it('creates a new account and returns a recovery key', () => {
    const recoveryKey = auth.setupPassword('secret123', 'Alice', 'alice@example.com')
    expect(recoveryKey).toBeTruthy()
    expect(recoveryKey).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  })

  it('marks hasPassword as true after setup', () => {
    auth.setupPassword('pass', 'Bob', 'bob@example.com')
    expect(auth.hasPassword()).toBe(true)
  })

  it('returns profile after setup', () => {
    auth.setupPassword('pass', 'Charlie', 'charlie@example.com')
    const profile = auth.getProfile()
    expect(profile).not.toBeNull()
    expect(profile!.name).toBe('Charlie')
    expect(profile!.email).toBe('charlie@example.com')
  })

  it('rejects duplicate email', () => {
    auth.setupPassword('pass1', 'User1', 'same@email.com')
    auth.clearActiveAccount()
    const result = auth.setupPassword('pass2', 'User2', 'same@email.com')
    expect(result).toBeNull()
  })

  it('normalizes email case', () => {
    auth.setupPassword('pass', 'User', 'Test@Email.COM')
    const profile = auth.getProfile()
    expect(profile!.email).toBe('test@email.com')
  })

  it('creates the account storage directory', () => {
    auth.setupPassword('pass', 'User', 'user@test.com')
    const accountsDir = join(TEST_DIR, 'accounts')
    expect(existsSync(accountsDir)).toBe(true)
  })
})

// ── Password Verification ────────────────────────────────────────────────────

describe('verifyPassword', () => {
  it('returns true for correct password', () => {
    auth.setupPassword('correct-horse', 'User', 'user@test.com')
    auth.clearActiveAccount()
    expect(auth.verifyPassword('user@test.com', 'correct-horse')).toBe(true)
  })

  it('returns false for wrong password', () => {
    auth.setupPassword('correct', 'User', 'user@test.com')
    auth.clearActiveAccount()
    expect(auth.verifyPassword('user@test.com', 'wrong')).toBe(false)
  })

  it('returns false for non-existent email', () => {
    auth.setupPassword('pass', 'User', 'exists@test.com')
    auth.clearActiveAccount()
    expect(auth.verifyPassword('nope@test.com', 'pass')).toBe(false)
  })

  it('is case-insensitive on email', () => {
    auth.setupPassword('pass', 'User', 'user@test.com')
    auth.clearActiveAccount()
    expect(auth.verifyPassword('USER@TEST.COM', 'pass')).toBe(true)
  })
})

// ── Password Change ──────────────────────────────────────────────────────────

describe('changePassword', () => {
  it('changes password successfully', () => {
    auth.setupPassword('old-pass', 'User', 'user@test.com')
    expect(auth.changePassword('old-pass', 'new-pass')).toBe(true)
    // Verify new password works
    auth.clearActiveAccount()
    expect(auth.verifyPassword('user@test.com', 'new-pass')).toBe(true)
  })

  it('rejects wrong old password', () => {
    auth.setupPassword('real-pass', 'User', 'user@test.com')
    expect(auth.changePassword('wrong', 'new-pass')).toBe(false)
  })

  it('old password no longer works after change', () => {
    auth.setupPassword('pass-a', 'User', 'user@test.com')
    auth.changePassword('pass-a', 'pass-b')
    auth.clearActiveAccount()
    expect(auth.verifyPassword('user@test.com', 'pass-a')).toBe(false)
    expect(auth.verifyPassword('user@test.com', 'pass-b')).toBe(true)
  })
})

// ── Recovery Key ─────────────────────────────────────────────────────────────

describe('recovery key flow', () => {
  it('hasRecoveryKey returns true after setup', () => {
    auth.setupPassword('pass', 'User', 'user@test.com')
    expect(auth.hasRecoveryKey()).toBe(true)
  })

  it('verifyRecoveryKey accepts the original key', () => {
    const key = auth.setupPassword('pass', 'User', 'user@test.com')!
    auth.clearActiveAccount()
    expect(auth.verifyRecoveryKey(key)).toBe(true)
  })

  it('verifyRecoveryKey rejects an invalid key', () => {
    auth.setupPassword('pass', 'User', 'user@test.com')
    auth.clearActiveAccount()
    expect(auth.verifyRecoveryKey('XXXX-XXXX-XXXX-XXXX-XXXX')).toBe(false)
  })

  it('resetWithRecoveryKey changes the password and returns new key', () => {
    const originalKey = auth.setupPassword('pass', 'User', 'user@test.com')!
    auth.clearActiveAccount()

    const newKey = auth.resetWithRecoveryKey(originalKey, 'new-pass')
    expect(newKey).toBeTruthy()
    expect(newKey).not.toBe(originalKey)

    // New password works
    auth.clearActiveAccount()
    expect(auth.verifyPassword('user@test.com', 'new-pass')).toBe(true)

    // Old password does not
    auth.clearActiveAccount()
    expect(auth.verifyPassword('user@test.com', 'pass')).toBe(false)
  })

  it('regenerateRecoveryKey produces a new key', () => {
    const originalKey = auth.setupPassword('pass', 'User', 'user@test.com')!
    const newKey = auth.regenerateRecoveryKey('pass')
    expect(newKey).toBeTruthy()

    // New key works
    auth.clearActiveAccount()
    expect(auth.verifyRecoveryKey(newKey!)).toBe(true)

    // Old key does not
    auth.clearActiveAccount()
    expect(auth.verifyRecoveryKey(originalKey)).toBe(false)
  })
})

// ── Profile Updates ──────────────────────────────────────────────────────────

describe('updateProfile', () => {
  it('updates name and email', () => {
    auth.setupPassword('pass', 'Old Name', 'old@test.com')
    expect(auth.updateProfile('New Name', 'new@test.com')).toBe(true)
    const profile = auth.getProfile()
    expect(profile!.name).toBe('New Name')
    expect(profile!.email).toBe('new@test.com')
  })

  it('updates optional fields', () => {
    auth.setupPassword('pass', 'User', 'user@test.com')
    auth.updateProfile('User', 'user@test.com', '12 Rue de Paris', 'Paris', '0612345678')
    const profile = auth.getProfile()
    expect(profile!.address).toBe('12 Rue de Paris')
    expect(profile!.city).toBe('Paris')
    expect(profile!.phone).toBe('0612345678')
  })

  it('rejects update if email conflicts with another account', () => {
    auth.setupPassword('pass1', 'User1', 'user1@test.com')
    auth.clearActiveAccount()
    auth.setupPassword('pass2', 'User2', 'user2@test.com')
    // Now logged in as User2, try to take User1's email
    expect(auth.updateProfile('User2', 'user1@test.com')).toBe(false)
  })
})

// ── Multi-Account ────────────────────────────────────────────────────────────

describe('multi-account', () => {
  it('supports creating multiple accounts', () => {
    auth.setupPassword('pass1', 'Alice', 'alice@test.com')
    auth.clearActiveAccount()
    auth.setupPassword('pass2', 'Bob', 'bob@test.com')
    // Now logged in as Bob
    expect(auth.getProfile()!.name).toBe('Bob')
    // Can switch to Alice
    auth.clearActiveAccount()
    auth.verifyPassword('alice@test.com', 'pass1')
    expect(auth.getProfile()!.name).toBe('Alice')
  })
})

// ── Remember Session ─────────────────────────────────────────────────────────

describe('remember session', () => {
  it('restores remembered session', () => {
    auth.setupPassword('pass', 'User', 'user@test.com')
    auth.clearActiveAccount()
    auth.verifyPassword('user@test.com', 'pass', true) // remember = true
    auth.clearActiveAccount()

    const profile = auth.restoreRememberedSession()
    expect(profile).not.toBeNull()
    expect(profile!.name).toBe('User')
  })

  it('returns null when no session is remembered', () => {
    auth.setupPassword('pass', 'User', 'user@test.com')
    auth.clearActiveAccount()
    auth.verifyPassword('user@test.com', 'pass', false)
    auth.clearActiveAccount()

    expect(auth.restoreRememberedSession()).toBeNull()
  })

  it('lockCurrentSession clears remembered session', () => {
    auth.setupPassword('pass', 'User', 'user@test.com')
    auth.clearActiveAccount()
    auth.verifyPassword('user@test.com', 'pass', true)
    auth.lockCurrentSession()

    expect(auth.restoreRememberedSession()).toBeNull()
  })
})

// ── Delete Account ───────────────────────────────────────────────────────────

describe('deleteAccount', () => {
  it('deletes account with correct password', () => {
    auth.setupPassword('pass', 'User', 'user@test.com')
    expect(auth.deleteAccount('pass')).toBe(true)
    expect(auth.hasPassword()).toBe(false)
  })

  it('rejects deletion with wrong password', () => {
    auth.setupPassword('pass', 'User', 'user@test.com')
    expect(auth.deleteAccount('wrong')).toBe(false)
    expect(auth.hasPassword()).toBe(true)
  })
})

// ── Export / Import ──────────────────────────────────────────────────────────

describe('export and import', () => {
  it('exports current account auth data', () => {
    auth.setupPassword('pass', 'User', 'user@test.com')
    const exported = auth.exportCurrentAccountAuth()
    const data = JSON.parse(exported)
    expect(data.name).toBe('User')
    expect(data.email).toBe('user@test.com')
    expect(data.hash).toBeTruthy()
    expect(data.salt).toBeTruthy()
  })

  it('imports account from backup payload', () => {
    auth.setupPassword('pass', 'Original', 'original@test.com')
    const exported = auth.exportCurrentAccountAuth()

    // Clear and reimport
    auth.deleteAccount('pass')
    expect(auth.hasPassword()).toBe(false)

    const result = auth.importAccountFromBackup(exported)
    expect(result.accountId).toBeTruthy()
    expect(auth.hasPassword()).toBe(true)

    // Can log in with original password
    auth.clearActiveAccount()
    expect(auth.verifyPassword('original@test.com', 'pass')).toBe(true)
  })

  it('throws on invalid import payload', () => {
    auth.setupPassword('pass', 'User', 'user@test.com')
    expect(() => auth.importAccountFromBackup('not json')).toThrow()
  })

  it('throws on incomplete import payload', () => {
    auth.setupPassword('pass', 'User', 'user@test.com')
    expect(() => auth.importAccountFromBackup('{"name": "X"}')).toThrow()
  })
})

// ── Legacy Migration ─────────────────────────────────────────────────────────

describe('legacy auth migration', () => {
  it('migrates legacy auth.json to multi-account store', async () => {
    // Clean up any existing accounts file
    const accountsFile = join(TEST_DIR, 'accounts.json')
    if (existsSync(accountsFile)) rmSync(accountsFile)

    // Create a legacy auth.json with known hash/salt
    const { scryptSync } = await import('crypto')
    const salt = randomBytes(32).toString('hex')
    const hash = scryptSync('legacy-pass', salt, 64).toString('hex')

    const legacyData = {
      hash,
      salt,
      name: 'Legacy User',
      email: 'legacy@test.com',
      address: '',
      city: '',
      phone: '',
      signatureImage: '',
      createdAt: '2024-01-01T00:00:00.000Z',
    }

    writeFileSync(join(TEST_DIR, 'auth.json'), JSON.stringify(legacyData))

    // Re-import module to trigger migration
    vi.resetModules()
    const freshAuth = await import('../../electron/auth')

    expect(freshAuth.hasPassword()).toBe(true)
    const profile = freshAuth.getProfile()
    expect(profile!.name).toBe('Legacy User')
    expect(profile!.email).toBe('legacy@test.com')

    // Legacy auth.json should be deleted
    expect(existsSync(join(TEST_DIR, 'auth.json'))).toBe(false)
  })
})
