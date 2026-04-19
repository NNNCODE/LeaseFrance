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
  owner_profile_id: string | null
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
  property_owner_profile_id: string | null
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
  owner_profile_id?: string | null
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

function normalizeOwnerProfileId(ownerProfileId: string | null | undefined): string | null {
  const normalized = ownerProfileId?.trim()
  return normalized ? normalized : null
}

function getPropertyOwnerProfileId(propertyId: number): string | null {
  const row = getDb()
    .prepare('SELECT owner_profile_id FROM properties WHERE id = ?')
    .get(propertyId) as { owner_profile_id: string | null } | undefined
  return normalizeOwnerProfileId(row?.owner_profile_id)
}

function getStoredLeaseOwnerProfileId(leaseId: number): string | null {
  const row = getDb()
    .prepare('SELECT owner_profile_id FROM leases WHERE id = ?')
    .get(leaseId) as { owner_profile_id: string | null } | undefined
  return normalizeOwnerProfileId(row?.owner_profile_id)
}

const SELECT = `
  SELECT
    l.id,
    l.property_id,
    l.tenant_id,
    l.owner_profile_id,
    l.type,
    l.start_date,
    l.end_date,
    l.rent_amount,
    l.charges_amount,
    l.deposit_amount,
    l.deposit_received_date,
    l.deposit_refund_date,
    l.deposit_retained_amount,
    l.deposit_notes,
    l.irl_reference_index,
    l.irl_reference_quarter,
    l.status,
    l.created_at,
    COALESCE(l.updated_at, l.created_at) AS updated_at,
    l.contract_details,
    p.name  AS property_name,
    p.address AS property_address,
    p.city  AS property_city,
    p.zip   AS property_zip,
    p.area_m2 AS property_area_m2,
    p.owner_profile_id AS property_owner_profile_id,
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
  const ownerProfileId = data.owner_profile_id !== undefined
    ? normalizeOwnerProfileId(data.owner_profile_id)
    : getPropertyOwnerProfileId(data.property_id)
  const result = db.prepare(`
    INSERT INTO leases
      (property_id, tenant_id, owner_profile_id, type, start_date, end_date,
       rent_amount, charges_amount, deposit_amount,
       deposit_received_date, deposit_refund_date, deposit_retained_amount, deposit_notes,
       irl_reference_index, irl_reference_quarter, contract_details, status)
    VALUES
      (@property_id, @tenant_id, @owner_profile_id, @type, @start_date, @end_date,
       @rent_amount, @charges_amount, @deposit_amount,
       @deposit_received_date, @deposit_refund_date, @deposit_retained_amount, @deposit_notes,
       @irl_reference_index, @irl_reference_quarter, @contract_details, @status)
  `).run({
    ...data,
    owner_profile_id: ownerProfileId,
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
  const ownerProfileId = data.owner_profile_id !== undefined
    ? normalizeOwnerProfileId(data.owner_profile_id)
    : getStoredLeaseOwnerProfileId(id) ?? getPropertyOwnerProfileId(data.property_id)
  const result = getDb().prepare(`
    UPDATE leases SET
      property_id=@property_id, tenant_id=@tenant_id, owner_profile_id=@owner_profile_id, type=@type,
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
    WHERE id=@id AND COALESCE(updated_at, created_at)=@expected_updated_at
  `).run({
    ...data,
    owner_profile_id: ownerProfileId,
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
    WHERE id=@id AND COALESCE(updated_at, created_at)=@expected_updated_at
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

export function removeWithLinkedRecords(id: number): boolean {
  const db = getDb()
  const removeTx = db.transaction((leaseId: number) => {
    const paymentIds = (
      db.prepare('SELECT id FROM payments WHERE lease_id = ?').all(leaseId) as Array<{ id: number }>
    ).map((row) => row.id)
    const inspectionIds = (
      db.prepare('SELECT id FROM inspections WHERE lease_id = ?').all(leaseId) as Array<{ id: number }>
    ).map((row) => row.id)

    if (paymentIds.length > 0) {
      const paymentPlaceholders = paymentIds.map(() => '?').join(', ')
      db.prepare(`UPDATE bank_imports SET payment_id = NULL WHERE payment_id IN (${paymentPlaceholders})`).run(...paymentIds)
      db.prepare(`DELETE FROM payments WHERE id IN (${paymentPlaceholders})`).run(...paymentIds)
    }

    if (inspectionIds.length > 0) {
      const inspectionPlaceholders = inspectionIds.map(() => '?').join(', ')
      db.prepare(`DELETE FROM attachments WHERE entity_type = 'inspection' AND entity_id IN (${inspectionPlaceholders})`).run(...inspectionIds)
    }

    db.prepare(`DELETE FROM documents WHERE lease_id = ?`).run(leaseId)
    db.prepare(`DELETE FROM manual_reminders WHERE lease_id = ?`).run(leaseId)
    db.prepare(`DELETE FROM attachments WHERE entity_type = 'lease' AND entity_id = ?`).run(leaseId)
    db.prepare(`DELETE FROM charge_reconciliations WHERE lease_id = ?`).run(leaseId)
    db.prepare(`DELETE FROM inspections WHERE lease_id = ?`).run(leaseId)

    const result = db.prepare('DELETE FROM leases WHERE id = ?').run(leaseId)
    return result.changes > 0
  })

  return removeTx(id)
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
