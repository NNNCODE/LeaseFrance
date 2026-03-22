import { getDb } from '../database'

export interface Tenant {
  id: number
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  created_at: string
  // Joined lease info (may be null if no active lease)
  lease_id: number | null
  lease_type: string | null
  property_name: string | null
  property_city: string | null
  rent_amount: number | null
  charges_amount: number | null
  lease_start_date: string | null
  unpaid_count: number
}

export interface TenantInput {
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
}

const SELECT = `
  SELECT
    t.*,
    l.id          AS lease_id,
    l.type        AS lease_type,
    l.rent_amount,
    l.charges_amount,
    l.start_date  AS lease_start_date,
    p.name        AS property_name,
    p.city        AS property_city,
    (
      SELECT COUNT(*) FROM payments pay
      WHERE pay.lease_id = l.id AND pay.status = 'late'
    ) AS unpaid_count
  FROM tenants t
  LEFT JOIN leases l     ON l.tenant_id = t.id AND l.status = 'active'
  LEFT JOIN properties p ON p.id = l.property_id
  ORDER BY t.last_name ASC, t.first_name ASC
`

export function getAll(): Tenant[] {
  return getDb().prepare(SELECT).all() as Tenant[]
}

export function getById(id: number): Tenant | undefined {
  return getDb()
    .prepare(`${SELECT.replace('ORDER BY t.last_name ASC, t.first_name ASC', 'WHERE t.id = ?')}`)
    .get(id) as Tenant | undefined
}

export function create(data: TenantInput): Tenant {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO tenants (first_name, last_name, email, phone)
    VALUES (@first_name, @last_name, @email, @phone)
  `).run(data)
  return getById(result.lastInsertRowid as number)!
}

export function update(id: number, data: TenantInput): Tenant | undefined {
  getDb().prepare(`
    UPDATE tenants SET first_name=@first_name, last_name=@last_name,
    email=@email, phone=@phone WHERE id=@id
  `).run({ ...data, id })
  return getById(id)
}

export function remove(id: number): boolean {
  const result = getDb().prepare('DELETE FROM tenants WHERE id = ?').run(id)
  return result.changes > 0
}

export function count(): number {
  const row = getDb().prepare('SELECT COUNT(*) as n FROM tenants').get() as { n: number }
  return row.n
}
