import { useCallback, useEffect, useMemo, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { buildFurnishedLeaseContractPdfData } from '@/lib/leaseContractDocument'
import {
  DepositReceiptPDF,
  DepositSettlementPDF,
  RentRevisionNoticePDF,
  type DepositReceiptPdfData,
  type DepositSettlementPdfData,
  type RentRevisionNoticePdfData,
} from '@/lib/pdf/documentTemplates'
import { FurnishedLeaseContractPDF } from '@/lib/pdf/furnishedLeaseContract'
import { QuittancePDF, type QuittanceData } from '@/lib/pdf/quittance'
import { RecuPDF, type RecuData } from '@/lib/pdf/recu'
import { useAuthStore } from '@/stores/useAuthStore'
import DocumentDeleteModal from './DocumentDeleteModal'
import DocumentRow from './DocumentRow'
import {
  getDocumentMeta,
  getDocumentStatusMeta,
  getDocumentTypeFilters,
  normalizeDocumentSearch,
} from './documentPageUtils'
import DocumentsEmptyState from './DocumentsEmptyState'
import GenerateDocumentModal, { type GenerateDocumentRequest } from './GenerateDocumentModal'
import PdfPreviewModal from './PdfPreviewModal'
import {
  getDepositReturnedAmount,
  getRevisionTemplateContext,
  isFullPayment,
  MONTHS,
  type DocumentTemplateKind,
} from './documentTemplateHelpers'

const TEMPLATE_PARAMS_KEY = 'lf_doc_template_params'

export default function Documents() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [leases, setLeases] = useState<Lease[]>([])
  const [irlIndices, setIrlIndices] = useState<IrlIndex[]>([])
  const [sourcesLoaded, setSourcesLoaded] = useState(false)
  const [generationAvailability, setGenerationAvailability] = useState<DocumentGenerationAvailability>({
    paymentCertificates: 0,
    rentRevisionNotices: 0,
    furnishedLeaseContracts: 0,
    depositReceipts: 0,
    depositSettlements: 0,
    canGenerateAny: false,
  })
  const [loading, setLoading] = useState(true)
  const [generationLoading, setGenerationLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<DocumentRecord | null>(null)
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [regenerateKind, setRegenerateKind] = useState<DocumentTemplateKind | null>(null)
  const statusMeta = getDocumentStatusMeta(t)
  const typeFilters = getDocumentTypeFilters(t)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [nextDocs, nextAvailability] = await Promise.all([
        window.api.documents.getAll(),
        window.api.documents.getGenerationAvailability(),
      ])
      setDocs(nextDocs)
      setGenerationAvailability(nextAvailability)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredDocs = useMemo(() => {
    let result = docs

    if (typeFilter) {
      result = result.filter((doc) => doc.type === typeFilter)
    }

    if (statusFilter) {
      result = result.filter((doc) => doc.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const terms = normalizeDocumentSearch(searchQuery).split(/\s+/).filter(Boolean)
      result = result.filter((doc) => {
        const haystack = normalizeDocumentSearch(
          [
            doc.tenant_first_name,
            doc.tenant_last_name,
            doc.property_name,
            doc.property_city,
            getDocumentMeta(doc.type, t).label,
          ].join(' '),
        )
        return terms.every((term) => haystack.includes(term))
      })
    }

    return result
  }, [docs, typeFilter, statusFilter, searchQuery, t])

  function saveTemplateParams(kind: DocumentTemplateKind, params: Record<string, unknown>) {
    try {
      const stored = JSON.parse(localStorage.getItem(TEMPLATE_PARAMS_KEY) || '{}')
      stored[kind] = params
      localStorage.setItem(TEMPLATE_PARAMS_KEY, JSON.stringify(stored))
    } catch {
      // ignore localStorage errors
    }
  }

  function getTemplateParams(kind: DocumentTemplateKind): Record<string, unknown> | null {
    try {
      const stored = JSON.parse(localStorage.getItem(TEMPLATE_PARAMS_KEY) || '{}')
      return stored[kind] ?? null
    } catch {
      return null
    }
  }

  async function ensureGenerationSources() {
    if (sourcesLoaded) return true

    setGenerationLoading(true)
    setError('')
    try {
      const sources = await window.api.documents.getGenerationSources()
      setPayments(sources.payments)
      setLeases(sources.leases)
      setIrlIndices(sources.irlIndices)
      setSourcesLoaded(true)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    } finally {
      setGenerationLoading(false)
    }
  }

  async function handleGenerate(request: GenerateDocumentRequest): Promise<boolean> {
    const landlord = {
      landlordName: profile?.name ?? 'Proprietaire',
      landlordAddress: profile?.address,
      landlordCity: profile?.city,
      landlordPhone: profile?.phone,
      landlordSignature: profile?.signatureImage,
    }

    switch (request.kind) {
      case 'payment_certificate':
        saveTemplateParams('payment_certificate', { paymentId: request.paymentId })
        break
      case 'rent_revision_notice':
        saveTemplateParams('rent_revision_notice', {
          leaseId: request.leaseId,
          noticeDate: request.noticeDate,
          effectiveDate: request.effectiveDate,
        })
        break
      case 'furnished_lease_contract':
        saveTemplateParams('furnished_lease_contract', { leaseId: request.leaseId })
        break
      case 'deposit_receipt':
        saveTemplateParams('deposit_receipt', { leaseId: request.leaseId })
        break
      case 'deposit_settlement':
        saveTemplateParams('deposit_settlement', { leaseId: request.leaseId })
        break
    }

    switch (request.kind) {
      case 'payment_certificate': {
        const payment = payments.find((entry) => entry.id === request.paymentId)
        if (!payment) return false

        const lease = leases.find((entry) => entry.id === payment.lease_id)
        if (!lease) return false

        const full = isFullPayment(payment)
        const baseData = {
          ...landlord,
          tenantFirstName: payment.tenant_first_name,
          tenantLastName: payment.tenant_last_name,
          propertyName: payment.property_name,
          propertyAddress: lease.property_address,
          propertyCity: payment.property_city,
          propertyZip: lease.property_zip ?? '',
          periodMonth: payment.period_month,
          periodYear: payment.period_year,
          rentAmount: payment.rent_amount,
          chargesAmount: payment.charges_amount,
          paymentDate: payment.payment_date,
          paymentMethod: payment.payment_method,
          leaseType: lease.type,
        }
        const month = MONTHS[payment.period_month - 1]

        if (full) {
          const blob = await pdf(<QuittancePDF data={baseData as QuittanceData} />).toBlob()
          return saveGeneratedPdf(
            payment.lease_id,
            `Quittance_${payment.tenant_last_name}_${month}_${payment.period_year}.pdf`,
            blob,
            'quittance',
          )
        }

        const blob = await pdf(<RecuPDF data={baseData as RecuData} />).toBlob()
        return saveGeneratedPdf(
          payment.lease_id,
          `Recu_${payment.tenant_last_name}_${month}_${payment.period_year}.pdf`,
          blob,
          'recu',
        )
      }

      case 'rent_revision_notice': {
        const lease = leases.find((entry) => entry.id === request.leaseId)
        if (!lease) return false

        const context = getRevisionTemplateContext(lease, irlIndices)
        if (!context) return false

        const data: RentRevisionNoticePdfData = {
          ...landlord,
          tenantFirstName: lease.tenant_first_name,
          tenantLastName: lease.tenant_last_name,
          propertyName: lease.property_name,
          propertyAddress: lease.property_address,
          propertyCity: lease.property_city,
          propertyZip: lease.property_zip,
          leaseStartDate: lease.start_date,
          noticeDate: request.noticeDate,
          effectiveDate: request.effectiveDate,
          currentRent: context.revision.oldRent,
          newRent: context.revision.newRent,
          difference: context.revision.difference,
          referenceIrl: context.revision.referenceIrl,
          referenceLabel: context.revision.referenceLabel,
          newIrl: context.revision.newIrl,
          newLabel: context.revision.newLabel,
        }

        const blob = await pdf(<RentRevisionNoticePDF data={data} />).toBlob()
        return saveGeneratedPdf(
          lease.id,
          `Avis_revision_loyer_${lease.tenant_last_name}_${request.effectiveDate}.pdf`,
          blob,
          'avis_revision_loyer',
        )
      }

      case 'furnished_lease_contract': {
        const lease = leases.find((entry) => entry.id === request.leaseId)
        if (!lease) return false

        const persistedLease = await window.api.leases.updateContractDetails(
          lease.id,
          request.contractDetails,
          lease.updated_at,
        )
        if (!persistedLease) return false

        setLeases((current) =>
          current.map((entry) => (entry.id === persistedLease.id ? persistedLease : entry)),
        )

        const data = buildFurnishedLeaseContractPdfData(persistedLease, profile, request.contractDetails)
        const blob = await pdf(<FurnishedLeaseContractPDF data={data} />).toBlob()
        return saveGeneratedPdf(
          persistedLease.id,
          `Contrat_location_meublee_${persistedLease.tenant_last_name}_${persistedLease.start_date}.pdf`,
          blob,
          'contrat_location_meublee',
        )
      }

      case 'deposit_receipt': {
        const lease = leases.find((entry) => entry.id === request.leaseId)
        if (!lease || !lease.deposit_received_date || lease.deposit_amount <= 0) return false

        const data: DepositReceiptPdfData = {
          ...landlord,
          tenantFirstName: lease.tenant_first_name,
          tenantLastName: lease.tenant_last_name,
          propertyName: lease.property_name,
          propertyAddress: lease.property_address,
          propertyCity: lease.property_city,
          propertyZip: lease.property_zip,
          leaseType: lease.type,
          leaseStartDate: lease.start_date,
          receiptDate: lease.deposit_received_date,
          depositAmount: lease.deposit_amount,
        }

        const blob = await pdf(<DepositReceiptPDF data={data} />).toBlob()
        return saveGeneratedPdf(
          lease.id,
          `Recu_depot_garantie_${lease.tenant_last_name}_${lease.deposit_received_date}.pdf`,
          blob,
          'recu_depot_garantie',
        )
      }

      case 'deposit_settlement': {
        const lease = leases.find((entry) => entry.id === request.leaseId)
        if (!lease || !lease.deposit_refund_date || lease.deposit_amount <= 0) return false

        const data: DepositSettlementPdfData = {
          ...landlord,
          tenantFirstName: lease.tenant_first_name,
          tenantLastName: lease.tenant_last_name,
          propertyName: lease.property_name,
          propertyAddress: lease.property_address,
          propertyCity: lease.property_city,
          propertyZip: lease.property_zip,
          leaseStartDate: lease.start_date,
          leaseEndDate: lease.end_date,
          settlementDate: lease.deposit_refund_date,
          depositAmount: lease.deposit_amount,
          retainedAmount: lease.deposit_retained_amount,
          returnedAmount: getDepositReturnedAmount(lease),
          notes: lease.deposit_notes,
        }

        const blob = await pdf(<DepositSettlementPDF data={data} />).toBlob()
        return saveGeneratedPdf(
          lease.id,
          `Solde_depot_garantie_${lease.tenant_last_name}_${lease.deposit_refund_date}.pdf`,
          blob,
          'solde_depot_garantie',
        )
      }

      default:
        return false
    }
  }

  async function saveGeneratedPdf(leaseId: number, fileName: string, blob: Blob, docType: string) {
    const buffer = new Uint8Array(await blob.arrayBuffer())
    const result = await window.api.documents.savePdf(leaseId, fileName, buffer, docType)
    if (!result.saved) return false
    await load()
    return true
  }

  async function handleDelete() {
    if (!deleting) return
    await window.api.documents.delete(deleting.id)
    setDeleting(null)
    await load()
  }

  async function handleStatusChange(doc: DocumentRecord, newStatus: string) {
    await window.api.documents.updateStatus(doc.id, newStatus)
    await load()
  }

  async function handleRegenerate(doc: DocumentRecord) {
    const kindMap: Record<string, DocumentTemplateKind> = {
      quittance: 'payment_certificate',
      recu: 'payment_certificate',
      avis_revision_loyer: 'rent_revision_notice',
      contrat_location_meublee: 'furnished_lease_contract',
      recu_depot_garantie: 'deposit_receipt',
      solde_depot_garantie: 'deposit_settlement',
    }
    const kind = kindMap[doc.type] ?? null
    const ready = await ensureGenerationSources()
    if (!ready) return
    setRegenerateKind(kind)
    setShowForm(true)
  }

  async function handleOpenModal() {
    const ready = await ensureGenerationSources()
    if (!ready) return
    setRegenerateKind(null)
    setShowForm(true)
  }

  const hasFilters = Boolean(searchQuery || typeFilter || statusFilter)
  const paidPayments = payments
  const canGenerateAnyDocument = generationAvailability.canGenerateAny

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">{t('documents.title')}</h1>
          <p className="mt-1 text-sm text-textMuted">
            {t('documents.generatedCount', { count: docs.length })}
            {filteredDocs.length !== docs.length
              ? ` | ${t('documents.filteredCount', { count: filteredDocs.length })}`
              : ''}
          </p>
        </div>
        <Button
          onClick={() => {
            void handleOpenModal()
          }}
          disabled={!canGenerateAnyDocument || generationLoading}
        >
          <FileText className="h-4 w-4" />
          {generationLoading ? t('common.loading') : t('documents.generate')}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {(docs.length > 0 || hasFilters) && (
        <div className="flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('documents.searchPlaceholder')}
              className="h-9 pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {typeFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">{t('documents.allStatuses')}</option>
            <option value="generated">{statusMeta.generated.label}</option>
            <option value="sent">{statusMeta.sent.label}</option>
            <option value="archived">{statusMeta.archived.label}</option>
          </select>

          {hasFilters && (
            <button
              onClick={() => {
                setSearchQuery('')
                setTypeFilter('')
                setStatusFilter('')
              }}
              className="text-xs text-textMuted transition-colors hover:text-primary"
            >
              {t('documents.resetFilters')}
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((index) => (
            <div key={index} className="h-16 rounded-2xl border border-border bg-surface animate-pulse" />
          ))}
        </div>
      ) : !canGenerateAnyDocument && docs.length === 0 ? (
        <DocumentsEmptyState />
      ) : filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold text-textPrimary">
              {hasFilters ? t('documents.noMatchTitle') : t('documents.empty')}
            </p>
            <p className="mt-1 text-sm text-textMuted">
              {hasFilters
                ? t('documents.noMatchDesc')
                : t('documents.generateHelp')}
            </p>
          </div>
        </div>
      ) : (
        <motion.div
          className="flex flex-col gap-2"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
        >
          {filteredDocs.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              onOpen={() => doc.file_path && window.api.documents.openFile(doc.file_path)}
              onPreview={() => setPreviewDoc(doc)}
              onDelete={() => setDeleting(doc)}
              onStatusChange={(status) => {
                void handleStatusChange(doc, status)
              }}
              onRegenerate={() => {
                void handleRegenerate(doc)
              }}
            />
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {showForm && sourcesLoaded && (
          <GenerateDocumentModal
            profile={profile}
            payments={paidPayments}
            leases={leases}
            irlIndices={irlIndices}
            onGenerate={handleGenerate}
            onClose={() => {
              setShowForm(false)
              setRegenerateKind(null)
            }}
            initialTemplate={regenerateKind}
            getTemplateParams={getTemplateParams}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <DocumentDeleteModal
            doc={deleting}
            onConfirm={() => {
              void handleDelete()
            }}
            onClose={() => setDeleting(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewDoc && <PdfPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
      </AnimatePresence>
    </div>
  )
}
