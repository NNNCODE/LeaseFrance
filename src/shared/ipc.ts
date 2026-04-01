export interface BackupAutoDonePayload {
  path: string
  sizeBytes: number
  at: string
}

export interface RentFlowWindowApi {
  minimize: () => void
  maximize: () => void
  close: () => void
}

export interface RentFlowBackupEventsApi {
  onAutoDone: (cb: (_e: unknown, data: BackupAutoDonePayload) => void) => () => void
}

export interface RentFlowUpdatesEventsApi {
  onStateChanged: (cb: (_e: unknown, data: AutoUpdateState) => void) => () => void
}

export interface RentFlowInvokeApi {
  auth: {
    hasPassword: () => Promise<boolean>
    getProfile: () => Promise<UserProfile | null>
    restoreRememberedSession: () => Promise<UserProfile | null>
    setup: (pwd: string, name: string, email: string) => Promise<string | null>
    verify: (email: string, pwd: string, remember: boolean) => Promise<boolean>
    change: (old: string, next: string) => Promise<boolean>
    updateProfile: (name: string, email: string, address?: string, city?: string, phone?: string, signatureImage?: string) => Promise<boolean>
    delete: (pwd: string) => Promise<boolean>
    lockSession: () => Promise<void>
    hasRecoveryKey: () => Promise<boolean>
    verifyRecoveryKey: (key: string) => Promise<boolean>
    resetWithRecoveryKey: (key: string, newPwd: string) => Promise<string | null>
    regenerateRecoveryKey: (pwd: string) => Promise<string | null>
  }
  properties: {
    getAll: () => Promise<Property[]>
    count: () => Promise<number>
    create: (data: PropertyInput) => Promise<Property>
    update: (id: number, data: PropertyInput, expectedUpdatedAt: string) => Promise<Property>
    delete: (id: number) => Promise<boolean>
  }
  tenants: {
    getAll: () => Promise<Tenant[]>
    count: () => Promise<number>
    create: (data: TenantInput) => Promise<Tenant>
    update: (id: number, data: TenantInput, expectedUpdatedAt: string) => Promise<Tenant>
    delete: (id: number) => Promise<boolean>
  }
  leases: {
    getAll: () => Promise<Lease[]>
    count: () => Promise<number>
    create: (data: LeaseInput) => Promise<Lease>
    update: (id: number, data: LeaseInput, expectedUpdatedAt: string) => Promise<Lease>
    updateContractDetails: (id: number, contractDetails: LeaseContractDetails | null, expectedUpdatedAt: string) => Promise<Lease>
    delete: (id: number) => Promise<boolean>
  }
  payments: {
    getAll: () => Promise<Payment[]>
    getByLease: (leaseId: number) => Promise<Payment[]>
    getSummary: () => Promise<PaymentSummary>
    create: (data: PaymentInput) => Promise<Payment>
    update: (id: number, data: Partial<PaymentInput>, expectedUpdatedAt: string) => Promise<Payment>
    markPaid: (id: number, date: string, expectedUpdatedAt: string) => Promise<Payment>
    delete: (id: number) => Promise<boolean>
    generateMissing: () => Promise<AutoRentResult>
    markOverdue: () => Promise<number>
  }
  paymentReminders: {
    getByPayment: (paymentId: number) => Promise<PaymentReminder[]>
    create: (data: PaymentReminderInput) => Promise<PaymentReminder>
  }
  inspections: {
    getAll: () => Promise<Inspection[]>
    create: (data: InspectionInput) => Promise<Inspection>
    update: (id: number, data: InspectionInput) => Promise<Inspection>
    delete: (id: number) => Promise<boolean>
  }
  chargeReconciliations: {
    getByLease: (leaseId: number) => Promise<ChargeReconciliation[]>
    create: (data: ChargeReconciliationInput) => Promise<ChargeReconciliation>
    update: (id: number, data: ChargeReconciliationInput) => Promise<ChargeReconciliation>
    delete: (id: number) => Promise<boolean>
  }
  manualReminders: {
    getAll: () => Promise<ManualReminder[]>
    create: (data: ManualReminderInput) => Promise<ManualReminder>
    update: (id: number, data: ManualReminderInput) => Promise<ManualReminder>
    delete: (id: number) => Promise<boolean>
  }
  reminders: {
    getFeed: () => Promise<ReminderFeed>
  }
  dashboard: {
    getSnapshot: () => Promise<DashboardSnapshot>
  }
  search: {
    query: (query: string, filter: SearchFilterKey) => Promise<SearchResult[]>
  }
  documents: {
    getAll: () => Promise<DocumentRecord[]>
    getGenerationAvailability: () => Promise<DocumentGenerationAvailability>
    getGenerationSources: () => Promise<DocumentGenerationSources>
    delete: (id: number) => Promise<boolean>
    updateStatus: (id: number, status: string) => Promise<boolean>
    readFile: (filePath: string) => Promise<{ data: Uint8Array | null; mimeType: string | null; error: string | null }>
    savePdf: (leaseId: number, fileName: string, buffer: Uint8Array, docType?: string) => Promise<{ saved: boolean; path: string | null }>
    openFile: (filePath: string) => Promise<void>
  }
  exports: {
    saveFile: (fileName: string, buffer: Uint8Array, filters?: Array<{ name: string; extensions: string[] }>) => Promise<{ saved: boolean; path: string | null }>
  }
  fiscalExpenses: {
    getAll: () => Promise<FiscalExpense[]>
    getByYear: (year: number) => Promise<FiscalExpense[]>
    create: (data: FiscalExpenseInput) => Promise<FiscalExpense>
    update: (id: number, data: FiscalExpenseInput) => Promise<FiscalExpense>
    delete: (id: number) => Promise<boolean>
  }
  attachments: {
    getByEntity: (entityType: string, entityId: number) => Promise<Attachment[]>
    getAll: () => Promise<Attachment[]>
    upload: (entityType: string, entityId: number, slot: string | null) => Promise<Attachment[]>
    read: (id: number) => Promise<{ data: Uint8Array | null; mimeType: string | null; error: string | null }>
    open: (id: number) => Promise<void>
    delete: (id: number) => Promise<boolean>
  }
  bankImports: {
    findDuplicates: (fingerprints: string[]) => Promise<string[]>
    recordImported: (entries: BankImportEntry[]) => Promise<void>
  }
  backup: {
    create: (password?: string) => Promise<{ saved: boolean; path: string | null }>
    getSettings: () => Promise<BackupSettings>
    updateSettings: (patch: Partial<BackupSettings>) => Promise<BackupSettings>
    pickFolder: () => Promise<string | null>
    verify: (password?: string) => Promise<BackupVerifyResult | null>
    preview: (password?: string) => Promise<BackupPreviewResult | null>
    restoreFromPath: (filePath: string, password?: string) => Promise<{ restored: boolean; error?: string }>
    openDataFolder: () => Promise<void>
  }
  updates: {
    getState: () => Promise<AutoUpdateState>
    check: () => Promise<AutoUpdateState>
    download: () => Promise<AutoUpdateState>
    install: () => Promise<AutoUpdateState>
  }
  irl: {
    getAll: () => Promise<IrlIndex[]>
    getByQuarter: (year: number, quarter: number) => Promise<IrlIndex | null>
    getLatestForQuarter: (quarter: number) => Promise<IrlIndex | null>
    upsert: (year: number, quarter: number, value: number) => Promise<IrlIndex>
    delete: (id: number) => Promise<boolean>
  }
}

export type RentFlowApi = Omit<RentFlowInvokeApi, 'backup' | 'updates'> & {
  window: RentFlowWindowApi
  backup: RentFlowInvokeApi['backup'] & RentFlowBackupEventsApi
  updates: RentFlowInvokeApi['updates'] & RentFlowUpdatesEventsApi
}

type AnyFn = (...args: never[]) => unknown

type ChannelDescriptor<
  Channel extends string,
  Fn extends AnyFn,
> = {
  channel: Channel
  args: Parameters<Fn>
  return: Awaited<ReturnType<Fn>>
}

type NamespaceEntries<
  T,
  Prefix extends string = '',
> = {
  [K in keyof T & string]:
  T[K] extends AnyFn
    ? ChannelDescriptor<`${Prefix}${K}`, T[K]>
    : T[K] extends Record<string, unknown>
      ? NamespaceEntries<T[K], `${Prefix}${K}:`>
      : never
}[keyof T & string]

type UnionToIntersection<U> = (
  U extends unknown ? (value: U) => void : never
) extends (value: infer I) => void ? I : never

type EntriesToMap<U> = UnionToIntersection<
  U extends {
    channel: infer Channel extends string
    args: infer Args extends unknown[]
    return: infer Return
  }
    ? { [K in Channel]: { args: Args; return: Return } }
    : never
>

export type RentFlowInvokeChannels = EntriesToMap<NamespaceEntries<RentFlowInvokeApi>>
export type RentFlowWindowChannels = EntriesToMap<NamespaceEntries<RentFlowWindowApi, 'window:'>>
