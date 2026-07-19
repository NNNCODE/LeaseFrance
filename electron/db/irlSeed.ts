import Database from 'better-sqlite3'

// INSEE series 001515333, general France IRL values.
// Source: https://www.insee.fr/fr/statistiques/serie/001515333
const SEED_DATA: [number, number, number][] = [
  [2022, 1, 133.93],
  [2022, 2, 135.84],
  [2022, 3, 136.27],
  [2022, 4, 137.26],
  [2023, 1, 138.61],
  [2023, 2, 140.59],
  [2023, 3, 141.03],
  [2023, 4, 142.06],
  [2024, 1, 143.46],
  [2024, 2, 145.17],
  [2024, 3, 144.51],
  [2024, 4, 144.64],
  [2025, 1, 145.47],
  [2025, 2, 146.68],
  [2025, 3, 145.77],
  [2025, 4, 145.78],
  [2026, 1, 146.6],
]

export function seedIrlIndices(db: Database.Database): void {
  const insert = db.prepare(
    `
      INSERT INTO irl_indices (year, quarter, value) VALUES (?, ?, ?)
      ON CONFLICT(year, quarter) DO UPDATE SET value = excluded.value
      WHERE irl_indices.published_at IS NULL
    `,
  )
  const tx = db.transaction(() => {
    for (const [year, quarter, value] of SEED_DATA) {
      insert.run(year, quarter, value)
    }
  })
  tx()
}

// Backwards-compatible alias while older callers/tests are still updated.
export function seedIrlIndicesIfEmpty(db: Database.Database): void {
  seedIrlIndices(db)
}
