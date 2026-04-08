# Baillio

Windows desktop application for private landlords in France.

## Features

- Local authentication with email and password
- Property management
- Tenant management
- Lease management
- Payment tracking
- Dashboard with KPIs
- PDF receipt generation
- IRL-based rent revision support

## Stack

- Electron
- React 18
- TypeScript
- Tailwind CSS v3
- SQLite via `better-sqlite3`
- Framer Motion
- Zustand
- electron-vite

## Installation

```bash
npm install
npm run dev
```

## Build

```bash
npm run dist
```

## Auto-update

Baillio includes a Windows auto-update client based on `electron-updater`.

Enable it at build time with:

```bash
BAILLIO_UPDATE_URL=https://updates.example.com/baillio/
BAILLIO_UPDATE_CHANNEL=latest
npm run dist
```

Notes:

- `BAILLIO_UPDATE_URL` is required to enable in-app updates.
- `BAILLIO_UPDATE_CHANNEL` is optional and defaults to `latest`.
- Build generates `build/auto-update.json` and packages it as `resources/auto-update.json`.
- Development mode keeps auto-update disabled unless `BAILLIO_ENABLE_DEV_UPDATES=1`.
- Legacy `RENTFLOW_*` environment variables are still accepted for backward compatibility.
- The Settings page exposes manual actions to check, download, and install updates.

## Security

- Data stays local by default
- Passwords are hashed with `scrypt`
- Production code is obfuscated
- DevTools are disabled in production

## License

Private project. Personal use only.
