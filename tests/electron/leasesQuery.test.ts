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

import * as leasesDb from '../../electron/db/queries/leases'

describe.skipIf(!!loadError)('lease query legacy version token handling', () => {
  beforeEach(() => {
    db = new (Database as any)(':memory:')
    db.pragma('foreign_keys = ON')
    runMigrations(db)

    db.prepare("INSERT INTO properties (id, name, address, city, zip) VALUES (1, 'Appartement Paris', '12 rue de Paris', 'Paris', '75001')").run()
    db.prepare("INSERT INTO tenants (id, first_name, last_name) VALUES (1, 'Alice', 'Martin')").run()
  })

  afterEach(() => {
    db?.close()
  })

  if (loadError) {
    it.skip(`skipped: ${loadError}`, () => {})
    return
  }

  it('maps null updated_at to created_at and allows updating a legacy lease', () => {
    db.prepare(`
      INSERT INTO leases (
        id,
        property_id,
        tenant_id,
        type,
        start_date,
        end_date,
        rent_amount,
        charges_amount,
        deposit_amount,
        deposit_received_date,
        deposit_refund_date,
        deposit_retained_amount,
        deposit_notes,
        irl_reference_index,
        irl_reference_quarter,
        status,
        created_at,
        updated_at,
        contract_details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      7,
      1,
      1,
      'vide',
      '2026-04-01',
      null,
      800,
      80,
      800,
      null,
      null,
      0,
      null,
      null,
      null,
      'active',
      '2026-04-01 09:00:00',
      null,
      null,
    )

    const legacyLease = leasesDb.getById(7)
    expect(legacyLease?.updated_at).toBe('2026-04-01 09:00:00')

    const updated = leasesDb.update(7, {
      property_id: 1,
      tenant_id: 1,
      owner_profile_id: null,
      type: 'vide',
      start_date: '2026-04-01',
      end_date: null,
      rent_amount: 820,
      charges_amount: 80,
      deposit_amount: 800,
      deposit_received_date: null,
      deposit_refund_date: null,
      deposit_retained_amount: 0,
      deposit_notes: null,
      irl_reference_index: null,
      irl_reference_quarter: null,
      contract_details: null,
      status: 'active',
    }, legacyLease!.updated_at)

    expect(updated).toBeTruthy()
    expect(updated?.rent_amount).toBe(820)
    expect(updated?.updated_at).not.toBe('2026-04-01 09:00:00')

    const stored = db.prepare('SELECT updated_at FROM leases WHERE id = ?').get(7) as { updated_at: string | null }
    expect(stored.updated_at).toBeTruthy()
    expect(stored.updated_at).toBe(updated?.updated_at)
  })

  it('force deletes a lease together with linked records', () => {
    const lease = leasesDb.create({
      property_id: 1,
      tenant_id: 1,
      owner_profile_id: null,
      type: 'vide',
      start_date: '2026-04-01',
      end_date: null,
      rent_amount: 800,
      charges_amount: 80,
      deposit_amount: 800,
      deposit_received_date: null,
      deposit_refund_date: null,
      deposit_retained_amount: 0,
      deposit_notes: null,
      irl_reference_index: null,
      irl_reference_quarter: null,
      contract_details: null,
      status: 'active',
    })

    const paymentResult = db.prepare(`
      INSERT INTO payments (
        lease_id, period_month, period_year, rent_amount, charges_amount,
        payment_date, payment_method, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(lease.id, 4, 2026, 800, 80, null, 'virement', 'pending', null)
    const paymentId = paymentResult.lastInsertRowid as number

    db.prepare(`
      INSERT INTO payment_reminders (payment_id, stage, sent_at, notes)
      VALUES (?, ?, ?, ?)
    `).run(paymentId, 'relance_amiable', '2026-04-05', null)

    db.prepare(`
      INSERT INTO documents (lease_id, type, generated_at, file_path, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(lease.id, 'quittance', '2026-04-05 10:00:00', 'C:\\docs\\lease.pdf', 'generated')

    db.prepare(`
      INSERT INTO manual_reminders (lease_id, title, category, due_date, notes, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(lease.id, 'Insurance renewal', 'insurance', '2026-05-01', null, 'pending')

    const inspectionResult = db.prepare(`
      INSERT INTO inspections (
        lease_id, kind, inspection_date, meter_readings, general_condition, notes, rooms_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(lease.id, 'entry', '2026-04-01', null, null, null, '[]')
    const inspectionId = inspectionResult.lastInsertRowid as number

    db.prepare(`
      INSERT INTO charge_reconciliations (lease_id, year, actual_charges, provisions_collected_override, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(lease.id, 2026, 120, null, null)

    db.prepare(`
      INSERT INTO attachments (entity_type, entity_id, slot, file_name, mime_type, file_size, stored_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('lease', lease.id, null, 'lease-note.pdf', 'application/pdf', 1234, 'lease-note.pdf')

    db.prepare(`
      INSERT INTO attachments (entity_type, entity_id, slot, file_name, mime_type, file_size, stored_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('inspection', inspectionId, null, 'inspection-photo.jpg', 'image/jpeg', 4567, 'inspection-photo.jpg')

    db.prepare(`
      INSERT INTO bank_imports (fingerprint, tx_date, description, amount, payment_id)
      VALUES (?, ?, ?, ?, ?)
    `).run('lease-force-delete-fp', '2026-04-04', 'LOYER AVRIL', 880, paymentId)

    const removed = leasesDb.removeWithLinkedRecords(lease.id)

    expect(removed).toBe(true)
    expect((db.prepare('SELECT COUNT(*) AS n FROM leases WHERE id = ?').get(lease.id) as { n: number }).n).toBe(0)
    expect((db.prepare('SELECT COUNT(*) AS n FROM payments WHERE lease_id = ?').get(lease.id) as { n: number }).n).toBe(0)
    expect((db.prepare('SELECT COUNT(*) AS n FROM payment_reminders').get() as { n: number }).n).toBe(0)
    expect((db.prepare('SELECT COUNT(*) AS n FROM documents WHERE lease_id = ?').get(lease.id) as { n: number }).n).toBe(0)
    expect((db.prepare('SELECT COUNT(*) AS n FROM manual_reminders WHERE lease_id = ?').get(lease.id) as { n: number }).n).toBe(0)
    expect((db.prepare('SELECT COUNT(*) AS n FROM inspections WHERE lease_id = ?').get(lease.id) as { n: number }).n).toBe(0)
    expect((db.prepare('SELECT COUNT(*) AS n FROM charge_reconciliations WHERE lease_id = ?').get(lease.id) as { n: number }).n).toBe(0)
    expect((db.prepare("SELECT COUNT(*) AS n FROM attachments WHERE entity_type = 'lease' AND entity_id = ?").get(lease.id) as { n: number }).n).toBe(0)
    expect((db.prepare("SELECT COUNT(*) AS n FROM attachments WHERE entity_type = 'inspection' AND entity_id = ?").get(inspectionId) as { n: number }).n).toBe(0)

    const bankImport = db
      .prepare('SELECT payment_id FROM bank_imports WHERE fingerprint = ?')
      .get('lease-force-delete-fp') as { payment_id: number | null }
    expect(bankImport.payment_id).toBeNull()
  })
})
