import { app, BrowserWindow, shell, ipcMain, dialog, session } from 'electron'
import { writeFileSync, copyFileSync, existsSync, readFileSync, mkdirSync, unlinkSync, statSync } from 'fs'
import { join } from 'path'
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
import {
  BACKUP_EXTENSION, buildBackupArchive, ensureBackupPath,
  readRestorePayload, removeSqliteSidecars, serializeArchive,
  getBackupSettings, saveBackupSettings, recordBackupDone,
  startAutoBackupTimer, stopAutoBackupTimer,
  verifyBackupFile, previewBackupFile,
} from './backupManager'
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
import { getDashboardSnapshot } from './services/dashboard'
import { getDocumentGenerationAvailability, getDocumentGenerationSources } from './services/documents'
import { getReminderFeed } from './services/reminders'
import { querySearch } from './services/search'
import { checkForUpdates, downloadUpdate, getAutoUpdateState, initAutoUpdates, installUpdate } from './autoUpdate'
import { activateLicense, getLicenseState, initLicenseRuntime, refreshLicense } from './license'
import type { RentFlowInvokeChannels, RentFlowWindowChannels } from '../src/shared/ipc'
import { validateInvokeArgs } from '../src/shared/ipcValidation'
import { ATTACHMENT_DIALOG_EXTENSIONS, validateAttachmentFileSelection } from './security/attachments'

const isDev = process.env['ELECTRON_RENDERER_URL'] !== undefined

let mainWindow: BrowserWindow | null = null
let lastPreviewedRestorePath: string | null = null
const sessionDataPath = join(app.getPath('temp'), 'rentflow', 'session-data', String(process.pid))

function configureSessionDataPath(): void {
  mkdirSync(sessionDataPath, { recursive: true })
  app.setPath('sessionData', sessionDataPath)
}

configureSessionDataPath()

function toNodeBuffer(data: Uint8Array): Buffer {
  return Buffer.from(data)
}

function handle<Channel extends keyof RentFlowInvokeChannels>(
  channel: Channel,
  handler: (...args: RentFlowInvokeChannels[Channel]['args']) =>
    RentFlowInvokeChannels[Channel]['return']
    | Promise<RentFlowInvokeChannels[Channel]['return']>,
): void {
  ipcMain.handle(channel, (_event, ...rawArgs: unknown[]) => {
    const args = validateInvokeArgs(channel, rawArgs)
    return handler(...args)
  })
}

function onWindow<Channel extends keyof RentFlowWindowChannels>(
  channel: Channel,
  listener: () => void,
): void {
  ipcMain.on(channel, () => listener())
}

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
      // sandbox: false is required because better-sqlite3 is a native Node addon
      // that must be loaded in the preload script. Sandboxed preload scripts cannot
      // require native modules. Security is maintained through:
      //   - contextIsolation: true  (renderer cannot access Node globals)
      //   - nodeIntegration: false  (renderer cannot require() modules)
      //   - CSP headers             (injected via session.webRequest)
      //   - whitelist-only API      (only explicitly bridged methods are exposed)
      // See docs/SECURITY.md for the full rationale.
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev,
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

  // Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' ws://localhost:* http://localhost:*;"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self';"
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    })
  })

  if (isDev) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']!)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Auth IPC
handle('auth:hasPassword', () => hasPassword())
handle('auth:getProfile', () => getProfile())
handle('auth:restoreRememberedSession', () => restoreRememberedSession())
handle('auth:setup', (pwd, name, email) => setupPassword(pwd, name, email))
handle('auth:verify', (email, pwd, remember) => verifyPassword(email, pwd, remember))
handle('auth:change', (oldPwd, newPwd) => changePassword(oldPwd, newPwd))
handle('auth:updateProfile', (name, email, address, city, phone, signatureImage) =>
  updateProfile(name, email, address, city, phone, signatureImage))
handle('auth:delete', (pwd) => { closeDb(); return deleteAccount(pwd) })
handle('auth:lockSession', () => { closeDb(); return lockCurrentSession() })
handle('auth:hasRecoveryKey', () => hasRecoveryKey())
handle('auth:verifyRecoveryKey', (key) => verifyRecoveryKey(key))
handle('auth:resetWithRecoveryKey', (key, newPwd) => resetWithRecoveryKey(key, newPwd))
handle('auth:regenerateRecoveryKey', (pwd) => regenerateRecoveryKey(pwd))

// Properties IPC
handle('properties:getAll', () => propertiesDb.getAll())
handle('properties:count', () => propertiesDb.count())
handle('properties:create', (data) => propertiesDb.create(data))
handle('properties:update', (id, data, expectedUpdatedAt) => propertiesDb.update(id, data, expectedUpdatedAt))
handle('properties:delete', (id) => propertiesDb.remove(id))

// Tenants IPC
handle('tenants:getAll', () => tenantsDb.getAll())
handle('tenants:count', () => tenantsDb.count())
handle('tenants:create', (data) => tenantsDb.create(data))
handle('tenants:update', (id, data, expectedUpdatedAt) => tenantsDb.update(id, data, expectedUpdatedAt))
handle('tenants:delete', (id) => tenantsDb.remove(id))

// Leases IPC
handle('leases:getAll', () => leasesDb.getAll())
handle('leases:count', () => leasesDb.count())
handle('leases:create', (data) => leasesDb.create(data))
handle('leases:update', (id, data, expectedUpdatedAt) => leasesDb.update(id, data, expectedUpdatedAt))
handle('leases:updateContractDetails', (id, contractDetails, expectedUpdatedAt) =>
  leasesDb.updateContractDetails(id, contractDetails, expectedUpdatedAt))
handle('leases:delete', (id) => leasesDb.remove(id))

// Payments IPC
handle('payments:getAll', () => paymentsDb.getAll())
handle('payments:getByLease', (leaseId) => paymentsDb.getByLease(leaseId))
handle('payments:getSummary', () => paymentsDb.getSummary())
handle('payments:create', (data) => paymentsDb.create(data))
handle('payments:update', (id, data, expectedUpdatedAt) => paymentsDb.update(id, data, expectedUpdatedAt))
handle('payments:markPaid', (id, date, expectedUpdatedAt) => paymentsDb.markPaid(id, date, expectedUpdatedAt))
handle('payments:delete', (id) => paymentsDb.remove(id))

// Auto-rent IPC
handle('payments:generateMissing', () => autoRentDb.generateMissingPayments())
handle('payments:markOverdue', () => autoRentDb.markOverduePayments())

// Payment reminders IPC
handle('paymentReminders:getByPayment', (paymentId) => paymentRemindersDb.getByPayment(paymentId))
handle('paymentReminders:create', (data) => paymentRemindersDb.create(data))

// Inspections IPC
handle('inspections:getAll', () => inspectionsDb.getAll())
handle('inspections:create', (data) => inspectionsDb.create(data))
handle('inspections:update', (id, data) => inspectionsDb.update(id, data))
handle('inspections:delete', (id) => inspectionsDb.remove(id))

// Charge reconciliations IPC
handle('chargeReconciliations:getByLease', (leaseId) => chargeReconciliationsDb.getByLease(leaseId))
handle('chargeReconciliations:create', (data) => chargeReconciliationsDb.create(data))
handle('chargeReconciliations:update', (id, data) => chargeReconciliationsDb.update(id, data))
handle('chargeReconciliations:delete', (id) => chargeReconciliationsDb.remove(id))

// Manual reminders IPC
handle('manualReminders:getAll', () => manualRemindersDb.getAll())
handle('manualReminders:create', (data) => manualRemindersDb.create(data))
handle('manualReminders:update', (id, data) => manualRemindersDb.update(id, data))
handle('manualReminders:delete', (id) => manualRemindersDb.remove(id))

// Dashboard + search IPC
handle('dashboard:getSnapshot', () => getDashboardSnapshot())
handle('search:query', (query, filter) => querySearch(query, filter))
handle('reminders:getFeed', () => getReminderFeed())

// Documents IPC
handle('documents:getAll', () => documentsDb.getAll())
handle('documents:getGenerationAvailability', () => getDocumentGenerationAvailability())
handle('documents:getGenerationSources', () => getDocumentGenerationSources())
handle('documents:delete', (id) => documentsDb.remove(id))
handle('documents:savePdf', async (leaseId, fileName, buffer, docType) => {
  const titleMap: Record<string, string> = {
    quittance: 'Enregistrer la quittance',
    recu: 'Enregistrer le recu de loyer',
    avis_revision_loyer: "Enregistrer l'avis de revision du loyer",
    contrat_location_meublee: 'Enregistrer le contrat de location meublee',
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
  writeFileSync(filePath, toNodeBuffer(buffer))
  documentsDb.create(leaseId, docType ?? 'quittance', filePath)
  return { saved: true, path: filePath }
})
handle('documents:updateStatus', (id, status) => documentsDb.updateStatus(id, status))
handle('documents:readFile', (filePath) => {
  const knownPath = resolveKnownDocumentPath(filePath)
  if (!knownPath) {
    return { data: null, mimeType: null, error: 'Document introuvable' }
  }
  try {
    const buffer = readFileSync(knownPath)
    return { data: buffer, mimeType: 'application/pdf', error: null }
  } catch {
    return { data: null, mimeType: null, error: 'Fichier introuvable' }
  }
})
handle('documents:openFile', (filePath) => {
  const knownPath = resolveKnownDocumentPath(filePath)
  if (!knownPath) return
  shell.openPath(knownPath)
})

handle('exports:saveFile', async (fileName, buffer, filters) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Exporter le fichier',
    defaultPath: fileName,
    filters: filters && filters.length > 0 ? filters : undefined,
  })
  if (canceled || !filePath) return { saved: false, path: null }
  writeFileSync(filePath, toNodeBuffer(buffer))
  return { saved: true, path: filePath }
})

// IRL IPC
handle('irl:getAll', () => irlDb.getAll())
handle('irl:getByQuarter', (year, quarter) => irlDb.getByQuarter(year, quarter))
handle('irl:getLatestForQuarter', (quarter) => irlDb.getLatestForQuarter(quarter))
handle('irl:upsert', (year, quarter, value) => irlDb.upsert(year, quarter, value))
handle('irl:delete', (id) => irlDb.remove(id))

// Fiscal expenses IPC
handle('fiscalExpenses:getAll', () => fiscalExpensesDb.getAll())
handle('fiscalExpenses:getByYear', (year) => fiscalExpensesDb.getByYear(year))
handle('fiscalExpenses:create', (data) => fiscalExpensesDb.create(data))
handle('fiscalExpenses:update', (id, data) => fiscalExpensesDb.update(id, data))
handle('fiscalExpenses:delete', (id) => fiscalExpensesDb.remove(id))

// Attachments IPC
function getAttachmentsDir(): string {
  const dir = join(getCurrentAccountStorageDir(), 'attachments')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function resolveKnownDocumentPath(filePath: string): string | null {
  const document = documentsDb.getByFilePath(filePath)
  return document?.file_path ?? null
}

handle('attachments:getByEntity', (entityType, entityId) => attachmentsDb.getByEntity(entityType, entityId))
handle('attachments:getAll', () => attachmentsDb.getAll())
handle('attachments:upload', async (entityType, entityId, slot) => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Ajouter un fichier',
    filters: [
      { name: 'Documents et images', extensions: ATTACHMENT_DIALOG_EXTENSIONS },
    ],
    properties: ['openFile', 'multiSelections'],
  })
  if (canceled || filePaths.length === 0) return []

  const dir = getAttachmentsDir()
  const results: attachmentsDb.Attachment[] = []
  const validatedSelections = filePaths.map((srcPath) => {
    const validated = validateAttachmentFileSelection(srcPath)
    return {
      srcPath,
      ...validated,
      fileSize: statSync(srcPath).size,
    }
  })

  for (const selection of validatedSelections) {
    const storedName = `${Date.now()}_${randomBytes(6).toString('hex')}${selection.extension}`
    const destPath = join(dir, storedName)
    copyFileSync(selection.srcPath, destPath)

    const record = attachmentsDb.create({
      entity_type: entityType,
      entity_id: entityId,
      slot: slot || null,
      file_name: selection.fileName || storedName,
      mime_type: selection.mimeType,
      file_size: selection.fileSize,
      stored_name: storedName,
    })
    results.push(record)
  }

  return results
})

handle('attachments:read', (id) => {
  const attachment = attachmentsDb.getById(id)
  if (!attachment) return { data: null, mimeType: null, error: 'Piece jointe introuvable' }
  const filePath = join(getAttachmentsDir(), attachment.stored_name)
  try {
    const buffer = readFileSync(filePath)
    return { data: buffer, mimeType: attachment.mime_type, error: null }
  } catch {
    return { data: null, mimeType: null, error: 'Fichier introuvable sur le disque' }
  }
})

handle('attachments:open', (id) => {
  const attachment = attachmentsDb.getById(id)
  if (!attachment) return
  const filePath = join(getAttachmentsDir(), attachment.stored_name)
  if (existsSync(filePath)) shell.openPath(filePath)
})

handle('attachments:delete', (id) => {
  const attachment = attachmentsDb.remove(id)
  if (!attachment) return false
  const filePath = join(getAttachmentsDir(), attachment.stored_name)
  try { if (existsSync(filePath)) unlinkSync(filePath) } catch { /* ignore */ }
  return true
})

// Bank imports IPC
handle('bankImports:findDuplicates', (fingerprints) => bankImportsDb.findDuplicates(fingerprints))
handle('bankImports:recordImported', (entries) => bankImportsDb.recordImported(entries))

// ── Backup / restore IPC ─────────────────────────────────────────────────────

handle('backup:create', async (password?) => {
  const timestamp = new Date().toISOString().slice(0, 10)
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Sauvegarder les donnees',
    defaultPath: `rentflow_backup_${timestamp}${BACKUP_EXTENSION}`,
    filters: [{ name: 'RentFlow Backup', extensions: [BACKUP_EXTENSION.slice(1)] }],
  })
  if (canceled || !filePath) return { saved: false, path: null }

  const targetPath = ensureBackupPath(filePath)
  const archive = await buildBackupArchive()
  writeFileSync(targetPath, serializeArchive(archive, password || undefined), 'utf8')

  const size = statSync(targetPath).size
  recordBackupDone(targetPath, size)

  return { saved: true, path: targetPath }
})

handle('backup:getSettings', () => {
  return getBackupSettings()
})

handle('backup:updateSettings', (patch) => {
  const updated = saveBackupSettings(patch)
  // Restart or stop the timer according to new settings
  if (updated.autoEnabled && updated.destinationFolder) {
    startAutoBackupTimer()
  } else {
    stopAutoBackupTimer()
  }
  return updated
})

handle('backup:pickFolder', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Choisir le dossier de sauvegarde automatique',
    properties: ['openDirectory', 'createDirectory'],
  })
  if (canceled || filePaths.length === 0) return null
  return filePaths[0]
})

handle('backup:verify', async (password?) => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Verifier une sauvegarde',
    filters: [{ name: 'RentFlow Backup', extensions: [BACKUP_EXTENSION.slice(1)] }],
    properties: ['openFile'],
  })
  if (canceled || filePaths.length === 0) return null
  return verifyBackupFile(filePaths[0], password || undefined)
})

handle('backup:preview', async (password?) => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Selectionner une sauvegarde a restaurer',
    filters: [
      { name: 'RentFlow Backup', extensions: [BACKUP_EXTENSION.slice(1)] },
      { name: 'SQLite Database (legacy)', extensions: ['db'] },
    ],
    properties: ['openFile'],
  })
  if (canceled || filePaths.length === 0) {
    lastPreviewedRestorePath = null
    return null
  }
  lastPreviewedRestorePath = filePaths[0]
  return previewBackupFile(filePaths[0], password || undefined)
})

handle('backup:restoreFromPath', async (filePath, password?) => {
  if (filePath !== lastPreviewedRestorePath) {
    return { restored: false, error: 'Sauvegarde non autorisee. Relancez la previsualisation avant de restaurer.' }
  }
  lastPreviewedRestorePath = null
  let payload: { dbBuffer: Buffer; authBuffer: Buffer }
  try {
    payload = readRestorePayload(filePath, password || undefined)
  } catch (err) {
    return { restored: false, error: err instanceof Error ? err.message : String(err) }
  }

  closeDb()
  stopAutoBackupTimer()

  let targetAccountId: string
  try {
    targetAccountId = (await importAccountFromBackup(payload.authBuffer.toString('utf8'))).accountId
  } catch (err) {
    return { restored: false, error: err instanceof Error ? err.message : String(err) }
  }

  const dbPath = getAccountDbPathById(targetAccountId)
  removeSqliteSidecars(dbPath)
  writeFileSync(dbPath, payload.dbBuffer)

  app.relaunch()
  app.exit(0)
  return { restored: true }
})

handle('backup:openDataFolder', () => {
  try {
    shell.openPath(getCurrentAccountStorageDir())
  } catch {
    shell.openPath(app.getPath('userData'))
  }
})

handle('license:getState', () => getLicenseState())
handle('license:activate', (billingEmail, activationCode) => activateLicense(billingEmail, activationCode))
handle('license:refresh', () => refreshLicense())

handle('updates:getState', () => getAutoUpdateState())
handle('updates:check', () => checkForUpdates())
handle('updates:download', () => downloadUpdate())
handle('updates:install', () => installUpdate())

// Window controls via IPC
onWindow('window:minimize', () => mainWindow?.minimize())
onWindow('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
onWindow('window:close', () => mainWindow?.close())

app.whenReady()
  .then(() => {
    // Désactiver le menu applicatif en production
    if (!isDev) {
      app.applicationMenu = null
    }

    createWindow()
    initLicenseRuntime((licenseState) => {
      for (const window of BrowserWindow.getAllWindows()) {
        if (!window.isDestroyed()) {
          window.webContents.send('license:stateChanged', licenseState)
        }
      }
    })
    initAutoUpdates((updateState) => {
      for (const window of BrowserWindow.getAllWindows()) {
        if (!window.isDestroyed()) {
          window.webContents.send('updates:stateChanged', updateState)
        }
      }
    })
    startAutoBackupTimer()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  .catch((error: unknown) => {
    console.error('Failed to initialize the Electron main process.', error)
    app.quit()
  })

app.on('window-all-closed', () => {
  stopAutoBackupTimer()
  if (process.platform !== 'darwin') app.quit()
})
