# AGENTS.md

## Purpose

RentFlow is a Windows desktop app for private landlords in France.
It manages properties, tenants, leases, payments, IRL reference data, and PDF rent documents.

This file is for Codex. Keep it short, concrete, and repo-specific.

## Working Style

- Prefer small targeted changes over broad refactors.
- Keep the app local-first. Do not introduce remote services, cloud sync, or telemetry.
- Preserve current architecture unless there is a clear defect.
- Verify assumptions from code, not from this file.
- Use ASCII in docs and code comments unless a file already requires French accents.

## Planning Files

- Keep `AGENTS.md` for stable repo rules, constraints, and workflow guidance.
- Product direction lives in `docs/ROADMAP.md`.
- Actionable work lives in `docs/BACKLOG.md`.
- Feature-level design notes live in `docs/features/*.md` when needed.
- When finishing a backlog item, update its status and any scope changes in the docs.

## Tech Stack

- Electron 42
- React 18
- TypeScript
- electron-vite
- Tailwind CSS
- Zustand
- SQLite via `better-sqlite3`
- `@react-pdf/renderer`

## Key Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run dist
```

Notes:

- There is no `lint` script in `package.json`.
- `npm run dev` goes through `scripts/dev.mjs`.
- `npm run dist` builds first, then packages with `electron-builder`.

## Critical Runtime Constraint

VS Code / Codex may set `ELECTRON_RUN_AS_NODE=1`.
This breaks Electron APIs during local development.

- Do not replace the current dev flow with `cross-env ELECTRON_RUN_AS_NODE=`.
- `scripts/dev.mjs` must keep deleting `ELECTRON_RUN_AS_NODE` from the child environment before starting Electron.

## Repo Map

- `electron/main.ts`
  Main process, BrowserWindow setup, and all IPC registration.
- `electron/preload.ts`
  Safe API exposed to the renderer through `window.api`.
- `electron/auth.ts`
  Local account storage and password verification.
- `electron/db/database.ts`
  SQLite connection and schema initialization.
- `electron/db/queries/*`
  Database access layer.
- `src/App.tsx`
  Top-level auth gate and routes.
- `src/stores/useAuthStore.ts`
  Auth lifecycle and profile state.
- `src/pages/*`
  Page-level UI.
- `src/lib/pdf/quittance.tsx`
  Full-payment rent receipt PDF.
- `src/lib/pdf/recu.tsx`
  Partial-payment receipt PDF.
- `src/pages/Documents/index.tsx`
  Document generation flow and payment-to-document logic.
- `src/pages/Inspections/index.tsx`
  Move-in / move-out inspection workflow.
- `src/pages/Reminders/index.tsx`
  Deadline center: derived and manual reminders.
- `src/pages/Fiscal/index.tsx`
  Annual fiscal summary and CSV/PDF export.
- `src/lib/pdf/reminder.tsx`
  Unpaid rent follow-up letter PDFs.
- `src/lib/pdf/inspection.tsx`
  Etat des lieux inspection report PDF.
- `src/lib/pdf/chargeReconciliation.tsx`
  Annual charges reconciliation PDF.
- `src/lib/pdf/documentTemplates.tsx`
  Rent revision, deposit receipt, deposit settlement PDFs.
- `src/lib/pdf/fiscalSummary.tsx`
  Fiscal summary PDF.
- `src/env.d.ts`
  Renderer-side entity types and `window.api` typings.

## Architecture Rules

- Renderer code must not use Node or Electron APIs directly.
- New renderer capabilities must go through all of these layers:
  1. `electron/main.ts`
  2. `electron/preload.ts`
  3. `src/env.d.ts`
  4. renderer usage in `src/*`
- If you add or rename DB fields, update:
  - schema in `electron/db/database.ts`
  - relevant query files in `electron/db/queries/`
  - entity typings in `src/env.d.ts`
  - forms, tables, and PDF data mapping in the renderer

## Auth Invariants

- The app always shows the login screen first when auth is not unlocked.
- If no account exists, login can route to setup.
- `src/App.tsx` and `src/stores/useAuthStore.ts` are the source of truth for this flow.
- Auth statuses are:
  - `loading`
  - `setup`
  - `locked`
  - `unlocked`

Do not change the auth entry flow casually. Several screens assume this sequence.

## Database Notes

- SQLite lives in `app.getPath('userData')/leasefrance.db`.
- Schema creation is currently done in `initSchema()` inside `electron/db/database.ts`.
- There is no real migration system yet.
- Schema changes must be backward-safe and idempotent.

Current core tables:

- `properties`
- `tenants`
- `leases`
- `payments`
- `documents`
- `irl_indices`
- `payment_reminders`
- `inspections`
- `charge_reconciliations`
- `manual_reminders`
- `fiscal_expenses`

## Document and French Domain Rules

These rules already affect product behavior and should stay consistent across UI, storage, and PDF output.

- Full payment for a period produces a `quittance`.
- Partial payment produces a `recu`.
- Current detection lives in `src/pages/Documents/index.tsx` via `isFullPayment()`.
- PDF generation only starts from payments marked `paid`.
- If payment semantics change, update both:
  - `src/pages/Documents/index.tsx`
  - `src/lib/pdf/quittance.tsx`
  - `src/lib/pdf/recu.tsx`

Be careful with French rental terminology. `quittance` and `recu` are not interchangeable.

## UI Conventions

- Reuse local UI primitives from `src/components/ui/` before creating new ones.
- Keep page composition consistent with existing layout files under `src/components/layout/`.
- Follow current route structure instead of adding one-off entry points.
- Prefer straightforward React state and effects. Do not introduce new abstractions unless duplication is real.

## Security and Packaging

- Production disables DevTools and the context menu in `electron/main.ts`.
- The production app is frameless.
- Packaging uses `electron-builder.yml`.
- Build scripts also run JS obfuscation for main/preload output.

Do not weaken production protections unless the task explicitly requires it.

## Data Shape Discipline

Several pages depend on joined fields returned by query files, not only on base table columns.
When changing query output, check:

- `src/env.d.ts`
- the related page in `src/pages/`
- document generation in `src/pages/Documents/index.tsx`

## Validation Checklist

For most TypeScript changes, run:

```bash
npm run typecheck
```

Also do targeted checks when relevant:

- Electron or preload changes: `npm run build`
- PDF changes: generate at least one sample document in the app
- Query or schema changes: verify the affected page still loads and CRUD still works

## What Not To Assume

- Do not assume a missing feature described in old docs actually exists.
- Do not assume there is a migration framework.
- Do not assume there is a linter or test suite beyond TypeScript checks.
- Do not assume fields in the PDF templates are legally correct without checking the current implementation and product intent.

## Preferred Output From Codex

When making changes:

- explain the real files touched
- mention any cross-layer updates
- state what was verified
- call out risks if build or manual checks were not run
