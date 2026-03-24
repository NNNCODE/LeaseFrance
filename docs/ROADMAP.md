# Product Roadmap

LeaseFrance is a local-first Windows desktop app for private landlords in France.
This file tracks medium- and long-term product direction.

Use this file for:
- product priorities
- sequencing across releases
- decisions about what to build next

Do not use this file for:
- small implementation tasks
- code-level notes
- temporary scratch TODOs

Actionable engineering work belongs in `docs/BACKLOG.md`.
Detailed feature design can live in `docs/features/<feature>.md`.

## Current Product Base

Already in place:
- local authentication
- properties
- tenants
- leases
- payments
- IRL reference data
- quittance and recu PDF generation
- dashboard and document archive

## Now

These are the highest-value additions for private landlords using the current app.

### 1. Tenant Account Ledger

Goal:
Show a clear balance history per tenant and per lease: expected rent, received amounts, arrears, credits, and carry-over between months.

Why it matters:
Payments alone are not enough once there are partial payments, adjustments, or late settlements.

### 2. Deposit Management

Goal:
Track deposit collection, retained amounts, refund date, and deduction reasons.

Why it matters:
This is a common end-of-lease workflow and directly connects to disputes and document generation.

### 3. Unpaid Rent Follow-up

Goal:
Support reminder stages for unpaid rent: reminder, formal notice, payment plan, notes, and generated letters.

Why it matters:
Landlords need a consistent process, not only a late payment status.

### 4. Annual Charges Reconciliation

Goal:
Track collected charges vs actual expenses and generate a yearly regularisation summary.

Why it matters:
This closes an important gap between monthly rent collection and real annual accounting.

### 5. Reminders and Deadlines

Goal:
Surface upcoming dates such as lease renewals, IRL revision windows, insurance proof requests, diagnostics, and tax-related reminders.

Why it matters:
A desktop app should help users avoid missing dates, not just store records.

## Next

These features are strong follow-ups once the workflows above exist.

### 6. Etat des Lieux

Structured move-in and move-out inspections with room-by-room notes, meter readings, photos, and signatures.

### 7. Expanded Document Center

Add more landlord-facing templates:
- rent revision notice
- deposit receipt
- deposit settlement
- unpaid rent reminder letter
- tenant certificate / attestation

### 8. Tenant and Guarantor File

Store guarantor details, emergency contacts, and application document completeness.

### 9. Bank Import and Payment Matching

Import CSV statements and suggest links to existing leases and unpaid periods.

## Later

These are valuable, but not on the immediate path.

### 10. Annual Fiscal Summary

Generate yearly summaries of rent received, recoverable charges, vacancies, and exportable totals.

### 11. Maintenance and Incidents

Track repairs, suppliers, interventions, and costs by property and lease.

### 12. Multi-owner or Family Ownership Support

Useful for indivision or small shared ownership cases, but lower priority than core solo-landlord workflows.

## Out of Scope For Now

Keep these out unless there is a deliberate product shift:
- cloud sync
- online tenant portal
- SaaS multi-user collaboration
- agency / property manager workflows
- bank API integrations
