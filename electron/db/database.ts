import Database = require('better-sqlite3')
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

function ensureColumnExists(db: Database.Database, table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
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
      id                         INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name                 TEXT    NOT NULL,
      last_name                  TEXT    NOT NULL,
      email                      TEXT,
      phone                      TEXT,
      guarantor_name             TEXT,
      guarantor_email            TEXT,
      guarantor_phone            TEXT,
      guarantor_address          TEXT,
      emergency_contact_name     TEXT,
      emergency_contact_phone    TEXT,
      emergency_contact_relation TEXT,
      dossier_id_document        INTEGER NOT NULL DEFAULT 0,
      dossier_income_proof       INTEGER NOT NULL DEFAULT 0,
      dossier_employment_proof   INTEGER NOT NULL DEFAULT 0,
      dossier_tax_notice         INTEGER NOT NULL DEFAULT 0,
      dossier_bank_details       INTEGER NOT NULL DEFAULT 0,
      dossier_notes              TEXT,
      created_at                 TEXT    NOT NULL DEFAULT (datetime('now'))
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
      deposit_received_date TEXT,
      deposit_refund_date   TEXT,
      deposit_retained_amount REAL  NOT NULL DEFAULT 0,
      deposit_notes         TEXT,
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

    CREATE TABLE IF NOT EXISTS payment_reminders (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      stage      TEXT    NOT NULL,
      sent_at    TEXT    NOT NULL,
      notes      TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inspections (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      lease_id          INTEGER NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
      kind              TEXT    NOT NULL,
      inspection_date   TEXT    NOT NULL,
      meter_readings    TEXT,
      general_condition TEXT,
      notes             TEXT,
      rooms_json        TEXT    NOT NULL DEFAULT '[]',
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS charge_reconciliations (
      id                            INTEGER PRIMARY KEY AUTOINCREMENT,
      lease_id                      INTEGER NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
      year                          INTEGER NOT NULL,
      actual_charges                REAL    NOT NULL,
      provisions_collected_override REAL,
      notes                         TEXT,
      created_at                    TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(lease_id, year)
    );

    CREATE TABLE IF NOT EXISTS manual_reminders (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      lease_id   INTEGER REFERENCES leases(id) ON DELETE SET NULL,
      title      TEXT    NOT NULL,
      category   TEXT    NOT NULL DEFAULT 'custom',
      due_date   TEXT    NOT NULL,
      notes      TEXT,
      status     TEXT    NOT NULL DEFAULT 'pending',
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
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

  ensureColumnExists(db, 'leases', 'deposit_received_date', 'TEXT')
  ensureColumnExists(db, 'leases', 'deposit_refund_date', 'TEXT')
  ensureColumnExists(db, 'leases', 'deposit_retained_amount', 'REAL NOT NULL DEFAULT 0')
  ensureColumnExists(db, 'leases', 'deposit_notes', 'TEXT')
  ensureColumnExists(db, 'tenants', 'guarantor_name', 'TEXT')
  ensureColumnExists(db, 'tenants', 'guarantor_email', 'TEXT')
  ensureColumnExists(db, 'tenants', 'guarantor_phone', 'TEXT')
  ensureColumnExists(db, 'tenants', 'guarantor_address', 'TEXT')
  ensureColumnExists(db, 'tenants', 'emergency_contact_name', 'TEXT')
  ensureColumnExists(db, 'tenants', 'emergency_contact_phone', 'TEXT')
  ensureColumnExists(db, 'tenants', 'emergency_contact_relation', 'TEXT')
  ensureColumnExists(db, 'tenants', 'dossier_id_document', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumnExists(db, 'tenants', 'dossier_income_proof', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumnExists(db, 'tenants', 'dossier_employment_proof', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumnExists(db, 'tenants', 'dossier_tax_notice', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumnExists(db, 'tenants', 'dossier_bank_details', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumnExists(db, 'tenants', 'dossier_notes', 'TEXT')
}
