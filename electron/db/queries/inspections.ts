import { getDb } from '../database'

export interface InspectionRoom {
  area: string
  condition: string
  notes: string
}

export interface Inspection {
  id: number
  lease_id: number
  kind: 'entry' | 'exit'
  inspection_date: string
  meter_readings: string | null
  general_condition: string | null
  notes: string | null
  rooms: InspectionRoom[]
  created_at: string
  // Joined
  property_name: string
  property_address: string
  property_city: string
  property_zip: string
  tenant_first_name: string
  tenant_last_name: string
  lease_start_date: string
  lease_end_date: string | null
}

export interface InspectionInput {
  lease_id: number
  kind: 'entry' | 'exit'
  inspection_date: string
  meter_readings?: string | null
  general_condition?: string | null
  notes?: string | null
  rooms: InspectionRoom[]
}

const SELECT = `
  SELECT
    i.id,
    i.lease_id,
    i.kind,
    i.inspection_date,
    i.meter_readings,
    i.general_condition,
    i.notes,
    i.rooms_json,
    i.created_at,
    p.name       AS property_name,
    p.address    AS property_address,
    p.city       AS property_city,
    p.zip        AS property_zip,
    t.first_name AS tenant_first_name,
    t.last_name  AS tenant_last_name,
    l.start_date AS lease_start_date,
    l.end_date   AS lease_end_date
  FROM inspections i
  JOIN leases     l ON l.id = i.lease_id
  JOIN properties p ON p.id = l.property_id
  JOIN tenants    t ON t.id = l.tenant_id
`

type InspectionRow = Omit<Inspection, 'rooms'> & { rooms_json: string }

function mapRow(row: InspectionRow): Inspection {
  return {
    ...row,
    rooms: JSON.parse(row.rooms_json || '[]') as InspectionRoom[],
  }
}

export function getAll(): Inspection[] {
  const rows = getDb()
    .prepare(`${SELECT} ORDER BY i.inspection_date DESC, i.created_at DESC`)
    .all() as InspectionRow[]
  return rows.map(mapRow)
}

export function getById(id: number): Inspection | undefined {
  const row = getDb()
    .prepare(`${SELECT} WHERE i.id = ?`)
    .get(id) as InspectionRow | undefined
  return row ? mapRow(row) : undefined
}

export function create(data: InspectionInput): Inspection {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO inspections
      (lease_id, kind, inspection_date, meter_readings, general_condition, notes, rooms_json)
    VALUES
      (@lease_id, @kind, @inspection_date, @meter_readings, @general_condition, @notes, @rooms_json)
  `).run({
    ...data,
    meter_readings: data.meter_readings ?? null,
    general_condition: data.general_condition ?? null,
    notes: data.notes ?? null,
    rooms_json: JSON.stringify(data.rooms ?? []),
  })

  return getById(result.lastInsertRowid as number)!
}

export function update(id: number, data: InspectionInput): Inspection | undefined {
  getDb().prepare(`
    UPDATE inspections SET
      lease_id=@lease_id,
      kind=@kind,
      inspection_date=@inspection_date,
      meter_readings=@meter_readings,
      general_condition=@general_condition,
      notes=@notes,
      rooms_json=@rooms_json
    WHERE id=@id
  `).run({
    ...data,
    meter_readings: data.meter_readings ?? null,
    general_condition: data.general_condition ?? null,
    notes: data.notes ?? null,
    rooms_json: JSON.stringify(data.rooms ?? []),
    id,
  })

  return getById(id)
}

export function remove(id: number): boolean {
  return getDb().prepare('DELETE FROM inspections WHERE id = ?').run(id).changes > 0
}
