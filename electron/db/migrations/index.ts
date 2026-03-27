/**
 * Schema migration runner.
 *
 * Uses SQLite's built-in PRAGMA user_version to track the current schema
 * version.  Each migration file lives in this directory and is registered
 * in the `migrations` array below.
 *
 * Adding a new migration
 * ----------------------
 * 1. Create `NNN_short_name.ts` exporting an `up(db)` function.
 * 2. Append an entry to the `migrations` array with the next version number.
 * 3. That's it — `runMigrations` picks it up automatically.
 */
import type Database from 'better-sqlite3'
import { up as baseline } from './001_baseline'
import { up as addLeaseContractDetails } from './002_lease_contract_details'

interface Migration {
  /** Target version after this migration completes (monotonically increasing). */
  version: number
  description: string
  up: (db: Database.Database) => void
}

const migrations: Migration[] = [
  { version: 1, description: 'Baseline schema', up: baseline },
  { version: 2, description: 'Lease contract details', up: addLeaseContractDetails },
]

/**
 * Run all pending migrations.
 *
 * Each migration runs inside a transaction.  If the up() function throws,
 * the transaction is rolled back and user_version stays unchanged so the
 * migration can be retried on next launch.
 *
 * PRAGMA user_version is NOT transactional in SQLite — it writes to the
 * file header immediately.  We therefore set it *after* the transaction
 * commits successfully.
 */
export function runMigrations(db: Database.Database): void {
  const currentVersion = db.pragma('user_version', { simple: true }) as number

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      db.transaction(() => {
        migration.up(db)
      })()
      // Only stamp version after a successful commit
      db.pragma(`user_version = ${migration.version}`)
    }
  }
}
