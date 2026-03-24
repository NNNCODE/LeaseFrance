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
    updateProfile: (name: string, email: string, address?: string, city?: string, phone?: string, signatureImage?: string) => ipcRenderer.invoke('auth:updateProfile', name, email, address, city, phone, signatureImage),
    delete:        (pwd: string) => ipcRenderer.invoke('auth:delete', pwd),
  },
  properties: {
    getAll: () => ipcRenderer.invoke('properties:getAll'),
    count:  () => ipcRenderer.invoke('properties:count'),
    create: (data: unknown) => ipcRenderer.invoke('properties:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('properties:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('properties:delete', id),
  },
  tenants: {
    getAll: () => ipcRenderer.invoke('tenants:getAll'),
    count:  () => ipcRenderer.invoke('tenants:count'),
    create: (data: unknown) => ipcRenderer.invoke('tenants:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('tenants:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('tenants:delete', id),
  },
  leases: {
    getAll: () => ipcRenderer.invoke('leases:getAll'),
    count:  () => ipcRenderer.invoke('leases:count'),
    create: (data: unknown) => ipcRenderer.invoke('leases:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('leases:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('leases:delete', id),
  },
  payments: {
    getAll:     () => ipcRenderer.invoke('payments:getAll'),
    getByLease: (leaseId: number) => ipcRenderer.invoke('payments:getByLease', leaseId),
    getSummary: () => ipcRenderer.invoke('payments:getSummary'),
    create:     (data: unknown) => ipcRenderer.invoke('payments:create', data),
    update:     (id: number, data: unknown) => ipcRenderer.invoke('payments:update', id, data),
    markPaid:   (id: number, date: string) => ipcRenderer.invoke('payments:markPaid', id, date),
    delete:     (id: number) => ipcRenderer.invoke('payments:delete', id),
  },
  paymentReminders: {
    getByPayment: (paymentId: number) => ipcRenderer.invoke('paymentReminders:getByPayment', paymentId),
    create:       (data: unknown) => ipcRenderer.invoke('paymentReminders:create', data),
  },
  inspections: {
    getAll:  () => ipcRenderer.invoke('inspections:getAll'),
    create:  (data: unknown) => ipcRenderer.invoke('inspections:create', data),
    update:  (id: number, data: unknown) => ipcRenderer.invoke('inspections:update', id, data),
    delete:  (id: number) => ipcRenderer.invoke('inspections:delete', id),
  },
  chargeReconciliations: {
    getByLease: (leaseId: number) => ipcRenderer.invoke('chargeReconciliations:getByLease', leaseId),
    create:     (data: unknown) => ipcRenderer.invoke('chargeReconciliations:create', data),
    update:     (id: number, data: unknown) => ipcRenderer.invoke('chargeReconciliations:update', id, data),
    delete:     (id: number) => ipcRenderer.invoke('chargeReconciliations:delete', id),
  },
  manualReminders: {
    getAll:  () => ipcRenderer.invoke('manualReminders:getAll'),
    create:  (data: unknown) => ipcRenderer.invoke('manualReminders:create', data),
    update:  (id: number, data: unknown) => ipcRenderer.invoke('manualReminders:update', id, data),
    delete:  (id: number) => ipcRenderer.invoke('manualReminders:delete', id),
  },
  documents: {
    getAll:    () => ipcRenderer.invoke('documents:getAll'),
    delete:    (id: number) => ipcRenderer.invoke('documents:delete', id),
    savePdf:   (leaseId: number, fileName: string, buffer: number[], docType?: string) => ipcRenderer.invoke('documents:savePdf', leaseId, fileName, buffer, docType),
    openFile:  (filePath: string) => ipcRenderer.invoke('documents:openFile', filePath),
  },
  exports: {
    saveFile: (fileName: string, buffer: number[], filters?: unknown) => ipcRenderer.invoke('exports:saveFile', fileName, buffer, filters),
  },
  irl: {
    getAll:             () => ipcRenderer.invoke('irl:getAll'),
    getByQuarter:       (year: number, quarter: number) => ipcRenderer.invoke('irl:getByQuarter', year, quarter),
    getLatestForQuarter:(quarter: number) => ipcRenderer.invoke('irl:getLatestForQuarter', quarter),
    upsert:             (year: number, quarter: number, value: number) => ipcRenderer.invoke('irl:upsert', year, quarter, value),
    delete:             (id: number) => ipcRenderer.invoke('irl:delete', id),
  },
})
