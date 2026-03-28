import type Database from 'better-sqlite3'

export function up(db: Database.Database): void {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_leases_status_tenant
    ON leases(status, tenant_id);

    CREATE INDEX IF NOT EXISTS idx_payments_lease_status
    ON payments(lease_id, status);

    CREATE INDEX IF NOT EXISTS idx_payments_status_period
    ON payments(status, period_year, period_month);

    CREATE INDEX IF NOT EXISTS idx_payment_reminders_payment_sent_created
    ON payment_reminders(payment_id, sent_at, created_at);

    CREATE INDEX IF NOT EXISTS idx_inspections_date_created
    ON inspections(inspection_date, created_at);

    CREATE INDEX IF NOT EXISTS idx_manual_reminders_status_due_created
    ON manual_reminders(status, due_date, created_at);

    CREATE INDEX IF NOT EXISTS idx_fiscal_expenses_year_property_category_created
    ON fiscal_expenses(year, property_id, category, created_at);

    CREATE INDEX IF NOT EXISTS idx_attachments_entity_slot_created
    ON attachments(entity_type, entity_id, slot, created_at);

    CREATE INDEX IF NOT EXISTS idx_documents_generated_at
    ON documents(generated_at);
  `)
}
