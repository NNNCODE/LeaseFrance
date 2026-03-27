/**
 * Migration 001 — Baseline
 *
 * Captures the full schema as of the migration-system introduction.
 * For a brand-new database every CREATE TABLE fires normally.
 * For an existing (pre-migration) database the IF NOT EXISTS clauses and
 * ensureColumnExists calls make the whole migration a safe no-op.
 */
import type Database from 'better-sqlite3'
import { ensureColumnExists, indexExists } from './helpers'

export function up(db: Database.Database): void {
  /* ------------------------------------------------------------------ */
  /*  Core tables                                                       */
  /* ------------------------------------------------------------------ */
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
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id             INTEGER NOT NULL REFERENCES properties(id),
      tenant_id               INTEGER NOT NULL REFERENCES tenants(id),
      type                    TEXT    NOT NULL DEFAULT 'vide',
      start_date              TEXT    NOT NULL,
      end_date                TEXT,
      rent_amount             REAL    NOT NULL,
      charges_amount          REAL    NOT NULL DEFAULT 0,
      deposit_amount          REAL    NOT NULL DEFAULT 0,
      deposit_received_date   TEXT,
      deposit_refund_date     TEXT,
      deposit_retained_amount REAL    NOT NULL DEFAULT 0,
      deposit_notes           TEXT,
      irl_reference_index     REAL,
      irl_reference_quarter   TEXT,
      status                  TEXT    NOT NULL DEFAULT 'active',
      created_at              TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at              TEXT    NOT NULL DEFAULT (datetime('now'))
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
      id                           INTEGER PRIMARY KEY AUTOINCREMENT,
      lease_id                     INTEGER NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
      year                         INTEGER NOT NULL,
      actual_charges               REAL    NOT NULL,
      provisions_collected_override REAL,
      notes                        TEXT,
      created_at                   TEXT    NOT NULL DEFAULT (datetime('now')),
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

  /* ------------------------------------------------------------------ */
  /*  Columns added after the original table definitions                */
  /*  (idempotent — already present in new DBs, patched in old ones)    */
  /* ------------------------------------------------------------------ */
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

  ensureColumnExists(db, 'documents', 'status', "TEXT NOT NULL DEFAULT 'generated'")

  /* ------------------------------------------------------------------ */
  /*  Backfill updated_at for core tables                               */
  /* ------------------------------------------------------------------ */
  for (const table of ['properties', 'tenants', 'leases', 'payments']) {
    ensureColumnExists(db, table, 'updated_at', 'TEXT')
    db.exec(`UPDATE ${table} SET updated_at = created_at WHERE updated_at IS NULL`)
  }

  /* ------------------------------------------------------------------ */
  /*  Unique payment per period constraint                              */
  /* ------------------------------------------------------------------ */
  if (!indexExists(db, 'idx_payments_lease_period')) {
    // Deduplicate: keep the best row per (lease_id, period_month, period_year)
    db.exec(`
      DELETE FROM payments WHERE id NOT IN (
        SELECT id FROM (
          SELECT id,
            ROW_NUMBER() OVER (
              PARTITION BY lease_id, period_month, period_year
              ORDER BY
                CASE status WHEN 'paid' THEN 0 WHEN 'late' THEN 1 ELSE 2 END,
                id DESC
            ) AS rn
          FROM payments
        ) WHERE rn = 1
      )
    `)

    db.exec(`
      CREATE UNIQUE INDEX idx_payments_lease_period
      ON payments(lease_id, period_month, period_year)
    `)
  }
}
