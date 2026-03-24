import { getDb } from '../database'

export interface Lease {
  id: number
  property_id: number
  tenant_id: number
  type: 'vide' | 'meuble' | 'mobilite'
  start_date: string
  end_date: string | null
  rent_amount: number
  charges_amount: number
  deposit_amount: number
  deposit_received_date: string | null
  deposit_refund_date: string | null
  deposit_retained_amount: number
  deposit_notes: string | null
  irl_reference_index: number | null
  irl_reference_quarter: string | null
  status: 'active' | 'ended' | 'terminated'
  created_at: string
  // Joined fields
  property_name: string
  property_address: string
  property_city: string
  property_zip: string
  tenant_first_name: string
  tenant_last_name: string
}

export interface LeaseInput {
  property_id: number
  tenant_id: number
  type: string
  start_date: string
  end_date?: string | null
  rent_amount: number
  charges_amount: number
  deposit_amount: number
  deposit_received_date?: string | null
  deposit_refund_date?: string | null
  deposit_retained_amount?: number
  deposit_notes?: string | null
  irl_reference_index?: number | null
  irl_reference_quarter?: string | null
  status?: string
}

const SELECT = `
  SELECT l.*,
    p.name  AS property_name,
    p.address AS property_address,
    p.city  AS property_city,
    p.zip   AS property_zip,
    t.first_name AS tenant_first_name,
    t.last_name  AS tenant_last_name
  FROM leases l
  JOIN properties p ON p.id = l.property_id
  JOIN tenants    t ON t.id = l.tenant_id
`

export function getAll(): Lease[] {
  return getDb().prepare(`${SELECT} ORDER BY l.created_at DESC`).all() as Lease[]
}

export function getById(id: number): Lease | undefined {
  return getDb().prepare(`${SELECT} WHERE l.id = ?`).get(id) as Lease | undefined
}

export function create(data: LeaseInput): Lease {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO leases
      (property_id, tenant_id, type, start_date, end_date,
       rent_amount, charges_amount, deposit_amount,
       deposit_received_date, deposit_refund_date, deposit_retained_amount, deposit_notes,
       irl_reference_index, irl_reference_quarter, status)
    VALUES
      (@property_id, @tenant_id, @type, @start_date, @end_date,
       @rent_amount, @charges_amount, @deposit_amount,
       @deposit_received_date, @deposit_refund_date, @deposit_retained_amount, @deposit_notes,
       @irl_reference_index, @irl_reference_quarter, @status)
  `).run({
    ...data,
    end_date: data.end_date ?? null,
    deposit_received_date: data.deposit_received_date ?? null,
    deposit_refund_date: data.deposit_refund_date ?? null,
    deposit_retained_amount: data.deposit_retained_amount ?? 0,
    deposit_notes: data.deposit_notes ?? null,
    irl_reference_index: data.irl_reference_index ?? null,
    irl_reference_quarter: data.irl_reference_quarter ?? null,
    status: data.status ?? 'active',
  })
  return getById(result.lastInsertRowid as number)!
}

export function update(id: number, data: LeaseInput): Lease | undefined {
  getDb().prepare(`
    UPDATE leases SET
      property_id=@property_id, tenant_id=@tenant_id, type=@type,
      start_date=@start_date, end_date=@end_date,
      rent_amount=@rent_amount, charges_amount=@charges_amount,
      deposit_amount=@deposit_amount,
      deposit_received_date=@deposit_received_date,
      deposit_refund_date=@deposit_refund_date,
      deposit_retained_amount=@deposit_retained_amount,
      deposit_notes=@deposit_notes,
      irl_reference_index=@irl_reference_index,
      irl_reference_quarter=@irl_reference_quarter,
      status=@status
    WHERE id=@id
  `).run({
    ...data,
    end_date: data.end_date ?? null,
    deposit_received_date: data.deposit_received_date ?? null,
    deposit_refund_date: data.deposit_refund_date ?? null,
    deposit_retained_amount: data.deposit_retained_amount ?? 0,
    deposit_notes: data.deposit_notes ?? null,
    irl_reference_index: data.irl_reference_index ?? null,
    irl_reference_quarter: data.irl_reference_quarter ?? null,
    status: data.status ?? 'active',
    id,
  })
  return getById(id)
}

export function remove(id: number): boolean {
  const result = getDb().prepare('DELETE FROM leases WHERE id = ?').run(id)
  return result.changes > 0
}

export function count(): number {
  const row = getDb().prepare('SELECT COUNT(*) as n FROM leases WHERE status = ?').get('active') as { n: number }
  return row.n
}
