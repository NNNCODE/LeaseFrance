/**
 * Backup manager — settings persistence, auto-backup timer, rotation,
 * integrity verification, and restore preview.
 *
 * Utility functions previously inlined in main.ts (archive building,
 * parsing, SQLite header check, etc.) are centralised here so both
 * manual and automatic backup flows share the same code path.
 */
import { app, BrowserWindow } from 'electron'
import {
  existsSync, mkdirSync, readFileSync, readdirSync,
  statSync, unlinkSync, writeFileSync,
} from 'fs'
import { basename, extname, join } from 'path'
import { randomBytes } from 'crypto'
import Database = require('better-sqlite3')
import { getCurrentAccountStorageDir, exportCurrentAccountAuth } from './auth'
import { getDb } from './db/database'

// ── Archive format ───────────────────────────────────────────────────────────

export const BACKUP_EXTENSION = '.lfbackup'

export interface BackupArchiveV1 {
  version: 1
  createdAt: string
  dbBase64: string
  authBase64: string
}

// ── Low-level helpers ────────────────────────────────────────────────────────

export function hasValidSqliteHeader(buffer: Buffer): boolean {
  return buffer.toString('utf8', 0, 15) === 'SQLite format 3'
}

export function ensureBackupPath(filePath: string): string {
  return extname(filePath).toLowerCase() === BACKUP_EXTENSION
    ? filePath
    : `${filePath}${BACKUP_EXTENSION}`
}

export function removeSqliteSidecars(dbPath: string): void {
  for (const suffix of ['-wal', '-shm']) {
    const p = `${dbPath}${suffix}`
    if (existsSync(p)) unlinkSync(p)
  }
}

// ── Archive build / parse ────────────────────────────────────────────────────

export async function buildBackupArchive(): Promise<BackupArchiveV1> {
  const tempDbPath = join(
    app.getPath('temp'),
    `rentflow_backup_${Date.now()}_${randomBytes(6).toString('hex')}.db`,
  )
  try {
    await getDb().backup(tempDbPath)
    const dbBuffer = readFileSync(tempDbPath)
    if (!hasValidSqliteHeader(dbBuffer)) {
      throw new Error('La sauvegarde SQLite generee est invalide.')
    }
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      dbBase64: dbBuffer.toString('base64'),
      authBase64: Buffer.from(exportCurrentAccountAuth(), 'utf8').toString('base64'),
    }
  } finally {
    if (existsSync(tempDbPath)) unlinkSync(tempDbPath)
  }
}

export function parseBackupArchive(raw: string): { dbBuffer: Buffer; authBuffer: Buffer } {
  let archive: unknown
  try { archive = JSON.parse(raw) } catch {
    throw new Error("Le fichier de sauvegarde est illisible ou n'est pas au format attendu.")
  }
  if (
    !archive || typeof archive !== 'object' ||
    (archive as { version?: unknown }).version !== 1 ||
    typeof (archive as { dbBase64?: unknown }).dbBase64 !== 'string' ||
    typeof (archive as { authBase64?: unknown }).authBase64 !== 'string'
  ) {
    throw new Error('Le fichier de sauvegarde est incomplet.')
  }
  const dbBuffer = Buffer.from((archive as BackupArchiveV1).dbBase64, 'base64')
  const authBuffer = Buffer.from((archive as BackupArchiveV1).authBase64, 'base64')
  if (!hasValidSqliteHeader(dbBuffer)) {
    throw new Error('La base de donnees incluse dans la sauvegarde est invalide.')
  }
  try { JSON.parse(authBuffer.toString('utf8')) } catch {
    throw new Error("Le profil d'authentification inclus dans la sauvegarde est invalide.")
  }
  return { dbBuffer, authBuffer }
}

export function readRestorePayload(srcPath: string): { dbBuffer: Buffer; authBuffer: Buffer } {
  if (extname(srcPath).toLowerCase() === BACKUP_EXTENSION) {
    return parseBackupArchive(readFileSync(srcPath, 'utf8'))
  }
  const dbBuffer = readFileSync(srcPath)
  if (!hasValidSqliteHeader(dbBuffer)) {
    throw new Error("Le fichier selectionne n'est pas une base de donnees SQLite valide.")
  }
  const authSrc = srcPath.replace(/\.db$/i, '_auth.json')
  if (!existsSync(authSrc)) {
    throw new Error('Cette sauvegarde legacy est incomplete : le fichier companion _auth.json est introuvable.')
  }
  const authBuffer = readFileSync(authSrc)
  try { JSON.parse(authBuffer.toString('utf8')) } catch {
    throw new Error('Le fichier companion _auth.json est invalide.')
  }
  return { dbBuffer, authBuffer }
}

// ── Backup settings ──────────────────────────────────────────────────────────

export interface BackupSettings {
  autoEnabled: boolean
  intervalHours: number
  destinationFolder: string
  maxBackups: number
  lastBackupAt: string | null
  lastBackupPath: string | null
  lastBackupSizeBytes: number | null
}

const DEFAULT_SETTINGS: BackupSettings = {
  autoEnabled: false,
  intervalHours: 24,
  destinationFolder: '',
  maxBackups: 5,
  lastBackupAt: null,
  lastBackupPath: null,
  lastBackupSizeBytes: null,
}

function settingsPath(): string {
  return join(getCurrentAccountStorageDir(), 'backup-settings.json')
}

export function getBackupSettings(): BackupSettings {
  const p = settingsPath()
  if (!existsSync(p)) return { ...DEFAULT_SETTINGS }
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(readFileSync(p, 'utf8')) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveBackupSettings(patch: Partial<BackupSettings>): BackupSettings {
  const merged = { ...getBackupSettings(), ...patch }
  writeFileSync(settingsPath(), JSON.stringify(merged, null, 2), 'utf8')
  return merged
}

export function recordBackupDone(filePath: string, sizeBytes: number): BackupSettings {
  return saveBackupSettings({
    lastBackupAt: new Date().toISOString(),
    lastBackupPath: filePath,
    lastBackupSizeBytes: sizeBytes,
  })
}

// ── Auto-backup timer & rotation ─────────────────────────────────────────────

const AUTO_PREFIX = 'rentflow_auto_'
const LEGACY_AUTO_PREFIX = 'leasefrance_auto_' // keep for rotation of pre-rebrand backups
let autoTimer: ReturnType<typeof setInterval> | null = null

export function startAutoBackupTimer(): void {
  stopAutoBackupTimer()
  // Check every 15 minutes
  autoTimer = setInterval(() => { runAutoBackupIfDue().catch(() => {}) }, 15 * 60_000)
  // Immediate first check
  runAutoBackupIfDue().catch(() => {})
}

export function stopAutoBackupTimer(): void {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null }
}

function rotateAutoBackups(folder: string, maxKeep: number): void {
  if (!existsSync(folder)) return
  const files = readdirSync(folder)
    .filter(f => (f.startsWith(AUTO_PREFIX) || f.startsWith(LEGACY_AUTO_PREFIX)) && f.endsWith(BACKUP_EXTENSION))
    .map(f => ({ name: f, path: join(folder, f), mtime: statSync(join(folder, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  for (let i = maxKeep; i < files.length; i++) {
    try { unlinkSync(files[i].path) } catch { /* ignore */ }
  }
}

async function runAutoBackupIfDue(): Promise<void> {
  let settings: BackupSettings
  try { settings = getBackupSettings() } catch { return }

  if (!settings.autoEnabled || !settings.destinationFolder) return
  if (!existsSync(settings.destinationFolder)) return

  const now = Date.now()
  const lastAt = settings.lastBackupAt ? new Date(settings.lastBackupAt).getTime() : 0
  if (now - lastAt < settings.intervalHours * 3_600_000) return

  // Build and write
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filePath = join(settings.destinationFolder, `${AUTO_PREFIX}${ts}${BACKUP_EXTENSION}`)
  mkdirSync(settings.destinationFolder, { recursive: true })
  const archive = await buildBackupArchive()
  writeFileSync(filePath, JSON.stringify(archive), 'utf8')

  const size = statSync(filePath).size
  recordBackupDone(filePath, size)
  rotateAutoBackups(settings.destinationFolder, settings.maxBackups)

  // Notify renderer (if window exists)
  const win = BrowserWindow.getAllWindows()[0]
  if (win && !win.isDestroyed()) {
    win.webContents.send('backup:autoDone', {
      path: filePath,
      sizeBytes: size,
      at: new Date().toISOString(),
    })
  }
}

// ── Verify ───────────────────────────────────────────────────────────────────

export interface BackupVerifyResult {
  valid: boolean
  createdAt: string | null
  fileSize: number
  errors: string[]
}

export function verifyBackupFile(filePath: string): BackupVerifyResult {
  const fileSize = statSync(filePath).size
  const errors: string[] = []
  let createdAt: string | null = null

  try {
    const raw = readFileSync(filePath, 'utf8')
    let archive: Record<string, unknown>
    try { archive = JSON.parse(raw) } catch {
      return { valid: false, createdAt: null, fileSize, errors: ["Le fichier n'est pas au format JSON valide."] }
    }

    createdAt = typeof archive.createdAt === 'string' ? archive.createdAt : null

    if (archive.version !== 1) errors.push(`Version de format inconnue : ${archive.version}`)

    if (typeof archive.dbBase64 !== 'string') {
      errors.push('Donnees de base de donnees manquantes.')
    } else {
      const buf = Buffer.from(archive.dbBase64, 'base64')
      if (!hasValidSqliteHeader(buf)) errors.push("En-tete SQLite invalide dans la base incluse.")
    }

    if (typeof archive.authBase64 !== 'string') {
      errors.push("Donnees d'authentification manquantes.")
    } else {
      try {
        const auth = JSON.parse(Buffer.from(archive.authBase64, 'base64').toString('utf8'))
        if (!auth.hash || !auth.salt || !auth.name || !auth.email) {
          errors.push("Profil d'authentification incomplet.")
        }
      } catch {
        errors.push("Profil d'authentification illisible.")
      }
    }
  } catch (err) {
    errors.push(`Erreur de lecture : ${err instanceof Error ? err.message : String(err)}`)
  }

  return { valid: errors.length === 0, createdAt, fileSize, errors }
}

// ── Preview (verify + table counts + profile) ────────────────────────────────

export interface BackupPreviewResult {
  filePath: string
  valid: boolean
  createdAt: string | null
  fileSize: number
  profile: { name: string; email: string } | null
  tables: Array<{ name: string; label: string; count: number }>
  errors: string[]
}

const TABLE_LABELS: Array<[string, string]> = [
  ['properties', 'Biens'],
  ['tenants', 'Locataires'],
  ['leases', 'Baux'],
  ['payments', 'Paiements'],
  ['documents', 'Documents'],
  ['inspections', 'Etats des lieux'],
  ['charge_reconciliations', 'Regularisations'],
  ['manual_reminders', 'Rappels'],
  ['fiscal_expenses', 'Charges fiscales'],
  ['attachments', 'Pieces jointes'],
  ['bank_imports', 'Imports bancaires'],
]

export function previewBackupFile(filePath: string): BackupPreviewResult {
  const fileSize = statSync(filePath).size
  const errors: string[] = []
  let createdAt: string | null = null
  let profile: { name: string; email: string } | null = null
  const tables: Array<{ name: string; label: string; count: number }> = []

  let dbBuffer: Buffer
  let authBuffer: Buffer

  try {
    const raw = readFileSync(filePath, 'utf8')
    // Extract createdAt before full parse so we have it even if parsing fails later
    try { createdAt = (JSON.parse(raw) as Record<string, unknown>).createdAt as string ?? null } catch { /* */ }
    const parsed = parseBackupArchive(raw)
    dbBuffer = parsed.dbBuffer
    authBuffer = parsed.authBuffer
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err))
    return { filePath, valid: false, createdAt, fileSize, profile: null, tables: [], errors }
  }

  // Profile
  try {
    const auth = JSON.parse(authBuffer.toString('utf8'))
    profile = { name: auth.name || '', email: auth.email || '' }
  } catch {
    errors.push("Profil d'authentification illisible.")
  }

  // Table counts via temp DB
  const tempPath = join(app.getPath('temp'), `lf_preview_${Date.now()}_${randomBytes(4).toString('hex')}.db`)
  try {
    writeFileSync(tempPath, dbBuffer)
    const tempDb = new Database(tempPath, { readonly: true })
    for (const [name, label] of TABLE_LABELS) {
      try {
        const row = tempDb.prepare(`SELECT COUNT(*) as n FROM ${name}`).get() as { n: number }
        tables.push({ name, label, count: row.n })
      } catch {
        // Table might not exist in older backups
      }
    }
    tempDb.close()
  } catch {
    errors.push('Impossible de lire la base de donnees incluse.')
  } finally {
    if (existsSync(tempPath)) unlinkSync(tempPath)
  }

  return { filePath, valid: errors.length === 0, createdAt, fileSize, profile, tables, errors }
}
