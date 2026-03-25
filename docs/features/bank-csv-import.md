# Bank CSV Import

Goal:
Let landlords import a bank CSV export, detect incoming rent-like credits, and reconcile them against the existing `payments` workflow.

## Current scope

- CSV import modal from the `Paiements` page
- parse common CSV formats with flexible header detection:
  - `date` (multiple aliases per bank)
  - `libelle` or `description` (multiple aliases)
  - `montant`, or `credit` / `debit` split columns
- bank template presets for major French banks (BNP, CA, SG, LCL, BP, Boursorama, CIC, Fortuneo)
- auto-detection of bank format from CSV headers
- keep only incoming credit transactions for reconciliation
- suggest one of three actions per transaction:
  - ignore
  - mark an existing unpaid payment as received
  - create a new paid payment on an active lease

## Matching rules

Suggestions are derived from a weighted score using:
- amount similarity to the contractual rent + charges (up to 38 pts)
- text similarity against tenant name or property name (up to 24 pts)
- month/year proximity for existing payment rows (14 pts)
- preference for existing `late` (8 pts) or `pending` (5 pts) payments

Each criterion provides a detailed breakdown shown in the UI:
- label (e.g. "Montant"), detail text (e.g. "Ecart de 2,00 EUR"), and point value
- expandable per-row so users understand why a match was suggested

Confidence levels: high (>=60), medium (>=42), low (>=28), none (<28).

## Duplicate detection

- `bank_imports` table stores a fingerprint for each successfully imported transaction
- fingerprint = `date|amount|normalized_description_first_60_chars`
- on CSV load, all fingerprints are checked against stored history
- duplicates are flagged with a warning badge and auto-set to "ignore"
- users can manually override and force-import a duplicate if needed

## Batch operations

- "Tout accepter" — accept all non-duplicate suggestions
- "Confiance haute/moyenne" — accept only high/medium confidence, ignore the rest
- "Tout ignorer" — set all rows to ignore

## Confirmation step

Before applying, users see a summary screen showing:
- total transactions and amount
- breakdown of mark-existing vs create-new actions
- line-by-line review of each action with target payment/lease
- "Modifier les lignes" link to go back and adjust

## User workflow

1. User opens `Paiements`.
2. User clicks `Import banque CSV`.
3. Optionally selects a bank preset (auto-detected by default).
4. User selects a CSV export from their bank.
5. App parses credits, checks for duplicates, and proposes actions.
6. User can use batch controls or adjust individual rows.
7. User clicks "Verifier et appliquer" to see the confirmation summary.
8. User confirms to apply the reconciliation.
9. Existing payments are updated or new paid payments are created.
10. Fingerprints are recorded to prevent future duplicate imports.

## Architecture

- `bank_imports` table in SQLite stores import fingerprints
- `electron/db/queries/bankImports.ts` — findDuplicates, recordImported
- IPC handlers: `bankImports:findDuplicates`, `bankImports:recordImported`
- `src/pages/Payments/bankImport.ts` — parsing, presets, fingerprints, scoring
- `src/pages/Payments/PaymentBankImportModal.tsx` — full UI

## Open questions

- should later matching also consider ended leases or historical balances?
- should we support OFX/QIF formats in addition to CSV?
