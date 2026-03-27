import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type BetterSqlite3 from 'better-sqlite3'

/**
 * Smoke test for the Electron main process database layer.
 *
 * Instead of importing database.ts directly (which depends on auth module state),
 * we replicate the schema init logic against an in-memory SQLite database.
 * This catches schema syntax errors, missing tables, and seed-data regressions.
 *
 * NOTE: better-sqlite3 is normally compiled for Electron's Node version.
 * If the native binding doesn't match the system Node version, these tests
 * are skipped automatically. Run `npm rebuild better-sqlite3` to fix.
 */

// Try loading the native module — skip all tests if it was built for Electron
let Database: typeof import('better-sqlite3') | null = null
let seedIrlIndicesIfEmpty: typeof import('../../electron/db/irlSeed').seedIrlIndicesIfEmpty | null = null
let loadError: string | null = null

try {
  Database = require('better-sqlite3')
  seedIrlIndicesIfEmpty = require('../../electron/db/irlSeed').seedIrlIndicesIfEmpty
} catch (err: any) {
  loadError = err.message
}

// Tables that must exist after schema initialization
const EXPECTED_TABLES = [
  'properties',
  'tenants',
  'leases',
  'payments',
  'documents',
  'payment_reminders',
  'inspections',
  'charge_reconciliations',
  'manual_reminders',
  'irl_indices',
  'fiscal_expenses',
  'attachments',
  'bank_imports',
]

function initSchemaOnDb(db: BetterSqlite3.Database): void {
  // This is the exact schema from electron/db/database.ts initSchema()
  // If the schema there changes, this test should be updated to match.
  db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      address    TEXT    NOT NULL,
      city       TEXT    NOT NULL,
      zip        TEXT    NOT NULL,
      type       TEXT    NOT NULL DEFAULT 'appartement',
      area_m2    REAL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
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
      created_at                 TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at                 TEXT    NOT NULL DEFAULT (datetime('now'))
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
      created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
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
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      lease_id     INTEGER NOT NULL REFERENCES leases(id),
      type         TEXT    NOT NULL,
      generated_at TEXT    NOT NULL DEFAULT (datetime('now')),
      file_path    TEXT,
      status       TEXT    NOT NULL DEFAULT 'generated'
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

    CREATE TABLE IF NOT EXISTS fiscal_expenses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      year        INTEGER NOT NULL,
      category    TEXT    NOT NULL,
      label       TEXT    NOT NULL,
      amount      REAL    NOT NULL DEFAULT 0,
      notes       TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT    NOT NULL,
      entity_id   INTEGER NOT NULL,
      slot        TEXT,
      file_name   TEXT    NOT NULL,
      mime_type   TEXT    NOT NULL,
      file_size   INTEGER NOT NULL DEFAULT 0,
      stored_name TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bank_imports (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint TEXT    NOT NULL UNIQUE,
      tx_date     TEXT    NOT NULL,
      description TEXT    NOT NULL,
      amount      REAL    NOT NULL,
      payment_id  INTEGER,
      imported_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe.skipIf(!!loadError)('Database schema smoke test', () => {
  let db: any

  beforeEach(() => {
    db = new (Database as any)(':memory:')
    db.pragma('foreign_keys = ON')
  })

  afterEach(() => {
    db?.close()
  })

  if (loadError) {
    it.skip(`skipped: ${loadError}`, () => {})
    return
  }

  it('creates all expected tables without errors', () => {
    expect(() => initSchemaOnDb(db)).not.toThrow()

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as Array<{ name: string }>

    const tableNames = tables.map((t) => t.name)
    for (const expected of EXPECTED_TABLES) {
      expect(tableNames).toContain(expected)
    }
  })

  it('schema is idempotent (can run twice)', () => {
    initSchemaOnDb(db)
    expect(() => initSchemaOnDb(db)).not.toThrow()
  })

  it('IRL seed data populates correctly', () => {
    initSchemaOnDb(db)
    seedIrlIndicesIfEmpty!(db)

    const count = (db.prepare('SELECT COUNT(*) as n FROM irl_indices').get() as { n: number }).n
    expect(count).toBeGreaterThanOrEqual(13) // 2022Q1 through 2025Q1
  })

  it('IRL seed is idempotent', () => {
    initSchemaOnDb(db)
    seedIrlIndicesIfEmpty!(db)
    const count1 = (db.prepare('SELECT COUNT(*) as n FROM irl_indices').get() as { n: number }).n

    seedIrlIndicesIfEmpty!(db)
    const count2 = (db.prepare('SELECT COUNT(*) as n FROM irl_indices').get() as { n: number }).n

    expect(count2).toBe(count1)
  })

  it('can insert and query a property', () => {
    initSchemaOnDb(db)
    db.prepare(
      "INSERT INTO properties (name, address, city, zip) VALUES (?, ?, ?, ?)"
    ).run('Appt 3B', '12 Rue de Rivoli', 'Paris', '75001')

    const row = db.prepare('SELECT * FROM properties WHERE name = ?').get('Appt 3B') as any
    expect(row).toBeTruthy()
    expect(row.city).toBe('Paris')
  })

  it('can insert and query a full lease chain (property → tenant → lease → payment)', () => {
    initSchemaOnDb(db)

    db.prepare(
      "INSERT INTO properties (id, name, address, city, zip) VALUES (1, 'Appt', '1 Rue', 'Paris', '75001')"
    ).run()
    db.prepare(
      "INSERT INTO tenants (id, first_name, last_name) VALUES (1, 'Jean', 'Dupont')"
    ).run()
    db.prepare(
      "INSERT INTO leases (id, property_id, tenant_id, start_date, rent_amount) VALUES (1, 1, 1, '2024-01-01', 800)"
    ).run()
    db.prepare(
      "INSERT INTO payments (lease_id, period_month, period_year, rent_amount) VALUES (1, 1, 2025, 800)"
    ).run()

    const payment = db.prepare('SELECT * FROM payments WHERE lease_id = 1').get() as any
    expect(payment).toBeTruthy()
    expect(payment.rent_amount).toBe(800)
  })

  it('enforces foreign key constraints', () => {
    initSchemaOnDb(db)
    // Trying to insert a lease with non-existent property should fail
    expect(() => {
      db.prepare(
        "INSERT INTO leases (property_id, tenant_id, start_date, rent_amount) VALUES (999, 999, '2024-01-01', 500)"
      ).run()
    }).toThrow()
  })

  it('bank_imports fingerprint is unique', () => {
    initSchemaOnDb(db)
    db.prepare(
      "INSERT INTO bank_imports (fingerprint, tx_date, description, amount) VALUES ('fp1', '2025-01-01', 'test', 100)"
    ).run()

    expect(() => {
      db.prepare(
        "INSERT INTO bank_imports (fingerprint, tx_date, description, amount) VALUES ('fp1', '2025-01-02', 'dup', 200)"
      ).run()
    }).toThrow()
  })

  it('charge_reconciliations has unique(lease_id, year) constraint', () => {
    initSchemaOnDb(db)
    db.prepare(
      "INSERT INTO properties (id, name, address, city, zip) VALUES (1, 'P', 'A', 'C', '00')"
    ).run()
    db.prepare(
      "INSERT INTO tenants (id, first_name, last_name) VALUES (1, 'F', 'L')"
    ).run()
    db.prepare(
      "INSERT INTO leases (id, property_id, tenant_id, start_date, rent_amount) VALUES (1, 1, 1, '2024-01-01', 500)"
    ).run()

    db.prepare(
      "INSERT INTO charge_reconciliations (lease_id, year, actual_charges) VALUES (1, 2024, 1200)"
    ).run()

    expect(() => {
      db.prepare(
        "INSERT INTO charge_reconciliations (lease_id, year, actual_charges) VALUES (1, 2024, 999)"
      ).run()
    }).toThrow()
  })
})
