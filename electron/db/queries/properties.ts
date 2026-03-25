import { getDb } from '../database'

export interface Property {
  id: number
  name: string
  address: string
  city: string
  zip: string
  type: string
  area_m2: number | null
  created_at: string
}

export interface PropertyInput {
  name: string
  address: string
  city: string
  zip: string
  type: string
  area_m2?: number | null
}

export function getAll(): Property[] {
  return getDb().prepare('SELECT * FROM properties ORDER BY created_at DESC').all() as Property[]
}

export function getById(id: number): Property | undefined {
  return getDb().prepare('SELECT * FROM properties WHERE id = ?').get(id) as Property | undefined
}

export function create(data: PropertyInput): Property {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO properties (name, address, city, zip, type, area_m2)
    VALUES (@name, @address, @city, @zip, @type, @area_m2)
  `)
  const result = stmt.run(data)
  return getById(result.lastInsertRowid as number)!
}

export function update(id: number, data: PropertyInput): Property | undefined {
  getDb().prepare(`
    UPDATE properties SET name=@name, address=@address, city=@city,
    zip=@zip, type=@type, area_m2=@area_m2 WHERE id=@id
  `).run({ ...data, id })
  return getById(id)
}

export function remove(id: number): boolean {
  try {
    const result = getDb().prepare('DELETE FROM properties WHERE id = ?').run(id)
    return result.changes > 0
  } catch (err) {
    if (err instanceof Error && err.message.includes('FOREIGN KEY constraint failed')) {
      throw new Error('Impossible de supprimer ce bien car un bail ou des donnees locatives y sont encore rattaches.')
    }
    throw err
  }
}

export function count(): number {
  const row = getDb().prepare('SELECT COUNT(*) as n FROM properties').get() as { n: number }
  return row.n
}
