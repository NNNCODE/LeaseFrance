# Rebrand Migration Report: LeaseFrance -> Baillio

Date: 2026-04-09
Status: Desktop branding switched to Baillio with compatibility safeguards for existing installs.

## Completed

- User-facing desktop brand updated to `Baillio`
- Renderer header, sidebar, auth shell, HTML title, PDF footers and backup labels updated
- IPC type names renamed from `RentFlow*` to `Baillio*`
- Default backup and diagnostics filenames now use `baillio_*`
- Build-time update and license configuration now prefer `BAILLIO_*` environment variables
- Existing `RENTFLOW_*` environment variables remain accepted as fallbacks
- `productName` changed to `Baillio`
- Startup now migrates `%APPDATA%/LeaseFrance` into `%APPDATA%/Baillio`
- Per-account databases now migrate from `leasefrance.db` to `baillio.db`

## Intentionally Kept For Compatibility

- `appId: com.leasefrance.app` in `electron-builder.yml`
  Reason: changing it would create a separate Windows install identity and break upgrade-in-place for existing users.
- Legacy user-data source folder `LeaseFrance`
  Reason: startup migration needs to find and move existing customer data.
- Legacy DB filename `leasefrance.db`
  Reason: rename-on-access migration needs to detect and move existing account databases.
- Legacy auto-backup prefixes `rentflow_auto_` and `leasefrance_auto_`
  Reason: rotation must continue to recognize older backup files.
- Legacy `RENTFLOW_*` environment variables
  Reason: current deployment or local build scripts may still rely on them.

## Remaining Manual Items

- Replace the Windows icon asset if it still contains old initials or branding
- Rename the repository folder if you also want the local filesystem path to stop showing `leaseFrance`
- Decide later whether breaking the Windows install identity (`appId`) is worth a clean full rebrand