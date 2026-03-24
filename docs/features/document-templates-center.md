# Expanded Document Templates

Goal:
Turn `Documents` into a usable template center for private landlords, not only a passive archive of previously generated PDFs.

Current scope:
- keep the existing document archive list
- replace the old payment-only generator with a template center modal
- support generation of:
  - rent revision notice
  - deposit receipt
  - deposit settlement

Data model:
- no new table for the MVP
- rent revision notice derives from existing lease and IRL reference data
- deposit documents derive from existing lease-level deposit fields
- generated files continue to be persisted through the existing `documents` table with new `type` values

Document types introduced:
- `avis_revision_loyer`
- `recu_depot_garantie`
- `solde_depot_garantie`

UI workflow:
1. User opens `Documents`.
2. User clicks `Nouveau document`.
3. User selects a template family from the modal.
4. User selects the relevant payment or lease.
5. User reviews the generated data preview.
6. User saves the PDF and it appears immediately in the archive.

Template rules:
- `Quittance / recu`:
  - available for payments with status `paid`
  - full payment generates a quittance
  - partial payment generates a recu
- `Avis de revision de loyer`:
  - available for active non-mobility leases
  - requires an IRL reference value and quarter on the lease
  - requires a newer IRL for the same quarter in the local IRL dataset
- `Recu de depot de garantie`:
  - available when `deposit_amount > 0` and `deposit_received_date` is filled
- `Solde de depot de garantie`:
  - available when `deposit_amount > 0` and `deposit_refund_date` is filled

Files touched:
- `src/pages/Documents/index.tsx`
- `src/pages/Documents/GenerateDocumentModal.tsx`
- `src/pages/Documents/documentTemplateHelpers.ts`
- `src/lib/pdf/documentTemplates.tsx`
- `electron/main.ts`

Acceptance:
- the `Documents` page can generate at least three landlord-facing templates beyond quittance and recu
- new templates save through the same PDF persistence flow as existing documents
- new archive rows display readable labels and icons for the new document types

Open questions:
- should `attestation de loyer` be the next template or should the app first expose unpaid reminder letters directly from the document center?
- should later versions store structured metadata on each document row beyond `type` and `lease_id`?
