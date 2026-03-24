# Tenant Ledger

## Goal

Introduce a first `Compte locataire` workflow without adding a new database table.
The first iteration should help a landlord understand:
- what should have been collected
- what was actually marked as received
- which periods still need regularisation
- the running balance for the active lease

## Scope Of The First Iteration

Delivered UI:
- entry point from each tenant card with an active lease
- modal view named `Compte locataire`
- monthly ledger rows with:
  - period
  - amount due
  - amount received
  - delta
  - running balance
  - derived status

Not included yet:
- dedicated route or standalone page
- ended lease support
- opening balance import
- dashboard KPI updates from ledger data

## Data Source

The first iteration uses existing data only:
- active lease monthly amount from the tenant's joined lease data
- tracked payments from `window.api.payments.getByLease(leaseId)`

No schema change is introduced in this iteration.

## Business Rules

### Reconstructed Due Amount

For each month from the lease start date to the current month:
- the due amount is reconstructed from the active lease monthly rent plus charges

### Received Amount

Only payment rows with status `paid` count as received money.

This matters because current payment rows can also represent scheduled or unpaid periods:
- `pending` and `late` still carry an amount, but are not yet counted as collected

### Derived Statuses

The modal derives these states:
- `Regle`: received amount is at least the monthly due amount
- `Partiel`: some money was received, but not the full due amount
- `En retard`: tracked row exists with status `late` and nothing has been counted as paid for the period
- `En attente`: tracked row exists with status `pending`, or the current month has no payment yet
- `A regulariser`: no tracked row exists for a past period, but the lease implies a due amount

### Running Balance

Running balance is cumulative:
- positive balance means the tenant still owes money
- negative balance means there is a credit in the tenant's favour

## UX Notes

The modal includes a disclaimer because the account is reconstructed:
- it is based on the active lease and the payments entered in the app
- periods with no payment row are estimated, not confirmed

This is important for landlords who start using the app after a lease has already been running for some time.

## Open Questions

Before calling the feature complete, decide:
- should the app support an explicit opening balance per lease?
- should ended leases keep a ledger view after the lease is no longer active?
- should dashboard arrears switch from status-based totals to ledger-derived balances?