import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import {
  hasPassword, setupPassword, verifyPassword,
  changePassword, updateProfile, deleteAccount, getProfile,
} from './auth'
import * as propertiesDb from './db/queries/properties'
import * as tenantsDb from './db/queries/tenants'
import * as leasesDb from './db/queries/leases'
import * as paymentsDb from './db/queries/payments'
import * as documentsDb from './db/queries/documents'
import * as irlDb from './db/queries/irl'

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

// Documents IPC
ipcMain.handle('documents:getAll', () => documentsDb.getAll())
ipcMain.handle('documents:delete', (_e, id) => documentsDb.remove(id))
ipcMain.handle('documents:savePdf', async (_e, leaseId: number, fileName: string, buffer: number[], docType?: string) => {
  const titleMap: Record<string, string> = { quittance: 'Enregistrer la quittance', recu: 'Enregistrer le reçu de loyer' }
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

// IRL IPC
ipcMain.handle('irl:getAll',            () => irlDb.getAll())
ipcMain.handle('irl:getByQuarter',      (_e, year: number, quarter: number) => irlDb.getByQuarter(year, quarter))
ipcMain.handle('irl:getLatestForQuarter',(_e, quarter: number) => irlDb.getLatestForQuarter(quarter))
ipcMain.handle('irl:upsert',           (_e, year: number, quarter: number, value: number) => irlDb.upsert(year, quarter, value))
ipcMain.handle('irl:delete',           (_e, id: number) => irlDb.remove(id))

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
