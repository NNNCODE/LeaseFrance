import Database = require('better-sqlite3')

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
  [2024, 2, 144.44],
  [2024, 3, 144.51],
  [2024, 4, 145.17],
  [2025, 1, 145.4],
]

export function seedIrlIndicesIfEmpty(db: Database.Database): void {
  const count = (db.prepare('SELECT COUNT(*) as n FROM irl_indices').get() as { n: number }).n
  if (count > 0) return

  const insert = db.prepare(
    'INSERT OR IGNORE INTO irl_indices (year, quarter, value) VALUES (?, ?, ?)',
  )
  const tx = db.transaction(() => {
    for (const [year, quarter, value] of SEED_DATA) {
      insert.run(year, quarter, value)
    }
  })
  tx()
}
