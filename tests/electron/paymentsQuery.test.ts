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

import * as paymentsDb from '../../electron/db/queries/payments'

describe.skipIf(!!loadError)('payment query legacy version token handling', () => {
  beforeEach(() => {
    db = new (Database as any)(':memory:')
    db.pragma('foreign_keys = ON')
    runMigrations(db)

    db.prepare("INSERT INTO properties (id, name, address, city, zip) VALUES (1, 'Appartement Paris', '12 rue de Paris', 'Paris', '75001')").run()
    db.prepare("INSERT INTO tenants (id, first_name, last_name) VALUES (1, 'Alice', 'Martin')").run()
    db.prepare("INSERT INTO leases (id, property_id, tenant_id, start_date, rent_amount, charges_amount) VALUES (1, 1, 1, '2026-01-01', 820, 45)").run()
  })

  afterEach(() => {
    db?.close()
  })

  if (loadError) {
    it.skip(`skipped: ${loadError}`, () => {})
    return
  }

  it('maps null updated_at to created_at and allows marking a legacy payment as paid', () => {
    db.prepare(`
      INSERT INTO payments (
        id,
        lease_id,
        period_month,
        period_year,
        rent_amount,
        charges_amount,
        payment_date,
        payment_method,
        status,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(7, 1, 4, 2026, 820, 45, null, 'virement', 'pending', null, '2026-04-01 09:00:00', null)

    const legacyPayment = paymentsDb.getById(7)
    expect(legacyPayment?.updated_at).toBe('2026-04-01 09:00:00')

    const updated = paymentsDb.markPaid(7, '2026-04-05', legacyPayment!.updated_at)

    expect(updated).toBeTruthy()
    expect(updated?.status).toBe('paid')
    expect(updated?.payment_date).toBe('2026-04-05')
    expect(updated?.updated_at).not.toBe('2026-04-01 09:00:00')

    const stored = db.prepare('SELECT updated_at FROM payments WHERE id = ?').get(7) as { updated_at: string | null }
    expect(stored.updated_at).toBeTruthy()
    expect(stored.updated_at).toBe(updated?.updated_at)
  })
})
