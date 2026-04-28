import { getDb } from '../database'

type DpeValue = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export interface PropertyDiagnostics {
  id: number
  property_id: number
  dpe_class: DpeValue | null
  dpe_ges_class: DpeValue | null
  dpe_performed_at: string | null
  dpe_expires_at: string | null
  dpe_ademe_number: string | null
  dpe_energy_estimate: string | null
  lead_performed_at: string | null
  lead_expires_at: string | null
  gas_performed_at: string | null
  gas_expires_at: string | null
  electricity_performed_at: string | null
  electricity_expires_at: string | null
  erp_performed_at: string | null
  erp_expires_at: string | null
  noise_performed_at: string | null
  noise_expires_at: string | null
  asbestos_available: boolean
  notes: string | null
  created_at: string
  updated_at: string
  property_name: string
  property_city: string
}

export interface PropertyDiagnosticsInput {
  dpe_class?: DpeValue | null
  dpe_ges_class?: DpeValue | null
  dpe_performed_at?: string | null
  dpe_expires_at?: string | null
  dpe_ademe_number?: string | null
  dpe_energy_estimate?: string | null
  lead_performed_at?: string | null
  lead_expires_at?: string | null
  gas_performed_at?: string | null
  gas_expires_at?: string | null
  electricity_performed_at?: string | null
  electricity_expires_at?: string | null
  erp_performed_at?: string | null
  erp_expires_at?: string | null
  noise_performed_at?: string | null
  noise_expires_at?: string | null
  asbestos_available?: boolean
  notes?: string | null
}

interface PropertyDiagnosticsRow extends Omit<PropertyDiagnostics, 'asbestos_available'> {
  asbestos_available: number
}

const SELECT = `
  SELECT
    pd.*,
    p.name AS property_name,
    p.city AS property_city
  FROM property_diagnostics pd
  JOIN properties p ON p.id = pd.property_id
`

export function getAll(): PropertyDiagnostics[] {
  return (getDb()
    .prepare(`${SELECT} ORDER BY p.name ASC`)
    .all() as PropertyDiagnosticsRow[])
    .map(mapRow)
}

export function getByProperty(propertyId: number): PropertyDiagnostics | null {
  const row = getDb()
    .prepare(`${SELECT} WHERE pd.property_id = ?`)
    .get(propertyId) as PropertyDiagnosticsRow | undefined
  return row ? mapRow(row) : null
}

export function upsert(propertyId: number, data: PropertyDiagnosticsInput): PropertyDiagnostics {
  const db = getDb()
  const payload = normalizeInput(propertyId, data)
  const existing = db
    .prepare('SELECT id FROM property_diagnostics WHERE property_id = ?')
    .get(propertyId) as { id: number } | undefined

  if (existing) {
    db.prepare(`
      UPDATE property_diagnostics SET
        dpe_class=@dpe_class,
        dpe_ges_class=@dpe_ges_class,
        dpe_performed_at=@dpe_performed_at,
        dpe_expires_at=@dpe_expires_at,
        dpe_ademe_number=@dpe_ademe_number,
        dpe_energy_estimate=@dpe_energy_estimate,
        lead_performed_at=@lead_performed_at,
        lead_expires_at=@lead_expires_at,
        gas_performed_at=@gas_performed_at,
        gas_expires_at=@gas_expires_at,
        electricity_performed_at=@electricity_performed_at,
        electricity_expires_at=@electricity_expires_at,
        erp_performed_at=@erp_performed_at,
        erp_expires_at=@erp_expires_at,
        noise_performed_at=@noise_performed_at,
        noise_expires_at=@noise_expires_at,
        asbestos_available=@asbestos_available,
        notes=@notes,
        updated_at=datetime('now')
      WHERE property_id=@property_id
    `).run(payload)
  } else {
    db.prepare(`
      INSERT INTO property_diagnostics (
        property_id,
        dpe_class,
        dpe_ges_class,
        dpe_performed_at,
        dpe_expires_at,
        dpe_ademe_number,
        dpe_energy_estimate,
        lead_performed_at,
        lead_expires_at,
        gas_performed_at,
        gas_expires_at,
        electricity_performed_at,
        electricity_expires_at,
        erp_performed_at,
        erp_expires_at,
        noise_performed_at,
        noise_expires_at,
        asbestos_available,
        notes
      ) VALUES (
        @property_id,
        @dpe_class,
        @dpe_ges_class,
        @dpe_performed_at,
        @dpe_expires_at,
        @dpe_ademe_number,
        @dpe_energy_estimate,
        @lead_performed_at,
        @lead_expires_at,
        @gas_performed_at,
        @gas_expires_at,
        @electricity_performed_at,
        @electricity_expires_at,
        @erp_performed_at,
        @erp_expires_at,
        @noise_performed_at,
        @noise_expires_at,
        @asbestos_available,
        @notes
      )
    `).run(payload)
  }

  const saved = getByProperty(propertyId)
  if (!saved) throw new Error('Diagnostic introuvable apres enregistrement.')
  return saved
}

function nullableText(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function normalizeDpeClass(value: DpeValue | null | undefined): DpeValue | null {
  const normalized = nullableText(value)?.toUpperCase()
  return normalized && isDpeValue(normalized) ? normalized : null
}

function isDpeValue(value: string): value is DpeValue {
  return ['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(value)
}

function normalizeInput(propertyId: number, data: PropertyDiagnosticsInput) {
  return {
    property_id: propertyId,
    dpe_class: normalizeDpeClass(data.dpe_class),
    dpe_ges_class: normalizeDpeClass(data.dpe_ges_class),
    dpe_performed_at: data.dpe_performed_at ?? null,
    dpe_expires_at: data.dpe_expires_at ?? null,
    dpe_ademe_number: nullableText(data.dpe_ademe_number),
    dpe_energy_estimate: nullableText(data.dpe_energy_estimate),
    lead_performed_at: data.lead_performed_at ?? null,
    lead_expires_at: data.lead_expires_at ?? null,
    gas_performed_at: data.gas_performed_at ?? null,
    gas_expires_at: data.gas_expires_at ?? null,
    electricity_performed_at: data.electricity_performed_at ?? null,
    electricity_expires_at: data.electricity_expires_at ?? null,
    erp_performed_at: data.erp_performed_at ?? null,
    erp_expires_at: data.erp_expires_at ?? null,
    noise_performed_at: data.noise_performed_at ?? null,
    noise_expires_at: data.noise_expires_at ?? null,
    asbestos_available: data.asbestos_available ? 1 : 0,
    notes: nullableText(data.notes),
  }
}

function mapRow(row: PropertyDiagnosticsRow): PropertyDiagnostics {
  return {
    ...row,
    asbestos_available: Boolean(row.asbestos_available),
  }
}
