import * as irlDb from '../db/queries/irl'
import * as leasesDb from '../db/queries/leases'
import * as paymentsDb from '../db/queries/payments'
import { parseQuarter } from '../../src/lib/irl'

export interface DocumentGenerationAvailability {
  paymentCertificates: number
  rentRevisionNotices: number
  furnishedLeaseContracts: number
  depositReceipts: number
  depositSettlements: number
  canGenerateAny: boolean
}

export interface DocumentGenerationSources {
  payments: paymentsDb.Payment[]
  leases: leasesDb.Lease[]
  irlIndices: irlDb.IrlIndex[]
}

function hasRevisionTemplate(lease: leasesDb.Lease, irlIndices: irlDb.IrlIndex[]): boolean {
  if (lease.status !== 'active') return false
  if (lease.type === 'mobilite') return false
  if (!lease.irl_reference_index || !lease.irl_reference_quarter) return false

  const parsedQuarter = parseQuarter(lease.irl_reference_quarter)
  if (!parsedQuarter) return false

  return irlIndices.some((index) => index.quarter === parsedQuarter.quarter && index.year > parsedQuarter.year)
}

export function getDocumentGenerationAvailability(): DocumentGenerationAvailability {
  const payments = paymentsDb.getAll()
  const leases = leasesDb.getAll()
  const irlIndices = irlDb.getAll()

  const paymentCertificates = payments.filter((payment) => payment.status === 'paid').length
  const rentRevisionNotices = leases.filter((lease) => hasRevisionTemplate(lease, irlIndices)).length
  const furnishedLeaseContracts = leases.filter((lease) => lease.type === 'meuble').length
  const depositReceipts = leases.filter((lease) => lease.deposit_amount > 0 && Boolean(lease.deposit_received_date)).length
  const depositSettlements = leases.filter((lease) => lease.deposit_amount > 0 && Boolean(lease.deposit_refund_date)).length

  return {
    paymentCertificates,
    rentRevisionNotices,
    furnishedLeaseContracts,
    depositReceipts,
    depositSettlements,
    canGenerateAny: (
      paymentCertificates > 0
      || rentRevisionNotices > 0
      || furnishedLeaseContracts > 0
      || depositReceipts > 0
      || depositSettlements > 0
    ),
  }
}

export function getDocumentGenerationSources(): DocumentGenerationSources {
  return {
    payments: paymentsDb.getAll().filter((payment) => payment.status === 'paid'),
    leases: leasesDb.getAll(),
    irlIndices: irlDb.getAll(),
  }
}
