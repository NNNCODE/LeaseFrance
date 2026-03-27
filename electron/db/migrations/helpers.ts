import type Database from 'better-sqlite3'

/** Idempotent ADD COLUMN — safe to call repeatedly. */
export function ensureColumnExists(
  db: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

/** Check whether an index already exists in the schema. */
export function indexExists(db: Database.Database, name: string): boolean {
  return !!db
    .prepare(`SELECT 1 FROM sqlite_master WHERE type='index' AND name=?`)
    .get(name)
}
