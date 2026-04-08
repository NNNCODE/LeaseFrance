import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { pdf } from '@react-pdf/renderer'
import { useTranslation } from 'react-i18next'
import {
  CalendarDays,
  Download,
  FileText,
  Home,
  Pencil,
  Plus,
  ScrollText,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InspectionPDF, type InspectionPdfData } from '@/lib/pdf/inspection'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'
import { useOwnerStore } from '@/stores/useOwnerStore'
import InspectionModal from './InspectionModal'

type InspectionKind = Inspection['kind']

const KIND_META: Record<InspectionKind, {
  labelKey: string
  badge: 'default' | 'warning'
}> = {
  entry: { labelKey: 'inspections.kindEntry', badge: 'default' },
  exit: { labelKey: 'inspections.kindExit', badge: 'warning' },
}

function buildFileName(inspection: Inspection) {
  const kind = inspection.kind === 'entry' ? 'etat_des_lieux_entree' : 'etat_des_lieux_sortie'
  return `${kind}_${inspection.tenant_last_name}_${inspection.inspection_date}.pdf`
}

function buildDocumentType(kind: InspectionKind) {
  return kind === 'entry' ? 'etat_des_lieux_entree' : 'etat_des_lieux_sortie'
}

function buildInspectionPdfData(
  inspection: Inspection,
  profile: UserProfile | null,
  fallbackLandlordName: string,
): InspectionPdfData {
  return {
    landlordName: profile?.name ?? fallbackLandlordName,
    landlordAddress: profile?.address,
    landlordCity: profile?.city,
    landlordPhone: profile?.phone,
    landlordSignature: profile?.signatureImage,
    tenantFirstName: inspection.tenant_first_name,
    tenantLastName: inspection.tenant_last_name,
    propertyName: inspection.property_name,
    propertyAddress: inspection.property_address,
    propertyCity: inspection.property_city,
    propertyZip: inspection.property_zip,
    leaseStartDate: inspection.lease_start_date,
    leaseEndDate: inspection.lease_end_date,
    kind: inspection.kind,
    inspectionDate: inspection.inspection_date,
    generalCondition: inspection.general_condition,
    meterReadings: inspection.meter_readings,
    notes: inspection.notes,
    rooms: inspection.rooms,
  }
}

export default function Inspections() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  const activeOwner = useOwnerStore((state) => state.activeOwner)
  const ownerProfile = activeOwner ?? profile
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [leases, setLeases] = useState<Lease[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<Inspection | null>(null)
  const [initialLeaseId, setInitialLeaseId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<Inspection | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    setError('')

    try {
      const [nextInspections, nextLeases] = await Promise.all([
        window.api.inspections.getAll(),
        window.api.leases.getAll(),
      ])
      setInspections(nextInspections)
      setLeases(nextLeases)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const availableLeases = useMemo(
    () => leases.filter((lease) => lease.status === 'active' || lease.status === 'ended'),
    [leases],
  )

  const stats = useMemo(() => ({
    total: inspections.length,
    entry: inspections.filter((inspection) => inspection.kind === 'entry').length,
    exit: inspections.filter((inspection) => inspection.kind === 'exit').length,
  }), [inspections])

  function openCreate(leaseId?: number) {
    setEditing(null)
    setInitialLeaseId(leaseId ?? null)
    setShowForm(true)
  }

  function openEdit(inspection: Inspection) {
    setEditing(inspection)
    setInitialLeaseId(null)
    setShowForm(true)
  }

  function closeForm() {
    setEditing(null)
    setInitialLeaseId(null)
    setShowForm(false)
  }

  async function handleSave(data: InspectionInput) {
    if (editing) {
      await window.api.inspections.update(editing.id, data)
      setNotice(t('inspections.updatedNotice'))
    } else {
      await window.api.inspections.create(data)
      setNotice(t('inspections.createdNotice'))
    }
    closeForm()
    await load()
  }

  async function handleDelete() {
    if (!deleting) return

    setBusyId(deleting.id)
    setError('')
    try {
      await window.api.inspections.delete(deleting.id)
      setNotice(t('inspections.deletedNotice'))
      setDeleting(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  async function handleGeneratePdf(inspection: Inspection) {
    setBusyId(inspection.id)
    setError('')

    try {
      const data = buildInspectionPdfData(inspection, ownerProfile, t('nav.profile'))
      const blob = await pdf(<InspectionPDF data={data} />).toBlob()
      const buffer = new Uint8Array(await blob.arrayBuffer())
      const result = await window.api.documents.savePdf(
        inspection.lease_id,
        buildFileName(inspection),
        buffer,
        buildDocumentType(inspection.kind),
      )

      if (result.saved) {
        setNotice(t('inspections.pdfSavedNotice'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">{t('inspections.title')}</h1>
          <p className="text-sm text-textMuted mt-1">{t('inspections.subtitle')}</p>
        </div>
        <Button onClick={() => openCreate()} disabled={availableLeases.length === 0}>
          <Plus className="w-4 h-4" />
          {t('inspections.add')}
        </Button>
      </div>

      {notice ? (
        <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-textMuted">{t('inspections.statsTotal')}</p>
            <p className="text-2xl font-semibold text-textPrimary mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-textMuted">{t('inspections.statsEntry')}</p>
            <p className="text-2xl font-semibold text-textPrimary mt-1">{stats.entry}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-textMuted">{t('inspections.statsExit')}</p>
            <p className="text-2xl font-semibold text-textPrimary mt-1">{stats.exit}</p>
          </CardContent>
        </Card>
      </div>

      {availableLeases.length === 0 ? (
        <EmptyState
          title={t('inspections.noLeaseTitle')}
          description={t('inspections.noLeaseDesc')}
        />
      ) : loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((index) => (
            <div key={index} className="h-24 rounded-2xl border border-border bg-surface animate-pulse" />
          ))}
        </div>
      ) : inspections.length === 0 ? (
        <EmptyState
          title={t('inspections.empty')}
          description={t('inspections.emptyDesc')}
          action={<Button onClick={() => openCreate()}><Plus className="w-4 h-4" />{t('inspections.emptyAction')}</Button>}
        />
      ) : (
        <motion.div
          className="flex flex-col gap-3"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {inspections.map((inspection) => (
            <InspectionRow
              key={inspection.id}
              inspection={inspection}
              busy={busyId === inspection.id}
              onEdit={() => openEdit(inspection)}
              onDelete={() => setDeleting(inspection)}
              onGeneratePdf={() => handleGeneratePdf(inspection)}
            />
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {showForm && (
          <InspectionModal
            inspection={editing}
            leases={availableLeases}
            inspections={inspections}
            initialLeaseId={initialLeaseId}
            onSave={handleSave}
            onClose={closeForm}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <DeleteInspectionModal
            inspection={deleting}
            deleting={busyId === deleting.id}
            onConfirm={handleDelete}
            onClose={() => setDeleting(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center rounded-2xl border border-dashed border-border bg-surfaceHigh/20">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
        <ScrollText className="w-8 h-8 text-primary" />
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">{title}</p>
        <p className="text-sm text-textMuted mt-1 max-w-xl">{description}</p>
      </div>
      {action}
    </div>
  )
}

function InspectionRow({
  inspection,
  busy,
  onEdit,
  onDelete,
  onGeneratePdf,
}: {
  inspection: Inspection
  busy: boolean
  onEdit: () => void
  onDelete: () => void
  onGeneratePdf: () => void
}) {
  const { t } = useTranslation()
  const meta = KIND_META[inspection.kind]

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: -8 },
        show: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' } },
      }}
    >
      <Card className="group hover:border-primary/30 transition-colors">
        <CardContent className="px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-textPrimary">
                  {inspection.tenant_first_name} {inspection.tenant_last_name}
                </p>
                <Badge variant={meta.badge}>{t(meta.labelKey)}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-textMuted">
                <div className="flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5" />
                  <span>{inspection.property_name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>{formatDate(inspection.inspection_date)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t('inspections.zoneCount', { count: inspection.rooms.length })}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div className="rounded-xl bg-surfaceHigh/30 border border-border px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-textMuted">{t('inspections.generalCondition')}</p>
                  <p className="text-textPrimary mt-1 line-clamp-2">{inspection.general_condition || t('inspections.noGeneralCondition')}</p>
                </div>
                <div className="rounded-xl bg-surfaceHigh/30 border border-border px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-textMuted">{t('inspections.notes')}</p>
                  <p className="text-textPrimary mt-1 line-clamp-2">{inspection.notes || t('inspections.noAdditionalNotes')}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onGeneratePdf}
                disabled={busy}
                title={t('inspections.generatePdf')}
                className="p-1.5 rounded-lg hover:bg-primary/10 text-textMuted hover:text-primary transition-colors disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={onEdit}
                disabled={busy}
                title={t('common.edit')}
                className="p-1.5 rounded-lg hover:bg-surfaceHigh text-textMuted hover:text-textPrimary transition-colors disabled:opacity-40"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                disabled={busy}
                title={t('common.delete')}
                className="p-1.5 rounded-lg hover:bg-danger/10 text-textMuted hover:text-danger transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function DeleteInspectionModal({
  inspection,
  deleting,
  onConfirm,
  onClose,
}: {
  inspection: Inspection
  deleting: boolean
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
        className="w-full max-w-sm bg-surface border border-danger/30 rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-danger/10 shrink-0">
            <Trash2 className="w-5 h-5 text-danger" />
          </div>
          <div>
            <p className="text-sm font-semibold text-textPrimary">{t('inspections.deleteTitle')}</p>
            <p className="text-xs text-textMuted mt-1">
              {inspection.tenant_first_name} {inspection.tenant_last_name} - {t(KIND_META[inspection.kind].labelKey)} - {formatDate(inspection.inspection_date)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={deleting}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1" disabled={deleting}>
            {deleting ? t('common.deleting') : t('common.delete')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
