import { useEffect, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import ManualReminderModal from './ManualReminderModal'

const MANUAL_CATEGORY_META: Record<string, { labelKey: string; icon: React.ElementType }> = {
  insurance: { labelKey: 'reminders.category.insurance', icon: ShieldCheck },
  diagnostic: { labelKey: 'reminders.category.diagnostic', icon: FileText },
  tax: { labelKey: 'reminders.category.tax', icon: FileText },
  custom: { labelKey: 'reminders.category.custom', icon: BellRing },
}

const EMPTY_FEED: ReminderFeed = {
  pendingItems: [],
  completedManual: [],
  manualReminders: [],
  stats: {
    overdue: 0,
    upcoming30: 0,
    manualPending: 0,
    completed: 0,
  },
}

function daysUntil(date: string) {
  const target = new Date(date)
  const now = new Date()
  target.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function timingMeta(dueDate: string, t: TFunction) {
  const days = daysUntil(dueDate)
  if (days < 0) return { label: t('reminders.overdue', { days: Math.abs(days) }), variant: 'danger' as const }
  if (days === 0) return { label: t('reminders.dueToday'), variant: 'warning' as const }
  if (days <= 7) return { label: t('reminders.dueInDays', { days }), variant: 'warning' as const }
  if (days <= 30) return { label: t('reminders.dueInDays', { days }), variant: 'default' as const }
  return { label: t('reminders.dueInDays', { days }), variant: 'muted' as const }
}

function categoryMeta(item: ReminderFeedItem) {
  if (item.source === 'derived') {
    return item.derived_kind === 'irl_revision'
      ? { labelKey: 'reminders.category.irl', icon: TrendingUp }
      : { labelKey: 'reminders.category.lease', icon: CalendarClock }
  }

  return MANUAL_CATEGORY_META[item.category] ?? MANUAL_CATEGORY_META.custom
}

function extractIrlQuarter(notes: string | null) {
  if (!notes) return null
  const match = notes.match(/(\d{4}-T[1-4])/i)
  return match?.[1] ?? null
}

function displayReminderTitle(item: ReminderFeedItem, t: TFunction) {
  if (item.source !== 'derived') return item.title

  if (item.derived_kind === 'irl_revision') {
    return t('reminders.derived.irlRevisionTitle')
  }

  if (item.derived_kind === 'lease_end') {
    return t('reminders.derived.leaseEndTitle')
  }

  return item.title
}

function displayReminderNotes(item: ReminderFeedItem, t: TFunction) {
  if (item.source !== 'derived') return item.notes

  if (item.derived_kind === 'irl_revision') {
    const quarter = extractIrlQuarter(item.notes)
    return quarter
      ? t('reminders.derived.irlRevisionDescWithQuarter', { quarter })
      : t('reminders.derived.irlRevisionDesc')
  }

  if (item.derived_kind === 'lease_end') {
    return t('reminders.derived.leaseEndDesc')
  }

  return item.notes
}

export default function Reminders() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [leases, setLeases] = useState<Lease[]>([])
  const [leasesLoaded, setLeasesLoaded] = useState(false)
  const [feed, setFeed] = useState<ReminderFeed>(EMPTY_FEED)
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<ManualReminder | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<ManualReminder | null>(null)

  async function load() {
    setLoading(true)
    setError('')

    try {
      setFeed(await window.api.reminders.getFeed())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function ensureLeases() {
    if (leasesLoaded) return true

    setFormLoading(true)
    setError('')
    try {
      setLeases(await window.api.leases.getAll())
      setLeasesLoaded(true)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    } finally {
      setFormLoading(false)
    }
  }

  function findManualReminder(itemId: string) {
    return feed.manualReminders.find((entry) => entry.id === Number(itemId.replace('manual-', ''))) ?? null
  }

  async function openCreate() {
    const ready = await ensureLeases()
    if (!ready) return
    setEditing(null)
    setShowForm(true)
  }

  async function openEdit(reminder: ManualReminder) {
    const ready = await ensureLeases()
    if (!ready) return
    setEditing(reminder)
    setShowForm(true)
  }

  async function handleSave(data: ManualReminderInput) {
    if (editing) {
      await window.api.manualReminders.update(editing.id, data)
    } else {
      await window.api.manualReminders.create(data)
    }
    setShowForm(false)
    setEditing(null)
    await load()
  }

  async function handleStatusChange(reminder: ManualReminder, status: 'pending' | 'done') {
    await window.api.manualReminders.update(reminder.id, {
      lease_id: reminder.lease_id,
      title: reminder.title,
      category: reminder.category,
      due_date: reminder.due_date,
      notes: reminder.notes,
      status,
    })
    await load()
  }

  async function handleDelete() {
    if (!deleting) return
    await window.api.manualReminders.delete(deleting.id)
    setDeleting(null)
    await load()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">{t('reminders.title')}</h1>
          <p className="mt-1 text-sm text-textMuted">{t('reminders.subtitle')}</p>
        </div>
        <Button onClick={() => { void openCreate() }} disabled={formLoading}>
          <Plus className="w-4 h-4" />
          {formLoading ? t('common.loading') : t('reminders.add')}
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-4">
        <StatCard label={t('reminders.stats.overdue')} value={feed.stats.overdue} icon={AlertTriangle} tone="danger" />
        <StatCard label={t('reminders.stats.upcoming')} value={feed.stats.upcoming30} icon={CalendarClock} tone="warning" />
        <StatCard label={t('reminders.stats.pending')} value={feed.stats.manualPending} icon={BellRing} tone="primary" />
        <StatCard label={t('reminders.stats.done')} value={feed.stats.completed} icon={CheckCircle2} tone="success" />
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-textPrimary">{t('reminders.pendingTitle')}</h2>
              <p className="mt-1 text-sm text-textMuted">{t('reminders.pendingDesc')}</p>
            </div>
            <Badge variant="muted">{t('reminders.itemCount', { count: feed.pendingItems.length })}</Badge>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((index) => (
                <div key={index} className="h-20 rounded-2xl border border-border bg-surfaceHigh/20 animate-pulse" />
              ))}
            </div>
          ) : feed.pendingItems.length === 0 ? (
            <EmptyState
              title={t('reminders.noPendingTitle')}
              description={t('reminders.noPendingDesc')}
            />
          ) : (
            <motion.div
              className="flex flex-col gap-3"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
            >
              {feed.pendingItems.map((item) => (
                <ReminderRow
                  key={item.id}
                  item={item}
                  onOpenLease={() => item.lease_id && navigate('/leases')}
                  onEdit={() => {
                    if (item.source !== 'manual') return
                    const reminder = findManualReminder(item.id)
                    if (reminder) void openEdit(reminder)
                  }}
                  onToggleDone={() => {
                    if (item.source !== 'manual') return
                    const reminder = findManualReminder(item.id)
                    if (reminder) void handleStatusChange(reminder, 'done')
                  }}
                  onDelete={() => {
                    if (item.source !== 'manual') return
                    const reminder = findManualReminder(item.id)
                    if (reminder) setDeleting(reminder)
                  }}
                />
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-textPrimary">{t('reminders.completedManualTitle')}</h2>
              <p className="mt-1 text-sm text-textMuted">{t('reminders.completedManualDesc')}</p>
            </div>
            <Badge variant="muted">{t('reminders.itemCount', { count: feed.completedManual.length })}</Badge>
          </div>

          {feed.completedManual.length === 0 ? (
            <EmptyState
              title={t('reminders.noCompletedTitle')}
              description={t('reminders.noCompletedDesc')}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {feed.completedManual.map((item) => {
                const reminder = findManualReminder(item.id)
                if (!reminder) return null

                return (
                  <ReminderRow
                    key={item.id}
                    item={item}
                    onOpenLease={() => item.lease_id && navigate('/leases')}
                    onEdit={() => {
                      void openEdit(reminder)
                    }}
                    onToggleDone={() => { void handleStatusChange(reminder, 'pending') }}
                    onDelete={() => setDeleting(reminder)}
                  />
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {showForm && leasesLoaded && (
          <ManualReminderModal
            leases={leases}
            initial={editing}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditing(null) }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <DeleteModal
            reminder={deleting}
            onConfirm={handleDelete}
            onClose={() => setDeleting(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ReminderRow({
  item,
  onOpenLease,
  onEdit,
  onToggleDone,
  onDelete,
}: {
  item: ReminderFeedItem
  onOpenLease: () => void
  onEdit: () => void
  onToggleDone: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const timing = timingMeta(item.due_date, t)
  const category = categoryMeta(item)
  const CategoryIcon = category.icon
  const title = displayReminderTitle(item, t)
  const notes = displayReminderNotes(item, t)

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
      }}
    >
      <div className="rounded-2xl border border-border px-4 py-4 bg-surfaceHigh/10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-textPrimary">{title}</p>
              <Badge variant={timing.variant}>{timing.label}</Badge>
              <Badge variant={item.source === 'derived' ? 'muted' : 'default'}>
                {item.source === 'derived' ? t('reminders.sourceAutomatic') : t('reminders.sourceManual')}
              </Badge>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-textMuted">
              <div className="flex items-center gap-1.5">
                <CategoryIcon className="w-3.5 h-3.5" />
                <span>{t(category.labelKey)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock3 className="w-3.5 h-3.5" />
                <span>{formatDate(item.due_date)}</span>
              </div>
              {item.property_name ? (
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{item.property_name}</span>
                </div>
              ) : null}
              {item.tenant_label ? (
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{item.tenant_label}</span>
                </div>
              ) : null}
            </div>

            {notes ? (
              <p className="mt-3 text-xs leading-5 text-textMuted">{notes}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {item.lease_id ? (
              <button
                onClick={onOpenLease}
                title={t('reminders.openLease')}
                className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <CalendarClock className="w-4 h-4" />
              </button>
            ) : null}
            {item.source === 'manual' ? (
              <>
                <button
                  onClick={onToggleDone}
                  title={item.status === 'done' ? t('reminders.reopen') : t('reminders.markDone')}
                  className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-success/10 hover:text-success"
                >
                  {item.status === 'done' ? <RotateCcw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={onEdit}
                  title={t('common.edit')}
                  className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-surfaceHigh hover:text-textPrimary"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={onDelete}
                  title={t('common.delete')}
                  className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ElementType
  tone: 'primary' | 'success' | 'warning' | 'danger'
}) {
  const tones = {
    primary: { bg: 'bg-primary/10', text: 'text-primary' },
    success: { bg: 'bg-success/10', text: 'text-success' },
    warning: { bg: 'bg-warning/10', text: 'text-warning' },
    danger: { bg: 'bg-danger/10', text: 'text-danger' },
  }
  const style = tones[tone]

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-textMuted">{label}</p>
            <p className="text-2xl font-semibold text-textPrimary mt-1">{value}</p>
          </div>
          <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${style.bg}`}>
            <Icon className={`w-4 h-4 ${style.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surfaceHigh/10 py-12 text-center">
      <BellRing className="w-7 h-7 mx-auto text-textMuted" />
      <p className="mt-3 text-sm font-semibold text-textPrimary">{title}</p>
      <p className="mt-1 text-xs text-textMuted">{description}</p>
    </div>
  )
}

function DeleteModal({
  reminder,
  onConfirm,
  onClose,
}: {
  reminder: ManualReminder
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm rounded-2xl border border-danger/30 bg-surface p-6 shadow-2xl flex flex-col gap-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10 shrink-0">
            <Trash2 className="w-5 h-5 text-danger" />
          </div>
          <div>
            <p className="text-sm font-semibold text-textPrimary">{t('reminders.deleteTitle')}</p>
            <p className="mt-1 text-xs text-textMuted">{reminder.title} | {formatDate(reminder.due_date)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">{t('common.cancel')}</Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1">
            <Trash2 className="w-3.5 h-3.5" />
            {t('common.delete')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
