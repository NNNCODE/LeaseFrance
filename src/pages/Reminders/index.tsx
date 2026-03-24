import { useMemo, useEffect, useState } from 'react'
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
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { getRelevantAnniversaryDate, isAnniversaryWithinDays, isRevisionEligible } from '@/lib/irl'
import ManualReminderModal from './ManualReminderModal'

interface ReminderItem {
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

const MANUAL_CATEGORY_META: Record<string, { label: string; icon: React.ElementType }> = {
  insurance: { label: 'Assurance', icon: ShieldCheck },
  diagnostic: { label: 'Diagnostic', icon: FileText },
  tax: { label: 'Taxe / impots', icon: FileText },
  custom: { label: 'Libre', icon: BellRing },
}

function toIsoDate(value: Date) {
  return value.toISOString().split('T')[0]
}

function daysUntil(date: string) {
  const target = new Date(date)
  const now = new Date()
  target.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function timingMeta(dueDate: string) {
  const days = daysUntil(dueDate)
  if (days < 0) return { label: `En retard de ${Math.abs(days)} j`, variant: 'danger' as const }
  if (days === 0) return { label: "Aujourd'hui", variant: 'warning' as const }
  if (days <= 7) return { label: `Dans ${days} j`, variant: 'warning' as const }
  if (days <= 30) return { label: `Dans ${days} j`, variant: 'default' as const }
  return { label: `Dans ${days} j`, variant: 'muted' as const }
}

function categoryMeta(item: ReminderItem) {
  if (item.source === 'derived') {
    return item.derived_kind === 'irl_revision'
      ? { label: 'IRL', icon: TrendingUp }
      : { label: 'Bail', icon: CalendarClock }
  }

  return MANUAL_CATEGORY_META[item.category] ?? MANUAL_CATEGORY_META.custom
}

function buildDerivedReminders(leases: Lease[]): ReminderItem[] {
  const reminders: ReminderItem[] = []

  for (const lease of leases) {
    if (lease.status !== 'active') continue

    if (lease.end_date) {
      const due = daysUntil(lease.end_date)
      if (due >= -30 && due <= 120) {
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
      isRevisionEligible(lease.type, lease.start_date, lease.irl_reference_index, lease.irl_reference_quarter) &&
      isAnniversaryWithinDays(lease.start_date, 60)
    ) {
      const anniversary = getRelevantAnniversaryDate(lease.start_date)
      reminders.push({
        id: `irl-${lease.id}`,
        source: 'derived',
        title: 'Revision IRL possible',
        category: 'irl_revision',
        due_date: toIsoDate(anniversary),
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

function normalizeManual(reminders: ManualReminder[]): ReminderItem[] {
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

export default function Reminders() {
  const navigate = useNavigate()
  const [leases, setLeases] = useState<Lease[]>([])
  const [manualReminders, setManualReminders] = useState<ManualReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<ManualReminder | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<ManualReminder | null>(null)

  async function load() {
    setLoading(true)
    setError('')

    try {
      const [leaseRows, manualRows] = await Promise.all([
        window.api.leases.getAll(),
        window.api.manualReminders.getAll(),
      ])
      setLeases(leaseRows)
      setManualReminders(manualRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const derived = useMemo(() => buildDerivedReminders(leases), [leases])
  const normalizedManual = useMemo(() => normalizeManual(manualReminders), [manualReminders])
  const pendingItems = useMemo(
    () => [...derived, ...normalizedManual.filter((item) => item.status === 'pending')]
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    [derived, normalizedManual]
  )
  const completedManual = useMemo(
    () => normalizedManual.filter((item) => item.status === 'done')
      .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()),
    [normalizedManual]
  )

  const stats = useMemo(() => ({
    overdue: pendingItems.filter((item) => daysUntil(item.due_date) < 0).length,
    upcoming30: pendingItems.filter((item) => {
      const days = daysUntil(item.due_date)
      return days >= 0 && days <= 30
    }).length,
    manualPending: normalizedManual.filter((item) => item.status === 'pending').length,
    completed: completedManual.length,
  }), [completedManual.length, normalizedManual, pendingItems])

  function openCreate() {
    setEditing(null)
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
          <h1 className="text-2xl font-semibold text-textPrimary">Echeances & rappels</h1>
          <p className="text-sm text-textMuted mt-1">
            Centralisez les rappels derives des baux et vos rappels manuels.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nouveau rappel
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="En retard" value={stats.overdue} icon={AlertTriangle} tone="danger" />
        <StatCard label="Dans 30 jours" value={stats.upcoming30} icon={CalendarClock} tone="warning" />
        <StatCard label="Manuels ouverts" value={stats.manualPending} icon={BellRing} tone="primary" />
        <StatCard label="Termines" value={stats.completed} icon={CheckCircle2} tone="success" />
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-textPrimary">A traiter</h2>
              <p className="text-sm text-textMuted mt-1">Rappels derives automatiquement et rappels manuels encore ouverts.</p>
            </div>
            <Badge variant="muted">{pendingItems.length} element{pendingItems.length !== 1 ? 's' : ''}</Badge>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((index) => (
                <div key={index} className="h-20 rounded-2xl border border-border bg-surfaceHigh/20 animate-pulse" />
              ))}
            </div>
          ) : pendingItems.length === 0 ? (
            <EmptyState
              title='Aucune echeance imminente'
              description='Ajoutez un rappel manuel ou laissez l application vous signaler les fins de bail et revisions IRL.'
            />
          ) : (
            <motion.div
              className="flex flex-col gap-3"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
            >
              {pendingItems.map((item) => (
                <ReminderRow
                  key={item.id}
                  item={item}
                  onOpenLease={() => item.lease_id && navigate('/leases')}
                  onEdit={() => {
                    if (item.source !== 'manual') return
                    const reminder = manualReminders.find((entry) => entry.id === Number(item.id.replace('manual-', '')))
                    if (reminder) {
                      setEditing(reminder)
                      setShowForm(true)
                    }
                  }}
                  onToggleDone={() => {
                    if (item.source !== 'manual') return
                    const reminder = manualReminders.find((entry) => entry.id === Number(item.id.replace('manual-', '')))
                    if (reminder) handleStatusChange(reminder, 'done')
                  }}
                  onDelete={() => {
                    if (item.source !== 'manual') return
                    const reminder = manualReminders.find((entry) => entry.id === Number(item.id.replace('manual-', '')))
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
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-textPrimary">Rappels manuels termines</h2>
              <p className="text-sm text-textMuted mt-1">Historique des rappels clos ou deja traites.</p>
            </div>
            <Badge variant="muted">{completedManual.length}</Badge>
          </div>

          {completedManual.length === 0 ? (
            <EmptyState
              title='Aucun rappel termine'
              description='Les rappels que vous marquez comme faits apparaitront ici.'
            />
          ) : (
            <div className="flex flex-col gap-3">
              {completedManual.map((item) => {
                const reminder = manualReminders.find((entry) => entry.id === Number(item.id.replace('manual-', '')))
                if (!reminder) return null

                return (
                  <ReminderRow
                    key={item.id}
                    item={item}
                    onOpenLease={() => item.lease_id && navigate('/leases')}
                    onEdit={() => {
                      setEditing(reminder)
                      setShowForm(true)
                    }}
                    onToggleDone={() => handleStatusChange(reminder, 'pending')}
                    onDelete={() => setDeleting(reminder)}
                  />
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {showForm && (
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
  item: ReminderItem
  onOpenLease: () => void
  onEdit: () => void
  onToggleDone: () => void
  onDelete: () => void
}) {
  const timing = timingMeta(item.due_date)
  const category = categoryMeta(item)
  const CategoryIcon = category.icon

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
              <p className="text-sm font-semibold text-textPrimary">{item.title}</p>
              <Badge variant={timing.variant}>{timing.label}</Badge>
              <Badge variant={item.source === 'derived' ? 'muted' : 'default'}>
                {item.source === 'derived' ? 'Automatique' : 'Manuel'}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-textMuted">
              <div className="flex items-center gap-1.5">
                <CategoryIcon className="w-3.5 h-3.5" />
                <span>{category.label}</span>
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

            {item.notes ? (
              <p className="text-xs text-textMuted mt-3 leading-5">{item.notes}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {item.lease_id ? (
              <button
                onClick={onOpenLease}
                title="Ouvrir le bail"
                className="p-1.5 rounded-lg hover:bg-primary/10 text-textMuted hover:text-primary transition-colors"
              >
                <CalendarClock className="w-4 h-4" />
              </button>
            ) : null}
            {item.source === 'manual' ? (
              <>
                <button
                  onClick={onToggleDone}
                  title={item.status === 'done' ? 'Reouvrir' : 'Marquer comme fait'}
                  className="p-1.5 rounded-lg hover:bg-success/10 text-textMuted hover:text-success transition-colors"
                >
                  {item.status === 'done' ? <RotateCcw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={onEdit}
                  title="Modifier"
                  className="p-1.5 rounded-lg hover:bg-surfaceHigh text-textMuted hover:text-textPrimary transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={onDelete}
                  title="Supprimer"
                  className="p-1.5 rounded-lg hover:bg-danger/10 text-textMuted hover:text-danger transition-colors"
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
      <BellRing className="w-7 h-7 text-textMuted mx-auto" />
      <p className="text-sm font-semibold text-textPrimary mt-3">{title}</p>
      <p className="text-xs text-textMuted mt-1">{description}</p>
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
        className="w-full max-w-sm bg-surface border border-danger/30 rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-danger/10 shrink-0">
            <Trash2 className="w-5 h-5 text-danger" />
          </div>
          <div>
            <p className="text-sm font-semibold text-textPrimary">Supprimer ce rappel ?</p>
            <p className="text-xs text-textMuted mt-1">{reminder.title} · {formatDate(reminder.due_date)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Annuler</Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1">
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
