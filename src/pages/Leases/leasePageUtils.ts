import { Ban, Clock, ShieldCheck } from 'lucide-react'
import type { TFunction } from 'i18next'

export const LEASE_TYPES = [
  { value: 'vide', label: 'Vide', labelKey: 'leases.typeVide', description: 'Duree min. 3 ans', descriptionKey: 'leases.typeVideDesc' },
  { value: 'meuble', label: 'Meuble', labelKey: 'leases.typeMeuble', description: 'Duree min. 1 an', descriptionKey: 'leases.typeMeubleDesc' },
  { value: 'mobilite', label: 'Mobilite', labelKey: 'leases.typeMobilite', description: '1 a 10 mois', descriptionKey: 'leases.typeMobiliteDesc' },
] as const

export const STATUS_CONFIG = {
  active: { label: 'En cours', labelKey: 'leases.statusActive', variant: 'success', icon: ShieldCheck },
  ended: { label: 'Termine', labelKey: 'leases.statusEnded', variant: 'muted', icon: Clock },
  terminated: { label: 'Resilie', labelKey: 'leases.statusTerminated', variant: 'danger', icon: Ban },
} as const

export function typeLabel(type: string, t?: TFunction) {
  const leaseType = LEASE_TYPES.find((entry) => entry.value === type)
  if (!leaseType) return type
  return t ? t(leaseType.labelKey) : leaseType.label
}

export function statusLabel(status: keyof typeof STATUS_CONFIG, t?: TFunction) {
  const meta = STATUS_CONFIG[status]
  return t ? t(meta.labelKey) : meta.label
}

export function leaseVersionToken(lease: Lease) {
  return lease.updated_at ?? lease.created_at
}

export function formatLeaseErrorMessage(error: unknown) {
  let message = error instanceof Error ? error.message : String(error)

  message = message.replace(/^Error invoking remote method '[^']+':\s*/i, '').trim()
  while (message.startsWith('Error: ')) {
    message = message.slice('Error: '.length).trim()
  }

  return message
}

export function isLeaseDeleteBlockedError(error: string) {
  return formatLeaseErrorMessage(error).includes(
    'Impossible de supprimer ce bail car des paiements, documents ou rappels y sont encore rattaches.',
  )
}

function compareDesc(a: string, b: string) {
  return b.localeCompare(a)
}

export function getLatestMoveInVideoByLease(inspections: Inspection[], attachments: Attachment[]) {
  const moveInVideosByInspection = new Map<number, Attachment>()

  for (const attachment of [...attachments].sort((a, b) => (
    compareDesc(a.created_at, b.created_at) || b.id - a.id
  ))) {
    if (
      attachment.entity_type !== 'inspection'
      || attachment.slot !== 'move_in_video'
      || attachment.mime_type !== 'video/mp4'
      || moveInVideosByInspection.has(attachment.entity_id)
    ) {
      continue
    }

    moveInVideosByInspection.set(attachment.entity_id, attachment)
  }

  const result = new Map<number, Attachment>()
  const sortedInspections = [...inspections].sort((a, b) => (
    compareDesc(a.inspection_date, b.inspection_date)
    || compareDesc(a.created_at, b.created_at)
    || b.id - a.id
  ))

  for (const inspection of sortedInspections) {
    if (inspection.kind !== 'entry' || result.has(inspection.lease_id)) continue

    const video = moveInVideosByInspection.get(inspection.id)
    if (video) result.set(inspection.lease_id, video)
  }

  return result
}

export const emptyLeaseForm: LeaseInput = {
  property_id: 0,
  tenant_id: 0,
  owner_profile_id: null,
  type: 'vide',
  start_date: '',
  end_date: null,
  rent_amount: 0,
  charges_amount: 0,
  deposit_amount: 0,
  deposit_received_date: null,
  deposit_refund_date: null,
  deposit_retained_amount: 0,
  deposit_notes: null,
  contract_details: null,
  status: 'active',
}
