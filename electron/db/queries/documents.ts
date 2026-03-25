import { getDb } from '../database'

export interface DocumentRecord {
  id: number
  lease_id: number
  type: string
  generated_at: string
  file_path: string | null
  status: string
  // Joined
  property_name: string
  property_city: string
  tenant_first_name: string
  tenant_last_name: string
}

const SELECT = `
  SELECT d.*,
    p.name       AS property_name,
    p.city       AS property_city,
    t.first_name AS tenant_first_name,
    t.last_name  AS tenant_last_name
  FROM documents d
  JOIN leases     l ON l.id = d.lease_id
  JOIN properties p ON p.id = l.property_id
  JOIN tenants    t ON t.id = l.tenant_id
`

export function getAll(): DocumentRecord[] {
  return getDb().prepare(`${SELECT} ORDER BY d.generated_at DESC`).all() as DocumentRecord[]
}

export function create(lease_id: number, type: string, file_path: string | null): DocumentRecord {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO documents (lease_id, type, file_path)
    VALUES (?, ?, ?)
  `).run(lease_id, type, file_path)

  return getAll().find((d) => d.id === result.lastInsertRowid)!
}

export function updateStatus(id: number, status: string): boolean {
  return getDb().prepare('UPDATE documents SET status = ? WHERE id = ?').run(status, id).changes > 0
}

export function remove(id: number): boolean {
  return getDb().prepare('DELETE FROM documents WHERE id = ?').run(id).changes > 0
}
