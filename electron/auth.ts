import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'fs'
import { mkdir as mkdirAsync } from 'fs/promises'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const USER_DATA_PATH = app.getPath('userData')
const ACCOUNTS_FILE = join(USER_DATA_PATH, 'accounts.json')
const ACCOUNTS_LOCK_DIR = join(USER_DATA_PATH, 'accounts.lock')
const ACCOUNTS_DIR = join(USER_DATA_PATH, 'accounts')
const LEGACY_AUTH_FILE = join(USER_DATA_PATH, 'auth.json')
// DB filename kept as 'leasefrance.db' for backward compatibility with existing installs.
// TODO(rebrand): add migration to rename to 'rentflow.db' when safe to break compat.
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
  legalType?: 'personne_physique' | 'personne_morale'
  familySci?: boolean
  updatedAt?: string
}

export interface OwnerProfile extends UserProfile {
  id: string
  legalType: 'personne_physique' | 'personne_morale'
  familySci: boolean
  updatedAt: string
  isPrimary: boolean
}

interface OwnerProfilesStore {
  version: 1
  activeOwnerId: string | null
  profiles: OwnerProfile[]
}

let activeAccountId: string | null = null

function ensureUserDataDir(): void {
  mkdirSync(USER_DATA_PATH, { recursive: true })
}

function ensureAccountsDir(): void {
  ensureUserDataDir()
  mkdirSync(ACCOUNTS_DIR, { recursive: true })
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isLockStale(): boolean {
  try {
    return Date.now() - statSync(ACCOUNTS_LOCK_DIR).mtimeMs > LOCK_STALE_MS
  } catch {
    return false
  }
}

function releaseStoreLock(): void {
  rmSync(ACCOUNTS_LOCK_DIR, { recursive: true, force: true })
}

function tryAcquireStoreLockSync(): (() => void) | null {
  ensureUserDataDir()
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      mkdirSync(ACCOUNTS_LOCK_DIR)
      return releaseStoreLock
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'EEXIST') throw error

      if (isLockStale()) {
        releaseStoreLock()
        continue
      }

      return null
    }
  }

  return null
}

async function acquireStoreLock(): Promise<() => void> {
  ensureUserDataDir()
  const deadline = Date.now() + LOCK_TIMEOUT_MS

  while (true) {
    try {
      await mkdirAsync(ACCOUNTS_LOCK_DIR)
      return releaseStoreLock
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'EEXIST') throw error

      if (isLockStale()) {
        releaseStoreLock()
        continue
      }

      if (Date.now() >= deadline) {
        throw new Error("Impossible d'acquerir le verrou d'ecriture des comptes.")
      }

      await delay(LOCK_WAIT_MS)
    }
  }
}

async function withStoreWriteLock<T>(operation: () => T | Promise<T>): Promise<T> {
  const release = await acquireStoreLock()
  try {
    return await operation()
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
    legalType: 'personne_physique',
    familySci: false,
    updatedAt: account.lastUsedAt ?? account.createdAt,
  }
}

function ownerProfilesPath(accountId: string): string {
  return join(accountStorageDir(accountId), 'owner-profiles.json')
}

function primaryOwnerId(accountId: string): string {
  return `primary_${accountId}`
}

function createPrimaryOwnerProfile(account: AuthAccount): OwnerProfile {
  return {
    id: primaryOwnerId(account.id),
    name: account.name,
    email: account.email,
    address: account.address ?? '',
    city: account.city ?? '',
    phone: account.phone ?? '',
    signatureImage: account.signatureImage ?? '',
    createdAt: account.createdAt,
    updatedAt: account.lastUsedAt ?? account.createdAt,
    legalType: 'personne_physique',
    familySci: false,
    isPrimary: true,
  }
}

function normalizeOwnerProfile(
  value: unknown,
  fallbackPrimary: OwnerProfile,
): OwnerProfile | null {
  if (!value || typeof value !== 'object') return null
  const profile = value as Partial<OwnerProfile>
  if (typeof profile.id !== 'string') return null

  return {
    id: profile.id,
    name: typeof profile.name === 'string' ? profile.name : '',
    email: typeof profile.email === 'string' ? normalizeEmail(profile.email) : '',
    address: typeof profile.address === 'string' ? profile.address : '',
    city: typeof profile.city === 'string' ? profile.city : '',
    phone: typeof profile.phone === 'string' ? profile.phone : '',
    signatureImage: typeof profile.signatureImage === 'string' ? profile.signatureImage : '',
    createdAt: typeof profile.createdAt === 'string' ? profile.createdAt : fallbackPrimary.createdAt,
    updatedAt: typeof profile.updatedAt === 'string' ? profile.updatedAt : fallbackPrimary.updatedAt,
    legalType: profile.legalType === 'personne_morale' ? 'personne_morale' : 'personne_physique',
    familySci: typeof profile.familySci === 'boolean' ? profile.familySci : false,
    isPrimary: typeof profile.isPrimary === 'boolean' ? profile.isPrimary : false,
  }
}

function saveOwnerProfilesStore(accountId: string, nextStore: OwnerProfilesStore): void {
  const filePath = ownerProfilesPath(accountId)
  mkdirSync(accountStorageDir(accountId), { recursive: true })
  const tempFile = `${filePath}.${process.pid}.${Date.now()}.tmp`
  try {
    writeFileSync(tempFile, JSON.stringify(nextStore), 'utf-8')
    renameSync(tempFile, filePath)
  } finally {
    if (existsSync(tempFile)) {
      rmSync(tempFile, { force: true })
    }
  }
}

function defaultOwnerProfilesStore(account: AuthAccount): OwnerProfilesStore {
  const primary = createPrimaryOwnerProfile(account)
  return {
    version: 1,
    activeOwnerId: primary.id,
    profiles: [primary],
  }
}

function normalizeOwnerProfilesStore(raw: unknown, account: AuthAccount): OwnerProfilesStore {
  const primary = createPrimaryOwnerProfile(account)
  if (!raw || typeof raw !== 'object') {
    return defaultOwnerProfilesStore(account)
  }

  const parsed = raw as Partial<OwnerProfilesStore>
  const profiles = Array.isArray(parsed.profiles)
    ? parsed.profiles
      .map((entry) => normalizeOwnerProfile(entry, primary))
      .filter((entry): entry is OwnerProfile => entry !== null)
    : []

  const primaryFromStore = profiles.find((profile) => profile.isPrimary) ?? profiles.find((profile) => profile.id === primary.id)
  const secondaryProfiles = profiles.filter((profile) => profile.id !== primary.id && !profile.isPrimary)
  const syncedPrimary: OwnerProfile = {
    ...(primaryFromStore ?? primary),
    ...primary,
    legalType: primaryFromStore?.legalType ?? primary.legalType,
    familySci: primaryFromStore?.familySci ?? primary.familySci,
    isPrimary: true,
  }
  const normalizedProfiles = [syncedPrimary, ...secondaryProfiles]
  const activeOwnerId = typeof parsed.activeOwnerId === 'string'
    && normalizedProfiles.some((profile) => profile.id === parsed.activeOwnerId)
    ? parsed.activeOwnerId
    : syncedPrimary.id

  return {
    version: 1,
    activeOwnerId,
    profiles: normalizedProfiles,
  }
}

function loadOwnerProfilesStoreForAccount(account: AuthAccount): OwnerProfilesStore {
  const filePath = ownerProfilesPath(account.id)
  let nextStore = defaultOwnerProfilesStore(account)

  try {
    if (existsSync(filePath)) {
      const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as Partial<OwnerProfilesStore>
      nextStore = normalizeOwnerProfilesStore(parsed, account)
    }
  } catch {
    nextStore = defaultOwnerProfilesStore(account)
  }

  saveOwnerProfilesStore(account.id, nextStore)
  return nextStore
}

function loadOwnerProfilesStore(store: AccountsStore): OwnerProfilesStore | null {
  const account = getActiveAccount(store) ?? getLastUsedOrFirstAccount(store)
  if (!account) return null
  return loadOwnerProfilesStoreForAccount(account)
}

function getActiveOwnerFromStore(ownerStore: OwnerProfilesStore): OwnerProfile | null {
  return ownerStore.profiles.find((profile) => profile.id === ownerStore.activeOwnerId) ?? ownerStore.profiles[0] ?? null
}

function updatePrimaryOwnerFromAccount(ownerStore: OwnerProfilesStore, account: AuthAccount): OwnerProfilesStore {
  const primary = createPrimaryOwnerProfile(account)
  return normalizeOwnerProfilesStore(ownerStore, {
    ...account,
    name: primary.name,
    email: primary.email,
    address: primary.address,
    city: primary.city,
    phone: primary.phone,
    signatureImage: primary.signatureImage,
  })
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
  const release = tryAcquireStoreLockSync()
  if (!release) return
  try {
    migrateLegacyAuthIfNeededLocked()
  } finally {
    release()
  }
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

async function withLockedStore<T>(operation: (store: AccountsStore) => T | Promise<T>): Promise<T> {
  return withStoreWriteLock(async () => {
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

export async function lockCurrentSession(): Promise<void> {
  activeAccountId = null
  await withLockedStore((store) => {
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

export function listOwnerProfiles(): OwnerProfile[] {
  const ownerStore = loadOwnerProfilesStore(loadStore())
  return ownerStore ? ownerStore.profiles.map((profile) => ({ ...profile })) : []
}

export function getActiveOwnerProfile(): OwnerProfile | null {
  const ownerStore = loadOwnerProfilesStore(loadStore())
  const active = ownerStore ? getActiveOwnerFromStore(ownerStore) : null
  return active ? { ...active } : null
}

export async function restoreRememberedSession(): Promise<UserProfile | null> {
  const store = loadStore()
  const account = getRememberedAccount(store)
  if (account) {
    activeAccountId = account.id
    return accountProfile(account)
  }

  if (store.rememberedAccountId) {
    await withLockedStore((lockedStore) => {
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

export async function setupPassword(password: string, name: string, email: string): Promise<string | null> {
  const normalizedEmail = normalizeEmail(email)
  const result = await withLockedStore((store) => {
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

export function verifyPassword(email: string, password: string, rememberSession = false): Promise<boolean> {
  return withLockedStore((store) => {
    const account = findAccountByEmail(store, email)
    if (!account) return false

    const ok = verifyHash(password, account.salt, account.hash)
    if (!ok) return false

    markAccountAsCurrent(store, account.id, rememberSession)
    return true
  })
}

export function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
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

export function verifyRecoveryKey(key: string): Promise<boolean> {
  return withLockedStore((store) => {
    const account = findAccountByRecoveryKey(store, key)
    if (!account) return false

    markAccountAsCurrent(store, account.id)
    return true
  })
}

export function resetWithRecoveryKey(key: string, newPassword: string): Promise<string | null> {
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

export function regenerateRecoveryKey(password: string): Promise<string | null> {
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

export function updateProfile(name: string, email: string, address?: string, city?: string, phone?: string, signatureImage?: string): Promise<boolean> {
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

    const ownerStore = loadOwnerProfilesStoreForAccount(account)
    const syncedOwnerStore = updatePrimaryOwnerFromAccount(ownerStore, account)
    saveOwnerProfilesStore(account.id, syncedOwnerStore)
    return true
  })
}

export function createOwnerProfile(
  initial: Partial<Pick<OwnerProfile, 'name' | 'email' | 'address' | 'city' | 'phone' | 'signatureImage' | 'legalType' | 'familySci'>> = {},
): Promise<OwnerProfile> {
  return withLockedStore((store) => {
    const account = requireCurrentAccount(store)
    const ownerStore = loadOwnerProfilesStoreForAccount(account)
    const now = new Date().toISOString()
    const nextProfile: OwnerProfile = {
      id: `owner_${randomBytes(8).toString('hex')}`,
      name: typeof initial.name === 'string' ? initial.name.trim() : '',
      email: typeof initial.email === 'string' ? normalizeEmail(initial.email) : '',
      address: typeof initial.address === 'string' ? initial.address.trim() : '',
      city: typeof initial.city === 'string' ? initial.city.trim() : '',
      phone: typeof initial.phone === 'string' ? initial.phone.trim() : '',
      signatureImage: typeof initial.signatureImage === 'string' ? initial.signatureImage : '',
      createdAt: now,
      updatedAt: now,
      legalType: initial.legalType === 'personne_morale' ? 'personne_morale' : 'personne_physique',
      familySci: typeof initial.familySci === 'boolean' ? initial.familySci : false,
      isPrimary: false,
    }

    ownerStore.profiles.push(nextProfile)
    ownerStore.activeOwnerId = nextProfile.id
    saveOwnerProfilesStore(account.id, ownerStore)
    return { ...nextProfile }
  })
}

export function updateOwnerProfile(
  id: string,
  patch: Partial<Pick<OwnerProfile, 'name' | 'email' | 'address' | 'city' | 'phone' | 'signatureImage' | 'legalType' | 'familySci'>>,
): Promise<OwnerProfile | null> {
  return withLockedStore((store) => {
    const account = requireCurrentAccount(store)
    const ownerStore = loadOwnerProfilesStoreForAccount(account)
    const owner = ownerStore.profiles.find((entry) => entry.id === id)
    if (!owner) return null

    const normalizedEmail = patch.email !== undefined ? normalizeEmail(patch.email) : owner.email
    if (owner.isPrimary) {
      const normalizedName = patch.name !== undefined ? patch.name.trim() : owner.name
      if (!normalizedName || !normalizedEmail) return null
      const duplicate = store.accounts.find((entry) => entry.id !== account.id && entry.email === normalizedEmail)
      if (duplicate) return null
    }

    if (patch.name !== undefined) owner.name = patch.name.trim()
    if (patch.email !== undefined) owner.email = normalizedEmail
    if (patch.address !== undefined) owner.address = patch.address.trim()
    if (patch.city !== undefined) owner.city = patch.city.trim()
    if (patch.phone !== undefined) owner.phone = patch.phone.trim()
    if (patch.signatureImage !== undefined) owner.signatureImage = patch.signatureImage
    if (patch.legalType !== undefined) owner.legalType = patch.legalType === 'personne_morale' ? 'personne_morale' : 'personne_physique'
    if (patch.familySci !== undefined) owner.familySci = Boolean(patch.familySci)
    owner.updatedAt = new Date().toISOString()

    if (owner.isPrimary) {
      account.name = owner.name
      account.email = owner.email
      account.address = owner.address
      account.city = owner.city
      account.phone = owner.phone
      account.signatureImage = owner.signatureImage
      saveStore(store)
    }

    saveOwnerProfilesStore(account.id, ownerStore)
    return { ...owner }
  })
}

export function setActiveOwnerProfile(ownerId: string): Promise<OwnerProfile | null> {
  return withLockedStore((store) => {
    const account = requireCurrentAccount(store)
    const ownerStore = loadOwnerProfilesStoreForAccount(account)
    const owner = ownerStore.profiles.find((entry) => entry.id === ownerId)
    if (!owner) return null
    ownerStore.activeOwnerId = owner.id
    saveOwnerProfilesStore(account.id, ownerStore)
    return { ...owner }
  })
}

export function deleteOwnerProfile(ownerId: string): Promise<boolean> {
  return withLockedStore((store) => {
    const account = requireCurrentAccount(store)
    const ownerStore = loadOwnerProfilesStoreForAccount(account)
    const owner = ownerStore.profiles.find((entry) => entry.id === ownerId)
    if (!owner || owner.isPrimary) return false

    ownerStore.profiles = ownerStore.profiles.filter((entry) => entry.id !== ownerId)
    if (ownerStore.activeOwnerId === ownerId) {
      ownerStore.activeOwnerId = ownerStore.profiles[0]?.id ?? null
    }
    saveOwnerProfilesStore(account.id, ownerStore)
    return true
  })
}

export async function deleteAccount(password: string): Promise<boolean> {
  const accountId = await withLockedStore((store) => {
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
  return JSON.stringify({
    ...account,
    ownerProfiles: loadOwnerProfilesStoreForAccount(account),
  })
}

export async function importAccountFromBackup(payload: string): Promise<{ accountId: string }> {
  let raw: Partial<AuthAccount> & { ownerProfiles?: Partial<OwnerProfilesStore> }
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

  const accountId = await withLockedStore((store) => {
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
  const importedAccountStore = loadStoreFromDisk()
  const importedAccount = importedAccountStore.accounts.find((account) => account.id === accountId)
  if (importedAccount) {
    const ownerStore = normalizeOwnerProfilesStore(raw.ownerProfiles, importedAccount)
    saveOwnerProfilesStore(accountId, ownerStore)
  }
  return { accountId }
}
