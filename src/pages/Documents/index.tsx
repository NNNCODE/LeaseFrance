import { useCallback, useEffect, useMemo, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Eye,
  FileText,
  FolderOpen,
  Info,
  Receipt,
  RefreshCw,
  ScrollText,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { RecuPDF, type RecuData } from '@/lib/pdf/recu'
import { QuittancePDF, type QuittanceData } from '@/lib/pdf/quittance'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'
import GenerateDocumentModal, { type GenerateDocumentRequest } from './GenerateDocumentModal'
import {
  MONTHS,
  getDepositReturnedAmount,
  getRevisionTemplateContext,
  isFullPayment,
  type DocumentTemplateKind,
} from './documentTemplateHelpers'

// ── Constants ─────────────────────────────────────────────────────────────────

const DOC_STATUS_META: Record<string, { label: string; variant: 'muted' | 'default' | 'success' | 'warning' }> = {
  generated: { label: 'Genere', variant: 'muted' },
  sent:      { label: 'Envoye', variant: 'success' },
  archived:  { label: 'Archive', variant: 'warning' },
}

function getDocumentMeta(type: string) {
  switch (type) {
    case 'recu':
      return { label: 'Recu', variant: 'warning' as const, icon: Receipt, iconClass: 'text-accent', iconBg: 'bg-accent/10' }
    case 'etat_des_lieux_entree':
      return { label: "Etat des lieux d'entree", variant: 'default' as const, icon: ScrollText, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
    case 'etat_des_lieux_sortie':
      return { label: 'Etat des lieux de sortie', variant: 'warning' as const, icon: ScrollText, iconClass: 'text-warning', iconBg: 'bg-warning/10' }
    case 'regularisation_charges':
      return { label: 'Regularisation des charges', variant: 'default' as const, icon: ScrollText, iconClass: 'text-warning', iconBg: 'bg-warning/10' }
    case 'relance_amiable':
      return { label: 'Relance amiable', variant: 'default' as const, icon: Info, iconClass: 'text-warning', iconBg: 'bg-warning/10' }
    case 'mise_en_demeure':
      return { label: 'Mise en demeure', variant: 'danger' as const, icon: Info, iconClass: 'text-danger', iconBg: 'bg-danger/10' }
    case 'proposition_echeancier':
      return { label: 'Echeancier', variant: 'success' as const, icon: Info, iconClass: 'text-success', iconBg: 'bg-success/10' }
    case 'avis_revision_loyer':
      return { label: 'Avis de revision', variant: 'default' as const, icon: TrendingUp, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
    case 'recu_depot_garantie':
      return { label: 'Recu de depot', variant: 'default' as const, icon: ShieldCheck, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
    case 'solde_depot_garantie':
      return { label: 'Solde de depot', variant: 'warning' as const, icon: ShieldCheck, iconClass: 'text-warning', iconBg: 'bg-warning/10' }
    case 'contrat_location_meublee':
      return { label: 'Contrat meuble', variant: 'default' as const, icon: ScrollText, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
    default:
      return { label: 'Quittance', variant: 'muted' as const, icon: FileText, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
  }
}

// All known document types for filter
const DOC_TYPE_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tous les types' },
  { value: 'quittance', label: 'Quittance' },
  { value: 'recu', label: 'Recu' },
  { value: 'avis_revision_loyer', label: 'Avis de revision' },
  { value: 'contrat_location_meublee', label: 'Contrat meuble' },
  { value: 'recu_depot_garantie', label: 'Recu de depot' },
  { value: 'solde_depot_garantie', label: 'Solde de depot' },
  { value: 'relance_amiable', label: 'Relance amiable' },
  { value: 'mise_en_demeure', label: 'Mise en demeure' },
  { value: 'etat_des_lieux_entree', label: "Etat des lieux d'entree" },
  { value: 'etat_des_lieux_sortie', label: 'Etat des lieux de sortie' },
  { value: 'regularisation_charges', label: 'Regularisation' },
]

const TEMPLATE_PARAMS_KEY = 'lf_doc_template_params'

function normalize(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Documents() {
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

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Regenerate: pre-select template kind when opening modal
  const [regenerateKind, setRegenerateKind] = useState<DocumentTemplateKind | null>(null)

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

  useEffect(() => { load() }, [load])

  const paidPayments = payments
  const canGenerateAnyDocument = generationAvailability.canGenerateAny

  // ── Filter logic ─────────────────────────────────────────────
  const filteredDocs = useMemo(() => {
    let result = docs

    if (typeFilter) {
      result = result.filter((doc) => doc.type === typeFilter)
    }

    if (statusFilter) {
      result = result.filter((doc) => doc.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const terms = normalize(searchQuery).split(/\s+/).filter(Boolean)
      result = result.filter((doc) => {
        const hay = normalize([
          doc.tenant_first_name,
          doc.tenant_last_name,
          doc.property_name,
          doc.property_city,
          getDocumentMeta(doc.type).label,
        ].join(' '))
        return terms.every((term) => hay.includes(term))
      })
    }

    return result
  }, [docs, typeFilter, statusFilter, searchQuery])

  // ── Template parameter memory ────────────────────────────────
  function saveTemplateParams(kind: DocumentTemplateKind, params: Record<string, unknown>) {
    try {
      const stored = JSON.parse(localStorage.getItem(TEMPLATE_PARAMS_KEY) || '{}')
      stored[kind] = params
      localStorage.setItem(TEMPLATE_PARAMS_KEY, JSON.stringify(stored))
    } catch { /* ignore */ }
  }

  function getTemplateParams(kind: DocumentTemplateKind): Record<string, unknown> | null {
    try {
      const stored = JSON.parse(localStorage.getItem(TEMPLATE_PARAMS_KEY) || '{}')
      return stored[kind] ?? null
    } catch { return null }
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

  // ── Generation ───────────────────────────────────────────────
  async function handleGenerate(request: GenerateDocumentRequest): Promise<boolean> {
    const landlord = {
      landlordName: profile?.name ?? 'Proprietaire',
      landlordAddress: profile?.address,
      landlordCity: profile?.city,
      landlordPhone: profile?.phone,
      landlordSignature: profile?.signatureImage,
    }

    // Save template params for memory
    switch (request.kind) {
      case 'payment_certificate':
        saveTemplateParams('payment_certificate', { paymentId: request.paymentId })
        break
      case 'rent_revision_notice':
        saveTemplateParams('rent_revision_notice', { leaseId: request.leaseId, noticeDate: request.noticeDate, effectiveDate: request.effectiveDate })
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

        setLeases((current) => current.map((entry) => entry.id === persistedLease.id ? persistedLease : entry))

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
    // Map doc type to template kind
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

  const hasFilters = searchQuery || typeFilter || statusFilter

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">Documents</h1>
          <p className="text-textMuted text-sm mt-1">
            {docs.length} document{docs.length !== 1 ? 's' : ''} genere{docs.length !== 1 ? 's' : ''}
            {filteredDocs.length !== docs.length ? ` · ${filteredDocs.length} affiche${filteredDocs.length !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <Button onClick={() => { void handleOpenModal() }} disabled={!canGenerateAnyDocument || generationLoading}>
          <FileText className="w-4 h-4" />
          {generationLoading ? 'Chargement...' : 'Nouveau document'}
        </Button>
      </div>

      {/* ── Search + Filters ────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {(docs.length > 0 || hasFilters) && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par locataire, bien, ville..."
              className="pl-10 h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {DOC_TYPE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Tous les statuts</option>
            <option value="generated">Genere</option>
            <option value="sent">Envoye</option>
            <option value="archived">Archive</option>
          </select>

          {hasFilters && (
            <button
              onClick={() => { setSearchQuery(''); setTypeFilter(''); setStatusFilter('') }}
              className="text-xs text-textMuted hover:text-primary transition-colors"
            >
              Reinitialiser
            </button>
          )}
        </div>
      )}

      {/* ── Document List ───────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((index) => (
            <div key={index} className="h-16 bg-surface border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !canGenerateAnyDocument && docs.length === 0 ? (
        <EmptyState />
      ) : filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
            <FileText className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold text-textPrimary">
              {hasFilters ? 'Aucun document ne correspond' : 'Aucun document genere'}
            </p>
            <p className="text-sm text-textMuted mt-1">
              {hasFilters
                ? 'Essayez d ajuster vos filtres ou votre recherche.'
                : 'Ouvrez le centre de modeles pour generer une quittance, un avis de revision, un contrat meuble ou un document de depot.'}
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
            <DocRow
              key={doc.id}
              doc={doc}
              onOpen={() => doc.file_path && window.api.documents.openFile(doc.file_path)}
              onPreview={() => setPreviewDoc(doc)}
              onDelete={() => setDeleting(doc)}
              onStatusChange={(status) => handleStatusChange(doc, status)}
              onRegenerate={() => { void handleRegenerate(doc) }}
            />
          ))}
        </motion.div>
      )}

      {/* ── Generate Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showForm && sourcesLoaded && (
          <GenerateDocumentModal
            profile={profile}
            payments={paidPayments}
            leases={leases}
            irlIndices={irlIndices}
            onGenerate={handleGenerate}
            onClose={() => { setShowForm(false); setRegenerateKind(null) }}
            initialTemplate={regenerateKind}
            getTemplateParams={getTemplateParams}
          />
        )}
      </AnimatePresence>

      {/* ── Delete Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {deleting && (
          <DeleteModal
            doc={deleting}
            onConfirm={handleDelete}
            onClose={() => setDeleting(null)}
          />
        )}
      </AnimatePresence>

      {/* ── PDF Preview Modal ───────────────────────────────── */}
      <AnimatePresence>
        {previewDoc && (
          <PdfPreviewModal
            doc={previewDoc}
            onClose={() => setPreviewDoc(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Document Row ──────────────────────────────────────────────────────────────

function DocRow({
  doc,
  onOpen,
  onPreview,
  onDelete,
  onStatusChange,
  onRegenerate,
}: {
  doc: DocumentRecord
  onOpen: () => void
  onPreview: () => void
  onDelete: () => void
  onStatusChange: (status: string) => void
  onRegenerate: () => void
}) {
  const meta = getDocumentMeta(doc.type)
  const statusMeta = DOC_STATUS_META[doc.status] ?? DOC_STATUS_META.generated
  const Icon = meta.icon
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  // Determine if this doc type supports regeneration
  const canRegenerate = ['quittance', 'recu', 'avis_revision_loyer', 'contrat_location_meublee', 'recu_depot_garantie', 'solde_depot_garantie'].includes(doc.type)

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: -8 },
        show: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' } },
      }}
    >
      <Card className="group hover:border-primary/30 transition-colors duration-200">
        <CardContent className="py-3 px-4 flex items-center gap-4">
          <div className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${meta.iconBg}`}>
            <Icon className={`w-4 h-4 ${meta.iconClass}`} />
          </div>

          <div className="flex-1 min-w-0 grid grid-cols-[1.2fr_0.8fr_0.7fr_0.6fr] gap-3 items-center">
            {/* Tenant + Property */}
            <div className="min-w-0">
              <p className="text-sm font-medium text-textPrimary truncate">
                {doc.tenant_first_name} {doc.tenant_last_name}
              </p>
              <p className="text-xs text-textMuted truncate">{doc.property_name}</p>
            </div>

            {/* Doc type badge */}
            <div>
              <Badge variant={meta.variant}>{meta.label}</Badge>
            </div>

            {/* Status badge with dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="inline-flex"
              >
                <Badge variant={statusMeta.variant} className="cursor-pointer hover:opacity-80 transition-opacity">
                  {statusMeta.label}
                </Badge>
              </button>

              {showStatusMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
                  <div className="absolute top-full left-0 mt-1 z-50 bg-surface border border-border rounded-xl shadow-lg py-1 min-w-[140px]">
                    {Object.entries(DOC_STATUS_META).map(([key, meta]) => (
                      <button
                        key={key}
                        onClick={() => {
                          onStatusChange(key)
                          setShowStatusMenu(false)
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-surfaceHigh flex items-center gap-2 ${
                          doc.status === key ? 'text-primary font-medium' : 'text-textMuted'
                        }`}
                      >
                        {key === 'generated' && <FileText className="w-3 h-3" />}
                        {key === 'sent' && <Send className="w-3 h-3" />}
                        {key === 'archived' && <Archive className="w-3 h-3" />}
                        {meta.label}
                        {doc.status === key && <CheckCircle2 className="w-3 h-3 ml-auto" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Date */}
            <div className="text-xs text-textMuted">
              {formatDate(doc.generated_at)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {doc.file_path && (
              <button
                onClick={onPreview}
                title="Apercu PDF"
                className="p-1.5 rounded-lg hover:bg-primary/10 text-textMuted hover:text-primary transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}
            {doc.file_path && (
              <button
                onClick={onOpen}
                title="Ouvrir le fichier"
                className="p-1.5 rounded-lg hover:bg-primary/10 text-textMuted hover:text-primary transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            )}
            {canRegenerate && (
              <button
                onClick={onRegenerate}
                title="Regenerer ce type de document"
                className="p-1.5 rounded-lg hover:bg-warning/10 text-textMuted hover:text-warning transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onDelete}
              title="Supprimer"
              className="p-1.5 rounded-lg hover:bg-danger/10 text-textMuted hover:text-danger transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── PDF Preview Modal ─────────────────────────────────────────────────────────

function PdfPreviewModal({
  doc,
  onClose,
}: {
  doc: DocumentRecord
  onClose: () => void
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPreviewUrl(null)
    setError('')
    setLoading(true)

    if (!doc.file_path) {
      setError('Aucun fichier associe.')
      setLoading(false)
      return
    }

    let cancelled = false
    let objectUrl: string | null = null

    async function loadPdf() {
      const result = await window.api.documents.readFile(doc.file_path!)
      if (cancelled) return

      if (result.error || !result.data || !result.mimeType) {
        setError(result.error || 'Impossible de lire le fichier.')
      } else {
        const nextUrl = URL.createObjectURL(new Blob([result.data], { type: result.mimeType }))
        if (cancelled) {
          URL.revokeObjectURL(nextUrl)
          return
        }
        objectUrl = nextUrl
        setPreviewUrl(nextUrl)
      }
      setLoading(false)
    }

    loadPdf()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [doc.file_path])

  const meta = getDocumentMeta(doc.type)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-4xl h-[85vh] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surfaceHigh/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex items-center justify-center w-8 h-8 rounded-xl shrink-0 ${meta.iconBg}`}>
              <meta.icon className={`w-3.5 h-3.5 ${meta.iconClass}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-textPrimary truncate">
                {meta.label} — {doc.tenant_first_name} {doc.tenant_last_name}
              </p>
              <p className="text-xs text-textMuted truncate">{doc.property_name} · {formatDate(doc.generated_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {doc.file_path && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.api.documents.openFile(doc.file_path!)}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Ouvrir
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-textMuted hover:bg-surfaceHigh hover:text-textPrimary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-textMuted animate-pulse">Chargement du PDF...</div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <AlertTriangle className="w-8 h-8 text-warning" />
              <p className="text-sm text-textMuted">{error}</p>
            </div>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Delete Modal ──────────────────────────────────────────────────────────────

function DeleteModal({
  doc,
  onConfirm,
  onClose,
}: {
  doc: DocumentRecord
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
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-danger/10 shrink-0">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div>
            <p className="text-sm font-semibold text-textPrimary">Supprimer ce document ?</p>
            <p className="text-xs text-textMuted mt-0.5">
              {doc.tenant_first_name} {doc.tenant_last_name} {'·'} {doc.property_name}
            </p>
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

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
        <ScrollText className="w-8 h-8 text-primary" />
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">Aucune source de document</p>
        <p className="text-sm text-textMuted mt-1">
          Les modeles deviennent disponibles des qu un paiement est marque paye, qu un bail meuble est actif,
          qu un bail peut etre revise ou qu un depot de garantie est encaisse ou restitue.
        </p>
      </div>
    </div>
  )
}
