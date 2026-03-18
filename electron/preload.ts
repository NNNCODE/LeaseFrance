import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close:    () => ipcRenderer.send('window:close'),
  },
  auth: {
    hasPassword:   () => ipcRenderer.invoke('auth:hasPassword'),
    getProfile:    () => ipcRenderer.invoke('auth:getProfile'),
    setup:         (pwd: string, name: string, email: string) => ipcRenderer.invoke('auth:setup', pwd, name, email),
    verify:        (pwd: string) => ipcRenderer.invoke('auth:verify', pwd),
    change:        (old: string, next: string) => ipcRenderer.invoke('auth:change', old, next),
    updateProfile: (name: string, email: string) => ipcRenderer.invoke('auth:updateProfile', name, email),
    delete:        (pwd: string) => ipcRenderer.invoke('auth:delete', pwd),
  },
})
