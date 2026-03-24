# Tenant and Guarantor File

Goal:
Give each tenant a structured file that covers guarantor details, emergency contact information, and core dossier completeness.

Current scope:
- extend the `tenants` table instead of creating a separate dossier table
- store guarantor contact data directly on the tenant record
- store emergency contact data directly on the tenant record
- track a first checklist of core supporting documents with booleans
- expose dossier management through a dedicated modal from the `Locataires` page

Data model:
Tenant records now include:
- `guarantor_name`
- `guarantor_email`
- `guarantor_phone`
- `guarantor_address`
- `emergency_contact_name`
- `emergency_contact_phone`
- `emergency_contact_relation`
- `dossier_id_document`
- `dossier_income_proof`
- `dossier_employment_proof`
- `dossier_tax_notice`
- `dossier_bank_details`
- `dossier_notes`

UI workflow:
1. User opens `Locataires`.
2. User clicks `Dossier locatif` on any tenant card.
3. User updates guarantor, emergency contact, and checklist fields.
4. User saves the dossier.
5. The tenant card immediately reflects `Garant` and `Dossier x/5` status.

Scope decisions:
- the MVP tracks completeness, not actual uploaded files
- the dossier is attached to the tenant, not the lease, to remain useful before or after an active lease
- the main add/edit tenant modal remains lightweight; detailed dossier data lives in a dedicated modal

Acceptance:
- guarantor information persists on tenant records
- emergency contact information persists on tenant records
- dossier completeness is visible in the tenant list and editable from a dedicated modal

Open questions:
- should later versions support actual file attachments per checklist item?
- should guarantor financial documents be tracked separately from the tenant dossier?
- should incomplete tenant files appear in the dashboard or reminders center?
