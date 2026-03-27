import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { writeFileSync, copyFileSync, existsSync, readFileSync, mkdirSync, unlinkSync } from 'fs'
import { join, dirname, extname } from 'path'
import { randomBytes } from 'crypto'
import { closeDb, getDb, getDbPath } from './db/database'
import {
  deleteAccount, exportCurrentAccountAuth,
  getAccountDbPathById, getCurrentAccountStorageDir, getProfile,
  lockCurrentSession, restoreRememberedSession,
  hasRecoveryKey, verifyRecoveryKey, resetWithRecoveryKey, regenerateRecoveryKey,
  hasPassword, importAccountFromBackup, setupPassword, verifyPassword,
  changePassword, updateProfile,
} from './auth'
import * as propertiesDb from './db/queries/properties'
import * as tenantsDb from './db/queries/tenants'
import * as leasesDb from './db/queries/leases'
import * as paymentsDb from './db/queries/payments'
import * as paymentRemindersDb from './db/queries/paymentReminders'
import * as inspectionsDb from './db/queries/inspections'
import * as chargeReconciliationsDb from './db/queries/chargeReconciliations'
import * as manualRemindersDb from './db/queries/manualReminders'
import * as documentsDb from './db/queries/documents'
import * as irlDb from './db/queries/irl'
import * as bankImportsDb from './db/queries/bankImports'
import * as autoRentDb from './db/queries/autoRent'
import * as fiscalExpensesDb from './db/queries/fiscalExpenses'
import * as attachmentsDb from './db/queries/attachments'

const isDev = process.env['ELECTRON_RENDERER_URL'] !== undefined

let mainWindow: BrowserWindow | null = null
const sessionDataPath = join(app.getPath('temp'), 'leasefrance', 'session-data', String(process.pid))

function configureSessionDataPath(): void {
  mkdirSync(sessionDataPath, { recursive: true })
  app.setPath('sessionData', sessionDataPath)
}

configureSessionDataPath()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0F0F13',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev, // DevTools uniquement en développement
    },
  })

  // Bloquer l'ouverture des DevTools en production
  if (!isDev) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools()
    })

    // Bloquer les raccourcis clavier DevTools
    mainWindow.webContents.on('before-input-event', (_event, input) => {
      if (
        input.key === 'F12' ||
        (input.control && input.shift && input.key === 'I') ||
        (input.control && input.shift && input.key === 'J') ||
        (input.control && input.key === 'U')
      ) {
        _event.preventDefault()
      }
    })
  }

  // Bloquer l'ouverture de nouvelles fenêtres
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Désactiver le menu contextuel clic droit en production
  if (!isDev) {
    mainWindow.webContents.on('context-menu', (e) => e.preventDefault())
  }

  if (isDev) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']!)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Auth IPC
ipcMain.handle('auth:hasPassword', () => hasPassword())
ipcMain.handle('auth:getProfile',  () => getProfile())
ipcMain.handle('auth:restoreRememberedSession', () => restoreRememberedSession())
ipcMain.handle('auth:setup',    (_e, pwd: string, name: string, email: string) => setupPassword(pwd, name, email))
ipcMain.handle('auth:verify',   (_e, email: string, pwd: string, remember: boolean) => verifyPassword(email, pwd, remember))
ipcMain.handle('auth:change',   (_e, oldPwd: string, newPwd: string)           => changePassword(oldPwd, newPwd))
ipcMain.handle('auth:updateProfile', (_e, name: string, email: string, address?: string, city?: string, phone?: string, signatureImage?: string) => updateProfile(name, email, address, city, phone, signatureImage))
ipcMain.handle('auth:delete',   (_e, pwd: string)                              => { closeDb(); return deleteAccount(pwd) })
ipcMain.handle('auth:lockSession', () => { closeDb(); lockCurrentSession() })
ipcMain.handle('auth:hasRecoveryKey',      () => hasRecoveryKey())
ipcMain.handle('auth:verifyRecoveryKey',   (_e, key: string) => verifyRecoveryKey(key))
ipcMain.handle('auth:resetWithRecoveryKey',(_e, key: string, newPwd: string) => resetWithRecoveryKey(key, newPwd))
ipcMain.handle('auth:regenerateRecoveryKey', (_e, pwd: string) => regenerateRecoveryKey(pwd))

// Properties IPC
ipcMain.handle('properties:getAll',  () => propertiesDb.getAll())
ipcMain.handle('properties:count',   () => propertiesDb.count())
ipcMain.handle('properties:create',  (_e, data) => propertiesDb.create(data))
ipcMain.handle('properties:update',  (_e, id, data) => propertiesDb.update(id, data))
ipcMain.handle('properties:delete',  (_e, id) => propertiesDb.remove(id))

// Tenants IPC
ipcMain.handle('tenants:getAll',  () => tenantsDb.getAll())
ipcMain.handle('tenants:count',   () => tenantsDb.count())
ipcMain.handle('tenants:create',  (_e, data) => tenantsDb.create(data))
ipcMain.handle('tenants:update',  (_e, id, data) => tenantsDb.update(id, data))
ipcMain.handle('tenants:delete',  (_e, id) => tenantsDb.remove(id))

// Leases IPC
ipcMain.handle('leases:getAll',  () => leasesDb.getAll())
ipcMain.handle('leases:count',   () => leasesDb.count())
ipcMain.handle('leases:create',  (_e, data) => leasesDb.create(data))
ipcMain.handle('leases:update',  (_e, id, data) => leasesDb.update(id, data))
ipcMain.handle('leases:delete',  (_e, id) => leasesDb.remove(id))

// Payments IPC
ipcMain.handle('payments:getAll',    () => paymentsDb.getAll())
ipcMain.handle('payments:getByLease',(_e, leaseId) => paymentsDb.getByLease(leaseId))
ipcMain.handle('payments:getSummary',() => paymentsDb.getSummary())
ipcMain.handle('payments:create',    (_e, data) => paymentsDb.create(data))
ipcMain.handle('payments:update',    (_e, id, data) => paymentsDb.update(id, data))
ipcMain.handle('payments:markPaid',  (_e, id, date) => paymentsDb.markPaid(id, date))
ipcMain.handle('payments:delete',    (_e, id) => paymentsDb.remove(id))

// Auto-rent IPC
ipcMain.handle('payments:generateMissing', () => autoRentDb.generateMissingPayments())
ipcMain.handle('payments:markOverdue',     () => autoRentDb.markOverduePayments())

// Payment reminders IPC
ipcMain.handle('paymentReminders:getByPayment', (_e, paymentId) => paymentRemindersDb.getByPayment(paymentId))
ipcMain.handle('paymentReminders:create', (_e, data) => paymentRemindersDb.create(data))

// Inspections IPC
ipcMain.handle('inspections:getAll', () => inspectionsDb.getAll())
ipcMain.handle('inspections:create', (_e, data) => inspectionsDb.create(data))
ipcMain.handle('inspections:update', (_e, id, data) => inspectionsDb.update(id, data))
ipcMain.handle('inspections:delete', (_e, id) => inspectionsDb.remove(id))

// Charge reconciliations IPC
ipcMain.handle('chargeReconciliations:getByLease', (_e, leaseId) => chargeReconciliationsDb.getByLease(leaseId))
ipcMain.handle('chargeReconciliations:create', (_e, data) => chargeReconciliationsDb.create(data))
ipcMain.handle('chargeReconciliations:update', (_e, id, data) => chargeReconciliationsDb.update(id, data))
ipcMain.handle('chargeReconciliations:delete', (_e, id) => chargeReconciliationsDb.remove(id))

// Manual reminders IPC
ipcMain.handle('manualReminders:getAll', () => manualRemindersDb.getAll())
ipcMain.handle('manualReminders:create', (_e, data) => manualRemindersDb.create(data))
ipcMain.handle('manualReminders:update', (_e, id, data) => manualRemindersDb.update(id, data))
ipcMain.handle('manualReminders:delete', (_e, id) => manualRemindersDb.remove(id))

// Documents IPC
ipcMain.handle('documents:getAll', () => documentsDb.getAll())
ipcMain.handle('documents:delete', (_e, id) => documentsDb.remove(id))
ipcMain.handle('documents:savePdf', async (_e, leaseId: number, fileName: string, buffer: number[], docType?: string) => {
  const titleMap: Record<string, string> = {
    quittance: 'Enregistrer la quittance',
    recu: 'Enregistrer le recu de loyer',
    avis_revision_loyer: "Enregistrer l'avis de revision du loyer",
    recu_depot_garantie: 'Enregistrer le recu de depot de garantie',
    solde_depot_garantie: 'Enregistrer le solde de depot de garantie',
    relance_amiable: 'Enregistrer la relance amiable',
    mise_en_demeure: 'Enregistrer la mise en demeure',
    proposition_echeancier: "Enregistrer la proposition d'echeancier",
    etat_des_lieux_entree: "Enregistrer l'etat des lieux d'entree",
    etat_des_lieux_sortie: "Enregistrer l'etat des lieux de sortie",
    regularisation_charges: 'Enregistrer la regularisation annuelle des charges',
  }
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: titleMap[docType ?? 'quittance'] ?? 'Enregistrer le document',
    defaultPath: fileName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (canceled || !filePath) return { saved: false, path: null }
  writeFileSync(filePath, Buffer.from(buffer))
  documentsDb.create(leaseId, docType ?? 'quittance', filePath)
  return { saved: true, path: filePath }
})
ipcMain.handle('documents:updateStatus', (_e, id: number, status: string) => documentsDb.updateStatus(id, status))
ipcMain.handle('documents:readFile', (_e, filePath: string) => {
  try {
    const buffer = readFileSync(filePath)
    return { data: buffer.toString('base64'), error: null }
  } catch {
    return { data: null, error: 'Fichier introuvable' }
  }
})
ipcMain.handle('documents:openFile', (_e, filePath: string) => {
  shell.openPath(filePath)
})

ipcMain.handle('exports:saveFile', async (_e, fileName: string, buffer: number[], filters?: Array<{ name: string; extensions: string[] }>) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Exporter le fichier',
    defaultPath: fileName,
    filters: filters && filters.length > 0 ? filters : undefined,
  })
  if (canceled || !filePath) return { saved: false, path: null }
  writeFileSync(filePath, Buffer.from(buffer))
  return { saved: true, path: filePath }
})

// IRL IPC
ipcMain.handle('irl:getAll',            () => irlDb.getAll())
ipcMain.handle('irl:getByQuarter',      (_e, year: number, quarter: number) => irlDb.getByQuarter(year, quarter))
ipcMain.handle('irl:getLatestForQuarter',(_e, quarter: number) => irlDb.getLatestForQuarter(quarter))
ipcMain.handle('irl:upsert',           (_e, year: number, quarter: number, value: number) => irlDb.upsert(year, quarter, value))
ipcMain.handle('irl:delete',           (_e, id: number) => irlDb.remove(id))

// Fiscal expenses IPC
ipcMain.handle('fiscalExpenses:getAll',   () => fiscalExpensesDb.getAll())
ipcMain.handle('fiscalExpenses:getByYear',(_e, year: number) => fiscalExpensesDb.getByYear(year))
ipcMain.handle('fiscalExpenses:create',   (_e, data: unknown) => fiscalExpensesDb.create(data as fiscalExpensesDb.FiscalExpenseInput))
ipcMain.handle('fiscalExpenses:update',   (_e, id: number, data: unknown) => fiscalExpensesDb.update(id, data as fiscalExpensesDb.FiscalExpenseInput))
ipcMain.handle('fiscalExpenses:delete',   (_e, id: number) => fiscalExpensesDb.remove(id))

// Attachments IPC
function getAttachmentsDir(): string {
  const dir = join(getCurrentAccountStorageDir(), 'attachments')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

ipcMain.handle('attachments:getByEntity', (_e, entityType: string, entityId: number) => attachmentsDb.getByEntity(entityType, entityId))
ipcMain.handle('attachments:getAll', () => attachmentsDb.getAll())
ipcMain.handle('attachments:upload', async (_e, entityType: string, entityId: number, slot: string | null) => {
  const extensions = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff']
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Ajouter un fichier',
    filters: [
      { name: 'Documents et images', extensions },
    ],
    properties: ['openFile', 'multiSelections'],
  })
  if (canceled || filePaths.length === 0) return []

  const dir = getAttachmentsDir()
  const results: attachmentsDb.Attachment[] = []

  for (const srcPath of filePaths) {
    const ext = extname(srcPath).toLowerCase()
    const storedName = `${Date.now()}_${randomBytes(6).toString('hex')}${ext}`
    const destPath = join(dir, storedName)
    copyFileSync(srcPath, destPath)

    const stat = readFileSync(srcPath)
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
    }

    const record = attachmentsDb.create({
      entity_type: entityType,
      entity_id: entityId,
      slot: slot || null,
      file_name: srcPath.split(/[/\\]/).pop() || storedName,
      mime_type: mimeMap[ext] || 'application/octet-stream',
      file_size: stat.length,
      stored_name: storedName,
    })
    results.push(record)
  }

  return results
})

ipcMain.handle('attachments:read', (_e, id: number) => {
  const attachment = attachmentsDb.getById(id)
  if (!attachment) return { data: null, error: 'Piece jointe introuvable' }
  const filePath = join(getAttachmentsDir(), attachment.stored_name)
  try {
    const buffer = readFileSync(filePath)
    return { data: buffer.toString('base64'), mimeType: attachment.mime_type, error: null }
  } catch {
    return { data: null, mimeType: null, error: 'Fichier introuvable sur le disque' }
  }
})

ipcMain.handle('attachments:open', (_e, id: number) => {
  const attachment = attachmentsDb.getById(id)
  if (!attachment) return
  const filePath = join(getAttachmentsDir(), attachment.stored_name)
  if (existsSync(filePath)) shell.openPath(filePath)
})

ipcMain.handle('attachments:delete', (_e, id: number) => {
  const attachment = attachmentsDb.remove(id)
  if (!attachment) return false
  const filePath = join(getAttachmentsDir(), attachment.stored_name)
  try { if (existsSync(filePath)) unlinkSync(filePath) } catch { /* ignore */ }
  return true
})

// Bank imports IPC
ipcMain.handle('bankImports:findDuplicates', (_e, fingerprints: string[]) => bankImportsDb.findDuplicates(fingerprints))
ipcMain.handle('bankImports:recordImported', (_e, entries: Array<{ fingerprint: string; tx_date: string; description: string; amount: number; payment_id: number | null }>) => bankImportsDb.recordImported(entries))

// Backup / restore IPC
const BACKUP_EXTENSION = '.lfbackup'

interface BackupArchiveV1 {
  version: 1
  createdAt: string
  dbBase64: string
  authBase64: string
}

function hasValidSqliteHeader(buffer: Buffer): boolean {
  return buffer.toString('utf8', 0, 15) === 'SQLite format 3'
}

function ensureBackupPath(filePath: string): string {
  return extname(filePath).toLowerCase() === BACKUP_EXTENSION
    ? filePath
    : `${filePath}${BACKUP_EXTENSION}`
}

function removeSqliteSidecars(dbPath: string): void {
  for (const suffix of ['-wal', '-shm']) {
    const sidecarPath = `${dbPath}${suffix}`
    if (existsSync(sidecarPath)) {
      unlinkSync(sidecarPath)
    }
  }
}

async function buildBackupArchive(): Promise<BackupArchiveV1> {
  const tempDbPath = join(
    app.getPath('temp'),
    `leasefrance_backup_${Date.now()}_${randomBytes(6).toString('hex')}.db`,
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
    if (existsSync(tempDbPath)) {
      unlinkSync(tempDbPath)
    }
  }
}

function parseBackupArchive(raw: string): { dbBuffer: Buffer; authBuffer: Buffer } {
  let archive: unknown
  try {
    archive = JSON.parse(raw)
  } catch {
    throw new Error("Le fichier de sauvegarde est illisible ou n'est pas au format attendu.")
  }

  if (
    !archive ||
    typeof archive !== 'object' ||
    (archive as { version?: unknown }).version !== 1 ||
    typeof (archive as { dbBase64?: unknown }).dbBase64 !== 'string' ||
    typeof (archive as { authBase64?: unknown }).authBase64 !== 'string'
  ) {
    throw new Error('Le fichier de sauvegarde est incomplet.')
  }

  const dbBuffer = Buffer.from((archive as BackupArchiveV1).dbBase64, 'base64')
  const authBuffer = Buffer.from((archive as BackupArchiveV1).authBase64, 'base64')

  if (!hasValidSqliteHeader(dbBuffer)) {
    throw new Error("La base de donnees incluse dans la sauvegarde est invalide.")
  }

  try {
    JSON.parse(authBuffer.toString('utf8'))
  } catch {
    throw new Error("Le profil d'authentification inclus dans la sauvegarde est invalide.")
  }

  return { dbBuffer, authBuffer }
}

function readRestorePayload(srcPath: string): { dbBuffer: Buffer; authBuffer: Buffer } {
  if (extname(srcPath).toLowerCase() === BACKUP_EXTENSION) {
    return parseBackupArchive(readFileSync(srcPath, 'utf8'))
  }

  const dbBuffer = readFileSync(srcPath)
  if (!hasValidSqliteHeader(dbBuffer)) {
    throw new Error("Le fichier selectionne n'est pas une base de donnees SQLite valide.")
  }

  const authSrc = srcPath.replace(/\.db$/i, '_auth.json')
  if (!existsSync(authSrc)) {
    throw new Error("Cette sauvegarde legacy est incomplete : le fichier companion _auth.json est introuvable.")
  }

  const authBuffer = readFileSync(authSrc)
  try {
    JSON.parse(authBuffer.toString('utf8'))
  } catch {
    throw new Error("Le fichier companion _auth.json est invalide.")
  }

  return { dbBuffer, authBuffer }
}

ipcMain.handle('backup:create', async () => {
  const timestamp = new Date().toISOString().slice(0, 10)
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Sauvegarder les donnees',
    defaultPath: `leasefrance_backup_${timestamp}${BACKUP_EXTENSION}`,
    filters: [{ name: 'LeaseFrance Backup', extensions: [BACKUP_EXTENSION.slice(1)] }],
  })
  if (canceled || !filePath) return { saved: false, path: null }

  const targetPath = ensureBackupPath(filePath)
  const archive = await buildBackupArchive()
  writeFileSync(targetPath, JSON.stringify(archive), 'utf8')

  return { saved: true, path: targetPath }
})

ipcMain.handle('backup:restore', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Restaurer les donnees',
    filters: [
      { name: 'LeaseFrance Backup', extensions: [BACKUP_EXTENSION.slice(1)] },
      { name: 'SQLite Database (legacy)', extensions: ['db'] },
    ],
    properties: ['openFile'],
  })
  if (canceled || filePaths.length === 0) return { restored: false }

  const srcPath = filePaths[0]
  let payload: { dbBuffer: Buffer; authBuffer: Buffer }
  try {
    payload = readRestorePayload(srcPath)
  } catch (err) {
    return { restored: false, error: err instanceof Error ? err.message : String(err) }
  }

  // Close current DB connection before replacing
  closeDb()
  let targetAccountId: string
  try {
    targetAccountId = importAccountFromBackup(payload.authBuffer.toString('utf8')).accountId
  } catch (err) {
    return { restored: false, error: err instanceof Error ? err.message : String(err) }
  }

  const dbPath = getAccountDbPathById(targetAccountId)
  removeSqliteSidecars(dbPath)
  writeFileSync(dbPath, payload.dbBuffer)

  // Relaunch the app
  app.relaunch()
  app.exit(0)
  return { restored: true }
})

ipcMain.handle('backup:openDataFolder', () => {
  try {
    shell.openPath(getCurrentAccountStorageDir())
  } catch {
    shell.openPath(app.getPath('userData'))
  }
})

// Window controls via IPC
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window:close', () => mainWindow?.close())

app.whenReady()
  .then(() => {
    // Désactiver le menu applicatif en production
    if (!isDev) {
      app.applicationMenu = null
    }

    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  .catch((error: unknown) => {
    console.error('Failed to initialize the Electron main process.', error)
    app.quit()
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
