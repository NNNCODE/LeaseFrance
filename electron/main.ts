import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { writeFileSync, copyFileSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { closeDb, getDbPath } from './db/database'
import {
  hasPassword, setupPassword, verifyPassword,
  changePassword, updateProfile, deleteAccount, getProfile,
  hasRecoveryKey, verifyRecoveryKey, resetWithRecoveryKey, regenerateRecoveryKey,
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
import * as fiscalExpensesDb from './db/queries/fiscalExpenses'

const isDev = process.env['ELECTRON_RENDERER_URL'] !== undefined

let mainWindow: BrowserWindow | null = null

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
ipcMain.handle('auth:setup',    (_e, pwd: string, name: string, email: string) => setupPassword(pwd, name, email))
ipcMain.handle('auth:verify',   (_e, pwd: string)                              => verifyPassword(pwd))
ipcMain.handle('auth:change',   (_e, oldPwd: string, newPwd: string)           => changePassword(oldPwd, newPwd))
ipcMain.handle('auth:updateProfile', (_e, name: string, email: string, address?: string, city?: string, phone?: string, signatureImage?: string) => updateProfile(name, email, address, city, phone, signatureImage))
ipcMain.handle('auth:delete',   (_e, pwd: string)                              => deleteAccount(pwd))
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

// Bank imports IPC
ipcMain.handle('bankImports:findDuplicates', (_e, fingerprints: string[]) => bankImportsDb.findDuplicates(fingerprints))
ipcMain.handle('bankImports:recordImported', (_e, entries: Array<{ fingerprint: string; tx_date: string; description: string; amount: number; payment_id: number | null }>) => bankImportsDb.recordImported(entries))

// Backup / restore IPC
const AUTH_FILE = join(app.getPath('userData'), 'auth.json')

ipcMain.handle('backup:create', async () => {
  const timestamp = new Date().toISOString().slice(0, 10)
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Sauvegarder la base de donnees',
    defaultPath: `leasefrance_backup_${timestamp}.db`,
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
  })
  if (canceled || !filePath) return { saved: false, path: null }

  const dbPath = getDbPath()
  copyFileSync(dbPath, filePath)

  // Also copy auth.json alongside the DB backup
  if (existsSync(AUTH_FILE)) {
    const authDest = filePath.replace(/\.db$/, '_auth.json')
    copyFileSync(AUTH_FILE, authDest)
  }

  return { saved: true, path: filePath }
})

ipcMain.handle('backup:restore', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Restaurer la base de donnees',
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    properties: ['openFile'],
  })
  if (canceled || filePaths.length === 0) return { restored: false }

  const srcPath = filePaths[0]

  // Validate: check the SQLite magic header
  const header = Buffer.alloc(16)
  const fd = readFileSync(srcPath)
  fd.copy(header, 0, 0, 16)
  if (header.toString('utf8', 0, 15) !== 'SQLite format 3') {
    return { restored: false, error: 'Le fichier selectionne n\'est pas une base de donnees SQLite valide.' }
  }

  // Close current DB connection before replacing
  closeDb()

  const dbPath = getDbPath()
  copyFileSync(srcPath, dbPath)

  // Check for companion auth file
  const authSrc = srcPath.replace(/\.db$/, '_auth.json')
  if (existsSync(authSrc)) {
    copyFileSync(authSrc, AUTH_FILE)
  }

  // Relaunch the app
  app.relaunch()
  app.exit(0)
  return { restored: true }
})

ipcMain.handle('backup:openDataFolder', () => {
  shell.openPath(app.getPath('userData'))
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

app.whenReady().then(() => {
  // Désactiver le menu applicatif en production
  if (!isDev) {
    app.applicationMenu = null
  }

  createWindow()

  // Seed IRL indices with real INSEE data
  irlDb.seedIfEmpty()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
