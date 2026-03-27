import { getDb } from '../database'

interface ActiveLease {
  id: number
  start_date: string
  end_date: string | null
  rent_amount: number
  charges_amount: number
  status: string
}

interface GenerateResult {
  created: number
  markedLate: number
}

/**
 * For each active lease, create pending payment records for every month
 * from lease start_date up to the current month.
 * Skips months that already have a payment record (any status).
 * Stops at lease end_date if set.
 */
export function generateMissingPayments(): GenerateResult {
  const db = getDb()
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1 // 1-12

  const leases = db.prepare(
    `SELECT id, start_date, end_date, rent_amount, charges_amount, status
     FROM leases WHERE status = 'active'`
  ).all() as ActiveLease[]

  const existingStmt = db.prepare(
    `SELECT 1 FROM payments WHERE lease_id = ? AND period_month = ? AND period_year = ?`
  )

  const insertStmt = db.prepare(`
    INSERT INTO payments
      (lease_id, period_month, period_year, rent_amount, charges_amount,
       payment_date, payment_method, status, notes)
    VALUES
      (?, ?, ?, ?, ?, NULL, 'virement', 'pending', NULL)
  `)

  let created = 0

  const runAll = db.transaction(() => {
    for (const lease of leases) {
      const start = parseYearMonth(lease.start_date)
      const end = lease.end_date ? parseYearMonth(lease.end_date) : { year: curYear, month: curMonth }

      // Cap at current month
      const limit = ymMin(end, { year: curYear, month: curMonth })

      let ym = { ...start }
      while (ymLe(ym, limit)) {
        const exists = existingStmt.get(lease.id, ym.month, ym.year)
        if (!exists) {
          insertStmt.run(lease.id, ym.month, ym.year, lease.rent_amount, lease.charges_amount)
          created++
        }
        ym = ymNext(ym)
      }
    }
  })
  runAll()

  // Also mark overdue
  const markedLate = markOverduePayments()

  return { created, markedLate }
}

/**
 * Mark pending payments as 'late' when their period is before the current month.
 * A payment for month M/Y is considered overdue once we are in month M+1
 * (i.e. the due month has fully elapsed).
 */
export function markOverduePayments(): number {
  const db = getDb()
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1

  const result = db.prepare(`
    UPDATE payments SET status = 'late'
    WHERE status = 'pending'
      AND (period_year < ? OR (period_year = ? AND period_month < ?))
  `).run(curYear, curYear, curMonth)

  return result.changes
}

// ── Date helpers ─────────────────────────────────────────────────────────────

interface YM { year: number; month: number }

function parseYearMonth(dateStr: string): YM {
  const [y, m] = dateStr.split('-').map(Number)
  return { year: y, month: m }
}

function ymLe(a: YM, b: YM): boolean {
  return a.year < b.year || (a.year === b.year && a.month <= b.month)
}

function ymMin(a: YM, b: YM): YM {
  return ymLe(a, b) ? a : b
}

function ymNext(ym: YM): YM {
  return ym.month === 12
    ? { year: ym.year + 1, month: 1 }
    : { year: ym.year, month: ym.month + 1 }
}
