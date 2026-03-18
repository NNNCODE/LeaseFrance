import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import {
  hasPassword, setupPassword, verifyPassword,
  changePassword, updateProfile, deleteAccount, getProfile,
} from './auth'

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
ipcMain.handle('auth:updateProfile', (_e, name: string, email: string)         => updateProfile(name, email))
ipcMain.handle('auth:delete',   (_e, pwd: string)                              => deleteAccount(pwd))

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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
