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
- local authentication with profile and signature
- properties, tenants, leases, payments
- IRL reference data
- quittance and recu PDF generation
- dashboard and document archive

MVP delivered (in_progress — refinements tracked in BACKLOG):
- deposit management (collection, refund, deductions on leases)
- unpaid rent follow-up (reminder stages, PDF letters)
- annual charges reconciliation (yearly actual vs provisions, PDF export)
- reminders and deadlines center (derived lease/IRL dates, manual reminders)
- etat des lieux (entry/exit inspections, room-level notes, PDF report)
- expanded document templates (rent revision, deposit receipt, deposit settlement)
- tenant and guarantor file (guarantor contacts, emergency contacts, dossier checklist)
- bank CSV import (credit-line matching, payment creation)
- annual fiscal summary (per-property totals, CSV/PDF export)
- login page UI and custom window controls

## Now

Highest-value work: finishing in-progress items and closing gaps.

### 1. Tenant Account Ledger

Goal:
Show a clear balance history per tenant and per lease: expected rent, received amounts, arrears, credits, and carry-over between months.

Why it matters:
Payments alone are not enough once there are partial payments, adjustments, or late settlements.

### 2. Polish and Close In-Progress MVPs

Goal:
Move each in_progress backlog item to done by delivering remaining acceptance criteria (see BACKLOG.md for per-item details).

Priority items:
- deposit settlement PDF
- dashboard surfacing for arrears, reminders, and incomplete dossiers
- duplicate detection for bank CSV import
- tenant certificate / attestation document template

## Next

### 3. Maintenance and Incidents

Track repairs, suppliers, interventions, and costs by property and lease.

### 4. Multi-owner or Family Ownership Support

Useful for indivision or small shared ownership cases, but lower priority than core solo-landlord workflows.

## Out of Scope For Now

Keep these out unless there is a deliberate product shift:
- cloud sync
- online tenant portal
- SaaS multi-user collaboration
- agency / property manager workflows
- bank API integrations
