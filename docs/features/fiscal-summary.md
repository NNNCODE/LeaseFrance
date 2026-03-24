# Annual Fiscal Summary

Goal:
Provide a landlord-facing yearly export that consolidates rent received, recoverable charges, vacancy estimation, and tracked unpaid amounts for personal tax preparation.

Current scope:
- add a dedicated `Fiscal` page in the main navigation
- load existing `properties`, `leases`, and `payments`
- let the user switch between available fiscal years
- compute annual totals without adding a new backend table
- export the selected year to:
  - CSV
  - PDF

Computation rules:
- `received rent`:
  - sum of `payment.rent_amount` for rows with status `paid`
  - payment year uses `payment_date` when present, otherwise `period_year`
- `received charges`:
  - sum of `payment.charges_amount` for rows with status `paid`
- `outstanding amount`:
  - sum of `pending` and `late` rows on the selected `period_year`
- `vacancy`:
  - estimated month by month from lease date coverage on each property

UI workflow:
1. User opens `Fiscal`.
2. User selects a year.
3. App shows yearly cards and a per-property table.
4. User exports CSV or PDF.
5. File is saved to a chosen location through the Electron save dialog.

Scope decisions:
- exports are not stored in the existing `documents` table because they are portfolio-level, not lease-level
- the summary currently excludes owner expenses, works, loan interest, and tax-specific deductions
- the PDF includes a note that it does not replace tax or accounting advice

Files touched:
- `src/pages/Fiscal/index.tsx`
- `src/pages/Fiscal/summary.ts`
- `src/lib/pdf/fiscalSummary.tsx`
- `src/App.tsx`
- `src/components/layout/Sidebar.tsx`
- `electron/main.ts`
- `electron/preload.ts`
- `src/env.d.ts`

Acceptance:
- user can open a dedicated fiscal reporting page
- user can switch years and review a per-property annual summary
- CSV export opens with French-friendly numeric formatting
- PDF export includes landlord identity and signature when available

Open questions:
- should a future version include owner expenses and a truer tax result estimate?
- should later versions archive exported fiscal summaries in a separate non-lease document table?
- should vacancy later be computed from a stricter occupancy ledger rather than lease date coverage alone?
