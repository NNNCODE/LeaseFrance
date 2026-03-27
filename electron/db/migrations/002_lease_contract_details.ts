import type Database from 'better-sqlite3'
import { ensureColumnExists } from './helpers'

export function up(db: Database.Database): void {
  ensureColumnExists(db, 'leases', 'contract_details', 'TEXT')
}
