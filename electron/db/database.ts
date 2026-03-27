import Database = require('better-sqlite3')
import { mkdirSync } from 'fs'
import { dirname } from 'path'
import { getCurrentAccountDbPath } from '../auth'
import { runMigrations } from './migrations'
import { seedIrlIndices } from './irlSeed'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dbPath = getCurrentAccountDbPath()
  mkdirSync(dirname(dbPath), { recursive: true })

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('busy_timeout = 5000')
  db.pragma('foreign_keys = ON')

  runMigrations(db)
  seedIrlIndices(db)
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function getDbPath(): string {
  return getCurrentAccountDbPath()
}
