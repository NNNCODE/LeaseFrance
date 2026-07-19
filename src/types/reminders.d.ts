interface ManualReminder {
  id: number
  lease_id: number | null
  title: string
  category: 'insurance' | 'diagnostic' | 'tax' | 'custom'
  due_date: string
  notes: string | null
  status: 'pending' | 'done'
  created_at: string
  property_name: string | null
  tenant_first_name: string | null
  tenant_last_name: string | null
}

interface ManualReminderInput {
  lease_id?: number | null
  title: string
  category: string
  due_date: string
  notes?: string | null
  status?: string
}

interface ReminderFeedItem {
  id: string
  source: 'derived' | 'manual'
  title: string
  category: string
  due_date: string
  notes: string | null
  lease_id: number | null
  property_id?: number | null
  property_name: string | null
  tenant_label: string | null
  status: 'pending' | 'done'
  derived_kind?: 'lease_end' | 'irl_revision' | 'diagnostic_expiry'
}

interface ReminderFeedStats {
  overdue: number
  upcoming30: number
  manualPending: number
  completed: number
}

interface ReminderFeed {
  pendingItems: ReminderFeedItem[]
  completedManual: ReminderFeedItem[]
  manualReminders: ManualReminder[]
  stats: ReminderFeedStats
}
