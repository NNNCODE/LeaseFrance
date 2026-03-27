import { getDb } from '../database'
import { seedIrlIndices } from '../irlSeed'

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

export function seedIfEmpty(): void {
  seedIrlIndices(getDb())
}
