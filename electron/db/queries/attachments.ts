import { getDb } from '../database'

export interface Attachment {
  id: number
  entity_type: string   // 'tenant' | 'lease' | 'inspection' | 'property'
  entity_id: number
  slot: string | null    // e.g. 'id_document', 'income_proof', or null for general
  file_name: string
  mime_type: string
  file_size: number
  stored_name: string
  created_at: string
}

export interface AttachmentInput {
  entity_type: string
  entity_id: number
  slot?: string | null
  file_name: string
  mime_type: string
  file_size: number
  stored_name: string
}

export function getByEntity(entityType: string, entityId: number): Attachment[] {
  return getDb()
    .prepare('SELECT * FROM attachments WHERE entity_type = ? AND entity_id = ? ORDER BY slot, created_at DESC')
    .all(entityType, entityId) as Attachment[]
}

export function getAll(): Attachment[] {
  return getDb()
    .prepare('SELECT * FROM attachments ORDER BY created_at DESC')
    .all() as Attachment[]
}

export function getById(id: number): Attachment | undefined {
  return getDb()
    .prepare('SELECT * FROM attachments WHERE id = ?')
    .get(id) as Attachment | undefined
}

export function create(data: AttachmentInput): Attachment {
  const result = getDb().prepare(`
    INSERT INTO attachments (entity_type, entity_id, slot, file_name, mime_type, file_size, stored_name)
    VALUES (@entity_type, @entity_id, @slot, @file_name, @mime_type, @file_size, @stored_name)
  `).run({
    ...data,
    slot: data.slot ?? null,
  })
  return getById(result.lastInsertRowid as number)!
}

export function remove(id: number): Attachment | undefined {
  const attachment = getById(id)
  if (!attachment) return undefined
  getDb().prepare('DELETE FROM attachments WHERE id = ?').run(id)
  return attachment
}

export function removeByEntity(entityType: string, entityId: number): Attachment[] {
  const attachments = getByEntity(entityType, entityId)
  if (attachments.length > 0) {
    getDb().prepare('DELETE FROM attachments WHERE entity_type = ? AND entity_id = ?').run(entityType, entityId)
  }
  return attachments
}
