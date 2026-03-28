# Architecture

This document gives a high-level view of the LeaseFrance codebase.

## Runtime Architecture

```mermaid
flowchart TB
  User["User"]

  subgraph Renderer["Renderer: React + TypeScript"]
    App["App.tsx\nAuth gate + routes"]
    Pages["src/pages/*\nDashboard, Properties, Tenants,\nLeases, Payments, Documents,\nInspections, Reminders, Fiscal,\nProfile, Settings, Login, Setup"]
    Components["src/components/*\nLayout, UI primitives,\nSearchCommand, AttachmentPanel,\nIRL manager"]
    Store["src/stores/useAuthStore.ts\nAuth/session state"]
    Domain["src/lib/* + src/shared/*\nIRL logic, lease helpers,\nbank import logic, document helpers"]
    Pdf["src/lib/pdf/*\nReact PDF templates"]

    App --> Pages
    Pages --> Components
    Pages --> Domain
    Pages --> Pdf
    Store --> App
  end

  subgraph Bridge["Electron Bridge"]
    Preload["electron/preload.ts\nwindow.api facade"]
  end

  subgraph Main["Electron Main Process"]
    MainTs["electron/main.ts\nBrowserWindow, IPC registry,\nfile dialogs, shell access"]
    Auth["electron/auth.ts\nLocal account store,\npassword + recovery key flow"]
    Backup["electron/backupManager.ts\nManual backup, auto backup,\nrestore, preview, verify"]
    DB["electron/db/database.ts\nSQLite connection,\nWAL mode, busy timeout"]
    Migrations["electron/db/migrations/*\nSchema evolution"]
    Seed["electron/db/irlSeed.ts\nInitial IRL dataset"]
    Queries["electron/db/queries/*\nFeature CRUD and joined reads"]

    MainTs --> Auth
    MainTs --> Backup
    MainTs --> Queries
    Queries --> DB
    DB --> Migrations
    DB --> Seed
  end

  subgraph Storage["Local Storage and Generated Files"]
    Accounts["accounts.json\nper-account metadata"]
    AccountDirs["accounts/<accountId>/\nper-account storage root"]
    SQLite["leasefrance.db\nSQLite database"]
    Attachments["attachments/\nuploaded files"]
    BackupFiles["*.lfbackup\nbackup archives"]
    ExportedFiles["Saved PDFs / CSV exports"]
  end

  User --> Renderer
  Renderer -->|window.api calls| Preload
  Preload -->|IPC| MainTs

  Auth --> Accounts
  Auth --> AccountDirs
  DB --> SQLite
  Backup --> BackupFiles
  MainTs --> ExportedFiles
  MainTs --> Attachments
```

## Request Flow

```mermaid
sequenceDiagram
  participant U as User
  participant R as React page
  participant S as Zustand store / helpers
  participant P as preload.ts
  participant M as main.ts
  participant Q as db/queries or auth service
  participant D as SQLite / local files

  U->>R: Trigger action
  R->>S: Prepare local state / payload
  S->>P: Call window.api.*
  P->>M: ipcRenderer.invoke(...)
  M->>Q: Route to auth / backup / query module
  Q->>D: Read or write local data
  D-->>Q: Result
  Q-->>M: Domain result
  M-->>P: IPC response
  P-->>S: Promise resolved
  S-->>R: Update state
  R-->>U: UI refresh
```

## Build, Package, and Test Pipeline

```mermaid
flowchart LR
  Source["Source\nsrc/*\nelectron/*\nscripts/*"]
  Dev["scripts/dev.mjs\nremoves ELECTRON_RUN_AS_NODE"]
  Build["scripts/build.mjs"]
  Vite["electron-vite\nmain + preload + renderer build"]
  Out["out/main\nout/preload\nout/renderer"]
  Obfuscate["scripts/obfuscate.mjs\nmain/preload obfuscation"]
  Package["electron-builder\nvia electron-builder.yml"]
  Dist["Windows installer / packaged app"]
  Tests["Vitest\ntests/unit + tests/electron"]

  Source --> Dev
  Source --> Build
  Build --> Vite --> Out --> Obfuscate --> Package --> Dist
  Source --> Tests
```

## Feature Module Map

```mermaid
flowchart TD
  subgraph Routing["Route and page entrypoints"]
    Dashboard["Dashboard"]
    Properties["Properties"]
    Tenants["Tenants"]
    Leases["Leases"]
    Payments["Payments"]
    Documents["Documents"]
    Inspections["Inspections"]
    Reminders["Reminders"]
    Fiscal["Fiscal"]
    Profile["Profile"]
    Settings["Settings"]
  end

  subgraph SharedLogic["Shared renderer logic"]
    Irl["src/lib/irl.ts"]
    LeaseContract["src/lib/leaseContractDocument.ts\nsrc/shared/leaseContract.ts"]
    BankImport["src/pages/Payments/bankImport.ts"]
    TemplateHelpers["src/pages/Documents/documentTemplateHelpers.ts"]
    DepositUtils["src/pages/Leases/depositUtils.ts"]
    Utils["src/lib/utils.ts"]
    PdfTemplates["src/lib/pdf/*"]
  end

  subgraph MainServices["Main-process services"]
    AuthSvc["auth.ts"]
    QuerySvc["db/queries/*"]
    BackupSvc["backupManager.ts"]
  end

  Dashboard --> QuerySvc
  Dashboard --> Irl
  Dashboard --> DepositUtils

  Properties --> QuerySvc
  Tenants --> QuerySvc
  Tenants --> Utils

  Leases --> QuerySvc
  Leases --> Irl
  Leases --> DepositUtils

  Payments --> QuerySvc
  Payments --> BankImport
  Payments --> PdfTemplates

  Documents --> QuerySvc
  Documents --> TemplateHelpers
  Documents --> LeaseContract
  Documents --> PdfTemplates

  Inspections --> QuerySvc
  Inspections --> PdfTemplates

  Reminders --> QuerySvc
  Reminders --> Irl

  Fiscal --> QuerySvc
  Fiscal --> PdfTemplates

  Profile --> AuthSvc
  Settings --> AuthSvc
  Settings --> BackupSvc
```

## Document Generation Flow

```mermaid
flowchart LR
  subgraph Triggers["Renderer entrypoints"]
    PaymentsPage["Payments page"]
    DocumentsPage["Documents page"]
    RemindersModal["PaymentReminderModal"]
    InspectionPage["Inspections page"]
    FiscalPage["Fiscal page"]
    ChargeModal["ChargeReconciliationModal"]
  end

  subgraph Builder["Renderer-side document assembly"]
    PdfData["Document helper modules\nleaseContractDocument.ts\ndocumentTemplateHelpers.ts"]
    ReactPdf["React PDF templates\nsrc/lib/pdf/*"]
    Blob["Blob / Uint8Array buffer"]
  end

  subgraph MainSave["Main-process save/open"]
    SavePdf["documents:savePdf"]
    SaveExport["exports:saveFile"]
    FileDialog["Native save dialog"]
    DocumentsTable["documents table"]
    UserFiles["User-chosen PDF / CSV file path"]
  end

  PaymentsPage --> PdfData
  DocumentsPage --> PdfData
  RemindersModal --> PdfData
  InspectionPage --> PdfData
  FiscalPage --> PdfData
  ChargeModal --> PdfData

  PdfData --> ReactPdf --> Blob
  Blob --> SavePdf
  Blob --> SaveExport
  SavePdf --> FileDialog --> UserFiles
  SavePdf --> DocumentsTable
  SaveExport --> FileDialog --> UserFiles
```

## Data Ownership and Storage Boundaries

```mermaid
flowchart TB
  subgraph GlobalData["Global app-level metadata"]
    AccountsJson["userData/accounts.json\naccount registry,\nlast-used account,\nremembered session"]
    SessionLock["userData/accounts.lock\nwrite lock directory"]
  end

  subgraph AccountData["Per-account storage root"]
    AccountRoot["userData/accounts/<accountId>/"]
    AccountDb["leasefrance.db"]
    AccountAttachments["attachments/"]
    BackupSettings["backup-settings.json"]
  end

  subgraph OutsideAppData["User-selected external files"]
    SavedDocs["Generated PDFs"]
    CsvExports["CSV exports"]
    BackupArchives["*.lfbackup"]
  end

  AccountsJson --> AccountRoot
  SessionLock -. protects writes to .-> AccountsJson
  AccountRoot --> AccountDb
  AccountRoot --> AccountAttachments
  AccountRoot --> BackupSettings
```

## Account and Auth Flow

```mermaid
stateDiagram-v2
  [*] --> Loading
  Loading --> Setup: no local account
  Loading --> Locked: account exists
  Loading --> Unlocked: remembered session restored
  Setup --> Locked: first account created
  Locked --> Unlocked: password or recovery key verified
  Unlocked --> Locked: lock session
  Unlocked --> Setup: last account deleted
```

## Suggested Reading Order

1. Start from `src/App.tsx` and `src/stores/useAuthStore.ts` to understand route gating and session flow.
2. Read `electron/preload.ts` and `electron/main.ts` to understand the renderer-to-main contract.
3. Read `electron/auth.ts`, `electron/db/database.ts`, and `electron/db/queries/*` to understand persistence.
4. Read `src/pages/Documents/index.tsx` and `src/lib/pdf/*` to understand document generation, which is one of the densest cross-layer flows in the app.

## Layer Summary

- `src/`
  Renderer-only code. No direct Node or Electron access.
- `electron/preload.ts`
  The only bridge exposed to the renderer through `window.api`.
- `electron/main.ts`
  Owns IPC registration and all privileged operations.
- `electron/auth.ts`
  Owns account metadata, password hashing, recovery keys, and session restore.
- `electron/db/*`
  Owns SQLite setup, migrations, seed data, and query modules.
- `src/lib/pdf/*`
  Owns PDF rendering templates used by document workflows.
- `scripts/*`
  Owns local dev startup, production build orchestration, and output obfuscation.
- `tests/*`
  Unit and Electron-side smoke coverage.

## Main Architectural Rules

- Renderer features must flow through `main.ts -> preload.ts -> env.d.ts -> renderer usage`.
- Data is local-first: SQLite, local account files, local attachments, local backups.
- Business pages mostly compose from `src/pages/*`, shared helpers in `src/lib/*`, and persisted data from `electron/db/queries/*`.
- PDF generation is renderer-driven, while final file save/open flows go back through the main process.
