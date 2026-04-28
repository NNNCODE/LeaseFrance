import type Database from 'better-sqlite3'

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS property_diagnostics (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id             INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      dpe_class               TEXT,
      dpe_ges_class           TEXT,
      dpe_performed_at        TEXT,
      dpe_expires_at          TEXT,
      dpe_ademe_number        TEXT,
      dpe_energy_estimate     TEXT,
      lead_performed_at       TEXT,
      lead_expires_at         TEXT,
      gas_performed_at        TEXT,
      gas_expires_at          TEXT,
      electricity_performed_at TEXT,
      electricity_expires_at  TEXT,
      erp_performed_at        TEXT,
      erp_expires_at          TEXT,
      noise_performed_at      TEXT,
      noise_expires_at        TEXT,
      asbestos_available      INTEGER NOT NULL DEFAULT 0,
      notes                   TEXT,
      created_at              TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(property_id)
    );

    CREATE INDEX IF NOT EXISTS idx_property_diagnostics_property
    ON property_diagnostics(property_id);

    CREATE INDEX IF NOT EXISTS idx_property_diagnostics_dpe_expiry
    ON property_diagnostics(dpe_expires_at);
  `)
}
