# Privacy Notes

Baillio is designed as a local-first desktop application. Normal use does not
require a Baillio account, cloud sync, telemetry, analytics, or a hosted backend.

## Data Stored Locally

The app stores rental management data on the user's machine, under the Electron
`userData` directory. On Windows this is typically:

```text
%APPDATA%/Baillio
```

Stored data can include:

- owner profile and local account metadata
- properties, tenants, guarantors, leases, payments, reminders, and fiscal data
- generated documents and imported attachments
- backup settings and local support logs

## Diagnostics

Diagnostics exports are intended for support. They may include app version,
runtime state, local paths, update and license state, backup settings without
passwords, and recent log lines.

Diagnostics should not include backup encryption passwords or raw license tokens.
Users should still review a diagnostics file before sharing it because it can
contain local paths, account names, and account email addresses.

## Backups

Backup archives can contain the user's database and local account metadata.
Unencrypted backups are readable JSON archives. Encrypted backups are protected
with a user-provided password.

Users are responsible for storing backups safely and keeping backup passwords
outside the application.

## Optional Hosted Integrations

License activation and auto-update are optional build-time integrations. Public
free/offline builds should remain usable when these integrations are not
configured.

## User Responsibility

Landlords remain responsible for how they collect, store, protect, and delete
tenant and guarantor personal data. Baillio helps keep data local, but it does
not replace the user's legal obligations or professional advice.
