# Charges Reconciliation

## Goal

Add a practical yearly `regularisation des charges` workflow tied to each lease so a landlord can compare provisions already collected against the annual actual charges.

## Scope Of The Current Iteration

Delivered:
- dedicated lease-level modal from `Baux`
- persistent `charge_reconciliations` table
- yearly fields for:
  - `year`
  - `actual_charges`
  - optional `provisions_collected_override`
  - free-form `notes`
- automatic calculation of collected provisions from `payments` where status is `paid`
- PDF export for the saved yearly summary
- saved PDFs appear in `Documents` with a dedicated type

Not included yet:
- invoice or attachment storage behind the annual total
- tenant-facing send workflow
- dashboard reminders for leases that should be regularised
- detailed legal guidance around deadlines or supporting documents

## Data Model

The current iteration uses a dedicated `charge_reconciliations` table with:
- `lease_id`
- `year`
- `actual_charges`
- `provisions_collected_override`
- `notes`

A unique constraint on `(lease_id, year)` keeps one saved reconciliation per lease and year.

## Calculation Rules

### Automatic Provisions Collected

If no manual override is entered, the app uses:
- sum of `payments.charges_amount`
- only for rows with `status = paid`
- only for the selected `year`
- only for the current `lease`

### Manual Override

If payment history is incomplete, the landlord can enter `provisions_collected_override`.
That value replaces the auto-derived amount for the yearly balance.

### Balance

The balance is computed as:
- `actual_charges - effective_collected_provisions`

Meaning:
- positive balance: extra amount still due from the tenant
- negative balance: overcollection to reimburse to the tenant
- zero: settled year

## UX Notes

- the modal keeps history on the same lease so the workflow stays close to the contract
- the form shows the current year's preview before saving
- each saved year can be edited, deleted, or exported as PDF

## Open Questions

- should the app later support one charge line per invoice instead of one yearly total?
- should there be a dashboard card listing leases without any reconciliation for the previous year?
- should the PDF eventually include attached invoices or a structured breakdown by expense category?
