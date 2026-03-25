import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'fs'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const USER_DATA_PATH = app.getPath('userData')
const ACCOUNTS_FILE = join(USER_DATA_PATH, 'accounts.json')
const ACCOUNTS_LOCK_DIR = join(USER_DATA_PATH, 'accounts.lock')
const ACCOUNTS_DIR = join(USER_DATA_PATH, 'accounts')
const LEGACY_AUTH_FILE = join(USER_DATA_PATH, 'auth.json')
const LEGACY_DB_FILE = join(USER_DATA_PATH, 'leasefrance.db')
const LEGACY_ATTACHMENTS_DIR = join(USER_DATA_PATH, 'attachments')
const LOCK_WAIT_MS = 50
const LOCK_TIMEOUT_MS = 15_000
const LOCK_STALE_MS = 60_000

interface LegacyAuthData {
  hash: string
  salt: string
  recoveryHash?: string
  recoverySalt?: string
  name: string
  email: string
  address: string
  city: string
  phone: string
  signatureImage: string
  createdAt: string
}

interface AuthAccount extends LegacyAuthData {
  id: string
  lastUsedAt: string
}

interface AccountsStore {
  version: 1
  lastUsedAccountId: string | null
  rememberedAccountId: string | null
  accounts: AuthAccount[]
}

export interface UserProfile {
  name: string
  email: string
  address: string
  city: string
  phone: string
  signatureImage: string
  createdAt: string
}

let activeAccountId: string | null = null

function ensureUserDataDir(): void {
  mkdirSync(USER_DATA_PATH, { recursive: true })
}

function ensureAccountsDir(): void {
  ensureUserDataDir()
  mkdirSync(ACCOUNTS_DIR, { recursive: true })
}

function sleepSync(ms: number): void {
  const buffer = new SharedArrayBuffer(4)
  const array = new Int32Array(buffer)
  Atomics.wait(array, 0, 0, ms)
}

function isLockStale(): boolean {
  try {
    return Date.now() - statSync(ACCOUNTS_LOCK_DIR).mtimeMs > LOCK_STALE_MS
  } catch {
    return false
  }
}

function acquireStoreLock(): () => void {
  ensureUserDataDir()
  const deadline = Date.now() + LOCK_TIMEOUT_MS

  while (true) {
    try {
      mkdirSync(ACCOUNTS_LOCK_DIR)
      return () => {
        rmSync(ACCOUNTS_LOCK_DIR, { recursive: true, force: true })
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'EEXIST') throw error

      if (isLockStale()) {
        rmSync(ACCOUNTS_LOCK_DIR, { recursive: true, force: true })
        continue
      }

      if (Date.now() >= deadline) {
        throw new Error("Impossible d'acquerir le verrou d'ecriture des comptes.")
      }

      sleepSync(LOCK_WAIT_MS)
    }
  }
}

function withStoreWriteLock<T>(operation: () => T): T {
  const release = acquireStoreLock()
  try {
    return operation()
  } finally {
    release()
  }
}

function defaultStore(): AccountsStore {
  return {
    version: 1,
    lastUsedAccountId: null,
    rememberedAccountId: null,
    accounts: [],
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function hashPassword(password: string, salt: string): Buffer {
  return scryptSync(password, salt, 64)
}

function verifyHash(value: string, salt: string, storedHex: string): boolean {
  const candidate = hashPassword(value, salt)
  const stored = Buffer.from(storedHex, 'hex')
  if (candidate.length !== stored.length) return false
  return timingSafeEqual(candidate, stored)
}

function accountProfile(account: AuthAccount): UserProfile {
  return {
    name: account.name,
    email: account.email,
    address: account.address ?? '',
    city: account.city ?? '',
    phone: account.phone ?? '',
    signatureImage: account.signatureImage ?? '',
    createdAt: account.createdAt,
  }
}

function generateAccountId(): string {
  return randomBytes(8).toString('hex')
}

function accountStorageDir(accountId: string): string {
  ensureAccountsDir()
  return join(ACCOUNTS_DIR, accountId)
}

function moveIfExists(srcPath: string, destPath: string): void {
  if (!existsSync(srcPath) || existsSync(destPath)) return
  renameSync(srcPath, destPath)
}

function migrateLegacyStorage(accountId: string): void {
  const targetDir = accountStorageDir(accountId)
  mkdirSync(targetDir, { recursive: true })

  moveIfExists(LEGACY_DB_FILE, join(targetDir, 'leasefrance.db'))
  moveIfExists(`${LEGACY_DB_FILE}-wal`, join(targetDir, 'leasefrance.db-wal'))
  moveIfExists(`${LEGACY_DB_FILE}-shm`, join(targetDir, 'leasefrance.db-shm'))
  moveIfExists(LEGACY_ATTACHMENTS_DIR, join(targetDir, 'attachments'))
}

function saveStore(store: AccountsStore): void {
  ensureUserDataDir()
  const tempFile = `${ACCOUNTS_FILE}.${process.pid}.${Date.now()}.tmp`
  try {
    writeFileSync(tempFile, JSON.stringify(store), 'utf-8')
    renameSync(tempFile, ACCOUNTS_FILE)
  } finally {
    if (existsSync(tempFile)) {
      rmSync(tempFile, { force: true })
    }
  }
}

function migrateLegacyAuthIfNeededLocked(): void {
  if (existsSync(ACCOUNTS_FILE) || !existsSync(LEGACY_AUTH_FILE)) return

  const legacy = JSON.parse(readFileSync(LEGACY_AUTH_FILE, 'utf-8')) as LegacyAuthData
  const id = generateAccountId()
  const now = new Date().toISOString()

  const store: AccountsStore = {
    version: 1,
    lastUsedAccountId: id,
    rememberedAccountId: null,
    accounts: [{
      id,
      hash: legacy.hash,
      salt: legacy.salt,
      recoveryHash: legacy.recoveryHash ?? '',
      recoverySalt: legacy.recoverySalt ?? '',
      name: legacy.name.trim(),
      email: normalizeEmail(legacy.email),
      address: legacy.address ?? '',
      city: legacy.city ?? '',
      phone: legacy.phone ?? '',
      signatureImage: legacy.signatureImage ?? '',
      createdAt: legacy.createdAt ?? now,
      lastUsedAt: now,
    }],
  }

  saveStore(store)
  migrateLegacyStorage(id)
  rmSync(LEGACY_AUTH_FILE, { force: true })
}

function migrateLegacyAuthIfNeeded(): void {
  if (existsSync(ACCOUNTS_FILE) || !existsSync(LEGACY_AUTH_FILE)) return
  withStoreWriteLock(() => {
    migrateLegacyAuthIfNeededLocked()
  })
}

function loadStore(): AccountsStore {
  migrateLegacyAuthIfNeeded()
  return loadStoreFromDisk()
}

function loadStoreFromDisk(): AccountsStore {
  try {
    if (!existsSync(ACCOUNTS_FILE)) {
      return defaultStore()
    }

    const parsed = JSON.parse(readFileSync(ACCOUNTS_FILE, 'utf-8')) as Partial<AccountsStore>
    if (!Array.isArray(parsed.accounts)) {
      return defaultStore()
    }

    return {
      version: 1,
      lastUsedAccountId: typeof parsed.lastUsedAccountId === 'string' ? parsed.lastUsedAccountId : null,
      rememberedAccountId: typeof parsed.rememberedAccountId === 'string' ? parsed.rememberedAccountId : null,
      accounts: parsed.accounts
        .filter((account): account is AuthAccount => {
          return Boolean(
            account
            && typeof account.id === 'string'
            && typeof account.hash === 'string'
            && typeof account.salt === 'string'
            && typeof account.name === 'string'
            && typeof account.email === 'string'
            && typeof account.createdAt === 'string',
          )
        })
        .map((account) => ({
          ...account,
          email: normalizeEmail(account.email),
          recoveryHash: account.recoveryHash ?? '',
          recoverySalt: account.recoverySalt ?? '',
          address: account.address ?? '',
          city: account.city ?? '',
          phone: account.phone ?? '',
          signatureImage: account.signatureImage ?? '',
          lastUsedAt: account.lastUsedAt ?? account.createdAt,
        })),
    }
  } catch {
    return defaultStore()
  }
}

function withLockedStore<T>(operation: (store: AccountsStore) => T): T {
  return withStoreWriteLock(() => {
    migrateLegacyAuthIfNeededLocked()
    return operation(loadStoreFromDisk())
  })
}

function getActiveAccount(store: AccountsStore): AuthAccount | null {
  if (!activeAccountId) return null
  return store.accounts.find((account) => account.id === activeAccountId) ?? null
}

function getLastUsedOrFirstAccount(store: AccountsStore): AuthAccount | null {
  if (store.lastUsedAccountId) {
    const lastUsed = store.accounts.find((account) => account.id === store.lastUsedAccountId)
    if (lastUsed) return lastUsed
  }

  return store.accounts[0] ?? null
}

function getRememberedAccount(store: AccountsStore): AuthAccount | null {
  if (!store.rememberedAccountId) return null
  return store.accounts.find((account) => account.id === store.rememberedAccountId) ?? null
}

function requireCurrentAccount(store: AccountsStore): AuthAccount {
  const account = getActiveAccount(store)
  if (!account) {
    throw new Error('Aucun compte local authentifie dans ce processus.')
  }
  return account
}

function markAccountAsCurrent(store: AccountsStore, accountId: string, rememberSession = false): AuthAccount | null {
  const account = store.accounts.find((entry) => entry.id === accountId)
  if (!account) return null
  account.lastUsedAt = new Date().toISOString()
  store.lastUsedAccountId = accountId
  store.rememberedAccountId = rememberSession ? accountId : null
  activeAccountId = accountId
  saveStore(store)
  return account
}

function findAccountByEmail(store: AccountsStore, email: string): AuthAccount | undefined {
  const normalizedEmail = normalizeEmail(email)
  return store.accounts.find((account) => account.email === normalizedEmail)
}

function findAccountByRecoveryKey(store: AccountsStore, key: string): AuthAccount | undefined {
  const normalizedKey = normalizeRecoveryKey(key)
  return store.accounts.find((account) => {
    if (!account.recoveryHash || !account.recoverySalt) return false
    return verifyHash(normalizedKey, account.recoverySalt, account.recoveryHash)
  })
}

export function getAccountDbPathById(accountId: string): string {
  const dir = accountStorageDir(accountId)
  mkdirSync(dir, { recursive: true })
  return join(dir, 'leasefrance.db')
}

export function getCurrentAccountStorageDir(): string {
  const account = requireCurrentAccount(loadStore())
  const dir = accountStorageDir(account.id)
  mkdirSync(dir, { recursive: true })
  return dir
}

export function getCurrentAccountDbPath(): string {
  const account = requireCurrentAccount(loadStore())
  return getAccountDbPathById(account.id)
}

export function clearActiveAccount(): void {
  activeAccountId = null
}

export function lockCurrentSession(): void {
  activeAccountId = null
  withLockedStore((store) => {
    if (!store.rememberedAccountId) return
    store.rememberedAccountId = null
    saveStore(store)
  })
}

// Generate a human-readable recovery key: XXXX-XXXX-XXXX-XXXX-XXXX
// Uses an unambiguous alphabet (no 0/O, 1/I/L)
const RECOVERY_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function generateRecoveryKey(): string {
  const bytes = randomBytes(20)
  const chars: string[] = []
  for (let i = 0; i < 20; i++) {
    chars.push(RECOVERY_ALPHABET[bytes[i] % RECOVERY_ALPHABET.length])
  }
  return [
    chars.slice(0, 4).join(''),
    chars.slice(4, 8).join(''),
    chars.slice(8, 12).join(''),
    chars.slice(12, 16).join(''),
    chars.slice(16, 20).join(''),
  ].join('-')
}

function normalizeRecoveryKey(key: string): string {
  return key.replace(/[\s-]/g, '').toUpperCase()
}

export function hasPassword(): boolean {
  return loadStore().accounts.length > 0
}

export function getProfile(): UserProfile | null {
  const store = loadStore()
  const account = getActiveAccount(store) ?? getLastUsedOrFirstAccount(store)
  return account ? accountProfile(account) : null
}

export function restoreRememberedSession(): UserProfile | null {
  const store = loadStore()
  const account = getRememberedAccount(store)
  if (account) {
    activeAccountId = account.id
    return accountProfile(account)
  }

  if (store.rememberedAccountId) {
    withLockedStore((lockedStore) => {
      if (!getRememberedAccount(lockedStore) && lockedStore.rememberedAccountId) {
        lockedStore.rememberedAccountId = null
        saveStore(lockedStore)
      }
    })
  }

  return null
}

export function hasRecoveryKey(): boolean {
  const store = loadStore()
  const account = getActiveAccount(store) ?? getLastUsedOrFirstAccount(store)
  return Boolean(account?.recoveryHash && account?.recoverySalt)
}

export function setupPassword(password: string, name: string, email: string): string | null {
  const normalizedEmail = normalizeEmail(email)
  const result = withLockedStore((store) => {
    if (store.accounts.some((account) => account.email === normalizedEmail)) {
      return null
    }

    const salt = randomBytes(32).toString('hex')
    const hash = hashPassword(password, salt).toString('hex')
    const recoveryKey = generateRecoveryKey()
    const recoverySalt = randomBytes(32).toString('hex')
    const recoveryHash = hashPassword(normalizeRecoveryKey(recoveryKey), recoverySalt).toString('hex')
    const now = new Date().toISOString()
    const id = generateAccountId()

    store.accounts.push({
      id,
      hash,
      salt,
      recoveryHash,
      recoverySalt,
      name: name.trim(),
      email: normalizedEmail,
      address: '',
      city: '',
      phone: '',
      signatureImage: '',
      createdAt: now,
      lastUsedAt: now,
    })

    store.lastUsedAccountId = id
    store.rememberedAccountId = null
    activeAccountId = id
    saveStore(store)
    return { id, recoveryKey }
  })

  if (!result) return null
  mkdirSync(accountStorageDir(result.id), { recursive: true })
  return result.recoveryKey
}

export function verifyPassword(email: string, password: string, rememberSession = false): boolean {
  return withLockedStore((store) => {
    const account = findAccountByEmail(store, email)
    if (!account) return false

    const ok = verifyHash(password, account.salt, account.hash)
    if (!ok) return false

    markAccountAsCurrent(store, account.id, rememberSession)
    return true
  })
}

export function changePassword(oldPassword: string, newPassword: string): boolean {
  return withLockedStore((store) => {
    const account = requireCurrentAccount(store)
    if (!verifyHash(oldPassword, account.salt, account.hash)) return false

    const salt = randomBytes(32).toString('hex')
    account.hash = hashPassword(newPassword, salt).toString('hex')
    account.salt = salt
    saveStore(store)
    return true
  })
}

export function verifyRecoveryKey(key: string): boolean {
  return withLockedStore((store) => {
    const account = findAccountByRecoveryKey(store, key)
    if (!account) return false

    markAccountAsCurrent(store, account.id)
    return true
  })
}

export function resetWithRecoveryKey(key: string, newPassword: string): string | null {
  return withLockedStore((store) => {
    const account = findAccountByRecoveryKey(store, key)
    if (!account) return null

    const salt = randomBytes(32).toString('hex')
    account.hash = hashPassword(newPassword, salt).toString('hex')
    account.salt = salt

    const newRecoveryKey = generateRecoveryKey()
    const recoverySalt = randomBytes(32).toString('hex')
    account.recoveryHash = hashPassword(normalizeRecoveryKey(newRecoveryKey), recoverySalt).toString('hex')
    account.recoverySalt = recoverySalt

    markAccountAsCurrent(store, account.id)
    return newRecoveryKey
  })
}

export function regenerateRecoveryKey(password: string): string | null {
  return withLockedStore((store) => {
    const account = requireCurrentAccount(store)
    if (!verifyHash(password, account.salt, account.hash)) return null

    const recoveryKey = generateRecoveryKey()
    const recoverySalt = randomBytes(32).toString('hex')
    account.recoveryHash = hashPassword(normalizeRecoveryKey(recoveryKey), recoverySalt).toString('hex')
    account.recoverySalt = recoverySalt

    saveStore(store)
    return recoveryKey
  })
}

export function updateProfile(name: string, email: string, address?: string, city?: string, phone?: string, signatureImage?: string): boolean {
  const normalizedEmail = normalizeEmail(email)
  return withLockedStore((store) => {
    const account = requireCurrentAccount(store)
    const duplicate = store.accounts.find((entry) => entry.id !== account.id && entry.email === normalizedEmail)
    if (duplicate) return false

    account.name = name.trim()
    account.email = normalizedEmail
    if (address !== undefined) account.address = address.trim()
    if (city !== undefined) account.city = city.trim()
    if (phone !== undefined) account.phone = phone.trim()
    if (signatureImage !== undefined) account.signatureImage = signatureImage
    saveStore(store)
    return true
  })
}

export function deleteAccount(password: string): boolean {
  const accountId = withLockedStore((store) => {
    const account = requireCurrentAccount(store)
    if (!verifyHash(password, account.salt, account.hash)) return null

    const remaining = store.accounts.filter((entry) => entry.id !== account.id)
    store.accounts = remaining
    store.lastUsedAccountId = remaining[0]?.id ?? null
    store.rememberedAccountId = null
    activeAccountId = store.lastUsedAccountId
    saveStore(store)
    return account.id
  })

  if (!accountId) return false
  rmSync(accountStorageDir(accountId), { recursive: true, force: true })
  return true
}

export function exportCurrentAccountAuth(): string {
  const account = requireCurrentAccount(loadStore())
  return JSON.stringify(account)
}

export function importAccountFromBackup(payload: string): { accountId: string } {
  let raw: Partial<AuthAccount>
  try {
    raw = JSON.parse(payload) as Partial<AuthAccount>
  } catch {
    throw new Error("Le profil d'authentification inclus dans la sauvegarde est invalide.")
  }

  const requiredFields = ['hash', 'salt', 'name', 'email'] as const
  for (const field of requiredFields) {
    if (typeof raw[field] !== 'string' || !raw[field]) {
      throw new Error("Le profil d'authentification inclus dans la sauvegarde est incomplet.")
    }
  }

  const accountId = withLockedStore((store) => {
    const normalizedEmail = normalizeEmail(raw.email!)
    const existing = store.accounts.find((account) => account.email === normalizedEmail)
    const reusableId = typeof raw.id === 'string' && !store.accounts.some((account) => account.id === raw.id)
      ? raw.id
      : null
    const accountId = existing?.id ?? reusableId ?? generateAccountId()
    const now = new Date().toISOString()

    const imported: AuthAccount = {
      id: accountId,
      hash: raw.hash!,
      salt: raw.salt!,
      recoveryHash: typeof raw.recoveryHash === 'string' ? raw.recoveryHash : '',
      recoverySalt: typeof raw.recoverySalt === 'string' ? raw.recoverySalt : '',
      name: raw.name!.trim(),
      email: normalizedEmail,
      address: raw.address ?? '',
      city: raw.city ?? '',
      phone: raw.phone ?? '',
      signatureImage: raw.signatureImage ?? '',
      createdAt: raw.createdAt ?? now,
      lastUsedAt: now,
    }

    store.accounts = store.accounts.filter((account) => account.id !== accountId && account.email !== normalizedEmail)
    store.accounts.push(imported)
    store.lastUsedAccountId = accountId
    store.rememberedAccountId = null
    activeAccountId = accountId
    saveStore(store)
    return accountId
  })

  mkdirSync(accountStorageDir(accountId), { recursive: true })
  return { accountId }
}
