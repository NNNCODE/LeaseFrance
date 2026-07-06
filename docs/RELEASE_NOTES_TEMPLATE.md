# Baillio v0.1.1 Release Notes

Use this template for the GitHub Release body. Update the version, date, asset
names, and checksum after building the final installer.

## Download

Download the Windows installer from the GitHub Release assets:

- `Baillio Setup 0.1.1.exe`

After downloading, run the installer and follow the setup prompts. Baillio is a
Windows desktop app; the current public package targets Windows x64.

## Windows SmartScreen Notice

This public build is not code-signed. Windows may show an "Unknown publisher" or
SmartScreen warning before installation.

If you downloaded the installer from the official GitHub Release, you can choose
"More info" and then "Run anyway". Do not run installers from mirrors or
untrusted links.

## SHA256 Checksum

Publish the checksum next to the installer in this release:

```text
SHA256: <paste SHA256 for Baillio Setup 0.1.1.exe here>
```

Maintainer command to generate the checksum from the repository root:

```powershell
Get-FileHash -Algorithm SHA256 ".\dist\Baillio Setup 0.1.1.exe" | Format-List
```

Optional command to write a sidecar checksum file:

```powershell
Get-FileHash -Algorithm SHA256 ".\dist\Baillio Setup 0.1.1.exe" |
  ForEach-Object { "$($_.Hash)  Baillio Setup 0.1.1.exe" } |
  Set-Content -Encoding ascii ".\dist\Baillio Setup 0.1.1.exe.sha256"
```

User verification command after download:

```powershell
Get-FileHash -Algorithm SHA256 ".\Baillio Setup 0.1.1.exe"
```

Compare the printed hash with the SHA256 value published in this release.

## Local Data Storage

Baillio is local-first. Core app data is stored on your Windows machine under
the Electron user data directory, typically:

```text
%APPDATA%\Baillio
```

The free public build does not require a hosted Baillio service for local
account setup, properties, tenants, leases, payments, PDF generation, backups,
or diagnostics.

## Backup Reminder

Before upgrading from an older build, create a backup from Settings. Keep the
backup file somewhere outside the app data folder, such as an external drive or
a trusted personal backup location.

If you use encrypted backups, store the backup password separately. Baillio
cannot recover a lost backup password.

## Known Limitations

- Windows-only public package for now.
- The installer is unsigned, so Windows SmartScreen may warn.
- In-app auto-update and hosted license activation are disabled unless a private
  runtime endpoint is configured by the maintainer.
- Baillio stores data locally and does not provide cloud sync.
- Generated rental and fiscal documents should be reviewed before use; the app
  is not legal or tax advice.

## Privacy And Disclaimer

See [docs/PRIVACY.md](PRIVACY.md) for what stays local and what may appear in
diagnostic exports. See [docs/DISCLAIMER.md](DISCLAIMER.md) for the legal, tax,
and document-review boundaries of the app.
