import * as leasesDb from '../db/queries/leases'
import * as manualRemindersDb from '../db/queries/manualReminders'
import { getRelevantAnniversaryDate, isAnniversaryWithinDays, isRevisionEligible } from '../../src/lib/irl'

export interface ReminderFeedItem {
  id: string
  source: 'derived' | 'manual'
  title: string
  category: string
  due_date: string
  notes: string | null
  lease_id: number | null
  property_name: string | null
  tenant_label: string | null
  status: 'pending' | 'done'
  derived_kind?: 'lease_end' | 'irl_revision'
}

export interface ReminderFeedStats {
  overdue: number
  upcoming30: number
  manualPending: number
  completed: number
}

export interface ReminderFeed {
  pendingItems: ReminderFeedItem[]
  completedManual: ReminderFeedItem[]
  manualReminders: manualRemindersDb.ManualReminder[]
  stats: ReminderFeedStats
}

function toIsoDate(value: Date): string {
  return value.toISOString().split('T')[0]
}

function daysUntil(date: string, now = new Date()): number {
  const target = new Date(date)
  const current = new Date(now)
  target.setHours(0, 0, 0, 0)
  current.setHours(0, 0, 0, 0)
  return Math.floor((target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))
}

function buildDerivedReminders(leases: leasesDb.Lease[], now = new Date()): ReminderFeedItem[] {
  const reminders: ReminderFeedItem[] = []

  for (const lease of leases) {
    if (lease.status !== 'active') continue

    if (lease.end_date) {
      const dueInDays = daysUntil(lease.end_date, now)
      if (dueInDays >= -30 && dueInDays <= 120) {
        reminders.push({
          id: `lease-end-${lease.id}`,
          source: 'derived',
          title: 'Fin du bail',
          category: 'lease_end',
          due_date: lease.end_date,
          notes: 'Le bail approche de son terme. Verifiez renouvellement, sortie ou conge.',
          lease_id: lease.id,
          property_name: lease.property_name,
          tenant_label: `${lease.tenant_first_name} ${lease.tenant_last_name}`,
          status: 'pending',
          derived_kind: 'lease_end',
        })
      }
    }

    if (
      isRevisionEligible(lease.type, lease.start_date, lease.irl_reference_index, lease.irl_reference_quarter)
      && isAnniversaryWithinDays(lease.start_date, 60)
    ) {
      reminders.push({
        id: `irl-${lease.id}`,
        source: 'derived',
        title: 'Revision IRL possible',
        category: 'irl_revision',
        due_date: toIsoDate(getRelevantAnniversaryDate(lease.start_date, now)),
        notes: lease.irl_reference_quarter
          ? `Date anniversaire du bail. Reference actuelle : ${lease.irl_reference_quarter}.`
          : 'Date anniversaire du bail pour une eventuelle revision IRL.',
        lease_id: lease.id,
        property_name: lease.property_name,
        tenant_label: `${lease.tenant_first_name} ${lease.tenant_last_name}`,
        status: 'pending',
        derived_kind: 'irl_revision',
      })
    }
  }

  return reminders
}

function normalizeManual(reminders: manualRemindersDb.ManualReminder[]): ReminderFeedItem[] {
  return reminders.map((reminder) => ({
    id: `manual-${reminder.id}`,
    source: 'manual',
    title: reminder.title,
    category: reminder.category,
    due_date: reminder.due_date,
    notes: reminder.notes,
    lease_id: reminder.lease_id,
    property_name: reminder.property_name,
    tenant_label: reminder.tenant_first_name && reminder.tenant_last_name
      ? `${reminder.tenant_first_name} ${reminder.tenant_last_name}`
      : null,
    status: reminder.status,
  }))
}

export function getReminderFeed(now = new Date()): ReminderFeed {
  const leases = leasesDb.getAll()
  const manualReminders = manualRemindersDb.getAll()

  const derived = buildDerivedReminders(leases, now)
  const normalizedManual = normalizeManual(manualReminders)

  const pendingItems = [...derived, ...normalizedManual.filter((item) => item.status === 'pending')]
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

  const completedManual = normalizedManual
    .filter((item) => item.status === 'done')
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())

  const stats: ReminderFeedStats = {
    overdue: pendingItems.filter((item) => daysUntil(item.due_date, now) < 0).length,
    upcoming30: pendingItems.filter((item) => {
      const dueInDays = daysUntil(item.due_date, now)
      return dueInDays >= 0 && dueInDays <= 30
    }).length,
    manualPending: normalizedManual.filter((item) => item.status === 'pending').length,
    completed: completedManual.length,
  }

  return {
    pendingItems,
    completedManual,
    manualReminders,
    stats,
  }
}
