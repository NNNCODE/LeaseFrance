# Rebrand Migration Report: LeaseFrance -> RentFlow

Date: 2026-03-28
Status: Phase 1 complete (safe renames). Phase 2 pending (data migration + identity changes).

---

## 1. Files Changed (20 files)

### UI Text (4 files)
| File | Change |
|------|--------|
| `src/components/layout/Topbar.tsx` | Header brand name |
| `src/components/layout/Sidebar.tsx` | Sidebar logo text |
| `src/components/layout/AuthShell.tsx` | Login shell eyebrow "RentFlow Desktop" |
| `src/pages/Dashboard/index.tsx` | Onboarding card title |

### PDF Document Footers (6 files)
| File | Change |
|------|--------|
| `src/lib/pdf/quittance.tsx` | Footer: "via RentFlow" |
| `src/lib/pdf/recu.tsx` | Footer: "via RentFlow" |
| `src/lib/pdf/reminder.tsx` | Legal note: "generee via RentFlow" |
| `src/lib/pdf/inspection.tsx` | Legal note: "genere via RentFlow" |
| `src/lib/pdf/documentTemplates.tsx` | IRL revision footer |
| `src/lib/pdf/furnishedLeaseContract.tsx` | Page footer |

### HTML / Metadata (1 file)
| File | Change |
|------|--------|
| `index.html` | `<title>RentFlow</title>` |

### TypeScript Identifiers (4 files)
| File | Change |
|------|--------|
| `src/shared/ipc.ts` | 6 type renames: `LeaseFrance{WindowApi,BackupEventsApi,InvokeApi,Api,InvokeChannels,WindowChannels}` -> `RentFlow*` |
| `electron/main.ts` | Import refs, generic constraints, session temp path, backup dialog filter labels |
| `electron/preload.ts` | Import refs, `api` const type annotation |
| `src/env.d.ts` | `Window.api` type: `RentFlowApi` |

### Build Config (1 file)
| File | Change |
|------|--------|
| `electron-builder.yml` | `shortcutName: RentFlow`. Added TODO comments for `appId` and `productName`. |

### Backup System (1 file)
| File | Change |
|------|--------|
| `electron/backupManager.ts` | `AUTO_PREFIX` -> `rentflow_auto_`. Added `LEGACY_AUTO_PREFIX` for backward-compat rotation. Temp file prefix updated. |

### Auth / DB (1 file)
| File | Change |
|------|--------|
| `electron/auth.ts` | Added migration TODO comment. No functional change. |

### Tests (1 file)
| File | Change |
|------|--------|
| `tests/electron/auth.test.ts` | Temp dir prefix: `rentflow-auth-test-` |

### Documentation (4 files)
| File | Change |
|------|--------|
| `README.md` | Heading |
| `CLAUDE.md` | Purpose description |
| `docs/ROADMAP.md` | Opening line |
| `docs/ARCHITECTURE.md` | Opening line |

---

## 2. What Was Renamed Automatically

- All user-visible brand text in the renderer (Topbar, Sidebar, AuthShell, Dashboard)
- All PDF document footer/legal references
- HTML `<title>` tag
- All TypeScript type names containing `LeaseFrance` (6 types, 4 files)
- Backup dialog filter labels ("RentFlow Backup")
- Manual backup suggested filename prefix (`rentflow_backup_`)
- Auto-backup prefix (`rentflow_auto_`) with legacy fallback
- Temp session directory name
- Desktop shortcut name
- Test temp directory prefix
- Documentation headings and descriptions

---

## 3. Intentionally Left Unchanged

| Item | Location | Risk if Changed | Action Required |
|------|----------|----------------|-----------------|
| `appId: com.leasefrance.app` | `electron-builder.yml` | OS treats app as new install; existing users get duplicate Add/Remove entry | Decide on migration strategy (see Phase 2) |
| `productName: LeaseFrance` | `electron-builder.yml` | `app.getPath('userData')` moves from `%APPDATA%/LeaseFrance` to `%APPDATA%/RentFlow`; all user data becomes invisible | Requires startup migration logic first |
| `"name": "lease-france"` | `package.json` | Affects `package-lock.json`, npm scripts, any tooling keyed on package name | Low risk but deferred to keep lockfile stable |
| `leasefrance.db` (filename) | `electron/auth.ts` (4 refs) | Existing databases on disk won't be found | Requires rename-on-first-access migration |
| `leasefrance.db` (docs) | `CLAUDE.md`, `docs/ARCHITECTURE.md` (3 refs) | None (documentation) | Update after DB filename is actually migrated |
| `.lfbackup` extension | `electron/backupManager.ts` | Existing backup files won't import | Keep or add dual-extension import support |
| `d:/leaseFrance/` paths | `.claude/settings.json`, `.claude/settings.local.json` | Claude Code allowed-command patterns break | Update if/when repo folder is renamed |

---

## 4. Compatibility Concerns

### Data Directory (CRITICAL)
Electron derives `app.getPath('userData')` from `productName`. Currently `%APPDATA%/LeaseFrance/`. Changing `productName` without migration orphans:
- `accounts.json` (account registry)
- `accounts/` (per-account DB, attachments, backup settings)
- `accounts.lock` (session lock)

### Database Filename (HIGH)
`leasefrance.db` is the on-disk filename for every account. Stored inside `accounts/<accountId>/leasefrance.db`. Renaming requires iterating all account dirs.

### Backup Rotation (MEDIUM)
Old auto-backups use `leasefrance_auto_` prefix. Rotation logic now handles both prefixes. No data loss, but old files will eventually be rotated out.

### Installer Identity (MEDIUM)
`appId` is the Windows app identity. Changing it means NSIS creates a separate install entry. Users must manually uninstall the old version.

### Package Name (LOW)
`lease-france` in `package.json` is not published to npm and not user-visible. Safe to change at any time with a `package-lock.json` regeneration.

---

## 5. Domain-Related References Still Pointing to Old Name

| Reference | Location | Status |
|-----------|----------|--------|
| `com.leasefrance.app` | `electron-builder.yml:4` | Kept (see section 3) |
| `leasefrance.db` | `electron/auth.ts:14,194-196,367` | Kept (see section 3) |
| `leasefrance.db` | `docs/ARCHITECTURE.md:50,236` | Kept (documents current state) |
| `leasefrance.db` | `CLAUDE.md:133` | Kept (documents current state) |
| `leasefrance_auto_` | `electron/backupManager.ts:170` | Kept as `LEGACY_AUTO_PREFIX` |
| `lease-france` | `package.json:2`, `package-lock.json:2,8` | Kept (see section 3) |

No external domain names (e.g., `leasefrance.fr`) were found in the codebase.

---

## 6. Manual Tasks Remaining

### Phase 2A: Data Migration (required before full identity change)

- [ ] **userData migration**: Add startup logic in `electron/main.ts` that detects `%APPDATA%/LeaseFrance/` and moves contents to `%APPDATA%/RentFlow/` on first launch. Then change `productName` in `electron-builder.yml`.
- [ ] **DB file migration**: Add one-time rename in `electron/auth.ts` `getAccountDbPathById()` to rename `leasefrance.db` -> `rentflow.db` (plus `-wal` and `-shm` sidecars) per account directory.
- [ ] **Update docs**: After DB migration is in place, update `leasefrance.db` references in `CLAUDE.md` and `docs/ARCHITECTURE.md`.

### Phase 2B: Identity Changes (can be bundled as a breaking release)

- [ ] **appId**: Change `com.leasefrance.app` -> `com.rentflow.app` in `electron-builder.yml`. Communicate to existing users that they should uninstall old version first.
- [ ] **package.json**: Change `"name": "lease-france"` -> `"rentflow"`. Run `npm install` to regenerate `package-lock.json`.
- [ ] **Backup extension**: Decide whether `.lfbackup` -> `.rfbackup`. If yes, update `BACKUP_EXTENSION` and add import support for both extensions.

### Phase 3: Assets and Visual Identity

- [ ] **App icon**: Replace `build/icon.ico` if the icon contains "LF" or "LeaseFrance" branding. Update `electron-builder.yml` `win.icon` path if filename changes.
- [ ] **Favicon**: If a favicon is bundled (not currently found), update it.
- [ ] **Logo assets**: Check for any SVG/PNG logo files in `src/` or `public/` that contain old branding.

### Phase 4: Repository and Infrastructure

- [ ] **Repo folder**: Rename `d:\leaseFrance` -> `d:\rentFlow` (or preferred name). Update `.claude/settings.json` and `.claude/settings.local.json` paths.
- [ ] **Git remote / repo name**: If hosted on GitHub/GitLab, rename the repository and update all clone URLs.
- [ ] **CI/CD**: If any pipeline config exists outside the repo (GitHub Actions, etc.), update project references.
- [ ] **Cloudflare / deployment**: Not applicable (local-first desktop app, no cloud deployment found).

### Phase 5: Legal and Marketing

- [ ] **Privacy policy / terms**: Not currently in the codebase. If they exist externally, update product name references.
- [ ] **SEO / Open Graph**: Not applicable (Electron app, no web presence found). If a marketing site exists separately, update `<meta>` tags, OG images, and page titles.
- [ ] **Screenshots**: Any documentation or store listing screenshots showing "LeaseFrance" in the UI will need to be retaken after migration is complete.
- [ ] **Installer description**: The NSIS installer language and description text may need updating if customized beyond `electron-builder.yml`.

---

## Verification Performed

```
npm run typecheck   # PASSED (clean, zero errors)
```

### Recommended Next Steps

```bash
npm run build       # verify full Electron build
npm run test        # verify test suite
npm run dev         # visual check: confirm "RentFlow" appears in UI
npm run dist        # verify installer builds with correct shortcut name
```
