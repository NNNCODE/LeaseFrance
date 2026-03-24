import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Plus, ScrollText, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/utils'

type InspectionKind = Inspection['kind']

const KIND_ORDER: InspectionKind[] = ['entry', 'exit']

const KIND_META: Record<InspectionKind, { label: string }> = {
  entry: { label: 'Entree' },
  exit: { label: 'Sortie' },
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function defaultRooms(): InspectionRoom[] {
  return [
    { area: 'Entree', condition: '', notes: '' },
    { area: 'Sejour', condition: '', notes: '' },
    { area: 'Cuisine', condition: '', notes: '' },
    { area: 'Chambre', condition: '', notes: '' },
    { area: 'Salle de bain', condition: '', notes: '' },
    { area: 'WC', condition: '', notes: '' },
  ]
}

function seedRooms(leaseId: number | null, inspections: Inspection[], editingId?: number): InspectionRoom[] {
  if (!leaseId) return defaultRooms()
  const previous = inspections.find((inspection) => inspection.lease_id === leaseId && inspection.id !== editingId)
  if (!previous || previous.rooms.length === 0) return defaultRooms()
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
      : seedRooms(initialLease || null, inspections, inspection?.id),
  }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedLease = leases.find((lease) => lease.id === form.lease_id) ?? null
  const latestForLease = useMemo(
    () => inspections.find((item) => item.lease_id === form.lease_id && item.id !== inspection?.id),
    [form.lease_id, inspection?.id, inspections]
  )

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
      rooms: seedRooms(current.lease_id || null, inspections, inspection?.id),
    }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (!form.lease_id) return setError('Selectionnez un bail.')
    if (!form.inspection_date) return setError("Renseignez une date d'etat des lieux.")
    if (selectedLease && form.inspection_date < selectedLease.start_date) {
      return setError("La date ne peut pas etre anterieure au debut du bail.")
    }

    const rooms = form.rooms
      .map((room) => ({
        area: room.area.trim(),
        condition: room.condition.trim(),
        notes: room.notes.trim(),
      }))
      .filter((room) => room.area || room.condition || room.notes)

    if (rooms.length === 0) return setError('Ajoutez au moins une zone a decrire.')
    if (rooms.some((room) => !room.area)) return setError('Chaque ligne doit avoir un nom de zone.')

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
                {inspection ? "Modifier l'etat des lieux" : 'Nouvel etat des lieux'}
              </h2>
              <p className="text-sm text-textMuted">Constat d'entree ou de sortie pour un bail.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-5">
          <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Bail</label>
              <select
                value={form.lease_id}
                onChange={(event) => {
                  const leaseId = Number(event.target.value)
                  setForm((current) => ({
                    ...current,
                    lease_id: leaseId,
                    rooms: inspection?.lease_id === leaseId && inspection.rooms.length
                      ? inspection.rooms.map((room) => ({ ...room }))
                      : seedRooms(leaseId, inspections, inspection?.id),
                  }))
                }}
                className="h-10 rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {lease.tenant_first_name} {lease.tenant_last_name} · {lease.property_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {KIND_ORDER.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setField('kind', kind)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${form.kind === kind ? 'border-primary bg-primary/10 text-primary' : 'border-border text-textMuted hover:text-textPrimary'}`}
                  >
                    {KIND_META[kind].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Date du constat</label>
              <Input type="date" value={form.inspection_date} onChange={(event) => setField('inspection_date', event.target.value)} />
            </div>
          </div>

          {selectedLease ? (
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="pt-4"><p className="text-xs text-textMuted">Locataire</p><p className="text-base font-semibold text-textPrimary mt-1">{selectedLease.tenant_first_name} {selectedLease.tenant_last_name}</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-xs text-textMuted">Bien</p><p className="text-base font-semibold text-textPrimary mt-1">{selectedLease.property_name}</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-xs text-textMuted">Debut du bail</p><p className="text-base font-semibold text-textPrimary mt-1">{formatDate(selectedLease.start_date)}</p></CardContent></Card>
            </div>
          ) : null}

          {latestForLease ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-textPrimary">Dernier constat trouve pour ce bail</p>
                <p className="text-xs text-textMuted mt-1">{KIND_META[latestForLease.kind].label} du {formatDate(latestForLease.inspection_date)} · {latestForLease.rooms.length} zone{latestForLease.rooms.length !== 1 ? 's' : ''}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={restoreLatestRooms}>Reprendre les pieces</Button>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <textarea value={form.general_condition ?? ''} onChange={(event) => setField('general_condition', event.target.value)} rows={4} placeholder="Etat general du logement..." className="w-full resize-none rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
            <textarea value={form.meter_readings ?? ''} onChange={(event) => setField('meter_readings', event.target.value)} rows={4} placeholder="Releves de compteurs..." className="w-full resize-none rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
          </div>

          <div className="rounded-2xl border border-border">
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-textPrimary">Pieces et zones controlees</p>
                <p className="text-xs text-textMuted mt-1">Une ligne par piece, zone ou equipement notable.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addRoom}><Plus className="w-3.5 h-3.5" />Ajouter une ligne</Button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {form.rooms.map((room, index) => (
                <div key={index} className="grid grid-cols-[1.1fr_1fr_1.4fr_auto] gap-3 items-start">
                  <Input value={room.area} onChange={(event) => setRoom(index, 'area', event.target.value)} placeholder="Zone" />
                  <Input value={room.condition} onChange={(event) => setRoom(index, 'condition', event.target.value)} placeholder="Etat constate" />
                  <textarea value={room.notes} onChange={(event) => setRoom(index, 'notes', event.target.value)} rows={2} placeholder="Observations" className="w-full resize-none rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
                  <button type="button" onClick={() => removeRoom(index)} className="mt-2 p-2 rounded-lg text-textMuted hover:text-danger hover:bg-danger/10 transition-colors" title="Supprimer la ligne"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <textarea value={form.notes ?? ''} onChange={(event) => setField('notes', event.target.value)} rows={4} placeholder="Remarques complementaires..." className="w-full resize-none rounded-lg border border-border bg-surfaceHigh px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />

          <div className="rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-xs text-textMuted leading-5">
            Le PDF reprend la signature du proprietaire si elle existe dans `Proprietaire`. La signature du locataire reste un emplacement a signer sur la version imprimee.
          </div>

          {error ? <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <>Enregistrement...</> : <><CheckCircle2 className="w-3.5 h-3.5" />Enregistrer le constat</>}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
