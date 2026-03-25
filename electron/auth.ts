import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

const AUTH_FILE = join(app.getPath('userData'), 'auth.json')

interface AuthData {
  hash: string
  salt: string
  recoveryHash: string
  recoverySalt: string
  name: string
  email: string
  address: string
  city: string
  phone: string
  signatureImage: string
  createdAt: string
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

function hashPassword(password: string, salt: string): Buffer {
  return scryptSync(password, salt, 64)
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
  // Format as XXXX-XXXX-XXXX-XXXX-XXXX
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
  return existsSync(AUTH_FILE)
}

export function getProfile(): UserProfile | null {
  if (!hasPassword()) return null
  const data: AuthData = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'))
  return {
    name: data.name, email: data.email, address: data.address ?? '',
    city: data.city ?? '', phone: data.phone ?? '',
    signatureImage: data.signatureImage ?? '', createdAt: data.createdAt,
  }
}

export function hasRecoveryKey(): boolean {
  if (!hasPassword()) return false
  const data = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'))
  return Boolean(data.recoveryHash && data.recoverySalt)
}

/**
 * Creates the account and returns the recovery key (shown once to the user).
 * Returns null if account already exists.
 */
export function setupPassword(
  password: string,
  name: string,
  email: string
): string | null {
  if (hasPassword()) return null

  const salt = randomBytes(32).toString('hex')
  const hash = hashPassword(password, salt).toString('hex')

  const recoveryKey = generateRecoveryKey()
  const recoverySalt = randomBytes(32).toString('hex')
  const recoveryHash = hashPassword(normalizeRecoveryKey(recoveryKey), recoverySalt).toString('hex')

  const data: AuthData = {
    hash,
    salt,
    recoveryHash,
    recoverySalt,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    address: '',
    city: '',
    phone: '',
    signatureImage: '',
    createdAt: new Date().toISOString(),
  }
  writeFileSync(AUTH_FILE, JSON.stringify(data), 'utf-8')
  return recoveryKey
}

export function verifyPassword(password: string): boolean {
  if (!hasPassword()) return false
  const data: AuthData = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'))
  const candidate = hashPassword(password, data.salt)
  const stored = Buffer.from(data.hash, 'hex')
  return timingSafeEqual(candidate, stored)
}

export function changePassword(oldPassword: string, newPassword: string): boolean {
  if (!verifyPassword(oldPassword)) return false
  const data: AuthData = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'))
  const salt = randomBytes(32).toString('hex')
  data.hash = hashPassword(newPassword, salt).toString('hex')
  data.salt = salt
  writeFileSync(AUTH_FILE, JSON.stringify(data), 'utf-8')
  return true
}

/**
 * Verify a recovery key against the stored hash.
 */
export function verifyRecoveryKey(key: string): boolean {
  if (!hasPassword()) return false
  const data = JSON.parse(readFileSync(AUTH_FILE, 'utf-8')) as AuthData
  if (!data.recoveryHash || !data.recoverySalt) return false
  const candidate = hashPassword(normalizeRecoveryKey(key), data.recoverySalt)
  const stored = Buffer.from(data.recoveryHash, 'hex')
  return timingSafeEqual(candidate, stored)
}

/**
 * Reset the password using a valid recovery key.
 * Returns a new recovery key on success (the old one is invalidated).
 */
export function resetWithRecoveryKey(key: string, newPassword: string): string | null {
  if (!verifyRecoveryKey(key)) return null

  const data: AuthData = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'))

  // New password
  const salt = randomBytes(32).toString('hex')
  data.hash = hashPassword(newPassword, salt).toString('hex')
  data.salt = salt

  // New recovery key (old one is now invalid)
  const newRecoveryKey = generateRecoveryKey()
  const recoverySalt = randomBytes(32).toString('hex')
  data.recoveryHash = hashPassword(normalizeRecoveryKey(newRecoveryKey), recoverySalt).toString('hex')
  data.recoverySalt = recoverySalt

  writeFileSync(AUTH_FILE, JSON.stringify(data), 'utf-8')
  return newRecoveryKey
}

/**
 * Regenerate the recovery key (requires current password).
 * Returns the new key, or null if password is wrong.
 */
export function regenerateRecoveryKey(password: string): string | null {
  if (!verifyPassword(password)) return null

  const data: AuthData = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'))

  const recoveryKey = generateRecoveryKey()
  const recoverySalt = randomBytes(32).toString('hex')
  data.recoveryHash = hashPassword(normalizeRecoveryKey(recoveryKey), recoverySalt).toString('hex')
  data.recoverySalt = recoverySalt

  writeFileSync(AUTH_FILE, JSON.stringify(data), 'utf-8')
  return recoveryKey
}

export function updateProfile(name: string, email: string, address?: string, city?: string, phone?: string, signatureImage?: string): boolean {
  if (!hasPassword()) return false
  const data: AuthData = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'))
  data.name  = name.trim()
  data.email = email.trim().toLowerCase()
  if (address !== undefined)        data.address        = address.trim()
  if (city !== undefined)           data.city            = city.trim()
  if (phone !== undefined)          data.phone           = phone.trim()
  if (signatureImage !== undefined) data.signatureImage  = signatureImage
  writeFileSync(AUTH_FILE, JSON.stringify(data), 'utf-8')
  return true
}

/** Supprime definitivement le compte (reinitialise l'app au Setup) */
export function deleteAccount(password: string): boolean {
  if (!verifyPassword(password)) return false
  unlinkSync(AUTH_FILE)
  return true
}
