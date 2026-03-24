import { getDb } from '../database'

export interface ManualReminder {
  id: number
  lease_id: number | null
  title: string
  category: 'insurance' | 'diagnostic' | 'tax' | 'custom'
  due_date: string
  notes: string | null
  status: 'pending' | 'done'
  created_at: string
  property_name: string | null
  tenant_first_name: string | null
  tenant_last_name: string | null
}

export interface ManualReminderInput {
  lease_id?: number | null
  title: string
  category: string
  due_date: string
  notes?: string | null
  status?: string
}

const SELECT = `
  SELECT
    mr.*,
    p.name       AS property_name,
    t.first_name AS tenant_first_name,
    t.last_name  AS tenant_last_name
  FROM manual_reminders mr
  LEFT JOIN leases     l ON l.id = mr.lease_id
  LEFT JOIN properties p ON p.id = l.property_id
  LEFT JOIN tenants    t ON t.id = l.tenant_id
`

export function getAll(): ManualReminder[] {
  return getDb()
    .prepare(`${SELECT} ORDER BY mr.status ASC, mr.due_date ASC, mr.created_at DESC`)
    .all() as ManualReminder[]
}

export function getById(id: number): ManualReminder | undefined {
  return getDb()
    .prepare(`${SELECT} WHERE mr.id = ?`)
    .get(id) as ManualReminder | undefined
}

export function create(data: ManualReminderInput): ManualReminder {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO manual_reminders
      (lease_id, title, category, due_date, notes, status)
    VALUES
      (@lease_id, @title, @category, @due_date, @notes, @status)
  `).run({
    ...data,
    lease_id: data.lease_id ?? null,
    notes: data.notes ?? null,
    status: data.status ?? 'pending',
  })

  return getById(result.lastInsertRowid as number)!
}

export function update(id: number, data: ManualReminderInput): ManualReminder | undefined {
  getDb().prepare(`
    UPDATE manual_reminders SET
      lease_id=@lease_id,
      title=@title,
      category=@category,
      due_date=@due_date,
      notes=@notes,
      status=@status
    WHERE id=@id
  `).run({
    ...data,
    lease_id: data.lease_id ?? null,
    notes: data.notes ?? null,
    status: data.status ?? 'pending',
    id,
  })

  return getById(id)
}

export function remove(id: number): boolean {
  return getDb().prepare('DELETE FROM manual_reminders WHERE id = ?').run(id).changes > 0
}
