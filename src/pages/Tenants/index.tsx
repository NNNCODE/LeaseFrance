import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Euro,
  Film,
  FileText,
  Mail,
  Pencil,
  Phone,
  Plus,
  Save,
  ScrollText,
  ShieldCheck,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAttachments, useInspections, useLeases, useTenants } from '@/hooks'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getLatestMoveInVideoByTenant } from '@/pages/Leases/leasePageUtils'
import TenantFileModal, { type TenantFileForm } from './TenantFileModal'
import TenantLedgerModal from './TenantLedgerModal'
import {
  DOSSIER_ITEMS,
  buildTenantInputFromTenant,
  getCompletedDossierCount,
  getDossierStatusVariant,
  getMissingDossierItems,
  hasGuarantor,
} from './tenantFileHelpers'

function initials(tenant: Tenant) {
  return `${tenant.first_name[0] ?? ''}${tenant.last_name[0] ?? ''}`
}

const emptyForm: TenantInput = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
}

const AVATAR_COLORS = [
  'bg-primary/20 text-primary',
  'bg-success/20 text-success',
  'bg-warning/20 text-warning',
  'bg-accent/20 text-accent',
]

const LEASE_TYPE_LABELS: Record<string, string> = {
  vide: 'tenants.leaseType.vide',
  meuble: 'tenants.leaseType.meuble',
  mobilite: 'tenants.leaseType.mobilite',
}

function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length]
}

function getTenantVersionToken(tenant: Tenant) {
  return tenant.updated_at ?? tenant.created_at
}

export default function Tenants() {
  const { t } = useTranslation()
  const tenantsQuery = useTenants()
  const leasesQuery = useLeases()
  const inspectionsQuery = useInspections()
  const attachmentsQuery = useAttachments()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Tenant | null>(null)
  const [deleting, setDeleting] = useState<Tenant | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [ledgerTenant, setLedgerTenant] = useState<Tenant | null>(null)
  const [dossierTenant, setDossierTenant] = useState<Tenant | null>(null)

  const tenants = tenantsQuery.data
  const loading = tenantsQuery.loading || leasesQuery.loading
    || inspectionsQuery.loading || attachmentsQuery.loading

  const moveInVideosByTenant = useMemo(
    () => getLatestMoveInVideoByTenant(leasesQuery.data, inspectionsQuery.data, attachmentsQuery.data),
    [leasesQuery.data, inspectionsQuery.data, attachmentsQuery.data],
  )

  function reloadAll() {
    void tenantsQuery.reload()
    void leasesQuery.reload()
    void inspectionsQuery.reload()
    void attachmentsQuery.reload()
  }

  const filtered = tenants.filter((tenant) => {
    const q = search.toLowerCase()
    return (
      tenant.first_name.toLowerCase().includes(q)
      || tenant.last_name.toLowerCase().includes(q)
      || (tenant.email ?? '').toLowerCase().includes(q)
      || (tenant.property_name ?? '').toLowerCase().includes(q)
      || (tenant.guarantor_name ?? '').toLowerCase().includes(q)
    )
  })

  const withLease = tenants.filter((tenant) => tenant.lease_id).length
  const withUnpaid = tenants.filter((tenant) => tenant.unpaid_count > 0).length
  const withIncompleteFile = tenants.filter((tenant) => getCompletedDossierCount(tenant) < DOSSIER_ITEMS.length).length
  const summaryParts = [
    t('tenants.count', { active: tenants.length }),
    withLease > 0 ? t('tenants.withLease', { count: withLease }) : null,
    withUnpaid > 0 ? t('tenants.withUnpaid', { count: withUnpaid }) : null,
    withIncompleteFile > 0 ? t('tenants.withIncompleteFile', { count: withIncompleteFile }) : null,
  ].filter(Boolean)

  function openAdd() {
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(tenant: Tenant) {
    setEditing(tenant)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  function closeDelete() {
    setDeleting(null)
    setDeleteError('')
    setDeleteLoading(false)
  }

  async function handleSave(data: TenantInput) {
    if (editing) {
      await window.api.tenants.update(editing.id, {
        ...buildTenantInputFromTenant(editing),
        ...data,
      }, getTenantVersionToken(editing))
    } else {
      await window.api.tenants.create(data)
    }

    closeForm()
    reloadAll()
  }

  async function handleSaveDossier(tenantId: number, data: TenantFileForm, expectedUpdatedAt: string) {
    const current = tenants.find((tenant) => tenant.id === tenantId) ?? dossierTenant
    if (!current) {
      throw new Error('Locataire introuvable.')
    }

    const updated = await window.api.tenants.update(tenantId, {
      ...buildTenantInputFromTenant(current),
      ...data,
    }, expectedUpdatedAt)

    tenantsQuery.setData((currentTenants) => currentTenants.map((tenant) => (
      tenant.id === updated.id ? updated : tenant
    )))
    setDossierTenant(updated)
    return updated
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await window.api.tenants.delete(deleting.id)
      closeDelete()
      reloadAll()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err))
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">{t('tenants.title')}</h1>
          <p className="text-textMuted text-sm mt-1">{summaryParts.join(' | ')}</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" />
          {t('tenants.add')}
        </Button>
      </div>

      {tenants.length > 0 && (
        <div className="relative max-w-sm">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
          <Input
            className="pl-9"
            placeholder={t('tenants.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="h-60 bg-surface border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-textMuted">
          <User className="w-8 h-8 opacity-30" />
          <p className="text-sm">{t('tenants.noResults', { query: search })}</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 gap-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {filtered.map((tenant) => {
            const moveInVideoAttachment = moveInVideosByTenant.get(tenant.id) ?? null

            return (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onEdit={() => openEdit(tenant)}
                onDelete={() => setDeleting(tenant)}
                onOpenLedger={() => setLedgerTenant(tenant)}
                onOpenDossier={() => setDossierTenant(tenant)}
                moveInVideoAttachment={moveInVideoAttachment}
                onOpenMoveInVideo={() => {
                  if (moveInVideoAttachment) void window.api.attachments.open(moveInVideoAttachment.id)
                }}
              />
            )
          })}
        </motion.div>
      )}

      <AnimatePresence>
        {showForm && (
          <TenantFormModal initial={editing} onSave={handleSave} onClose={closeForm} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <DeleteModal
            tenant={deleting}
            onConfirm={handleDelete}
            onClose={closeDelete}
            error={deleteError}
            loading={deleteLoading}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ledgerTenant && (
          <TenantLedgerModal tenant={ledgerTenant} onClose={() => setLedgerTenant(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dossierTenant && (
          <TenantFileModal
            tenant={dossierTenant}
            onSave={handleSaveDossier}
            onClose={() => setDossierTenant(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-success/10">
        <Users className="w-8 h-8 text-success" />
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">{t('tenants.empty')}</p>
        <p className="text-sm text-textMuted mt-1">{t('tenants.emptyDesc')}</p>
      </div>
      <Button onClick={onAdd}>
        <Plus className="w-4 h-4" />
        {t('tenants.add')}
      </Button>
    </div>
  )
}

function TenantCard({
  tenant,
  onEdit,
  onDelete,
  onOpenLedger,
  onOpenDossier,
  moveInVideoAttachment,
  onOpenMoveInVideo,
}: {
  tenant: Tenant
  onEdit: () => void
  onDelete: () => void
  onOpenLedger: () => void
  onOpenDossier: () => void
  moveInVideoAttachment?: Attachment | null
  onOpenMoveInVideo?: () => void
}) {
  const { t } = useTranslation()
  const hasLease = Boolean(tenant.lease_id)
  const hasUnpaid = tenant.unpaid_count > 0
  const totalRent = (tenant.rent_amount ?? 0) + (tenant.charges_amount ?? 0)
  const dossierCompleted = getCompletedDossierCount(tenant)
  const dossierVariant = getDossierStatusVariant(tenant)
  const missingItems = getMissingDossierItems(tenant)
  const guarantorPresent = hasGuarantor(tenant)
  const hasMoveInVideo = Boolean(moveInVideoAttachment && onOpenMoveInVideo)
  const actionColumns = hasLease || hasMoveInVideo ? 'grid-cols-2' : 'grid-cols-1'

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
      }}
    >
      <Card className={`group h-full transition-colors duration-200 ${
        hasUnpaid ? 'border-danger/30 hover:border-danger/50' : 'hover:border-primary/40'
      }`}>
        <CardContent className="pt-5 flex flex-col gap-4 h-full">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-11 h-11 rounded-xl text-sm font-bold shrink-0 uppercase ${avatarColor(tenant.id)}`}>
                {initials(tenant)}
              </div>
              <div>
                <p className="text-sm font-semibold text-textPrimary">
                  {tenant.first_name} {tenant.last_name}
                </p>
                <p className="text-xs text-textMuted mt-0.5">
                  {t('tenants.createdAt', { date: formatDate(tenant.created_at) })}
                </p>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg hover:bg-surfaceHigh text-textMuted hover:text-textPrimary transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg hover:bg-danger/10 text-textMuted hover:text-danger transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={dossierVariant}>
              <FileText className="w-3 h-3" />
              {t('tenants.dossier.title')} {dossierCompleted}/{DOSSIER_ITEMS.length}
            </Badge>
            {guarantorPresent && (
              <Badge variant="default">
                <ShieldCheck className="w-3 h-3" />
                {t('tenants.guarantor')}
              </Badge>
            )}
            {hasUnpaid && (
              <Badge variant="danger">
                <AlertCircle className="w-3 h-3" />
                {t('tenants.unpaidBadge', { count: tenant.unpaid_count })}
              </Badge>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            {tenant.email ? (
              <div className="flex items-center gap-1.5 text-xs text-textMuted">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tenant.email}</span>
              </div>
            ) : null}
            {tenant.phone ? (
              <div className="flex items-center gap-1.5 text-xs text-textMuted">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>{tenant.phone}</span>
              </div>
            ) : null}
            {!tenant.email && !tenant.phone && (
              <p className="text-xs text-textMuted italic opacity-60">{t('tenants.noDirectContact')}</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surfaceHigh/40 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-textPrimary">{t('tenants.fileOverviewTitle')}</p>
              <span className="text-[11px] text-textMuted">
                {missingItems.length === 0 ? t('tenants.dossier.complete') : t('tenants.missingDocuments', { count: missingItems.length })}
              </span>
            </div>
            <p className="text-xs text-textMuted mt-1.5 line-clamp-2">
              {missingItems.length === 0
                ? t('tenants.allDocumentsReceived')
                : t('tenants.missingSummary', {
                    items: missingItems.slice(0, 3).map((item) => t(item.labelKey)).join(', '),
                  })}
            </p>
          </div>

          <div className="border-t border-border" />

          {hasLease ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-medium text-textPrimary truncate">{tenant.property_name}</span>
                <span className="text-textMuted shrink-0">{tenant.property_city}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-textMuted">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('tenants.leaseSince', { date: formatDate(tenant.lease_start_date!) })}</span>
                </div>
                <Badge variant="muted" className="text-[10px]">
                  {tenant.lease_type ? t(LEASE_TYPE_LABELS[tenant.lease_type] ?? tenant.lease_type) : tenant.lease_type}
                </Badge>
              </div>

              <div className="flex items-center justify-between mt-0.5">
                <div className="flex items-center gap-1 text-sm font-semibold text-textPrimary">
                  <Euro className="w-3.5 h-3.5 text-primary" />
                  {t('tenants.monthlyAmount', { amount: formatCurrency(totalRent) })}
                </div>
                {!hasUnpaid && (
                  <div className="flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t('tenants.upToDate')}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-textMuted">
              <div className="w-2 h-2 rounded-full bg-textMuted/30" />
              <span className="italic">{t('tenants.noLease')}</span>
            </div>
          )}

          <div className={`grid gap-2 mt-auto ${actionColumns}`}>
            <Button variant="outline" size="sm" onClick={onOpenDossier} className="w-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('tenants.file')}
            </Button>
            {hasLease && (
              <Button variant="outline" size="sm" onClick={onOpenLedger} className="w-full">
                <ScrollText className="w-3.5 h-3.5" />
                {t('tenants.ledger')}
              </Button>
            )}
            {hasMoveInVideo && (
              <Button variant="outline" size="sm" onClick={onOpenMoveInVideo} className="w-full">
                <Film className="w-3.5 h-3.5" />
                {t('tenants.openMoveInVideo')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function TenantFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Tenant | null
  onSave: (data: TenantInput) => Promise<void>
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState<TenantInput>(
    initial
      ? {
          first_name: initial.first_name,
          last_name: initial.last_name,
          email: initial.email ?? '',
          phone: initial.phone ?? '',
        }
      : emptyForm
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function setField(field: keyof TenantInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (!form.first_name.trim()) return setError(t('tenants.firstNameRequired'))
    if (!form.last_name.trim()) return setError(t('tenants.lastNameRequired'))

    setSaving(true)

    try {
      await onSave({
        ...form,
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
      })
    } catch (err) {
      setError(`${t('common.error')}: ${err instanceof Error ? err.message : String(err)}`)
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-textPrimary">
            {initial ? t('tenants.editTitle') : t('tenants.addTitle')}
          </h2>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('tenants.firstName')}</label>
              <Input
                value={form.first_name}
                onChange={(event) => setField('first_name', event.target.value)}
                placeholder="Jean"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('tenants.lastName')}</label>
              <Input
                value={form.last_name}
                onChange={(event) => setField('last_name', event.target.value)}
                placeholder="Dupont"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{`${t('tenants.email')} - ${t('common.optional')}`}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <Input
                className="pl-9"
                type="email"
                value={form.email ?? ''}
                onChange={(event) => setField('email', event.target.value)}
                placeholder="jean.dupont@email.fr"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{`${t('tenants.phone')} - ${t('common.optional')}`}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <Input
                className="pl-9"
                type="tel"
                value={form.phone ?? ''}
                onChange={(event) => setField('phone', event.target.value)}
                placeholder="06 12 34 56 78"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surfaceHigh/40 px-3 py-2.5 text-xs text-textMuted">
            {t('tenants.fileAfterCreate')}
          </div>

          {error && <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving} className="flex-1">
              <Save className="w-3.5 h-3.5" />
              {saving ? t('common.saving') : initial ? t('common.edit') : t('common.add')}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function DeleteModal({
  tenant,
  onConfirm,
  onClose,
  error,
  loading,
}: {
  tenant: Tenant
  onConfirm: () => void
  onClose: () => void
  error: string
  loading: boolean
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
        className="w-full max-w-sm bg-surface border border-danger/30 rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-danger/10 shrink-0">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div>
            <p className="text-sm font-semibold text-textPrimary">{t('tenants.deleteTitle')}</p>
            <p className="text-xs text-textMuted mt-0.5">
              {t('tenants.deleteDesc', { name: `${tenant.first_name} ${tenant.last_name}` })}
            </p>
          </div>
        </div>
        {error ? (
          <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
        ) : null}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>{t('common.cancel')}</Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1" disabled={loading}>
            <Trash2 className="w-3.5 h-3.5" />
            {loading ? t('common.deleting') : t('common.delete')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
