# RentFlow

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

RentFlow includes a Windows auto-update client based on `electron-updater`.

Enable it at build time with:

```bash
RENTFLOW_UPDATE_URL=https://updates.example.com/rentflow/
RENTFLOW_UPDATE_CHANNEL=latest
npm run dist
```

Notes:

- `RENTFLOW_UPDATE_URL` is required to enable in-app updates.
- `RENTFLOW_UPDATE_CHANNEL` is optional and defaults to `latest`.
- Build generates `build/auto-update.json` and packages it as `resources/auto-update.json`.
- Development mode keeps auto-update disabled unless `RENTFLOW_ENABLE_DEV_UPDATES=1`.
- The Settings page exposes manual actions to check, download, and install updates.

## Security

- Data stays local by default
- Passwords are hashed with `scrypt`
- Production code is obfuscated
- DevTools are disabled in production

## License

Private project. Personal use only.
