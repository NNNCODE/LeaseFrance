# Bank CSV Import

Goal:
Let landlords import a bank CSV export, detect incoming rent-like credits, and reconcile them against the existing `payments` workflow.

Current scope:
- add a CSV import modal from the `Paiements` page
- parse common CSV formats with:
  - `date`
  - `libelle` or `description`
  - `montant`
  - or `credit` / `debit`
- keep only incoming credit transactions for reconciliation
- suggest one of three actions per transaction:
  - ignore
  - mark an existing unpaid payment as received
  - create a new paid payment on an active lease

Matching rules:
Suggestions are derived from a lightweight score using:
- amount similarity to the contractual rent + charges
- text similarity against tenant name or property name
- month/year proximity for existing payment rows
- preference for existing `pending` or `late` payments

Scope decisions:
- no dedicated bank transaction table in the MVP
- imported rows are applied directly to `payments`
- the importer focuses on rent inflows, not full accounting or expense reconciliation
- duplicate detection is left for a later iteration

User workflow:
1. User opens `Paiements`.
2. User clicks `Import banque CSV`.
3. User selects a CSV export from their bank.
4. App parses incoming credit transactions and proposes a target action for each line.
5. User adjusts any uncertain rows.
6. User applies the reconciliation.
7. Existing payments are updated or new paid payments are created.

Acceptance:
- CSV import works without adding a backend table
- user can manually override suggestions before applying
- resulting payments remain visible in the normal payments list

Open questions:
- should the app store imported bank lines separately to prevent duplicate re-imports?
- should future versions support bank-specific column presets?
- should later matching also consider ended leases or historical balances?
