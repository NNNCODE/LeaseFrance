import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, FileText, Paperclip, Plus, ScrollText, Trash2, X } from 'lucide-react'
import AttachmentPanel from '@/components/AttachmentPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import DateInput from '@/components/ui/date-input'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/utils'

type InspectionKind = Inspection['kind']

const KIND_ORDER: InspectionKind[] = ['entry', 'exit']

const KIND_META: Record<InspectionKind, { labelKey: string }> = {
  entry: { labelKey: 'inspections.kindEntry' },
  exit: { labelKey: 'inspections.kindExit' },
}

const ENTRY_ATTACHMENT_SLOTS = [
  {
    key: 'move_in_video',
    labelKey: 'inspections.moveInVideoSlot',
    descriptionKey: 'inspections.moveInVideoSlotHelp',
    badgeKey: 'inspections.moveInVideoBadge',
  },
] as const

function today() {
  return new Date().toISOString().split('T')[0]
}

function seedRooms(
  leaseId: number | null,
  inspections: Inspection[],
  buildDefaultRooms: () => InspectionRoom[],
  editingId?: number,
): InspectionRoom[] {
  if (!leaseId) return buildDefaultRooms()
  const previous = inspections.find((item) => item.lease_id === leaseId && item.id !== editingId)
  if (!previous || previous.rooms.length === 0) return buildDefaultRooms()
  return previous.rooms.map((room) => ({ ...room }))
}

export default function InspectionModal({
  inspection,
  leases,
  inspections,
  initialLeaseId,
  onSave,
  onClose,
}: {
  inspection: Inspection | null
  leases: Lease[]
  inspections: Inspection[]
  initialLeaseId: number | null
  onSave: (data: InspectionInput) => Promise<void>
  onClose: () => void
}) {
  const { t } = useTranslation()
  const buildDefaultRooms = () => ([
    { area: t('inspections.roomDefaults.entryHall'), condition: '', notes: '' },
    { area: t('inspections.roomDefaults.livingRoom'), condition: '', notes: '' },
    { area: t('inspections.roomDefaults.kitchen'), condition: '', notes: '' },
    { area: t('inspections.roomDefaults.bedroom'), condition: '', notes: '' },
    { area: t('inspections.roomDefaults.bathroom'), condition: '', notes: '' },
    { area: t('inspections.roomDefaults.toilet'), condition: '', notes: '' },
  ])

  const initialLease = inspection?.lease_id ?? initialLeaseId ?? leases[0]?.id ?? 0
  const [form, setForm] = useState<InspectionInput>(() => ({
    lease_id: initialLease,
    kind: inspection?.kind ?? 'entry',
    inspection_date: inspection?.inspection_date ?? today(),
    meter_readings: inspection?.meter_readings ?? '',
    general_condition: inspection?.general_condition ?? '',
    notes: inspection?.notes ?? '',
    rooms: inspection?.rooms.length
      ? inspection.rooms.map((room) => ({ ...room }))
      : seedRooms(initialLease || null, inspections, buildDefaultRooms, inspection?.id),
  }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedLease = leases.find((lease) => lease.id === form.lease_id) ?? null
  const latestForLease = useMemo(
    () => inspections.find((item) => item.lease_id === form.lease_id && item.id !== inspection?.id),
    [form.lease_id, inspection?.id, inspections],
  )
  const inspectionAttachmentSlots = form.kind === 'entry'
    ? ENTRY_ATTACHMENT_SLOTS.map((slot) => ({
      key: slot.key,
      label: t(slot.labelKey),
      description: t(slot.descriptionKey),
      badge: t(slot.badgeKey),
      featured: true,
    }))
    : undefined

  function setField<K extends keyof InspectionInput>(field: K, value: InspectionInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function setRoom(index: number, field: keyof InspectionRoom, value: string) {
    setForm((current) => ({
      ...current,
      rooms: current.rooms.map((room, roomIndex) => (
        roomIndex === index ? { ...room, [field]: value } : room
      )),
    }))
  }

  function addRoom() {
    setForm((current) => ({
      ...current,
      rooms: [...current.rooms, { area: '', condition: '', notes: '' }],
    }))
  }

  function removeRoom(index: number) {
    setForm((current) => ({
      ...current,
      rooms: current.rooms.filter((_, roomIndex) => roomIndex !== index),
    }))
  }

  function restoreLatestRooms() {
    setForm((current) => ({
      ...current,
      rooms: seedRooms(current.lease_id || null, inspections, buildDefaultRooms, inspection?.id),
    }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (!form.lease_id) return setError(t('inspections.errors.selectLease'))
    if (!form.inspection_date) return setError(t('inspections.errors.dateRequired'))
    if (selectedLease && form.inspection_date < selectedLease.start_date) {
      return setError(t('inspections.errors.dateBeforeLeaseStart'))
    }

    const rooms = form.rooms
      .map((room) => ({
        area: room.area.trim(),
        condition: room.condition.trim(),
        notes: room.notes.trim(),
      }))
      .filter((room) => room.area || room.condition || room.notes)

    if (rooms.length === 0) return setError(t('inspections.errors.addRoom'))
    if (rooms.some((room) => !room.area)) return setError(t('inspections.errors.roomNameRequired'))

    setSaving(true)
    try {
      await onSave({
        lease_id: form.lease_id,
        kind: form.kind,
        inspection_date: form.inspection_date,
        meter_readings: form.meter_readings?.trim() || null,
        general_condition: form.general_condition?.trim() || null,
        notes: form.notes?.trim() || null,
        rooms,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
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
        className="w-full max-w-5xl max-h-[92vh] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0">
              <ScrollText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-textPrimary">
                {inspection ? t('inspections.editTitle') : t('inspections.addTitle')}
              </h2>
              <p className="text-sm text-textMuted">{t('inspections.formSubtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-5">
          <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('inspections.lease')}</label>
              <select
                value={form.lease_id}
                onChange={(event) => {
                  const leaseId = Number(event.target.value)
                  setForm((current) => ({
                    ...current,
                    lease_id: leaseId,
                    rooms: inspection?.lease_id === leaseId && inspection.rooms.length
                      ? inspection.rooms.map((room) => ({ ...room }))
                      : seedRooms(leaseId, inspections, buildDefaultRooms, inspection?.id),
                  }))
                }}
                className="h-10 rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {lease.tenant_first_name} {lease.tenant_last_name} - {lease.property_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('inspections.kind')}</label>
              <div className="grid grid-cols-2 gap-2">
                {KIND_ORDER.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setField('kind', kind)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${form.kind === kind ? 'border-primary bg-primary/10 text-primary' : 'border-border text-textMuted hover:text-textPrimary'}`}
                  >
                    {t(KIND_META[kind].labelKey)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('inspections.date')}</label>
              <DateInput value={form.inspection_date} onChange={(value) => setField('inspection_date', value ?? '')} />
            </div>
          </div>

          {selectedLease ? (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-textMuted">{t('inspections.tenant')}</p>
                  <p className="text-base font-semibold text-textPrimary mt-1">
                    {selectedLease.tenant_first_name} {selectedLease.tenant_last_name}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-textMuted">{t('inspections.property')}</p>
                  <p className="text-base font-semibold text-textPrimary mt-1">{selectedLease.property_name}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-textMuted">{t('inspections.leaseStartDate')}</p>
                  <p className="text-base font-semibold text-textPrimary mt-1">{formatDate(selectedLease.start_date)}</p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {latestForLease ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-textPrimary">{t('inspections.latestFoundTitle')}</p>
                <p className="text-xs text-textMuted mt-1">
                  {t(KIND_META[latestForLease.kind].labelKey)} - {formatDate(latestForLease.inspection_date)} - {t('inspections.zoneCount', { count: latestForLease.rooms.length })}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={restoreLatestRooms}>
                {t('inspections.restoreRooms')}
              </Button>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <textarea
              value={form.general_condition ?? ''}
              onChange={(event) => setField('general_condition', event.target.value)}
              rows={4}
              placeholder={t('inspections.generalConditionPlaceholder')}
              className="w-full resize-none rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <textarea
              value={form.meter_readings ?? ''}
              onChange={(event) => setField('meter_readings', event.target.value)}
              rows={4}
              placeholder={t('inspections.meterReadingsPlaceholder')}
              className="w-full resize-none rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="rounded-2xl border border-border">
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-textPrimary">{t('inspections.roomsTitle')}</p>
                <p className="text-xs text-textMuted mt-1">{t('inspections.roomsDesc')}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addRoom}>
                <Plus className="w-3.5 h-3.5" />
                {t('inspections.addRoom')}
              </Button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {form.rooms.map((room, index) => (
                <div key={index} className="grid grid-cols-[1.1fr_1fr_1.4fr_auto] gap-3 items-start">
                  <Input
                    value={room.area}
                    onChange={(event) => setRoom(index, 'area', event.target.value)}
                    placeholder={t('inspections.roomAreaPlaceholder')}
                  />
                  <Input
                    value={room.condition}
                    onChange={(event) => setRoom(index, 'condition', event.target.value)}
                    placeholder={t('inspections.roomConditionPlaceholder')}
                  />
                  <textarea
                    value={room.notes}
                    onChange={(event) => setRoom(index, 'notes', event.target.value)}
                    rows={2}
                    placeholder={t('inspections.roomNotesPlaceholder')}
                    className="w-full resize-none rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => removeRoom(index)}
                    className="mt-2 p-2 rounded-lg text-textMuted hover:text-danger hover:bg-danger/10 transition-colors"
                    title={t('inspections.removeRoom')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{t('inspections.notes')}</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(event) => setField('notes', event.target.value)}
              rows={3}
              placeholder={t('inspections.notesPlaceholder')}
              className="w-full resize-none rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {inspection ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-textPrimary">{t('inspections.evidenceFlowTitle')}</p>
                    <p className="text-xs text-textMuted mt-1 leading-5">{t('inspections.evidenceFlowDesc')}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-textMuted">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/70 px-2 py-1">
                    <FileText className="w-3 h-3" />
                    {t('inspections.pdfRecordLabel')}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/70 px-2 py-1">
                    <Paperclip className="w-3 h-3" />
                    {t('inspections.evidenceFilesLabel')}
                  </span>
                </div>
              </div>
              <AttachmentPanel
                entityType="inspection"
                entityId={inspection.id}
                title={t('inspections.attachmentsTitle')}
                slots={inspectionAttachmentSlots}
                generalSectionLabel={form.kind === 'entry' ? t('inspections.generalFilesLabel') : undefined}
                generalSectionDescription={form.kind === 'entry' ? t('inspections.generalFilesHelp') : undefined}
                alwaysShowGeneralSection={form.kind === 'entry'}
                compact
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surfaceHigh/20 px-4 py-3 text-xs text-textMuted leading-5">
              {t('inspections.attachmentsAfterSave')}
            </div>
          )}

          <div className="rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-xs text-textMuted leading-5">
            {t('inspections.signatureHelp', { owner: t('nav.profile') })}
          </div>

          {error ? <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('common.saving') : <><CheckCircle2 className="w-3.5 h-3.5" />{t('inspections.saveInspection')}</>}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
