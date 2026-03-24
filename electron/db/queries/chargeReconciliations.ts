import { getDb } from '../database'

export interface ChargeReconciliation {
  id: number
  lease_id: number
  year: number
  actual_charges: number
  provisions_collected_override: number | null
  notes: string | null
  created_at: string
  property_name: string
  property_address: string
  property_city: string
  property_zip: string
  tenant_first_name: string
  tenant_last_name: string
  lease_start_date: string
  lease_end_date: string | null
  lease_charges_amount: number
}

export interface ChargeReconciliationInput {
  lease_id: number
  year: number
  actual_charges: number
  provisions_collected_override?: number | null
  notes?: string | null
}

const SELECT = `
  SELECT
    cr.*,
    p.name            AS property_name,
    p.address         AS property_address,
    p.city            AS property_city,
    p.zip             AS property_zip,
    t.first_name      AS tenant_first_name,
    t.last_name       AS tenant_last_name,
    l.start_date      AS lease_start_date,
    l.end_date        AS lease_end_date,
    l.charges_amount  AS lease_charges_amount
  FROM charge_reconciliations cr
  JOIN leases     l ON l.id = cr.lease_id
  JOIN properties p ON p.id = l.property_id
  JOIN tenants    t ON t.id = l.tenant_id
`

export function getById(id: number): ChargeReconciliation | undefined {
  return getDb()
    .prepare(`${SELECT} WHERE cr.id = ?`)
    .get(id) as ChargeReconciliation | undefined
}

export function getByLease(leaseId: number): ChargeReconciliation[] {
  return getDb()
    .prepare(`${SELECT} WHERE cr.lease_id = ? ORDER BY cr.year DESC, cr.created_at DESC`)
    .all(leaseId) as ChargeReconciliation[]
}

export function create(data: ChargeReconciliationInput): ChargeReconciliation {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO charge_reconciliations
      (lease_id, year, actual_charges, provisions_collected_override, notes)
    VALUES
      (@lease_id, @year, @actual_charges, @provisions_collected_override, @notes)
  `).run({
    ...data,
    provisions_collected_override: data.provisions_collected_override ?? null,
    notes: data.notes ?? null,
  })

  return getById(result.lastInsertRowid as number)!
}

export function update(id: number, data: ChargeReconciliationInput): ChargeReconciliation | undefined {
  getDb().prepare(`
    UPDATE charge_reconciliations SET
      lease_id=@lease_id,
      year=@year,
      actual_charges=@actual_charges,
      provisions_collected_override=@provisions_collected_override,
      notes=@notes
    WHERE id=@id
  `).run({
    ...data,
    provisions_collected_override: data.provisions_collected_override ?? null,
    notes: data.notes ?? null,
    id,
  })

  return getById(id)
}

export function remove(id: number): boolean {
  return getDb().prepare('DELETE FROM charge_reconciliations WHERE id = ?').run(id).changes > 0
}
