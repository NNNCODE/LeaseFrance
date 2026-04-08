import type Database from 'better-sqlite3'
import { ensureColumnExists } from './helpers'

export function up(db: Database.Database): void {
  ensureColumnExists(db, 'properties', 'owner_profile_id', 'TEXT')
  ensureColumnExists(db, 'leases', 'owner_profile_id', 'TEXT')
}
