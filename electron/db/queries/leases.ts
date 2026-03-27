import { getDb } from '../database'
import {
  type LeaseContractDetails,
  parseLeaseContractDetails,
  serializeLeaseContractDetails,
} from '../../../src/shared/leaseContract'

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
  updated_at: string
  contract_details: LeaseContractDetails | null
  // Joined fields
  property_name: string
  property_address: string
  property_city: string
  property_zip: string
  property_area_m2: number | null
  tenant_first_name: string
  tenant_last_name: string
  tenant_email: string | null
  tenant_phone: string | null
  tenant_guarantor_name: string | null
  tenant_guarantor_address: string | null
  tenant_guarantor_email: string | null
  tenant_guarantor_phone: string | null
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
  contract_details?: LeaseContractDetails | null
  status?: string
}

interface LeaseRow extends Omit<Lease, 'contract_details'> {
  contract_details: string | null
}

const SELECT = `
  SELECT l.*,
    p.name  AS property_name,
    p.address AS property_address,
    p.city  AS property_city,
    p.zip   AS property_zip,
    p.area_m2 AS property_area_m2,
    t.first_name AS tenant_first_name,
    t.last_name  AS tenant_last_name,
    t.email AS tenant_email,
    t.phone AS tenant_phone,
    t.guarantor_name AS tenant_guarantor_name,
    t.guarantor_address AS tenant_guarantor_address,
    t.guarantor_email AS tenant_guarantor_email,
    t.guarantor_phone AS tenant_guarantor_phone
  FROM leases l
  JOIN properties p ON p.id = l.property_id
  JOIN tenants    t ON t.id = l.tenant_id
`

export function getAll(): Lease[] {
  return (getDb().prepare(`${SELECT} ORDER BY l.created_at DESC`).all() as LeaseRow[]).map(mapLeaseRow)
}

export function getById(id: number): Lease | undefined {
  const row = getDb().prepare(`${SELECT} WHERE l.id = ?`).get(id) as LeaseRow | undefined
  return row ? mapLeaseRow(row) : undefined
}

export function create(data: LeaseInput): Lease {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO leases
      (property_id, tenant_id, type, start_date, end_date,
       rent_amount, charges_amount, deposit_amount,
       deposit_received_date, deposit_refund_date, deposit_retained_amount, deposit_notes,
       irl_reference_index, irl_reference_quarter, contract_details, status)
    VALUES
      (@property_id, @tenant_id, @type, @start_date, @end_date,
       @rent_amount, @charges_amount, @deposit_amount,
       @deposit_received_date, @deposit_refund_date, @deposit_retained_amount, @deposit_notes,
       @irl_reference_index, @irl_reference_quarter, @contract_details, @status)
  `).run({
    ...data,
    end_date: data.end_date ?? null,
    deposit_received_date: data.deposit_received_date ?? null,
    deposit_refund_date: data.deposit_refund_date ?? null,
    deposit_retained_amount: data.deposit_retained_amount ?? 0,
    deposit_notes: data.deposit_notes ?? null,
    irl_reference_index: data.irl_reference_index ?? null,
    irl_reference_quarter: data.irl_reference_quarter ?? null,
    contract_details: serializeLeaseContractDetails(data.contract_details ?? null),
    status: data.status ?? 'active',
  })
  return getById(result.lastInsertRowid as number)!
}

const CONFLICT_MSG = 'Les donnees ont ete modifiees depuis votre dernier chargement. Fermez le formulaire et reessayez.'

export function update(id: number, data: LeaseInput, expectedUpdatedAt: string): Lease | undefined {
  const result = getDb().prepare(`
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
      contract_details=@contract_details,
      status=@status,
      updated_at=datetime('now')
    WHERE id=@id AND updated_at=@expected_updated_at
  `).run({
    ...data,
    end_date: data.end_date ?? null,
    deposit_received_date: data.deposit_received_date ?? null,
    deposit_refund_date: data.deposit_refund_date ?? null,
    deposit_retained_amount: data.deposit_retained_amount ?? 0,
    deposit_notes: data.deposit_notes ?? null,
    irl_reference_index: data.irl_reference_index ?? null,
    irl_reference_quarter: data.irl_reference_quarter ?? null,
    contract_details: serializeLeaseContractDetails(data.contract_details ?? null),
    status: data.status ?? 'active',
    id,
    expected_updated_at: expectedUpdatedAt,
  })
  if (result.changes === 0) {
    if (getDb().prepare('SELECT 1 FROM leases WHERE id = ?').get(id)) {
      throw new Error(CONFLICT_MSG)
    }
    return undefined
  }
  return getById(id)
}

export function updateContractDetails(
  id: number,
  contractDetails: LeaseContractDetails | null,
  expectedUpdatedAt: string,
): Lease | undefined {
  const result = getDb().prepare(`
    UPDATE leases SET
      contract_details=@contract_details,
      updated_at=datetime('now')
    WHERE id=@id AND updated_at=@expected_updated_at
  `).run({
    id,
    contract_details: serializeLeaseContractDetails(contractDetails),
    expected_updated_at: expectedUpdatedAt,
  })
  if (result.changes === 0) {
    if (getDb().prepare('SELECT 1 FROM leases WHERE id = ?').get(id)) {
      throw new Error(CONFLICT_MSG)
    }
    return undefined
  }
  return getById(id)
}

export function remove(id: number): boolean {
  try {
    const result = getDb().prepare('DELETE FROM leases WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    if (err instanceof Error && err.message.includes('FOREIGN KEY constraint failed')) {
      throw new Error('Impossible de supprimer ce bail car des paiements, documents ou rappels y sont encore rattaches.')
    }
    throw err
  }
}

export function count(): number {
  const row = getDb().prepare('SELECT COUNT(*) as n FROM leases WHERE status = ?').get('active') as { n: number }
  return row.n
}

function mapLeaseRow(row: LeaseRow): Lease {
  return {
    ...row,
    contract_details: parseLeaseContractDetails(row.contract_details),
  }
}
