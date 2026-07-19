import { app, BrowserWindow, shell, ipcMain, dialog, session } from 'electron'
import { writeFileSync, copyFileSync, existsSync, readFileSync, mkdirSync, unlinkSync, statSync } from 'fs'
import { basename, isAbsolute, join } from 'path'
import { randomBytes } from 'crypto'
import { configureUserDataPath } from './appIdentity'
import { closeDb } from './db/database'
import {
  deleteAccount,
  createOwnerProfile, deleteOwnerProfile,
  getAccountDbPathById, getCurrentAccountStorageDir, getProfile,
  getActiveOwnerProfile, listOwnerProfiles,
  lockCurrentSession, restoreRememberedSession,
  hasRecoveryKey, verifyRecoveryKey, resetWithRecoveryKey, regenerateRecoveryKey,
  hasPassword, importAccountFromBackup, setupPassword, verifyPassword,
  changePassword, setActiveOwnerProfile, updateOwnerProfile, updateProfile,
} from './auth'
import {
  BACKUP_EXTENSION, buildBackupArchive, ensureBackupPath,
  readRestorePayload, removeSqliteSidecars, serializeArchive,
  getBackupSettings, saveBackupSettings, recordBackupDone,
  startAutoBackupTimer, stopAutoBackupTimer,
  verifyBackupFile, previewBackupFile,
} from './backupManager'
import * as propertiesDb from './db/queries/properties'
import * as propertyDiagnosticsDb from './db/queries/propertyDiagnostics'
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
import {
  getAppRuntimeLogPath,
  initAppRuntimeTracking,
  markAppExitClean,
  markAppExitUnclean,
  normalizeRendererRuntimeEventPayload,
  recordAppBootstrapFailure,
  recordMainUncaughtException,
  recordMainUnhandledRejection,
  recordPreloadError,
  recordRendererLoadFailure,
  recordRendererProcessGone,
  recordRendererRuntimeError,
} from './appRuntime'
import { exportDiagnosticsReport, openLogsFolder } from './diagnostics'
import { activateLicense, getLicenseState, initLicenseRuntime, refreshLicense } from './license'
import type { BaillioInvokeChannels, BaillioWindowChannels } from '../src/shared/ipc'
import { validateInvokeArgs } from '../src/shared/ipcValidation'
import { ATTACHMENT_DIALOG_EXTENSIONS, validateAttachmentFileSelection } from './security/attachments'
import { buildContentSecurityPolicy } from './security/csp'
import { isAllowedExternalUrl } from './security/externalLinks'

const isDev = process.env['ELECTRON_RENDERER_URL'] !== undefined

let mainWindow: BrowserWindow | null = null
let lastPreviewedRestorePath: string | null = null
let isHandlingFatalMainError = false
const sessionDataPath = join(app.getPath('temp'), 'baillio', 'session-data', String(process.pid))

function configureSessionDataPath(): void {
  mkdirSync(sessionDataPath, { recursive: true })
  app.setPath('sessionData', sessionDataPath)
}

configureSessionDataPath()
configureUserDataPath()
initAppRuntimeTracking()

function showSupportError(title: string, message: string): void {
  if (isDev) return
  try {
    dialog.showErrorBox(title, `${message}\n\nLog file: ${getAppRuntimeLogPath()}`)
  } catch {
    // Ignore dialog failures on degraded startup paths.
  }
}

function handleFatalMainProcessError(error: unknown): void {
  if (isHandlingFatalMainError) return
  isHandlingFatalMainError = true
  recordMainUncaughtException(error)
  markAppExitUnclean('main-uncaughtException')
  showSupportError(
    'Baillio encountered a fatal error',
    'The app needs to close. Restart it, then export Diagnostics or send the logs folder if the problem happens again.',
  )
  app.exit(1)
}

function attachWindowRuntimeObservers(window: BrowserWindow): void {
  window.webContents.on('render-process-gone', (_event, details) => {
    recordRendererProcessGone({
      reason: details.reason,
      exitCode: details.exitCode,
      windowId: window.id,
      webContentsId: window.webContents.id,
      url: window.webContents.getURL() || null,
    })
    showSupportError(
      'Baillio window crashed',
      'The application window stopped unexpectedly. Restart the app and send Diagnostics or the logs folder if this repeats.',
    )
  })

  window.webContents.on('preload-error', (_event, preloadPath, error) => {
    recordPreloadError({
      preloadPath,
      error,
      windowId: window.id,
      webContentsId: window.webContents.id,
      url: window.webContents.getURL() || null,
    })
    showSupportError(
      'Baillio failed to initialize',
      'A preload error prevented the window from starting correctly. Restart the app and send Diagnostics or the logs folder if this repeats.',
    )
  })

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return
    recordRendererLoadFailure({
      errorCode,
      errorDescription,
      validatedURL,
      windowId: window.id,
      webContentsId: window.webContents.id,
    })
    showSupportError(
      'Baillio could not open the app window',
      'The app window failed to load. Restart the app and send Diagnostics or the logs folder if this repeats.',
    )
  })
}

function toNodeBuffer(data: Uint8Array): Buffer {
  return Buffer.from(data)
}

function handle<Channel extends keyof BaillioInvokeChannels>(
  channel: Channel,
  handler: (...args: BaillioInvokeChannels[Channel]['args']) =>
    BaillioInvokeChannels[Channel]['return']
    | Promise<BaillioInvokeChannels[Channel]['return']>,
): void {
  ipcMain.handle(channel, (_event, ...rawArgs: unknown[]) => {
    const args = validateInvokeArgs(channel, rawArgs)
    return handler(...args)
  })
}

function onWindow<Channel extends keyof BaillioWindowChannels>(
  channel: Channel,
  listener: () => void,
): void {
  ipcMain.on(channel, () => listener())
}

process.on('uncaughtException', (error) => {
  handleFatalMainProcessError(error)
})

process.on('unhandledRejection', (reason) => {
  recordMainUnhandledRejection(reason)
})

app.once('before-quit', () => {
  markAppExitClean('before-quit')
})

ipcMain.on('app-runtime:renderer-event', (event, payload: unknown) => {
  const normalizedPayload = normalizeRendererRuntimeEventPayload(payload)
  if (!normalizedPayload) return

  const ownerWindow = BrowserWindow.fromWebContents(event.sender)
  recordRendererRuntimeError({
    payload: normalizedPayload,
    windowId: ownerWindow?.id ?? null,
    webContentsId: event.sender.id,
    url: event.sender.getURL() || null,
  })
})

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
  attachWindowRuntimeObservers(mainWindow)

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
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url).catch(() => {
        // Ignore OS-level failures; the renderer must not gain a fallback path.
      })
    }
    return { action: 'deny' }
  })

  // Désactiver le menu contextuel clic droit en production
  if (!isDev) {
    mainWindow.webContents.on('context-menu', (e) => e.preventDefault())
  }

  // Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = buildContentSecurityPolicy(isDev)
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

handle('owners:list', () => listOwnerProfiles())
handle('owners:getActive', () => getActiveOwnerProfile())
handle('owners:create', (draft) => createOwnerProfile(draft))
handle('owners:update', (id, patch) => updateOwnerProfile(id, patch))
handle('owners:setActive', (id) => setActiveOwnerProfile(id))
handle('owners:delete', (id) => deleteOwnerProfile(id))

// Properties IPC
handle('properties:getAll', () => propertiesDb.getAll())
handle('properties:count', () => propertiesDb.count())
handle('properties:create', (data) => propertiesDb.create(data))
handle('properties:update', (id, data, expectedUpdatedAt) => propertiesDb.update(id, data, expectedUpdatedAt))
handle('properties:delete', (id) => propertiesDb.remove(id))

handle('propertyDiagnostics:getAll', () => propertyDiagnosticsDb.getAll())
handle('propertyDiagnostics:getByProperty', (propertyId) => propertyDiagnosticsDb.getByProperty(propertyId))
handle('propertyDiagnostics:upsert', (propertyId, data) => propertyDiagnosticsDb.upsert(propertyId, data))

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
handle('leases:deleteWithLinkedRecords', (id) => leasesDb.removeWithLinkedRecords(id))

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
handle('documents:delete', (id) => {
  const document = documentsDb.getById(id)
  const removed = documentsDb.remove(id)
  // Only unlink files we manage; legacy absolute paths point at user-chosen locations.
  if (removed && document?.file_path && !isAbsolute(document.file_path)) {
    const fullPath = resolveManagedDocumentPath(document.file_path)
    try { if (fullPath && existsSync(fullPath)) unlinkSync(fullPath) } catch { /* ignore */ }
  }
  return removed
})
handle('documents:savePdf', async (leaseId, fileName, buffer, docType) => {
  const dir = getManagedDocumentsDir()
  const targetPath = uniqueManagedPdfPath(dir, sanitizePdfFileName(fileName))
  writeFileSync(targetPath, toNodeBuffer(buffer))
  documentsDb.create(leaseId, docType ?? 'quittance', `${MANAGED_DOCUMENTS_DIR_NAME}/${basename(targetPath)}`)
  return { saved: true, path: targetPath }
})
handle('documents:exportCopy', async (id) => {
  const document = documentsDb.getById(id)
  if (!document?.file_path) return { saved: false, path: null }
  const sourcePath = resolveManagedDocumentPath(document.file_path)
  if (!sourcePath || !existsSync(sourcePath)) return { saved: false, path: null }
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Exporter le document',
    defaultPath: basename(sourcePath),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (canceled || !filePath) return { saved: false, path: null }
  copyFileSync(sourcePath, filePath)
  return { saved: true, path: filePath }
})
handle('documents:showInFolder', (id) => {
  const document = documentsDb.getById(id)
  if (!document?.file_path) return
  const fullPath = resolveManagedDocumentPath(document.file_path)
  if (fullPath && existsSync(fullPath)) shell.showItemInFolder(fullPath)
})
handle('documents:importForLease', async (leaseId, docType) => {
  const titleMap: Record<string, string> = {
    contrat_location: 'Importer un contrat de location',
    contrat_location_meublee: 'Importer un contrat de location meublee',
  }
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: titleMap[docType ?? 'contrat_location'] ?? 'Importer un document',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    properties: ['openFile'],
  })
  if (canceled || filePaths.length === 0) return { imported: false, path: null }
  documentsDb.create(leaseId, docType ?? 'contrat_location', filePaths[0])
  return { imported: true, path: filePaths[0] }
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

// Generated PDFs live inside the per-account storage dir so they follow backups.
// documents.file_path is relative ("documents/<file>.pdf") for managed files;
// absolute paths are legacy rows saved before the managed library existed.
const MANAGED_DOCUMENTS_DIR_NAME = 'documents'

function getManagedDocumentsDir(): string {
  const dir = join(getCurrentAccountStorageDir(), MANAGED_DOCUMENTS_DIR_NAME)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function sanitizePdfFileName(fileName: string): string {
  const cleaned = basename(fileName).replace(/[<>:"/\\|?*]/g, '_').trim()
  return cleaned || 'document.pdf'
}

function uniqueManagedPdfPath(dir: string, fileName: string): string {
  const ext = '.pdf'
  const stem = fileName.toLowerCase().endsWith(ext) ? fileName.slice(0, -ext.length) : fileName
  for (let index = 1; ; index += 1) {
    const candidate = index === 1 ? `${stem}${ext}` : `${stem}_${index}${ext}`
    const fullPath = join(dir, candidate)
    if (!existsSync(fullPath)) return fullPath
  }
}

function resolveManagedDocumentPath(storedPath: string): string | null {
  if (isAbsolute(storedPath)) return storedPath
  const segments = storedPath.replace(/\\/g, '/').split('/')
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return null
  return join(getCurrentAccountStorageDir(), ...segments)
}

function resolveKnownDocumentPath(filePath: string): string | null {
  const document = documentsDb.getByFilePath(filePath)
  if (!document?.file_path) return null
  return resolveManagedDocumentPath(document.file_path)
}

handle('attachments:getByEntity', (entityType, entityId) => attachmentsDb.getByEntity(entityType, entityId))
handle('attachments:getAll', () => attachmentsDb.getAll())
handle('attachments:upload', async (entityType, entityId, slot) => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Ajouter un fichier',
    filters: [
      { name: 'Documents, images et videos', extensions: ATTACHMENT_DIALOG_EXTENSIONS },
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
    defaultPath: `baillio_backup_${timestamp}${BACKUP_EXTENSION}`,
    filters: [{ name: 'Baillio Backup', extensions: [BACKUP_EXTENSION.slice(1)] }],
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
    filters: [{ name: 'Baillio Backup', extensions: [BACKUP_EXTENSION.slice(1)] }],
    properties: ['openFile'],
  })
  if (canceled || filePaths.length === 0) return null
  return verifyBackupFile(filePaths[0], password || undefined)
})

handle('backup:preview', async (password?) => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Selectionner une sauvegarde a restaurer',
    filters: [
      { name: 'Baillio Backup', extensions: [BACKUP_EXTENSION.slice(1)] },
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

handle('diagnostics:exportReport', () => exportDiagnosticsReport())
handle('diagnostics:openLogsFolder', () => openLogsFolder())

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
    recordAppBootstrapFailure(error)
    markAppExitUnclean('app-bootstrap-failure')
    showSupportError(
      'Baillio failed to start',
      'The app could not finish startup. Restart it, then send Diagnostics or the logs folder if the problem happens again.',
    )
    app.exit(1)
  })

app.on('window-all-closed', () => {
  stopAutoBackupTimer()
  if (process.platform !== 'darwin') app.quit()
})
