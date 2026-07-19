/// <reference types="vite/client" />

// Domain entity types live in src/types/*.d.ts (ambient, one file per domain).

interface Window {
  api: import('./shared/ipc').BaillioApi
}
