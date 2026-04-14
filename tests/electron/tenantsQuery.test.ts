import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type BetterSqlite3 from 'better-sqlite3'
import { runMigrations } from '../../electron/db/migrations'

let Database: typeof import('better-sqlite3') | null = null
let loadError: string | null = null

try {
  Database = require('better-sqlite3')
  const probe = new (Database as any)(':memory:')
  probe.close()
} catch (err: any) {
  loadError = err.message
}

let db: BetterSqlite3.Database

vi.mock('../../electron/db/database', () => ({
  getDb: () => db,
}))

import * as tenantsDb from '../../electron/db/queries/tenants'

describe.skipIf(!!loadError)('tenant query legacy version token handling', () => {
  beforeEach(() => {
    db = new (Database as any)(':memory:')
    db.pragma('foreign_keys = ON')
    runMigrations(db)
  })

  afterEach(() => {
    db?.close()
  })

  if (loadError) {
    it.skip(`skipped: ${loadError}`, () => {})
    return
  }

  it('maps null updated_at to created_at and allows the first update', () => {
    db.prepare(`
      INSERT INTO tenants (
        first_name,
        last_name,
        email,
        phone,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run('Julie', 'Bernard', null, null, '2026-04-01 09:00:00', null)

    const legacyTenant = tenantsDb.getAll()[0]
    expect(legacyTenant.updated_at).toBe('2026-04-01 09:00:00')

    const updated = tenantsDb.update(legacyTenant.id, {
      first_name: legacyTenant.first_name,
      last_name: legacyTenant.last_name,
      dossier_id_document: true,
    }, legacyTenant.updated_at)

    expect(updated).toBeTruthy()
    expect(updated?.dossier_id_document).toBe(true)
    expect(updated?.updated_at).not.toBe('2026-04-01 09:00:00')

    const stored = db.prepare('SELECT updated_at FROM tenants WHERE id = ?').get(legacyTenant.id) as { updated_at: string | null }
    expect(stored.updated_at).toBeTruthy()
    expect(stored.updated_at).toBe(updated?.updated_at)
  })
})
