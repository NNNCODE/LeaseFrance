import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const userDataPath = app.getPath('userData')
  mkdirSync(userDataPath, { recursive: true })

  db = new Database(join(userDataPath, 'leasefrance.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initSchema(db)
  return db
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      address    TEXT    NOT NULL,
      city       TEXT    NOT NULL,
      zip        TEXT    NOT NULL,
      type       TEXT    NOT NULL DEFAULT 'appartement',
      area_m2    REAL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name  TEXT NOT NULL,
      email      TEXT,
      phone      TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leases (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id           INTEGER NOT NULL REFERENCES properties(id),
      tenant_id             INTEGER NOT NULL REFERENCES tenants(id),
      type                  TEXT    NOT NULL DEFAULT 'vide',
      start_date            TEXT    NOT NULL,
      end_date              TEXT,
      rent_amount           REAL    NOT NULL,
      charges_amount        REAL    NOT NULL DEFAULT 0,
      deposit_amount        REAL    NOT NULL DEFAULT 0,
      irl_reference_index   REAL,
      irl_reference_quarter TEXT,
      status                TEXT    NOT NULL DEFAULT 'active',
      created_at            TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      lease_id        INTEGER NOT NULL REFERENCES leases(id),
      period_month    INTEGER NOT NULL,
      period_year     INTEGER NOT NULL,
      rent_amount     REAL    NOT NULL,
      charges_amount  REAL    NOT NULL DEFAULT 0,
      payment_date    TEXT,
      payment_method  TEXT    DEFAULT 'virement',
      status          TEXT    NOT NULL DEFAULT 'pending',
      notes           TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      lease_id     INTEGER NOT NULL REFERENCES leases(id),
      type         TEXT    NOT NULL,
      generated_at TEXT    NOT NULL DEFAULT (datetime('now')),
      file_path    TEXT
    );

    CREATE TABLE IF NOT EXISTS irl_indices (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      year         INTEGER NOT NULL,
      quarter      INTEGER NOT NULL,
      value        REAL    NOT NULL,
      published_at TEXT,
      UNIQUE(year, quarter)
    );
  `)
}
