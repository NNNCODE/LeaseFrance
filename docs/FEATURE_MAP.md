# Feature Map

Goal: make it fast to find every file involved in one feature.

The code is organized by technical layer, not by feature. So one feature is
spread across several files. This map is the index that ties them back together.

---

## 1. The layer stack (where code lives)

```
+-------------------------------------------------------------+
| RENDERER  src/        React UI. No Node/Electron APIs here. |
|   src/pages/<Feature>/index.tsx     UI + local state        |
|     | calls window.api.<ns>.<fn>(...)                        |
|     | some calls go through src/stores/use*Store.ts         |
+-----|-------------------------------------------------------+
      |  window.api   (the ONLY bridge renderer -> backend)
+-----v-------------------------------------------------------+
| PRELOAD  electron/preload.ts                                |
|   invoke('<ns>:<fn>')   1:1 with the api namespace name     |
+-----|-------------------------------------------------------+
      |  ipcRenderer.invoke('<ns>:<fn>', ...args)
+-----v-------------------------------------------------------+
| MAIN  electron/main.ts        registers every IPC handler   |
|   handle('<ns>:<fn>', (...args) => {                        |
|     validateInvokeArgs(...)   src/shared/ipcValidation.ts   |
|     -> <ns>Db.<fn>()          simple CRUD                    |
|     -> services/<x>.ts        aggregations (dashboard, ...) |
|   })                                                         |
+-----|-------------------------------------------------------+
      |
+-----v-------------------------------------------------------+
| DATA  electron/db/queries/<ns>.ts   -> SQLite               |
|   schema:  electron/db/database.ts + electron/db/migrations |
+-------------------------------------------------------------+
```

PDF output is a side branch off the renderer:
`src/pages/.../*.tsx  ->  src/lib/pdf/<doc>.tsx  ->  @react-pdf/renderer`.

---

## 2. The naming rule (the key to navigating)

Names line up 1:1 across all layers. Learn this once and you can jump anywhere:

```
  window.api.payments.getAll()        renderer call
             |        |
             v        v
        "payments" : "getAll"         IPC channel string
             |        |
             v        v
        paymentsDb . getAll()         electron/db/queries/payments.ts
```

So `window.api.X.Y` always maps to channel `X:Y` (registered in
`electron/main.ts`) which calls `Xdb.Y()` in `electron/db/queries/X.ts`.

---

## 3. Trace recipe (find any feature in 30 seconds)

1. Start at the page:        `src/pages/<Feature>/index.tsx`
2. Grep it for `window.api.` -> gives the namespaces it uses
3. For each `window.api.X.Y`, open `electron/db/queries/X.ts` -> the data logic
4. Data shape / types:       `src/env.d.ts` (renderer types are global/ambient)
5. PDF (if any):             imports from `src/lib/pdf/`

If a call hits a *service* instead of plain CRUD (dashboard, reminders, search,
documents availability), the logic is in `electron/services/<x>.ts`.

---

## 4. Feature index

Verified from `electron/preload.ts`, `electron/main.ts`, and per-page
`window.api.*` usage.

| Feature      | Page (src/pages/)   | window.api namespaces                                   | Service (electron/services/) | Queries (electron/db/queries/)                  | Tables                                  | PDF (src/lib/pdf/)                                   |
|--------------|---------------------|--------------------------------------------------------|------------------------------|-------------------------------------------------|-----------------------------------------|-----------------------------------------------------|
| Dashboard    | Dashboard/          | dashboard                                              | dashboard.ts                 | reads properties, tenants, leases, payments, manualReminders, attachments | (aggregates many)        | -- (chart uses recharts)                            |
| Properties   | Properties/         | properties, propertyDiagnostics                       | --                           | properties.ts, propertyDiagnostics.ts           | properties, property_diagnostics        | --                                                  |
| Tenants      | Tenants/            | tenants, attachments, leases, payments, inspections   | --                           | tenants.ts, attachments.ts                      | tenants, attachments                    | --                                                  |
| Leases       | Leases/             | leases, payments, chargeReconciliations, irl, attachments, documents, inspections, properties, propertyDiagnostics, tenants | -- | leases.ts, chargeReconciliations.ts, irl.ts | leases, charge_reconciliations, irl_indices | chargeReconciliation.tsx                        |
| Payments     | Payments/           | payments, paymentReminders, bankImports, leases, documents | (autoRent.ts via generateMissing/markOverdue) | payments.ts, paymentReminders.ts, autoRent.ts, bankImports.ts | payments, payment_reminders | quittance.tsx, recu.tsx, reminder.tsx           |
| Documents    | Documents/          | documents, leases                                     | documents.ts                 | documents.ts                                    | documents                               | quittance, recu, documentTemplates, furnishedLeaseContract |
| Inspections  | Inspections/        | inspections, attachments, leases, documents           | --                           | inspections.ts                                  | inspections                             | inspection.tsx                                      |
| Reminders    | Reminders/          | reminders, manualReminders, leases                    | reminders.ts                 | manualReminders.ts (+ leases, propertyDiagnostics via service) | manual_reminders (+ derived from leases, property_diagnostics) | --                          |
| Fiscal       | Fiscal/             | fiscalExpenses, payments, properties, leases, exports | --                           | fiscalExpenses.ts                               | fiscal_expenses                         | fiscalSummary.tsx                                   |
| Profile/Owners | Profile/          | auth, owners (via stores)                             | --                           | auth.ts (account + owner profiles)              | account/auth storage, owner profiles    | --                                                  |
| Settings     | Settings/           | backup, license, updates, diagnostics, auth           | --                           | backupManager.ts, license.ts, autoUpdate.ts, diagnostics.ts | backup settings, license files | --                                                  |
| IRL data     | Leases/IrlManagerModal.tsx | irl                                            | --                           | irl.ts (seed: db/irlSeed.ts)                    | irl_indices                             | --                                                  |
| Auth flow    | App.tsx, Login/, Setup/, Activation/ | auth, license                        | --                           | auth.ts, license.ts                             | account/auth storage                    | --                                                  |

Note: a page often touches *neighbour* namespaces for context (e.g. Payments
reads `leases` to label rows). The "owning" query for a feature is the one named
after it.

---

## 5. Cross-cutting pieces (shared by many features)

| Concern         | Entry (renderer)                | window.api | Backend                                              |
|-----------------|---------------------------------|------------|------------------------------------------------------|
| Attachments     | src/components/AttachmentPanel.tsx | attachments | queries/attachments.ts + file I/O in main.ts (files in userData/attachments) |
| Global search   | src/components/SearchCommand.tsx | search     | services/search.ts                                   |
| Backup/restore  | Settings/                       | backup     | electron/backupManager.ts                            |
| License gate    | src/stores/useLicenseStore.ts   | license    | electron/license.ts                                  |
| Auto-update     | Settings/                       | updates    | electron/autoUpdate.ts                               |
| Diagnostics/logs| Settings/                       | diagnostics| electron/diagnostics.ts, electron/appRuntime.ts      |

Stores (renderer state wrappers around window.api):
- useAuthStore.ts     -> auth
- useOwnerStore.ts    -> owners
- useLicenseStore.ts  -> license
- useThemeStore.ts    -> local theme only
- useLanguageStore.ts -> i18n only (src/i18n/)

---

## 6. The "spine" files (touched when adding/renaming any capability)

Per the architecture rule in CLAUDE.md, a new renderer capability passes through:

1. `electron/main.ts`             register `handle('<ns>:<fn>', ...)`
2. `electron/preload.ts`          expose `window.api.<ns>.<fn>`
3. `src/shared/ipc.ts`            channel arg/return types
4. `src/shared/ipcValidation.ts`  runtime arg validation
5. `src/env.d.ts`                 renderer entity types (global/ambient)
6. `electron/db/queries/<ns>.ts`  data logic
7. `electron/db/database.ts` + `electron/db/migrations/*`  schema (if fields change)
8. `src/pages/<Feature>/*`        UI

---

## 7. Two gotchas that make reading harder

1. Joined fields are not real columns.
   `Payment` (in `queries/payments.ts`) has `property_name`, `tenant_first_name`,
   etc. Those do NOT exist on the `payments` table; they are produced by the JOIN
   in the `SELECT` constant. Looking at the table schema alone will mislead you.

2. Renderer types are ambient (no import).
   Pages use `Payment`, `Lease`, etc. without importing them. They are declared
   globally in `src/env.d.ts`. To "go to definition", open that file.
