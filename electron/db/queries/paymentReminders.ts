import { getDb } from '../database'

export interface PaymentReminder {
  id: number
  payment_id: number
  stage: 'relance_amiable' | 'mise_en_demeure' | 'proposition_echeancier'
  sent_at: string
  notes: string | null
  created_at: string
  // Joined
  lease_id: number
  property_name: string
  tenant_first_name: string
  tenant_last_name: string
  period_month: number
  period_year: number
}

export interface PaymentReminderInput {
  payment_id: number
  stage: string
  sent_at: string
  notes?: string | null
}

const SELECT = `
  SELECT
    pr.*,
    pay.lease_id,
    pay.period_month,
    pay.period_year,
    p.name       AS property_name,
    t.first_name AS tenant_first_name,
    t.last_name  AS tenant_last_name
  FROM payment_reminders pr
  JOIN payments   pay ON pay.id = pr.payment_id
  JOIN leases     l   ON l.id = pay.lease_id
  JOIN properties p   ON p.id = l.property_id
  JOIN tenants    t   ON t.id = l.tenant_id
`

export function getByPayment(paymentId: number): PaymentReminder[] {
  return getDb()
    .prepare(`${SELECT} WHERE pr.payment_id = ? ORDER BY pr.sent_at DESC, pr.created_at DESC`)
    .all(paymentId) as PaymentReminder[]
}

export function getById(id: number): PaymentReminder | undefined {
  return getDb()
    .prepare(`${SELECT} WHERE pr.id = ?`)
    .get(id) as PaymentReminder | undefined
}

export function create(data: PaymentReminderInput): PaymentReminder {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO payment_reminders
      (payment_id, stage, sent_at, notes)
    VALUES
      (@payment_id, @stage, @sent_at, @notes)
  `).run({
    ...data,
    notes: data.notes ?? null,
  })

  return getById(result.lastInsertRowid as number)!
}
