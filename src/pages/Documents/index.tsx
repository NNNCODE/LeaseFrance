import { useEffect, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  FileText,
  FolderOpen,
  Info,
  Receipt,
  ScrollText,
  ShieldCheck,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DepositReceiptPDF,
  DepositSettlementPDF,
  RentRevisionNoticePDF,
  type DepositReceiptPdfData,
  type DepositSettlementPdfData,
  type RentRevisionNoticePdfData,
} from '@/lib/pdf/documentTemplates'
import { RecuPDF, type RecuData } from '@/lib/pdf/recu'
import { QuittancePDF, type QuittanceData } from '@/lib/pdf/quittance'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'
import GenerateDocumentModal, { type GenerateDocumentRequest } from './GenerateDocumentModal'
import {
  MONTHS,
  canGenerateDepositReceipt,
  canGenerateDepositSettlement,
  getDepositReturnedAmount,
  getRevisionTemplateContext,
  isFullPayment,
} from './documentTemplateHelpers'

function getDocumentMeta(type: string) {
  switch (type) {
    case 'recu':
      return { label: 'Re\u00e7u', variant: 'warning' as const, icon: Receipt, iconClass: 'text-accent', iconBg: 'bg-accent/10' }
    case 'etat_des_lieux_entree':
      return { label: "\u00c9tat des lieux d'entr\u00e9e", variant: 'default' as const, icon: ScrollText, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
    case 'etat_des_lieux_sortie':
      return { label: '\u00c9tat des lieux de sortie', variant: 'warning' as const, icon: ScrollText, iconClass: 'text-warning', iconBg: 'bg-warning/10' }
    case 'regularisation_charges':
      return { label: 'R\u00e9gularisation des charges', variant: 'default' as const, icon: ScrollText, iconClass: 'text-warning', iconBg: 'bg-warning/10' }
    case 'relance_amiable':
      return { label: 'Relance amiable', variant: 'default' as const, icon: Info, iconClass: 'text-warning', iconBg: 'bg-warning/10' }
    case 'mise_en_demeure':
      return { label: 'Mise en demeure', variant: 'danger' as const, icon: Info, iconClass: 'text-danger', iconBg: 'bg-danger/10' }
    case 'proposition_echeancier':
      return { label: '\u00c9ch\u00e9ancier', variant: 'success' as const, icon: Info, iconClass: 'text-success', iconBg: 'bg-success/10' }
    case 'avis_revision_loyer':
      return { label: 'Avis de r\u00e9vision', variant: 'default' as const, icon: TrendingUp, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
    case 'recu_depot_garantie':
      return { label: 'Re\u00e7u de d\u00e9p\u00f4t', variant: 'default' as const, icon: ShieldCheck, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
    case 'solde_depot_garantie':
      return { label: 'Solde de d\u00e9p\u00f4t', variant: 'warning' as const, icon: ShieldCheck, iconClass: 'text-warning', iconBg: 'bg-warning/10' }
    default:
      return { label: 'Quittance', variant: 'muted' as const, icon: FileText, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
  }
}

export default function Documents() {
  const { profile } = useAuthStore()
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [leases, setLeases] = useState<Lease[]>([])
  const [irlIndices, setIrlIndices] = useState<IrlIndex[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<DocumentRecord | null>(null)

  async function load() {
    setLoading(true)
    const [nextDocs, nextPayments, nextLeases, nextIrl] = await Promise.all([
      window.api.documents.getAll(),
      window.api.payments.getAll(),
      window.api.leases.getAll(),
      window.api.irl.getAll(),
    ])
    setDocs(nextDocs)
    setPayments(nextPayments)
    setLeases(nextLeases)
    setIrlIndices(nextIrl)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const paidPayments = payments.filter((payment) => payment.status === 'paid')
  const revisableLeaseCount = leases.filter((lease) => Boolean(getRevisionTemplateContext(lease, irlIndices))).length
  const depositReceiptCount = leases.filter(canGenerateDepositReceipt).length
  const depositSettlementCount = leases.filter(canGenerateDepositSettlement).length
  const canGenerateAnyDocument = (
    paidPayments.length > 0
    || revisableLeaseCount > 0
    || depositReceiptCount > 0
    || depositSettlementCount > 0
  )

  async function handleGenerate(request: GenerateDocumentRequest): Promise<boolean> {
    const landlord = {
      landlordName: profile?.name ?? 'Propri\u00e9taire',
      landlordAddress: profile?.address,
      landlordCity: profile?.city,
      landlordPhone: profile?.phone,
      landlordSignature: profile?.signatureImage,
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
    const buffer = Array.from(new Uint8Array(await blob.arrayBuffer()))
    const result = await window.api.documents.savePdf(leaseId, fileName, buffer, docType)
    if (!result.saved) return false
    await load()
    return true
  }

  async function handleDelete() {
    if (!deleting) return
    await window.api.documents.delete(deleting.id)
    setDeleting(null)
    load()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">Documents</h1>
          <p className="text-textMuted text-sm mt-1">
            {docs.length} document{docs.length !== 1 ? 's' : ''} g\u00e9n\u00e9r\u00e9{docs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={!canGenerateAnyDocument}>
          <FileText className="w-4 h-4" />
          Nouveau document
        </Button>
      </div>

      {!canGenerateAnyDocument && docs.length === 0 ? (
        <EmptyState />
      ) : loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((index) => (
            <div key={index} className="h-16 bg-surface border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
            <FileText className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold text-textPrimary">Aucun document g\u00e9n\u00e9r\u00e9</p>
            <p className="text-sm text-textMuted mt-1">
              Ouvrez le centre de mod\u00e8les pour g\u00e9n\u00e9rer une quittance, un avis de r\u00e9vision ou un document de d\u00e9p\u00f4t.
            </p>
          </div>
        </div>
      ) : (
        <motion.div
          className="flex flex-col gap-2"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {docs.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              onOpen={() => doc.file_path && window.api.documents.openFile(doc.file_path)}
              onDelete={() => setDeleting(doc)}
            />
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {showForm && (
          <GenerateDocumentModal
            payments={paidPayments}
            leases={leases}
            irlIndices={irlIndices}
            onGenerate={handleGenerate}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <DeleteModal
            doc={deleting}
            onConfirm={handleDelete}
            onClose={() => setDeleting(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
        <ScrollText className="w-8 h-8 text-primary" />
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">Aucune source de document</p>
        <p className="text-sm text-textMuted mt-1">
          Les mod\u00e8les deviennent disponibles d\u00e8s qu un paiement est marqu\u00e9 pay\u00e9, qu un bail peut \u00eatre r\u00e9vis\u00e9
          ou qu un d\u00e9p\u00f4t de garantie est encaiss\u00e9 ou restitu\u00e9.
        </p>
      </div>
    </div>
  )
}

function DocRow({
  doc,
  onOpen,
  onDelete,
}: {
  doc: DocumentRecord
  onOpen: () => void
  onDelete: () => void
}) {
  const meta = getDocumentMeta(doc.type)
  const Icon = meta.icon

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
          <div className="flex-1 min-w-0 grid grid-cols-3 gap-3 items-center">
            <div className="min-w-0">
              <p className="text-sm font-medium text-textPrimary truncate">
                {doc.tenant_first_name} {doc.tenant_last_name}
              </p>
              <p className="text-xs text-textMuted truncate">{doc.property_name}</p>
            </div>
            <div>
              <Badge variant={meta.variant}>{meta.label}</Badge>
            </div>
            <div className="text-xs text-textMuted">
              G\u00e9n\u00e9r\u00e9 le {formatDate(doc.generated_at)}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {doc.file_path && (
              <button
                onClick={onOpen}
                title="Ouvrir le PDF"
                className="p-1.5 rounded-lg hover:bg-primary/10 text-textMuted hover:text-primary transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onDelete}
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
              {doc.tenant_first_name} {doc.tenant_last_name} {'\u00b7'} {doc.property_name}
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
