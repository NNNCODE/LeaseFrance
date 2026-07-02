import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type BetterSqlite3 from 'better-sqlite3'

/**
 * Smoke tests for the database migration system.
 *
 * Uses an in-memory SQLite database so no disk I/O or auth module is needed.
 *
 * NOTE: better-sqlite3 is normally compiled for Electron's Node version.
 * If the native binding doesn't match the system Node version, these tests
 * are skipped automatically. Run `npm rebuild better-sqlite3` to fix.
 */

let Database: typeof import('better-sqlite3') | null = null
let runMigrations: typeof import('../../electron/db/migrations').runMigrations | null = null
let seedIrlIndices: typeof import('../../electron/db/irlSeed').seedIrlIndices | null = null
let loadError: string | null = null

try {
  Database = require('better-sqlite3')
  runMigrations = require('../../electron/db/migrations').runMigrations
  seedIrlIndices = require('../../electron/db/irlSeed').seedIrlIndices
} catch (err: any) {
  loadError = err.message
}

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
  'property_diagnostics',
]

const EXPECTED_INDEXES = [
  'idx_payments_lease_period',
  'idx_leases_status_tenant',
  'idx_payments_lease_status',
  'idx_payments_status_period',
  'idx_payment_reminders_payment_sent_created',
  'idx_inspections_date_created',
  'idx_manual_reminders_status_due_created',
  'idx_fiscal_expenses_year_property_category_created',
  'idx_attachments_entity_slot_created',
  'idx_documents_generated_at',
  'idx_property_diagnostics_property',
  'idx_property_diagnostics_dpe_expiry',
]

// ── Tests ────────────────────────────────────────────────────────────────────

describe.skipIf(!!loadError)('Database migration smoke tests', () => {
  let db: BetterSqlite3.Database

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

  // ── Migration basics ────────────────────────────────────────────────────

  it('creates all expected tables on a fresh database', () => {
    expect(() => runMigrations!(db)).not.toThrow()

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as Array<{ name: string }>

    const tableNames = tables.map((t) => t.name)
    for (const expected of EXPECTED_TABLES) {
      expect(tableNames).toContain(expected)
    }
  })

  it('sets user_version to 5 after migrations', () => {
    runMigrations!(db)
    const version = db.pragma('user_version', { simple: true }) as number
    expect(version).toBe(5)
  })

  it('is idempotent — running migrations twice does not throw', () => {
    runMigrations!(db)
    expect(() => runMigrations!(db)).not.toThrow()

    const version = db.pragma('user_version', { simple: true }) as number
    expect(version).toBe(5)
  })

  it('creates the expected secondary indexes', () => {
    runMigrations!(db)

    for (const indexName of EXPECTED_INDEXES) {
      const idx = db
        .prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND name=?")
        .get(indexName)
      expect(idx).toBeTruthy()
    }
  })

  // ── Upgrade from pre-migration database ─────────────────────────────────

  it('upgrades a pre-migration database without data loss', () => {
    // Simulate an old database: create minimal tables WITHOUT some newer columns
    db.exec(`
      CREATE TABLE properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, address TEXT NOT NULL,
        city TEXT NOT NULL, zip TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'appartement', area_m2 REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE tenants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL, last_name TEXT NOT NULL,
        email TEXT, phone TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE leases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        property_id INTEGER NOT NULL REFERENCES properties(id),
        tenant_id INTEGER NOT NULL REFERENCES tenants(id),
        type TEXT NOT NULL DEFAULT 'vide',
        start_date TEXT NOT NULL, end_date TEXT,
        rent_amount REAL NOT NULL, charges_amount REAL NOT NULL DEFAULT 0,
        deposit_amount REAL NOT NULL DEFAULT 0,
        irl_reference_index REAL, irl_reference_quarter TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lease_id INTEGER NOT NULL REFERENCES leases(id),
        period_month INTEGER NOT NULL, period_year INTEGER NOT NULL,
        rent_amount REAL NOT NULL, charges_amount REAL NOT NULL DEFAULT 0,
        payment_date TEXT, payment_method TEXT DEFAULT 'virement',
        status TEXT NOT NULL DEFAULT 'pending', notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lease_id INTEGER NOT NULL REFERENCES leases(id),
        type TEXT NOT NULL,
        generated_at TEXT NOT NULL DEFAULT (datetime('now')),
        file_path TEXT
      );
      CREATE TABLE payment_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        stage TEXT NOT NULL, sent_at TEXT NOT NULL, notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE inspections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lease_id INTEGER NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
        kind TEXT NOT NULL, inspection_date TEXT NOT NULL,
        meter_readings TEXT, general_condition TEXT, notes TEXT,
        rooms_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE charge_reconciliations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lease_id INTEGER NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
        year INTEGER NOT NULL, actual_charges REAL NOT NULL,
        provisions_collected_override REAL, notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(lease_id, year)
      );
      CREATE TABLE manual_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lease_id INTEGER REFERENCES leases(id) ON DELETE SET NULL,
        title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'custom',
        due_date TEXT NOT NULL, notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE irl_indices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL, quarter INTEGER NOT NULL,
        value REAL NOT NULL, published_at TEXT,
        UNIQUE(year, quarter)
      );
      CREATE TABLE fiscal_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        year INTEGER NOT NULL, category TEXT NOT NULL,
        label TEXT NOT NULL, amount REAL NOT NULL DEFAULT 0,
        notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL, entity_id INTEGER NOT NULL,
        slot TEXT, file_name TEXT NOT NULL, mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0, stored_name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE bank_imports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fingerprint TEXT NOT NULL UNIQUE,
        tx_date TEXT NOT NULL, description TEXT NOT NULL,
        amount REAL NOT NULL, payment_id INTEGER,
        imported_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)

    // Insert some data that should survive the upgrade
    db.exec(`
      INSERT INTO properties (id, name, address, city, zip) VALUES (1, 'Appt 3B', '12 Rue de Rivoli', 'Paris', '75001');
      INSERT INTO tenants (id, first_name, last_name) VALUES (1, 'Jean', 'Dupont');
      INSERT INTO leases (id, property_id, tenant_id, start_date, rent_amount) VALUES (1, 1, 1, '2024-01-01', 800);
      INSERT INTO payments (lease_id, period_month, period_year, rent_amount) VALUES (1, 1, 2025, 800);
    `)

    // Run migrations — should add missing columns, not destroy data
    expect(() => runMigrations!(db)).not.toThrow()

    // Data survived
    const prop = db.prepare('SELECT * FROM properties WHERE id = 1').get() as any
    expect(prop.name).toBe('Appt 3B')

    // New columns were added
    const leaseCols = (db.prepare('PRAGMA table_info(leases)').all() as Array<{ name: string }>)
      .map((c) => c.name)
    expect(leaseCols).toContain('deposit_received_date')
    expect(leaseCols).toContain('deposit_notes')
    expect(leaseCols).toContain('contract_details')
    expect(leaseCols).toContain('owner_profile_id')
    expect(leaseCols).toContain('updated_at')

    const propertyCols = (db.prepare('PRAGMA table_info(properties)').all() as Array<{ name: string }>)
      .map((c) => c.name)
    expect(propertyCols).toContain('owner_profile_id')

    const tenantCols = (db.prepare('PRAGMA table_info(tenants)').all() as Array<{ name: string }>)
      .map((c) => c.name)
    expect(tenantCols).toContain('guarantor_name')
    expect(tenantCols).toContain('dossier_id_document')

    // user_version stamped
    expect(db.pragma('user_version', { simple: true })).toBe(5)
  })

  it('deduplicates payments when upgrading a pre-migration DB with duplicates', () => {
    // Minimal schema without the unique index
    db.exec(`
      CREATE TABLE properties (
        id INTEGER PRIMARY KEY, name TEXT NOT NULL, address TEXT NOT NULL,
        city TEXT NOT NULL, zip TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE tenants (
        id INTEGER PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE leases (
        id INTEGER PRIMARY KEY, property_id INTEGER NOT NULL, tenant_id INTEGER NOT NULL,
        start_date TEXT NOT NULL, rent_amount REAL NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lease_id INTEGER NOT NULL, period_month INTEGER NOT NULL, period_year INTEGER NOT NULL,
        rent_amount REAL NOT NULL, charges_amount REAL NOT NULL DEFAULT 0,
        payment_date TEXT, payment_method TEXT DEFAULT 'virement',
        status TEXT NOT NULL DEFAULT 'pending', notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE documents (id INTEGER PRIMARY KEY, lease_id INTEGER NOT NULL,
        type TEXT NOT NULL, generated_at TEXT NOT NULL DEFAULT (datetime('now')), file_path TEXT);
      CREATE TABLE payment_reminders (id INTEGER PRIMARY KEY, payment_id INTEGER NOT NULL,
        stage TEXT NOT NULL, sent_at TEXT NOT NULL, notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE inspections (id INTEGER PRIMARY KEY, lease_id INTEGER NOT NULL,
        kind TEXT NOT NULL, inspection_date TEXT NOT NULL, meter_readings TEXT,
        general_condition TEXT, notes TEXT, rooms_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE charge_reconciliations (id INTEGER PRIMARY KEY,
        lease_id INTEGER NOT NULL, year INTEGER NOT NULL, actual_charges REAL NOT NULL,
        provisions_collected_override REAL, notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(lease_id, year));
      CREATE TABLE manual_reminders (id INTEGER PRIMARY KEY,
        lease_id INTEGER, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'custom',
        due_date TEXT NOT NULL, notes TEXT, status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE irl_indices (id INTEGER PRIMARY KEY,
        year INTEGER NOT NULL, quarter INTEGER NOT NULL, value REAL NOT NULL,
        published_at TEXT, UNIQUE(year, quarter));
      CREATE TABLE fiscal_expenses (id INTEGER PRIMARY KEY,
        property_id INTEGER NOT NULL, year INTEGER NOT NULL, category TEXT NOT NULL,
        label TEXT NOT NULL, amount REAL NOT NULL DEFAULT 0, notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE attachments (id INTEGER PRIMARY KEY,
        entity_type TEXT NOT NULL, entity_id INTEGER NOT NULL, slot TEXT,
        file_name TEXT NOT NULL, mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0, stored_name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE bank_imports (id INTEGER PRIMARY KEY,
        fingerprint TEXT NOT NULL UNIQUE, tx_date TEXT NOT NULL,
        description TEXT NOT NULL, amount REAL NOT NULL, payment_id INTEGER,
        imported_at TEXT NOT NULL DEFAULT (datetime('now')));
    `)

    db.exec(`
      INSERT INTO properties (id, name, address, city, zip) VALUES (1, 'P', 'A', 'C', '00');
      INSERT INTO tenants (id, first_name, last_name) VALUES (1, 'F', 'L');
      INSERT INTO leases (id, property_id, tenant_id, start_date, rent_amount) VALUES (1, 1, 1, '2024-01-01', 500);
    `)

    // Insert duplicate payments for the same period — the 'paid' one should survive
    db.exec(`
      INSERT INTO payments (lease_id, period_month, period_year, rent_amount, status) VALUES (1, 3, 2025, 500, 'pending');
      INSERT INTO payments (lease_id, period_month, period_year, rent_amount, status) VALUES (1, 3, 2025, 500, 'paid');
    `)

    runMigrations!(db)

    const rows = db.prepare(
      'SELECT * FROM payments WHERE lease_id = 1 AND period_month = 3 AND period_year = 2025'
    ).all() as any[]
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('paid')
  })

  // ── IRL seed ──────────────────────────────────────────────────────────────

  it('IRL seed data populates correctly', () => {
    runMigrations!(db)
    seedIrlIndices!(db)

    const count = (db.prepare('SELECT COUNT(*) as n FROM irl_indices').get() as { n: number }).n
    expect(count).toBeGreaterThanOrEqual(18)
  })

  it('IRL seed is idempotent', () => {
    runMigrations!(db)
    seedIrlIndices!(db)
    const count1 = (db.prepare('SELECT COUNT(*) as n FROM irl_indices').get() as { n: number }).n

    seedIrlIndices!(db)
    const count2 = (db.prepare('SELECT COUNT(*) as n FROM irl_indices').get() as { n: number }).n

    expect(count2).toBe(count1)
  })

  it('IRL seed backfills missing baseline rows into non-empty databases', () => {
    runMigrations!(db)
    db.prepare('INSERT INTO irl_indices (year, quarter, value) VALUES (?, ?, ?)').run(2030, 1, 200.01)

    seedIrlIndices!(db)

    const seededQuarter = db
      .prepare('SELECT value FROM irl_indices WHERE year = ? AND quarter = ?')
      .get(2025, 1) as { value: number } | undefined
    const customQuarter = db
      .prepare('SELECT value FROM irl_indices WHERE year = ? AND quarter = ?')
      .get(2030, 1) as { value: number } | undefined

    expect(seededQuarter?.value).toBe(145.47)
    expect(customQuarter?.value).toBe(200.01)
  })

  it('IRL seed corrects previous seed values without replacing user-maintained rows', () => {
    runMigrations!(db)
    db.prepare('INSERT INTO irl_indices (year, quarter, value) VALUES (?, ?, ?)').run(2024, 2, 144.44)
    db.prepare('INSERT INTO irl_indices (year, quarter, value, published_at) VALUES (?, ?, ?, ?)')
      .run(2025, 1, 999, '2026-01-01T00:00:00.000Z')

    seedIrlIndices!(db)

    const correctedSeed = db
      .prepare('SELECT value FROM irl_indices WHERE year = ? AND quarter = ?')
      .get(2024, 2) as { value: number } | undefined
    const userMaintained = db
      .prepare('SELECT value FROM irl_indices WHERE year = ? AND quarter = ?')
      .get(2025, 1) as { value: number } | undefined

    expect(correctedSeed?.value).toBe(145.17)
    expect(userMaintained?.value).toBe(999)
  })

  // ── CRUD basics ───────────────────────────────────────────────────────────

  it('can insert and query a property', () => {
    runMigrations!(db)
    db.prepare(
      "INSERT INTO properties (name, address, city, zip) VALUES (?, ?, ?, ?)"
    ).run('Appt 3B', '12 Rue de Rivoli', 'Paris', '75001')

    const row = db.prepare('SELECT * FROM properties WHERE name = ?').get('Appt 3B') as any
    expect(row).toBeTruthy()
    expect(row.city).toBe('Paris')
  })

  it('can insert and query a full lease chain', () => {
    runMigrations!(db)

    db.prepare("INSERT INTO properties (id, name, address, city, zip) VALUES (1, 'Appt', '1 Rue', 'Paris', '75001')").run()
    db.prepare("INSERT INTO tenants (id, first_name, last_name) VALUES (1, 'Jean', 'Dupont')").run()
    db.prepare("INSERT INTO leases (id, property_id, tenant_id, start_date, rent_amount) VALUES (1, 1, 1, '2024-01-01', 800)").run()
    db.prepare("INSERT INTO payments (lease_id, period_month, period_year, rent_amount) VALUES (1, 1, 2025, 800)").run()

    const payment = db.prepare('SELECT * FROM payments WHERE lease_id = 1').get() as any
    expect(payment).toBeTruthy()
    expect(payment.rent_amount).toBe(800)
  })

  it('enforces foreign key constraints', () => {
    runMigrations!(db)
    expect(() => {
      db.prepare(
        "INSERT INTO leases (property_id, tenant_id, start_date, rent_amount) VALUES (999, 999, '2024-01-01', 500)"
      ).run()
    }).toThrow()
  })

  it('bank_imports fingerprint is unique', () => {
    runMigrations!(db)
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
    runMigrations!(db)
    db.prepare("INSERT INTO properties (id, name, address, city, zip) VALUES (1, 'P', 'A', 'C', '00')").run()
    db.prepare("INSERT INTO tenants (id, first_name, last_name) VALUES (1, 'F', 'L')").run()
    db.prepare("INSERT INTO leases (id, property_id, tenant_id, start_date, rent_amount) VALUES (1, 1, 1, '2024-01-01', 500)").run()

    db.prepare("INSERT INTO charge_reconciliations (lease_id, year, actual_charges) VALUES (1, 2024, 1200)").run()
    expect(() => {
      db.prepare("INSERT INTO charge_reconciliations (lease_id, year, actual_charges) VALUES (1, 2024, 999)").run()
    }).toThrow()
  })
})
