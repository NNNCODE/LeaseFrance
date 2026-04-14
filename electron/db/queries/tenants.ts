import { getDb } from '../database'

export interface Tenant {
  id: number
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  guarantor_name: string | null
  guarantor_email: string | null
  guarantor_phone: string | null
  guarantor_address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relation: string | null
  dossier_id_document: boolean
  dossier_income_proof: boolean
  dossier_employment_proof: boolean
  dossier_tax_notice: boolean
  dossier_bank_details: boolean
  dossier_notes: string | null
  created_at: string
  updated_at: string
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
  guarantor_name?: string | null
  guarantor_email?: string | null
  guarantor_phone?: string | null
  guarantor_address?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  emergency_contact_relation?: string | null
  dossier_id_document?: boolean
  dossier_income_proof?: boolean
  dossier_employment_proof?: boolean
  dossier_tax_notice?: boolean
  dossier_bank_details?: boolean
  dossier_notes?: string | null
}

interface TenantRow extends Omit<Tenant, 'dossier_id_document' | 'dossier_income_proof' | 'dossier_employment_proof' | 'dossier_tax_notice' | 'dossier_bank_details'> {
  dossier_id_document: number
  dossier_income_proof: number
  dossier_employment_proof: number
  dossier_tax_notice: number
  dossier_bank_details: number
}

const SELECT = `
  SELECT
    t.id,
    t.first_name,
    t.last_name,
    t.email,
    t.phone,
    t.guarantor_name,
    t.guarantor_email,
    t.guarantor_phone,
    t.guarantor_address,
    t.emergency_contact_name,
    t.emergency_contact_phone,
    t.emergency_contact_relation,
    COALESCE(t.dossier_id_document, 0)      AS dossier_id_document,
    COALESCE(t.dossier_income_proof, 0)     AS dossier_income_proof,
    COALESCE(t.dossier_employment_proof, 0) AS dossier_employment_proof,
    COALESCE(t.dossier_tax_notice, 0)       AS dossier_tax_notice,
    COALESCE(t.dossier_bank_details, 0)     AS dossier_bank_details,
    t.dossier_notes,
    t.created_at,
    COALESCE(t.updated_at, t.created_at) AS updated_at,
    l.id         AS lease_id,
    l.type       AS lease_type,
    l.rent_amount,
    l.charges_amount,
    l.start_date AS lease_start_date,
    p.name       AS property_name,
    p.city       AS property_city,
    (
      SELECT COUNT(*) FROM payments pay
      WHERE pay.lease_id = l.id AND pay.status = 'late'
    ) AS unpaid_count
  FROM tenants t
  LEFT JOIN leases l     ON l.tenant_id = t.id AND l.status = 'active'
  LEFT JOIN properties p ON p.id = l.property_id
`

function mapTenantRow(row: TenantRow): Tenant {
  return {
    ...row,
    dossier_id_document: Boolean(row.dossier_id_document),
    dossier_income_proof: Boolean(row.dossier_income_proof),
    dossier_employment_proof: Boolean(row.dossier_employment_proof),
    dossier_tax_notice: Boolean(row.dossier_tax_notice),
    dossier_bank_details: Boolean(row.dossier_bank_details),
  }
}

function normalizeText(value: string | null | undefined): string | null {
  const text = value?.trim()
  return text ? text : null
}

function normalizeTenantInput(data: TenantInput, current?: Tenant) {
  return {
    first_name: data.first_name.trim(),
    last_name: data.last_name.trim(),
    email: normalizeText(data.email ?? current?.email),
    phone: normalizeText(data.phone ?? current?.phone),
    guarantor_name: normalizeText(data.guarantor_name ?? current?.guarantor_name),
    guarantor_email: normalizeText(data.guarantor_email ?? current?.guarantor_email),
    guarantor_phone: normalizeText(data.guarantor_phone ?? current?.guarantor_phone),
    guarantor_address: normalizeText(data.guarantor_address ?? current?.guarantor_address),
    emergency_contact_name: normalizeText(data.emergency_contact_name ?? current?.emergency_contact_name),
    emergency_contact_phone: normalizeText(data.emergency_contact_phone ?? current?.emergency_contact_phone),
    emergency_contact_relation: normalizeText(data.emergency_contact_relation ?? current?.emergency_contact_relation),
    dossier_id_document: (data.dossier_id_document ?? current?.dossier_id_document ?? false) ? 1 : 0,
    dossier_income_proof: (data.dossier_income_proof ?? current?.dossier_income_proof ?? false) ? 1 : 0,
    dossier_employment_proof: (data.dossier_employment_proof ?? current?.dossier_employment_proof ?? false) ? 1 : 0,
    dossier_tax_notice: (data.dossier_tax_notice ?? current?.dossier_tax_notice ?? false) ? 1 : 0,
    dossier_bank_details: (data.dossier_bank_details ?? current?.dossier_bank_details ?? false) ? 1 : 0,
    dossier_notes: normalizeText(data.dossier_notes ?? current?.dossier_notes),
  }
}

function runSelect(sql: string, params?: unknown): Tenant[] {
  const statement = getDb().prepare(sql)
  const rows = params === undefined
    ? statement.all()
    : statement.all(params)

  return (rows as TenantRow[]).map(mapTenantRow)
}

export function getAll(): Tenant[] {
  return runSelect(`${SELECT} ORDER BY t.last_name ASC, t.first_name ASC`)
}

export function getById(id: number): Tenant | undefined {
  const row = getDb()
    .prepare(`${SELECT} WHERE t.id = ?`)
    .get(id) as TenantRow | undefined

  return row ? mapTenantRow(row) : undefined
}

export function create(data: TenantInput): Tenant {
  const db = getDb()
  const payload = normalizeTenantInput(data)
  const result = db.prepare(`
    INSERT INTO tenants (
      first_name,
      last_name,
      email,
      phone,
      guarantor_name,
      guarantor_email,
      guarantor_phone,
      guarantor_address,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relation,
      dossier_id_document,
      dossier_income_proof,
      dossier_employment_proof,
      dossier_tax_notice,
      dossier_bank_details,
      dossier_notes
    )
    VALUES (
      @first_name,
      @last_name,
      @email,
      @phone,
      @guarantor_name,
      @guarantor_email,
      @guarantor_phone,
      @guarantor_address,
      @emergency_contact_name,
      @emergency_contact_phone,
      @emergency_contact_relation,
      @dossier_id_document,
      @dossier_income_proof,
      @dossier_employment_proof,
      @dossier_tax_notice,
      @dossier_bank_details,
      @dossier_notes
    )
  `).run(payload)

  return getById(result.lastInsertRowid as number)!
}

const CONFLICT_MSG = 'Les donnees ont ete modifiees depuis votre dernier chargement. Fermez le formulaire et reessayez.'

export function update(id: number, data: TenantInput, expectedUpdatedAt: string): Tenant | undefined {
  const current = getById(id)
  if (!current) return undefined

  const payload = normalizeTenantInput(data, current)

  const result = getDb().prepare(`
    UPDATE tenants SET
      first_name=@first_name,
      last_name=@last_name,
      email=@email,
      phone=@phone,
      guarantor_name=@guarantor_name,
      guarantor_email=@guarantor_email,
      guarantor_phone=@guarantor_phone,
      guarantor_address=@guarantor_address,
      emergency_contact_name=@emergency_contact_name,
      emergency_contact_phone=@emergency_contact_phone,
      emergency_contact_relation=@emergency_contact_relation,
      dossier_id_document=@dossier_id_document,
      dossier_income_proof=@dossier_income_proof,
      dossier_employment_proof=@dossier_employment_proof,
      dossier_tax_notice=@dossier_tax_notice,
      dossier_bank_details=@dossier_bank_details,
      dossier_notes=@dossier_notes,
      updated_at=datetime('now')
    WHERE id=@id AND COALESCE(updated_at, created_at)=@expected_updated_at
  `).run({ ...payload, id, expected_updated_at: expectedUpdatedAt })

  if (result.changes === 0) {
    throw new Error(CONFLICT_MSG)
  }

  return getById(id)
}

export function remove(id: number): boolean {
  try {
    const result = getDb().prepare('DELETE FROM tenants WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    if (err instanceof Error && err.message.includes('FOREIGN KEY constraint failed')) {
      throw new Error('Impossible de supprimer ce locataire car un bail ou des donnees locatives lui sont encore rattaches.')
    }
    throw err
  }
}

export function count(): number {
  const row = getDb().prepare('SELECT COUNT(*) as n FROM tenants').get() as { n: number }
  return row.n
}
