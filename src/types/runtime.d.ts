interface BackupSettings {
  autoEnabled: boolean
  intervalHours: number
  destinationFolder: string
  maxBackups: number
  encryptionPassword: string | null
  lastBackupAt: string | null
  lastBackupPath: string | null
  lastBackupSizeBytes: number | null
}

interface BackupVerifyResult {
  valid: boolean
  createdAt: string | null
  fileSize: number
  encrypted: boolean
  errors: string[]
}

interface BackupPreviewResult {
  filePath: string
  valid: boolean
  createdAt: string | null
  fileSize: number
  encrypted: boolean
  profile: { name: string; email: string } | null
  tables: Array<{ name: string; label: string; count: number }>
  errors: string[]
}

type LicenseStatus = 'disabled' | 'unlicensed' | 'checking' | 'activating' | 'active' | 'grace' | 'refreshing' | 'inactive' | 'expired'
type LicenseDisabledReason = 'not-configured' | null

interface LicenseState {
  enabled: boolean
  status: LicenseStatus
  accessGranted: boolean
  hasStoredToken: boolean
  billingEmail: string | null
  subscriptionStatus: string | null
  refreshAfterSeconds: number | null
  offlineGraceDays: number | null
  nextRefreshAt: string | null
  offlineGraceUntil: string | null
  currentPeriodEndsAt: string | null
  trialEndsAt: string | null
  lastValidatedAt: string | null
  lastRefreshAttemptAt: string | null
  lastErrorCode: string | null
  lastErrorMessage: string | null
  disabledReason: LicenseDisabledReason
  supportLogPath: string | null
  endpointBaseUrl: string | null
}

type AutoUpdateStatus = 'disabled' | 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'up_to_date' | 'error'
type AutoUpdateDisabledReason = 'not-configured' | 'unsupported-platform' | 'development' | null

interface AutoUpdateState {
  enabled: boolean
  status: AutoUpdateStatus
  currentVersion: string
  availableVersion: string | null
  releaseName: string | null
  releaseDate: string | null
  releaseNotes: string[]
  downloadPercent: number | null
  lastCheckedAt: string | null
  lastError: string | null
  feedUrl: string | null
  channel: string | null
  disabledReason: AutoUpdateDisabledReason
}
