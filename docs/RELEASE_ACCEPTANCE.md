# Release Acceptance Test Plan

This document is for answering one product question before a public demo,
release, or showcase:

> Can a landlord install Baillio, complete the core local workflow, and trust
> the app not to lose data during normal use?

Unit tests and UI regression tests are necessary, but they do not answer that
question on their own. This checklist is the manual acceptance layer on top of
`npm test`.

## What "Usable Product" Means Here

Baillio counts as usable for public showcase purposes only if a tester can:

- launch the app from a fresh environment
- create and reopen a local account
- create the core data chain: property -> tenant -> lease
- record payments and see expected follow-up state
- generate and save at least one PDF document
- export diagnostics and create a backup without corruption
- relaunch the app and keep previously entered data
- do all of the above without any hosted Baillio service configured

If any of those fail, the product is not ready to be presented as a reliable
desktop app, even if unit tests are green.

## Test Environments

Run this plan in the environments that match the actual product claim:

- Windows 11 packaged build
- Windows 10 packaged build if you still claim Windows 10 support
- optional: local dev run with `npm run dev` for faster triage after a failure

Use a fresh app data directory or a new Windows user profile for each run.
Do not reuse a long-lived developer profile for acceptance testing.

## Evidence To Keep

For each run, keep:

- app version or commit SHA
- Windows version
- screenshots for each major step
- one generated PDF saved from the run
- one backup archive generated from the run
- one diagnostics export from the run
- a short defect list with severity and reproduction notes

## Automated Gate Before Manual Testing

Run these first:

```bash
npm run typecheck
npm test
npm run build
npm run dist
```

Manual acceptance is worth much less if the packaged build is already broken.

## P0 Scenarios: Must Pass

These are blocking scenarios. If one fails, stop calling the product ready.

### P0-1 Fresh Setup And Relaunch

Steps:

1. Start from a fresh machine profile or clean `%APPDATA%/Baillio`.
2. Launch the packaged app.
3. Create the first local account.
4. Close the app completely.
5. Reopen the app and log in again.
6. Lock the session, then unlock it again.

Pass criteria:

- setup completes without crash
- login works after relaunch
- lock/unlock does not lose session data
- no activation screen appears when private license runtime is not configured

### P0-2 Core Data Chain

Steps:

1. Create one owner profile if the workflow requires it.
2. Create one property.
3. Create one tenant with realistic contact data.
4. Create one active lease linking that property and tenant.

Pass criteria:

- each record is visible in its page list after save
- the lease correctly links existing property and tenant data
- reopening the app preserves all created records

### P0-3 Payment Lifecycle

Steps:

1. From the active lease, create at least one expected payment period.
2. Mark one payment as paid.
3. Leave one payment unpaid or partial if the UI supports it.
4. Check dashboard, payments list, and lease-related views.

Pass criteria:

- the paid item stays paid after navigation or relaunch
- unpaid or partial state is visible where expected
- totals and status do not obviously contradict the entered data

### P0-4 Document Generation And Preview

Steps:

1. Open the Documents area or a document generation entry point.
2. Generate at least one landlord document based on real app data.
3. Open the generated PDF preview.
4. Save the PDF to disk.
5. Reopen the saved file outside the app if possible.

Pass criteria:

- generation completes without crash
- preview renders a non-empty document
- saved file opens and matches the selected record
- the document archive shows the generated item when the workflow should archive it

### P0-5 Backup And Restore Safety

Steps:

1. Create a backup from Settings.
2. Export diagnostics from Settings.
3. If restore is already considered user-ready, restore from the created backup in
   a clean profile or on a copied data directory.

Pass criteria:

- backup file is created successfully
- diagnostics export is created successfully
- restore brings back the expected records without corruption
- backup/restore does not silently drop attachments or core entities

### P0-6 Offline / No Private Services

Steps:

1. Use a build with no private license or update endpoint configured.
2. Launch and use the app without network-dependent setup.
3. Repeat the core data and document flow.

Pass criteria:

- the app remains usable without Baillio-hosted services
- optional private integrations fail closed and do not block local workflows

## P1 Scenarios: Strongly Recommended

These do not block a basic public showcase alone, but failures here reduce the
claim that the app is broadly usable.

### P1-1 Reminders

- create one manual reminder
- verify due date, done state, reopen flow

### P1-2 Inspection Workflow

- create one inspection
- add room-level notes
- export the PDF

### P1-3 Fiscal Export

- open the Fiscal page
- generate CSV and PDF exports for a year with sample payments

### P1-4 Diagnostics Review

- inspect the exported diagnostics bundle
- confirm the output is understandable enough to help debug a field issue

## Exit Rules

Call the product "ready for public showcase" only if:

- all automated checks pass
- every P0 scenario passes
- no crash, data loss, or blocker appears in a core workflow
- any P1 failures are understood and do not undermine the main product claim

Do not call the product ready if:

- setup, login, relaunch, payment recording, PDF generation, backup, or restore fails
- the app needs a private backend to complete the basic local workflow
- data disappears, duplicates unexpectedly, or becomes inconsistent after relaunch

## How To Log Results

For each run, record:

- `Pass` / `Fail`
- scenario ID
- observed behavior
- screenshot or file evidence path
- defect severity:
  - `blocker`: cannot continue or data loss
  - `major`: core workflow broken but workaround exists
  - `minor`: polish or non-blocking mismatch

## Recommended First Real Test Session

If you only have time for one serious pass, do this order:

1. `npm run dist`
2. install and launch the packaged build
3. P0-1 Fresh Setup And Relaunch
4. P0-2 Core Data Chain
5. P0-3 Payment Lifecycle
6. P0-4 Document Generation And Preview
7. P0-5 Backup And Restore Safety
8. P0-6 Offline / No Private Services

That sequence is the shortest path to answering whether Baillio is a real,
usable desktop product instead of only a codebase with green tests.
