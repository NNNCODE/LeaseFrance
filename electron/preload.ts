import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  BackupAutoDonePayload,
  BaillioApi,
  BaillioInvokeChannels,
  BaillioWindowChannels,
} from '../src/shared/ipc'

function normalizeRuntimeError(error: unknown): {
  name: string | null
  message: string
  stack: string | null
} {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message || error.name || 'Unknown error',
      stack: typeof error.stack === 'string' ? error.stack : null,
    }
  }

  if (typeof error === 'string') {
    return {
      name: null,
      message: error,
      stack: null,
    }
  }

  try {
    return {
      name: null,
      message: JSON.stringify(error) || String(error),
      stack: null,
    }
  } catch {
    return {
      name: null,
      message: String(error),
      stack: null,
    }
  }
}

function installRendererRuntimeObservers(): void {
  window.addEventListener('error', (event) => {
    const normalized = normalizeRuntimeError(event.error)
    ipcRenderer.send('app-runtime:renderer-event', {
      kind: 'error',
      message: normalized.message || event.message || 'Unknown renderer error',
      name: normalized.name,
      stack: normalized.stack,
      source: event.filename || null,
      lineno: Number.isFinite(event.lineno) ? event.lineno : null,
      colno: Number.isFinite(event.colno) ? event.colno : null,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const normalized = normalizeRuntimeError(event.reason)
    ipcRenderer.send('app-runtime:renderer-event', {
      kind: 'unhandledrejection',
      message: normalized.message,
      name: normalized.name,
      stack: normalized.stack,
      source: null,
      lineno: null,
      colno: null,
    })
  })
}

function invoke<Channel extends keyof BaillioInvokeChannels>(channel: Channel) {
  return (...args: BaillioInvokeChannels[Channel]['args']) =>
    ipcRenderer.invoke(channel, ...args) as Promise<BaillioInvokeChannels[Channel]['return']>
}

function send<Channel extends keyof BaillioWindowChannels>(channel: Channel) {
  return (...args: BaillioWindowChannels[Channel]['args']) => {
    ipcRenderer.send(channel, ...args)
  }
}

const api: BaillioApi = {
  window: {
    minimize: send('window:minimize'),
    maximize: send('window:maximize'),
    close: send('window:close'),
  },
  auth: {
    hasPassword: invoke('auth:hasPassword'),
    getProfile: invoke('auth:getProfile'),
    restoreRememberedSession: invoke('auth:restoreRememberedSession'),
    setup: invoke('auth:setup'),
    verify: invoke('auth:verify'),
    change: invoke('auth:change'),
    updateProfile: invoke('auth:updateProfile'),
    delete: invoke('auth:delete'),
    lockSession: invoke('auth:lockSession'),
    hasRecoveryKey: invoke('auth:hasRecoveryKey'),
    verifyRecoveryKey: invoke('auth:verifyRecoveryKey'),
    resetWithRecoveryKey: invoke('auth:resetWithRecoveryKey'),
    regenerateRecoveryKey: invoke('auth:regenerateRecoveryKey'),
  },
  owners: {
    list: invoke('owners:list'),
    getActive: invoke('owners:getActive'),
    create: invoke('owners:create'),
    update: invoke('owners:update'),
    setActive: invoke('owners:setActive'),
    delete: invoke('owners:delete'),
  },
  properties: {
    getAll: invoke('properties:getAll'),
    count: invoke('properties:count'),
    create: invoke('properties:create'),
    update: invoke('properties:update'),
    delete: invoke('properties:delete'),
  },
  tenants: {
    getAll: invoke('tenants:getAll'),
    count: invoke('tenants:count'),
    create: invoke('tenants:create'),
    update: invoke('tenants:update'),
    delete: invoke('tenants:delete'),
  },
  leases: {
    getAll: invoke('leases:getAll'),
    count: invoke('leases:count'),
    create: invoke('leases:create'),
    update: invoke('leases:update'),
    updateContractDetails: invoke('leases:updateContractDetails'),
    delete: invoke('leases:delete'),
    deleteWithLinkedRecords: invoke('leases:deleteWithLinkedRecords'),
  },
  payments: {
    getAll: invoke('payments:getAll'),
    getByLease: invoke('payments:getByLease'),
    getSummary: invoke('payments:getSummary'),
    create: invoke('payments:create'),
    update: invoke('payments:update'),
    markPaid: invoke('payments:markPaid'),
    delete: invoke('payments:delete'),
    generateMissing: invoke('payments:generateMissing'),
    markOverdue: invoke('payments:markOverdue'),
  },
  paymentReminders: {
    getByPayment: invoke('paymentReminders:getByPayment'),
    create: invoke('paymentReminders:create'),
  },
  inspections: {
    getAll: invoke('inspections:getAll'),
    create: invoke('inspections:create'),
    update: invoke('inspections:update'),
    delete: invoke('inspections:delete'),
  },
  chargeReconciliations: {
    getByLease: invoke('chargeReconciliations:getByLease'),
    create: invoke('chargeReconciliations:create'),
    update: invoke('chargeReconciliations:update'),
    delete: invoke('chargeReconciliations:delete'),
  },
  manualReminders: {
    getAll: invoke('manualReminders:getAll'),
    create: invoke('manualReminders:create'),
    update: invoke('manualReminders:update'),
    delete: invoke('manualReminders:delete'),
  },
  reminders: {
    getFeed: invoke('reminders:getFeed'),
  },
  dashboard: {
    getSnapshot: invoke('dashboard:getSnapshot'),
  },
  search: {
    query: invoke('search:query'),
  },
  documents: {
    getAll: invoke('documents:getAll'),
    getGenerationAvailability: invoke('documents:getGenerationAvailability'),
    getGenerationSources: invoke('documents:getGenerationSources'),
    delete: invoke('documents:delete'),
    savePdf: invoke('documents:savePdf'),
    importForLease: invoke('documents:importForLease'),
    updateStatus: invoke('documents:updateStatus'),
    readFile: invoke('documents:readFile'),
    openFile: invoke('documents:openFile'),
  },
  exports: {
    saveFile: invoke('exports:saveFile'),
  },
  fiscalExpenses: {
    getAll: invoke('fiscalExpenses:getAll'),
    getByYear: invoke('fiscalExpenses:getByYear'),
    create: invoke('fiscalExpenses:create'),
    update: invoke('fiscalExpenses:update'),
    delete: invoke('fiscalExpenses:delete'),
  },
  attachments: {
    getByEntity: invoke('attachments:getByEntity'),
    getAll: invoke('attachments:getAll'),
    upload: invoke('attachments:upload'),
    read: invoke('attachments:read'),
    open: invoke('attachments:open'),
    delete: invoke('attachments:delete'),
  },
  bankImports: {
    findDuplicates: invoke('bankImports:findDuplicates'),
    recordImported: invoke('bankImports:recordImported'),
  },
  backup: {
    create: invoke('backup:create'),
    getSettings: invoke('backup:getSettings'),
    updateSettings: invoke('backup:updateSettings'),
    pickFolder: invoke('backup:pickFolder'),
    verify: invoke('backup:verify'),
    preview: invoke('backup:preview'),
    restoreFromPath: invoke('backup:restoreFromPath'),
    openDataFolder: invoke('backup:openDataFolder'),
    onAutoDone: (cb) => {
      const listener = (event: IpcRendererEvent, data: BackupAutoDonePayload) => cb(event, data)
      ipcRenderer.on('backup:autoDone', listener)
      return () => { ipcRenderer.removeListener('backup:autoDone', listener) }
    },
  },
  diagnostics: {
    exportReport: invoke('diagnostics:exportReport'),
    openLogsFolder: invoke('diagnostics:openLogsFolder'),
  },
  license: {
    getState: invoke('license:getState'),
    activate: invoke('license:activate'),
    refresh: invoke('license:refresh'),
    onStateChanged: (cb) => {
      const listener = (event: IpcRendererEvent, data: LicenseState) => cb(event, data)
      ipcRenderer.on('license:stateChanged', listener)
      return () => { ipcRenderer.removeListener('license:stateChanged', listener) }
    },
  },
  updates: {
    getState: invoke('updates:getState'),
    check: invoke('updates:check'),
    download: invoke('updates:download'),
    install: invoke('updates:install'),
    onStateChanged: (cb) => {
      const listener = (event: IpcRendererEvent, data: AutoUpdateState) => cb(event, data)
      ipcRenderer.on('updates:stateChanged', listener)
      return () => { ipcRenderer.removeListener('updates:stateChanged', listener) }
    },
  },
  irl: {
    getAll: invoke('irl:getAll'),
    getByQuarter: invoke('irl:getByQuarter'),
    getLatestForQuarter: invoke('irl:getLatestForQuarter'),
    upsert: invoke('irl:upsert'),
    delete: invoke('irl:delete'),
  },
}

contextBridge.exposeInMainWorld('api', api)
installRendererRuntimeObservers()
