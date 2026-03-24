# Backlog

This file tracks actionable work for Claude Code and manual development sessions.

Rules:
- keep items concrete and implementation-ready
- split large features into MVP slices
- update status when work starts or finishes
- move feature-level design into `docs/features/<feature>.md` when scope gets non-trivial

Suggested statuses:
- `todo`
- `in_progress`
- `blocked`
- `done`

## P0

### Tenant Account Ledger

Status: `in_progress`
Outcome:
Provide a per-tenant and per-lease account view with debit, credit, arrears, overpayment, and running balance.

Current scope delivered:
- active lease ledger modal from the `Locataires` page
- month-by-month reconstruction from lease amount and tracked payments
- running balance, partial payment handling, and derived regularisation states

Still needed before `done`:
- handling for ended leases or imported historical balances
- dashboard integration based on ledger-derived arrears
- explicit opening balance support if the app starts tracking mid-lease

Acceptance:
- each lease has a readable ledger history
- partial payments affect balance correctly
- dashboard can surface current arrears from ledger data or a compatible derived value

Spec:
- `docs/features/tenant-ledger.md`

Likely touch points:
- `electron/db/database.ts`
- `electron/db/queries/payments.ts`
- `src/env.d.ts`
- `src/pages/Payments/index.tsx`
- `src/pages/Dashboard/index.tsx`

### Deposit Management MVP

Status: `todo`
Outcome:
Track deposit amount, collection date, retained amount, refund date, and refund status.

Acceptance:
- deposit data can be stored at lease level
- user can record refund and deductions
- data is visible from the lease workflow

Likely touch points:
- `electron/db/database.ts`
- `electron/db/queries/leases.ts`
- `src/env.d.ts`
- `src/pages/Leases/index.tsx`

### Unpaid Rent Follow-up

Status: `todo`
Outcome:
Record reminder stages and generate follow-up letters for unpaid rent.

Acceptance:
- payment or lease can store reminder state and dates
- user can generate at least one reminder letter PDF
- reminder history is visible in the UI

Likely touch points:
- `electron/db/database.ts`
- `electron/db/queries/payments.ts`
- `src/pages/Payments/index.tsx`
- `src/pages/Documents/index.tsx`
- `src/lib/pdf/`

### Annual Charges Reconciliation MVP

Status: `todo`
Outcome:
Capture annual actual charges and compare them against provisions already collected.

Acceptance:
- user can enter annual actual charge totals
- app shows overpayment or underpayment
- result can be exported or printed as a simple summary

Likely touch points:
- `electron/db/database.ts`
- `electron/db/queries/leases.ts`
- `src/pages/Leases/index.tsx`
- `src/pages/Documents/index.tsx`

## P1

### Reminders and Deadlines Center

Status: `todo`
Outcome:
Show upcoming lease, IRL, insurance, diagnostics, and tax reminders in one place.

Acceptance:
- deadlines are visible from a central screen or dashboard module
- reminder dates can be derived from lease/profile data or entered manually

### Etat des Lieux MVP

Status: `todo`
Outcome:
Support structured move-in and move-out inspection reports with notes and signatures.

Acceptance:
- user can create an entry and exit inspection
- room-level condition notes are persisted
- a printable PDF can be generated

### Expanded Document Templates

Status: `todo`
Outcome:
Add practical landlord documents beyond quittance and recu.

Target first templates:
- rent revision notice
- deposit receipt
- deposit settlement
- unpaid rent reminder letter

## P2

### Tenant and Guarantor File

Status: `todo`
Outcome:
Store guarantor details, supporting document completeness, and emergency contacts.

### Bank CSV Import

Status: `todo`
Outcome:
Import bank statements and suggest payment matching against leases or arrears.

### Annual Fiscal Summary

Status: `todo`
Outcome:
Export yearly rent and charge summaries for personal tax preparation.

## Working Pattern With Claude Code

Use prompts like:
- `Implement the "Deposit Management MVP" item from docs/BACKLOG.md`
- `Create a feature spec for "Tenant Account Ledger" under docs/features/`
- `Split the "Unpaid Rent Follow-up" item into schema, UI, and PDF subtasks`

After implementation:
- update the item status
- note any scope changes
- add a feature spec if the work introduced new business rules
