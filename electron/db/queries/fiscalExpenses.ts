import { getDb } from '../database'

export type FiscalExpenseCategory =
  | 'taxe_fonciere'
  | 'travaux'
  | 'assurance_pno'
  | 'frais_gestion'
  | 'interets_emprunt'
  | 'autre'

export interface FiscalExpense {
  id: number
  property_id: number
  year: number
  category: FiscalExpenseCategory
  label: string
  amount: number
  notes: string | null
  created_at: string
  property_name: string
  property_city: string
}

export interface FiscalExpenseInput {
  property_id: number
  year: number
  category: string
  label: string
  amount: number
  notes?: string | null
}

const SELECT = `
  SELECT
    fe.*,
    p.name AS property_name,
    p.city AS property_city
  FROM fiscal_expenses fe
  JOIN properties p ON p.id = fe.property_id
`

function getById(id: number): FiscalExpense | undefined {
  return getDb()
    .prepare(`${SELECT} WHERE fe.id = ?`)
    .get(id) as FiscalExpense | undefined
}

export function getAll(): FiscalExpense[] {
  return getDb()
    .prepare(`${SELECT} ORDER BY fe.year DESC, fe.property_id, fe.category, fe.created_at DESC`)
    .all() as FiscalExpense[]
}

export function getByYear(year: number): FiscalExpense[] {
  return getDb()
    .prepare(`${SELECT} WHERE fe.year = ? ORDER BY fe.property_id, fe.category, fe.created_at DESC`)
    .all(year) as FiscalExpense[]
}

export function create(data: FiscalExpenseInput): FiscalExpense {
  const result = getDb().prepare(`
    INSERT INTO fiscal_expenses (property_id, year, category, label, amount, notes)
    VALUES (@property_id, @year, @category, @label, @amount, @notes)
  `).run({
    ...data,
    notes: data.notes ?? null,
  })
  return getById(result.lastInsertRowid as number)!
}

export function update(id: number, data: FiscalExpenseInput): FiscalExpense | undefined {
  getDb().prepare(`
    UPDATE fiscal_expenses SET
      property_id=@property_id, year=@year, category=@category,
      label=@label, amount=@amount, notes=@notes
    WHERE id=@id
  `).run({ ...data, notes: data.notes ?? null, id })
  return getById(id)
}

export function remove(id: number): boolean {
  const result = getDb().prepare('DELETE FROM fiscal_expenses WHERE id = ?').run(id)
  return result.changes > 0
}
