# Deposit Management

## Goal

Extend the existing lease workflow so a landlord can manage the real life cycle of the `depot de garantie`, not only its contractual amount.
The first iteration should allow the landlord to:
- record when the deposit was actually received
- record when it was returned
- track the retained amount
- keep notes about deductions or restitution details

## Scope Of The First Iteration

Delivered:
- extra lease fields for deposit collection and restitution
- derived deposit statuses shown in the `Baux` list
- dedicated modal to manage:
  - collection date
  - refund date
  - retained amount
  - free-form notes
- computed amount still to return based on the contractual deposit and retained amount

Not included yet:
- settlement PDF
- photo or invoice attachments for deductions
- legal deadline reminders for restitution

## Data Model

The first iteration extends `leases` with:
- `deposit_received_date`
- `deposit_refund_date`
- `deposit_retained_amount`
- `deposit_notes`

This keeps deposit management directly attached to the lease, which is enough for a first MVP and avoids adding a new table too early.

## Business Rules

### Contractual Deposit

`deposit_amount` remains the agreed contractual amount from the lease form.

### Collection Status

If `deposit_amount > 0` and there is no `deposit_received_date`, the deposit is treated as still to be collected.

### Restitution Status

The status is derived from the lease fields:
- `A encaisser`: deposit exists but was not recorded as received yet
- `Detenu`: deposit was received and not returned yet
- `Restitue`: refund date exists and retained amount is zero
- `Restitue partiellement`: refund date exists and retained amount is between zero and the contractual amount
- `Retenu`: refund date exists and retained amount equals or exceeds the contractual amount

### Returned Amount

Returned amount is derived, not stored separately:
- `deposit_amount - deposit_retained_amount` once a refund date exists

## UX Notes

The lease form still defines the contractual deposit amount.
Operational handling lives in a dedicated modal from the lease row so the main lease form stays readable.

## Open Questions

Before calling the feature complete, decide:
- should the app generate a `solde de depot de garantie` PDF?
- should retained amounts require structured deduction lines instead of a single free-form note?
- should ended leases surface unresolved deposits in the dashboard?