import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

const AUTH_FILE = join(app.getPath('userData'), 'auth.json')

interface AuthData {
  hash: string
  salt: string
  name: string
  email: string
  address: string
  phone: string
  createdAt: string
}

export interface UserProfile {
  name: string
  email: string
  address: string
  phone: string
  createdAt: string
}

function hashPassword(password: string, salt: string): Buffer {
  return scryptSync(password, salt, 64)
}

export function hasPassword(): boolean {
  return existsSync(AUTH_FILE)
}

export function getProfile(): UserProfile | null {
  if (!hasPassword()) return null
  const data: AuthData = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'))
  return { name: data.name, email: data.email, address: data.address ?? '', phone: data.phone ?? '', createdAt: data.createdAt }
}

export function setupPassword(
  password: string,
  name: string,
  email: string
): boolean {
  if (hasPassword()) return false
  const salt = randomBytes(32).toString('hex')
  const hash = hashPassword(password, salt).toString('hex')
  const data: AuthData = {
    hash,
    salt,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    address: '',
    phone: '',
    createdAt: new Date().toISOString(),
  }
  writeFileSync(AUTH_FILE, JSON.stringify(data), 'utf-8')
  return true
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

export function updateProfile(name: string, email: string, address?: string, phone?: string): boolean {
  if (!hasPassword()) return false
  const data: AuthData = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'))
  data.name  = name.trim()
  data.email = email.trim().toLowerCase()
  if (address !== undefined) data.address = address.trim()
  if (phone !== undefined)   data.phone   = phone.trim()
  writeFileSync(AUTH_FILE, JSON.stringify(data), 'utf-8')
  return true
}

/** Supprime définitivement le compte (réinitialise l'app au Setup) */
export function deleteAccount(password: string): boolean {
  if (!verifyPassword(password)) return false
  unlinkSync(AUTH_FILE)
  return true
}
