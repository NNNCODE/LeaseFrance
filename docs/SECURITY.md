# Security Decisions

This document records deliberate security trade-offs in Baillio
and the mitigations that keep them safe.

## 1. sandbox: false in BrowserWindow

**Location:** `electron/main.ts` — `webPreferences.sandbox`

**Why it is disabled:**
`better-sqlite3` is a native Node C++ addon. Electron's sandboxed preload
scripts run in a restricted environment that cannot load native modules
via `require()`. Disabling the sandbox allows the preload script to load
`better-sqlite3` and expose database operations to the renderer through
the context bridge.

**Mitigations in place:**

| Control | Setting | Effect |
|---------|---------|--------|
| Context isolation | `contextIsolation: true` | Renderer code cannot access Node globals or the preload's scope |
| No Node integration | `nodeIntegration: false` | Renderer cannot call `require()` or use Node APIs directly |
| Whitelist-only API | `contextBridge.exposeInMainWorld` | Only explicitly listed methods are available to renderer code |
| Content Security Policy | `session.webRequest.onHeadersReceived` | Blocks inline scripts (prod), restricts connect/font/img sources |
| DevTools disabled | `devTools: isDev` | Production builds cannot open DevTools |
| Context menu disabled | `context-menu` event handler | Production builds block right-click inspect |
| Window open blocked | `setWindowOpenHandler` | All new-window attempts are denied; URLs open in system browser |

**Risk assessment:** Low. The sandbox primarily protects against malicious
renderer-side code escaping to the OS. With context isolation enabled,
the renderer has no path to Node APIs. The only attack surface is the
explicitly bridged API, which performs parameterized SQL and validated
file operations.

**Alternatives considered:**
- Moving SQLite to the main process and proxying all queries over IPC.
  This would allow `sandbox: true` but adds latency to every database
  call and complicates the architecture with no meaningful security gain,
  since context isolation already prevents renderer escape.

## 2. Content Security Policy

**Location:** `electron/main.ts` — `session.defaultSession.webRequest.onHeadersReceived`

CSP is injected as an HTTP response header (not a `<meta>` tag) so it
cannot be bypassed by modifying the HTML file.

**Development policy** allows `'unsafe-inline'` for scripts (Vite HMR)
and WebSocket connections to localhost.

**Production policy** blocks inline scripts entirely and restricts
all connections to `'self'`.

Both policies allow:
- Google Fonts (`style-src`, `font-src`)
- Data URIs and blobs for images (`img-src`) — needed for signature
  images and PDF preview
- Inline styles (`style-src 'unsafe-inline'`) — required by Tailwind
  and React dynamic styles

## 3. Code Obfuscation

**Location:** `scripts/obfuscate.mjs`

Main process and preload output are obfuscated with `javascript-obfuscator`
before packaging. This raises the cost of casual reverse-engineering but
is **not a security boundary**. Determined attackers can deobfuscate the
code. Do not rely on obfuscation to protect secrets or logic.

## 4. Local-Only Architecture

Baillio makes no network requests to external services (except Google
Fonts CDN for typography). All data stays on the user's machine in
`app.getPath('userData')`. There is no telemetry, analytics, or cloud sync.

This eliminates entire threat categories: network eavesdropping,
server-side breaches, API key leakage, and supply-chain attacks on
backend services.

## 5. Password Storage

**Location:** `electron/auth.ts`

Passwords are hashed with `crypto.scryptSync` using a random 32-byte salt.
Verification uses `crypto.timingSafeEqual` to prevent timing side-channels.
Recovery keys follow the same pattern.

## 6. Backup Encryption

**Location:** `electron/backupManager.ts`

Backup archives support two formats:

- **v1 (unencrypted):** JSON with base64-encoded database and auth data.
  Used when no password is provided.
- **v2 (encrypted):** The v1 JSON is encrypted with AES-256-GCM. The
  encryption key is derived from a user-provided password via
  `crypto.scryptSync` (32-byte key, N=16384, r=8, p=1). The salt, IV,
  and GCM auth tag are stored alongside the ciphertext in the archive.

Encryption is optional for manual backups (user enters a password in the
Settings UI). Auto-backups use an encryption password from backup settings
if configured. Existing v1 archives remain readable without a password.

## 7. Multi-Account Data Isolation

Each account stores its database and attachments in a separate directory
under `app.getPath('userData')/accounts/<account-id>/`. One account cannot
read another account's data through the application.
