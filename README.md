# Baillio

Baillio is a local-first Windows desktop app for private landlords in France.
It runs as an Electron application with a React renderer, stores operational
data in local SQLite files, and focuses on day-to-day rental management without
requiring a SaaS backend for normal use.

The product direction is pragmatic:

- local data first
- usable offline for core workflows
- PDF and export generation on the machine
- backup, diagnostics, and supportability built into the desktop app

## Repository Status

This repository is distributed under the MIT License.

- The desktop app can run locally without Baillio-hosted services.
- License activation and auto-update are optional integration points and stay
  disabled unless you configure them explicitly at build time.
- Hosted license activation and auto-update endpoints are optional private
  integrations, not required runtime dependencies for local development.

## What The App Currently Covers

- Local account setup and login
- Multi-owner profile management for landlord entities
- Property, tenant, lease, and payment management
- Rent receipts and other PDF document generation
- IRL-based rent revision support
- Reminder and deadline workflows
- Backup, restore, diagnostics, and support logs
- Packaged Windows installer builds

Baillio is an assistance tool, not legal, tax, or accounting advice. Users must
verify generated documents and reference data before relying on them. See
[docs/DISCLAIMER.md](docs/DISCLAIMER.md).

## Technology Stack

- Electron
- React 18
- TypeScript
- SQLite via `better-sqlite3`
- Zustand
- Tailwind CSS
- electron-vite
- Vitest

## Platform Scope

Baillio is currently a Windows-first desktop application.

- Primary target: Windows 10/11
- Packaging: NSIS installer via `electron-builder`
- Other desktop platforms are not the current focus

## Public Windows Download

Public Windows installers are published from GitHub Releases:

```text
https://github.com/NNNCODE/LeaseFrance/releases
```

Download the latest `Baillio Setup <version>.exe` asset from the release page.
Current public builds are not code-signed, so Windows may show an "Unknown
publisher" or SmartScreen warning. Verify that the installer came from the
official GitHub Release before choosing "More info" and "Run anyway".

Each release should publish a SHA256 checksum next to the installer. On Windows,
you can verify a downloaded installer with:

```powershell
Get-FileHash -Algorithm SHA256 ".\Baillio Setup <version>.exe"
```

Baillio stores data locally, typically under `%APPDATA%/Baillio`. Before
upgrading from an older build, create a backup from Settings and keep it outside
the app data folder.

## Quick Start

### Requirements

- Node.js 20+
- npm
- Windows development environment able to rebuild native modules

`better-sqlite3` is rebuilt during `npm install`, so your machine needs the
usual native build prerequisites for Electron dependencies.

### Install Dependencies

```bash
npm install
```

### Start Development Mode

```bash
npm run dev
```

### Run Tests

```bash
npm run typecheck
npm test
```

### Production Build

```bash
npm run build
```

### Build A Windows Installer

```bash
npm run dist
```

## Optional Private Integrations

The open repository should be usable without Baillio-operated services.
These integrations are optional and disabled by default:

Supported build-time environment variables are documented in `.env.example`.
They are examples only; the app does not require a checked-in runtime config file.

### License Activation Runtime

Enable packaged activation only if you provide a compatible license API:

```bash
BAILLIO_LICENSE_API_URL=https://licenses.example.com
npm run dist
```

When `BAILLIO_LICENSE_API_URL` is not set, packaged builds ship with license
runtime disabled.

### Auto-Update Runtime

Enable packaged updates only if you provide an update feed:

```bash
BAILLIO_UPDATE_URL=https://updates.example.com/baillio/
BAILLIO_UPDATE_CHANNEL=latest
npm run dist
```

When `BAILLIO_UPDATE_URL` is not set, in-app updates remain disabled.

### Legacy Environment Variables

Legacy `RENTFLOW_*` environment variables are still accepted for migration
compatibility, but new setups should use the `BAILLIO_*` names.

## Data Storage

Baillio stores user data under the Electron `userData` directory.
On Windows this is typically:

```text
%APPDATA%/Baillio
```

Current storage model:

- `accounts.json` for local account registry
- per-account directories under `accounts/<account-id>/`
- per-account SQLite database files
- attachments, generated documents, diagnostics, and backup artifacts

## Project Structure

```text
electron/   Main process, preload bridge, auth, updates, diagnostics, SQLite access
src/        React renderer, routes, pages, components, state stores, PDF templates
scripts/    Build orchestration and runtime config generation
tests/      Unit, UI, and Electron-side regression coverage
docs/       Architecture, roadmap, security notes, and feature write-ups
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Security Decisions](docs/SECURITY.md)
- [Privacy Notes](docs/PRIVACY.md)
- [Disclaimer](docs/DISCLAIMER.md)
- [Release Notes Template](docs/RELEASE_NOTES_TEMPLATE.md)
- [Roadmap](docs/ROADMAP.md)
- [Feature Notes](docs/features/README.md)

## Security Notes

- Data is local by default
- Passwords are hashed with `scrypt`
- Production builds disable DevTools
- Backup flows support encrypted archives

More detail lives in [SECURITY.md](SECURITY.md) and [docs/SECURITY.md](docs/SECURITY.md).

## Contributing

This is currently a maintainer-led public repository.
See [CONTRIBUTING.md](CONTRIBUTING.md) before opening issues or pull requests,
and follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) in public interactions.

## License

This repository is licensed under the [MIT License](LICENSE).
