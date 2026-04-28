# Property Compliance Diagnostics

## Goal

Track the French diagnostic file for each rental property so lease creation, reminders, and stored documents all use the same compliance source of truth.

## Scope

- Store one diagnostics register per property.
- Track DPE class, GES class, DPE dates, ADEME number, annual energy estimate, notes, and asbestos availability.
- Track performed and expiry dates for lead, gas, electricity, ERP, and noise diagnostics.
- Attach diagnostic documents directly to the property with named slots for DPE, ERP, lead, gas, electricity, noise, and asbestos.
- Surface automatic reminders when diagnostic expiries are within 120 days or overdue by up to 30 days.
- Warn or block lease saving based on DPE rental restriction dates.

## Data Model

The `property_diagnostics` table is keyed by `property_id` and cascades when a property is deleted. It stores all diagnostic fields as nullable text dates or labels, plus `asbestos_available`, `created_at`, and `updated_at`.

## IPC

Renderer access is provided through:

- `propertyDiagnostics.getAll()`
- `propertyDiagnostics.getByProperty(propertyId)`
- `propertyDiagnostics.upsert(propertyId, data)`

All mutation payloads are validated in `ipcValidation.ts`, including DPE class values and ISO date fields.

## UI

The Properties page exposes a diagnostics action on every property card. The modal includes:

- DPE/GES class selectors.
- DPE performed and expiry dates, with expiry inferred from the performed date.
- ADEME number and annual energy estimate.
- Other diagnostic dates.
- Asbestos availability.
- Property-scoped attachment slots.
- Notes.

## DPE Rules

The shared helper `getDpeRule` applies the rental restriction dates:

- DPE G blocked from `2025-01-01`.
- DPE F blocked from `2028-01-01`.
- DPE E blocked from `2034-01-01`.

Lease creation displays a warning for missing or future-restricted DPE classes, and blocks saving when the selected lease start date is on or after the restriction date.

## Acceptance

- A property can save and update diagnostics without creating duplicate rows.
- Property diagnostic attachments can be uploaded through the shared attachment flow.
- Expiring diagnostics appear in the reminders center.
- DPE G properties cannot be saved into leases starting on or after `2025-01-01`.
- IPC validation rejects invalid DPE classes and invalid attachment entity types.

## Out Of Scope

- Automatic government API lookup by ADEME number.
- PDF lease generation changes.
- Legal advice or full regulatory certification.
