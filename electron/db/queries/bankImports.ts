import { getDb } from '../database'

export interface BankImportRecord {
  id: number
  fingerprint: string
  tx_date: string
  description: string
  amount: number
  payment_id: number | null
  imported_at: string
}

export function findDuplicates(fingerprints: string[]): string[] {
  if (fingerprints.length === 0) return []
  const db = getDb()
  const placeholders = fingerprints.map(() => '?').join(',')
  const rows = db
    .prepare(`SELECT fingerprint FROM bank_imports WHERE fingerprint IN (${placeholders})`)
    .all(...fingerprints) as Array<{ fingerprint: string }>
  return rows.map((r) => r.fingerprint)
}

export function recordImported(
  entries: Array<{ fingerprint: string; tx_date: string; description: string; amount: number; payment_id: number | null }>
): void {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO bank_imports (fingerprint, tx_date, description, amount, payment_id)
    VALUES (@fingerprint, @tx_date, @description, @amount, @payment_id)
  `)
  const tx = db.transaction(() => {
    for (const entry of entries) {
      stmt.run(entry)
    }
  })
  tx()
}
