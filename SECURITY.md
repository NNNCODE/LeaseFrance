# Security Policy

## Reporting A Vulnerability

If you believe you found a security issue in Baillio, please report it
privately instead of opening a public GitHub issue.

Contact:

- `nieminghui.fr@gmail.com`

Please include:

- a clear description of the issue
- affected area or file when known
- reproduction steps
- expected impact
- logs, screenshots, or proof-of-concept details when useful

## Response Expectations

This is currently a maintainer-led project, not a staffed security program.
Response times may vary, but private disclosure is preferred over public issue
filing for anything that could expose users or local data.

## Scope

Relevant areas include:

- Electron main/preload security boundaries
- IPC validation and privileged actions
- local auth and recovery flows
- backup import/export and encryption
- document/file handling
- update and optional hosted integration configuration

For implementation trade-offs already documented in the project, see
[docs/SECURITY.md](docs/SECURITY.md).
