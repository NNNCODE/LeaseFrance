# Unpaid Rent Follow-up

## Goal

Add a practical `Relance impayes` workflow for private landlords without pretending to automate judicial enforcement.
The first iteration should allow the landlord to:
- keep a dated reminder history per unpaid payment
- generate an amicable reminder letter PDF
- escalate from a first reminder to a firmer letter or an instalment proposal

## Scope Of The First Iteration

Delivered:
- `payment_reminders` history table linked to a payment
- UI entry point from unpaid rows in `Paiements`
- modal with history, stage selection, reminder date, and free-form notes
- PDF generation for:
  - `relance_amiable`
  - `mise_en_demeure`
  - `proposition_echeancier`
- automatic switch from `pending` to `late` when a reminder is generated
- reminder documents visible in the `Documents` list

Not included yet:
- judicial `commandement de payer`
- legal delay calculations
- tenant response tracking beyond notes
- structured instalment schedule fields

## Data Model

New table:
- `payment_reminders`

Fields:
- `payment_id`
- `stage`
- `sent_at`
- `notes`
- `created_at`

This keeps a true history instead of only storing a single current reminder stage on the payment.

## Business Rules

### Reminder Stages

The first iteration supports amicable stages only:
- `relance_amiable`
- `mise_en_demeure`
- `proposition_echeancier`

### Why Not Commandement De Payer

A `commandement de payer` is not generated here.
The feature stays in an amicable lane and the PDF explicitly says it does not replace an act delivered by a commissaire de justice.

### Payment Status Interaction

If a reminder is generated for a payment still marked `pending`, the payment is automatically moved to `late`.
This keeps the operational status aligned with the fact that an unpaid follow-up has started.

## UX Notes

The reminder modal should show:
- payment amount and period
- reminder history
- the next likely stage preselected
- a warning that the generated PDF remains an amicable letter

## Open Questions

Before calling the feature complete, decide:
- should reminder counts be surfaced directly on payment rows or dashboard cards?
- should instalment plans become structured records instead of free-form notes?
- should the app add tenant acknowledgement tracking or follow-up tasks?