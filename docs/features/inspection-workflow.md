# Inspection Workflow

## Goal

Add a usable `etat des lieux` workflow for private landlords so the app can cover move-in and move-out handover documentation, not only rent and lease administration.

## Scope Of The Current Iteration

Delivered:
- dedicated `Etats des lieux` page with its own route and sidebar entry
- persistent `inspections` table attached to `leases`
- create, edit, delete flow for:
  - inspection kind (`entry` or `exit`)
  - inspection date
  - general condition
  - meter readings
  - free-form notes
  - room or area rows with condition and notes
- PDF generation for both entry and exit inspections
- saved PDFs appear in `Documents` with dedicated document types

Not included yet:
- tenant signature capture inside the app
- photo attachments by room
- side-by-side comparison between entry and exit inspections
- direct shortcut from the `Baux` list into a prefilled inspection modal

## Data Model

Current storage lives in a dedicated `inspections` table:
- `lease_id`
- `kind`
- `inspection_date`
- `meter_readings`
- `general_condition`
- `notes`
- `rooms_json`

`rooms_json` stores a list of rows shaped like:
- `area`
- `condition`
- `notes`

This is enough for a first MVP without introducing several related child tables too early.

## Workflow

1. User opens `Etats des lieux`.
2. User creates a new `entry` or `exit` inspection for a lease.
3. User fills the structured rows and summary fields.
4. User saves the inspection.
5. User can later edit it, delete it, or export a PDF.

## PDF Rules

- `entry` exports as `etat_des_lieux_entree`
- `exit` exports as `etat_des_lieux_sortie`
- landlord signature uses the existing `Proprietaire.signatureImage` if available
- tenant signature is currently a printable placeholder, not a stored signature asset

## UX Notes

- the modal can reuse room names from the most recent inspection for the same lease
- the first iteration prioritizes a clean record-and-print workflow over legal edge cases or attachment management
- the page is intentionally separate from `Baux` so inspections remain readable once a lease has multiple operational actions

## Open Questions

- should the exit workflow compare against the entry inspection automatically?
- should each room support photos or structured checkboxes?
- should both landlord and tenant signatures be captured directly on screen before export?
