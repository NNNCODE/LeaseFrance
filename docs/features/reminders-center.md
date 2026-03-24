# Reminders Center

## Goal

Create a central `Echeances` screen so landlords can see upcoming deadlines in one place instead of hunting across leases and notes.

## Scope Of The Current Iteration

Delivered:
- dedicated page and sidebar entry
- automatic reminders derived from existing lease data:
  - lease end dates
  - IRL anniversary windows
- manual reminders stored in a dedicated table
- manual reminder actions:
  - create
  - edit
  - mark done
  - reopen
  - delete

Not included yet:
- desktop notifications or scheduled popups
- dashboard widget for upcoming reminders
- insurance, diagnostics, and tax deadlines derived automatically from dedicated stored fields

## Data Model

The first iteration adds `manual_reminders` with:
- `lease_id` nullable
- `title`
- `category`
- `due_date`
- `notes`
- `status`

This keeps manually managed reminders explicit while derived reminders remain computed in the renderer from lease data.

## Derived Reminder Rules

### Lease End

For active leases with an `end_date`, the center surfaces reminders when the end date is within the configured upcoming or recent window.

### IRL Anniversary

For active leases that are IRL-eligible, the center surfaces a reminder around the lease anniversary date so the landlord can review whether a rent revision should be applied.

## Manual Reminder Categories

Current categories:
- `insurance`
- `diagnostic`
- `tax`
- `custom`

## UX Notes

- derived reminders cannot be marked done because they disappear when the source data is no longer relevant
- manual reminders can be closed and reopened
- reminders linked to a lease can jump back to the `Baux` page

## Open Questions

- should there be a dashboard card for the next 7 or 30 days?
- should desktop notifications be added later?
- once insurance or diagnostics are modeled directly, should their reminders stay editable or become fully derived?
