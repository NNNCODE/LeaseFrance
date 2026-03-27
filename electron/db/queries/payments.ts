import { getDb } from '../database'

export interface Payment {
  id: number
  lease_id: number
  period_month: number
  period_year: number
  rent_amount: number
  charges_amount: number
  payment_date: string | null
  payment_method: string
  status: 'pending' | 'paid' | 'late'
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  property_name: string
  property_address: string
  property_city: string
  property_zip: string
  tenant_first_name: string
  tenant_last_name: string
  lease_rent_amount: number
  lease_charges_amount: number
}

export interface PaymentInput {
  lease_id: number
  period_month: number
  period_year: number
  rent_amount: number
  charges_amount: number
  payment_date?: string | null
  payment_method?: string
  status?: string
  notes?: string | null
}

const SELECT = `
  SELECT
    pay.*,
    p.name        AS property_name,
    p.address     AS property_address,
    p.city        AS property_city,
    p.zip         AS property_zip,
    t.first_name  AS tenant_first_name,
    t.last_name   AS tenant_last_name,
    l.rent_amount    AS lease_rent_amount,
    l.charges_amount AS lease_charges_amount
  FROM payments pay
  JOIN leases     l ON l.id  = pay.lease_id
  JOIN properties p ON p.id  = l.property_id
  JOIN tenants    t ON t.id  = l.tenant_id
`

export function getAll(): Payment[] {
  return getDb()
    .prepare(`${SELECT} ORDER BY pay.period_year DESC, pay.period_month DESC, pay.created_at DESC`)
    .all() as Payment[]
}

export function getByLease(leaseId: number): Payment[] {
  return getDb()
    .prepare(`${SELECT} WHERE pay.lease_id = ? ORDER BY pay.period_year DESC, pay.period_month DESC`)
    .all(leaseId) as Payment[]
}

export function getById(id: number): Payment | undefined {
  return getDb()
    .prepare(`${SELECT} WHERE pay.id = ?`)
    .get(id) as Payment | undefined
}

export function create(data: PaymentInput): Payment {
  const db = getDb()
  try {
    const result = db.prepare(`
      INSERT INTO payments
        (lease_id, period_month, period_year, rent_amount, charges_amount,
         payment_date, payment_method, status, notes)
      VALUES
        (@lease_id, @period_month, @period_year, @rent_amount, @charges_amount,
         @payment_date, @payment_method, @status, @notes)
    `).run({
      ...data,
      payment_date:   data.payment_date   ?? null,
      payment_method: data.payment_method ?? 'virement',
      status:         data.status         ?? 'pending',
      notes:          data.notes          ?? null,
    })
    return getById(result.lastInsertRowid as number)!
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      throw new Error('Un paiement existe deja pour ce bail et cette periode. Modifiez le paiement existant.')
    }
    throw err
  }
}

const CONFLICT_MSG = 'Les donnees ont ete modifiees depuis votre dernier chargement. Fermez le formulaire et reessayez.'

export function update(id: number, data: Partial<PaymentInput>, expectedUpdatedAt: string): Payment | undefined {
  const current = getById(id)
  if (!current) return undefined
  const merged = {
    lease_id:       data.lease_id       ?? current.lease_id,
    period_month:   data.period_month   ?? current.period_month,
    period_year:    data.period_year    ?? current.period_year,
    rent_amount:    data.rent_amount    ?? current.rent_amount,
    charges_amount: data.charges_amount ?? current.charges_amount,
    payment_date:   data.payment_date   !== undefined ? data.payment_date   : current.payment_date,
    payment_method: data.payment_method ?? current.payment_method,
    status:         data.status         ?? current.status,
    notes:          data.notes          !== undefined ? data.notes           : current.notes,
  }
  const result = getDb().prepare(`
    UPDATE payments SET
      lease_id=@lease_id, period_month=@period_month, period_year=@period_year,
      rent_amount=@rent_amount, charges_amount=@charges_amount,
      payment_date=@payment_date, payment_method=@payment_method,
      status=@status, notes=@notes, updated_at=datetime('now')
    WHERE id=@id AND updated_at=@expected_updated_at
  `).run({ ...merged, id, expected_updated_at: expectedUpdatedAt })
  if (result.changes === 0) {
    throw new Error(CONFLICT_MSG)
  }
  return getById(id)
}

export function markPaid(id: number, paymentDate: string, expectedUpdatedAt: string): Payment | undefined {
  const result = getDb().prepare(
    `UPDATE payments SET status='paid', payment_date=?, updated_at=datetime('now') WHERE id=? AND updated_at=?`
  ).run(paymentDate, id, expectedUpdatedAt)
  if (result.changes === 0) {
    if (getDb().prepare('SELECT 1 FROM payments WHERE id = ?').get(id)) {
      throw new Error(CONFLICT_MSG)
    }
    return undefined
  }
  return getById(id)
}

export function remove(id: number): boolean {
  const result = getDb().prepare('DELETE FROM payments WHERE id = ?').run(id)
  return result.changes > 0
}

export function getSummary(): { total_due: number; total_paid: number; total_late: number } {
  const row = getDb().prepare(`
    SELECT
      SUM(rent_amount + charges_amount)                                         AS total_due,
      SUM(CASE WHEN status='paid' THEN rent_amount + charges_amount ELSE 0 END) AS total_paid,
      SUM(CASE WHEN status='late' THEN rent_amount + charges_amount ELSE 0 END) AS total_late
    FROM payments
  `).get() as { total_due: number; total_paid: number; total_late: number }
  return row
}
