import { getDb } from '../database'

export interface IrlIndex {
  id: number
  year: number
  quarter: number
  value: number
  published_at: string | null
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function getAll(): IrlIndex[] {
  return getDb()
    .prepare('SELECT * FROM irl_indices ORDER BY year DESC, quarter DESC')
    .all() as IrlIndex[]
}

export function getByQuarter(year: number, quarter: number): IrlIndex | undefined {
  return getDb()
    .prepare('SELECT * FROM irl_indices WHERE year = ? AND quarter = ?')
    .get(year, quarter) as IrlIndex | undefined
}

export function getLatestForQuarter(quarter: number): IrlIndex | undefined {
  return getDb()
    .prepare('SELECT * FROM irl_indices WHERE quarter = ? ORDER BY year DESC LIMIT 1')
    .get(quarter) as IrlIndex | undefined
}

export function upsert(year: number, quarter: number, value: number): IrlIndex {
  const db = getDb()
  db.prepare(`
    INSERT INTO irl_indices (year, quarter, value, published_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(year, quarter) DO UPDATE SET value = excluded.value, published_at = excluded.published_at
  `).run(year, quarter, value)
  return getByQuarter(year, quarter)!
}

export function remove(id: number): boolean {
  return getDb().prepare('DELETE FROM irl_indices WHERE id = ?').run(id).changes > 0
}

// ── Seed ─────────────────────────────────────────────────────────────────────
// Données IRL réelles publiées par l'INSEE
// Source : https://www.insee.fr/fr/statistiques/serie/001515333

const SEED_DATA: [number, number, number][] = [
  // [year, quarter, value]
  [2022, 1, 133.93],
  [2022, 2, 135.84],
  [2022, 3, 136.27],
  [2022, 4, 137.26],
  [2023, 1, 138.61],
  [2023, 2, 140.59],
  [2023, 3, 141.03],
  [2023, 4, 142.06],
  [2024, 1, 143.46],
  [2024, 2, 144.44],
  [2024, 3, 144.51],
  [2024, 4, 145.17],
  [2025, 1, 145.40],
]

export function seedIfEmpty(): void {
  const db = getDb()
  const count = (db.prepare('SELECT COUNT(*) as n FROM irl_indices').get() as { n: number }).n
  if (count > 0) return

  const insert = db.prepare(
    'INSERT OR IGNORE INTO irl_indices (year, quarter, value) VALUES (?, ?, ?)'
  )
  const tx = db.transaction(() => {
    for (const [year, quarter, value] of SEED_DATA) {
      insert.run(year, quarter, value)
    }
  })
  tx()
}
