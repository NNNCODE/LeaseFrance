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

import * as propertyDiagnosticsDb from '../../electron/db/queries/propertyDiagnostics'
import { getReminderFeed } from '../../electron/services/reminders'

describe.skipIf(!!loadError)('property diagnostics query and reminders', () => {
  beforeEach(() => {
    db = new (Database as any)(':memory:')
    db.pragma('foreign_keys = ON')
    runMigrations(db)

    db.prepare("INSERT INTO properties (id, name, address, city, zip) VALUES (1, 'Studio Centre', '3 rue Victor Hugo', 'Lyon', '69001')").run()
  })

  afterEach(() => {
    db?.close()
  })

  if (loadError) {
    it.skip(`skipped: ${loadError}`, () => {})
    return
  }

  it('upserts diagnostics for a property and normalizes nullable values', () => {
    const created = propertyDiagnosticsDb.upsert(1, {
      dpe_class: 'g',
      dpe_ges_class: 'f',
      dpe_performed_at: '2024-01-15',
      dpe_expires_at: '2034-01-15',
      dpe_ademe_number: ' 2475E1234567A ',
      asbestos_available: true,
      notes: ' DPE initial ',
    } as propertyDiagnosticsDb.PropertyDiagnosticsInput)

    expect(created.dpe_class).toBe('G')
    expect(created.dpe_ges_class).toBe('F')
    expect(created.dpe_ademe_number).toBe('2475E1234567A')
    expect(created.asbestos_available).toBe(true)
    expect(created.notes).toBe('DPE initial')

    const updated = propertyDiagnosticsDb.upsert(1, {
      dpe_class: 'F',
      dpe_ges_class: null,
      dpe_performed_at: null,
      dpe_expires_at: null,
      asbestos_available: false,
      notes: '',
    })

    expect(updated.id).toBe(created.id)
    expect(updated.dpe_class).toBe('F')
    expect(updated.dpe_ges_class).toBeNull()
    expect(updated.notes).toBeNull()
    expect(propertyDiagnosticsDb.getAll()).toHaveLength(1)
  })

  it('adds expiring diagnostics to the automatic reminder feed', () => {
    propertyDiagnosticsDb.upsert(1, {
      dpe_class: 'F',
      dpe_expires_at: '2026-05-01',
      gas_expires_at: '2026-08-15',
    })

    const feed = getReminderFeed(new Date('2026-04-01T00:00:00'))
    const diagnosticItems = feed.pendingItems.filter((item) => item.derived_kind === 'diagnostic_expiry')

    expect(diagnosticItems).toHaveLength(2)
    expect(diagnosticItems.map((item) => item.due_date)).toEqual(['2026-05-01', '2026-08-15'])
    expect(diagnosticItems[0]).toMatchObject({
      property_id: 1,
      property_name: 'Studio Centre',
      category: 'diagnostic',
    })
  })
})
