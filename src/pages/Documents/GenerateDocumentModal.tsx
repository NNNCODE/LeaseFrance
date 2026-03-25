import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Info,
  Receipt,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  MONTHS,
  canGenerateDepositReceipt,
  canGenerateDepositSettlement,
  getDepositReturnedAmount,
  getRevisionTemplateContext,
  isFullPayment,
  type DocumentTemplateKind,
} from './documentTemplateHelpers'

export type GenerateDocumentRequest =
  | { kind: 'payment_certificate'; paymentId: number }
  | { kind: 'rent_revision_notice'; leaseId: number; noticeDate: string; effectiveDate: string }
  | { kind: 'deposit_receipt'; leaseId: number }
  | { kind: 'deposit_settlement'; leaseId: number }

interface GenerateDocumentModalProps {
  payments: Payment[]
  leases: Lease[]
  irlIndices: IrlIndex[]
  onGenerate: (request: GenerateDocumentRequest) => Promise<boolean>
  onClose: () => void
  initialTemplate?: DocumentTemplateKind | null
  getTemplateParams?: (kind: DocumentTemplateKind) => Record<string, unknown> | null
}

interface TemplateCard {
  kind: DocumentTemplateKind
  title: string
  description: string
  count: number
  icon: typeof FileText
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function GenerateDocumentModal({
  payments,
  leases,
  irlIndices,
  onGenerate,
  onClose,
  initialTemplate,
  getTemplateParams,
}: GenerateDocumentModalProps) {
  const revisableLeases = leases
    .map((lease) => ({ lease, context: getRevisionTemplateContext(lease, irlIndices) }))
    .filter((entry): entry is { lease: Lease; context: NonNullable<ReturnType<typeof getRevisionTemplateContext>> } => Boolean(entry.context))
  const depositReceiptLeases = leases.filter(canGenerateDepositReceipt)
  const depositSettlementLeases = leases.filter(canGenerateDepositSettlement)

  const cards: TemplateCard[] = [
    {
      kind: 'payment_certificate',
      title: 'Quittance ou recu',
      description: 'A partir d un paiement marque paye.',
      count: payments.length,
      icon: Receipt,
    },
    {
      kind: 'rent_revision_notice',
      title: 'Avis de revision',
      description: 'Genere a partir de la reference IRL du bail.',
      count: revisableLeases.length,
      icon: TrendingUp,
    },
    {
      kind: 'deposit_receipt',
      title: 'Recu de depot',
      description: 'Necessite un depot de garantie encaisse.',
      count: depositReceiptLeases.length,
      icon: ShieldCheck,
    },
    {
      kind: 'deposit_settlement',
      title: 'Solde de depot',
      description: 'Necessite une restitution deja renseignee.',
      count: depositSettlementLeases.length,
      icon: FileText,
    },
  ]

  const [template, setTemplate] = useState<DocumentTemplateKind | null>(null)
  const [selectedId, setSelectedId] = useState(0)
  const [noticeDate, setNoticeDate] = useState(today())
  const [effectiveDate, setEffectiveDate] = useState(today())
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [memoryApplied, setMemoryApplied] = useState(false)

  // Pick initial template (from regenerate or first available)
  useEffect(() => {
    if (template && cards.some((card) => card.kind === template && card.count > 0)) return
    if (initialTemplate && cards.some((card) => card.kind === initialTemplate && card.count > 0)) {
      setTemplate(initialTemplate)
    } else {
      setTemplate(cards.find((card) => card.count > 0)?.kind ?? null)
    }
  }, [cards, template, initialTemplate])

  useEffect(() => {
    if (!template) return

    switch (template) {
      case 'payment_certificate':
        setSelectedId((current) => payments.some((payment) => payment.id === current) ? current : (payments[0]?.id ?? 0))
        break
      case 'rent_revision_notice':
        setSelectedId((current) => revisableLeases.some((entry) => entry.lease.id === current) ? current : (revisableLeases[0]?.lease.id ?? 0))
        break
      case 'deposit_receipt':
        setSelectedId((current) => depositReceiptLeases.some((lease) => lease.id === current) ? current : (depositReceiptLeases[0]?.id ?? 0))
        break
      case 'deposit_settlement':
        setSelectedId((current) => depositSettlementLeases.some((lease) => lease.id === current) ? current : (depositSettlementLeases[0]?.id ?? 0))
        break
      default:
        setSelectedId(0)
    }
  }, [depositReceiptLeases, depositSettlementLeases, payments, revisableLeases, template])

  // Apply remembered template params once
  useEffect(() => {
    if (memoryApplied || !template || !getTemplateParams) return
    const params = getTemplateParams(template)
    if (!params) return

    setMemoryApplied(true)

    switch (template) {
      case 'payment_certificate': {
        const pid = params.paymentId as number
        if (pid && payments.some((p) => p.id === pid)) setSelectedId(pid)
        break
      }
      case 'rent_revision_notice': {
        const lid = params.leaseId as number
        if (lid && revisableLeases.some((e) => e.lease.id === lid)) setSelectedId(lid)
        if (params.noticeDate) setNoticeDate(params.noticeDate as string)
        if (params.effectiveDate) setEffectiveDate(params.effectiveDate as string)
        break
      }
      case 'deposit_receipt': {
        const lid = params.leaseId as number
        if (lid && depositReceiptLeases.some((l) => l.id === lid)) setSelectedId(lid)
        break
      }
      case 'deposit_settlement': {
        const lid = params.leaseId as number
        if (lid && depositSettlementLeases.some((l) => l.id === lid)) setSelectedId(lid)
        break
      }
    }
  }, [template, memoryApplied, getTemplateParams, payments, revisableLeases, depositReceiptLeases, depositSettlementLeases])

  const selectedPayment = payments.find((payment) => payment.id === selectedId) ?? null
  const selectedRevisable = revisableLeases.find((entry) => entry.lease.id === selectedId) ?? null
  const selectedDepositReceiptLease = depositReceiptLeases.find((lease) => lease.id === selectedId) ?? null
  const selectedDepositSettlementLease = depositSettlementLeases.find((lease) => lease.id === selectedId) ?? null

  useEffect(() => {
    if (template !== 'rent_revision_notice' || !selectedRevisable) return
    setEffectiveDate(selectedRevisable.context.effectiveDate)
  }, [selectedId, selectedRevisable, template])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!template) return setError('Aucun modele disponible pour le moment.')
    if (!selectedId) return setError('Selectionnez un element.')

    setGenerating(true)
    setError('')

    try {
      let saved = false

      switch (template) {
        case 'payment_certificate':
          saved = await onGenerate({ kind: 'payment_certificate', paymentId: selectedId })
          break
        case 'rent_revision_notice':
          if (!noticeDate || !effectiveDate) {
            setGenerating(false)
            return setError('Renseignez la date de l avis et la date d effet.')
          }
          saved = await onGenerate({
            kind: 'rent_revision_notice',
            leaseId: selectedId,
            noticeDate,
            effectiveDate,
          })
          break
        case 'deposit_receipt':
          saved = await onGenerate({ kind: 'deposit_receipt', leaseId: selectedId })
          break
        case 'deposit_settlement':
          saved = await onGenerate({ kind: 'deposit_settlement', leaseId: selectedId })
          break
      }

      if (saved) {
        setDone(true)
      }
    } catch (err) {
      setError(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setGenerating(false)
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
        className="w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-textPrimary">Centre de modeles</h2>
          </div>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-success/10">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
            <p className="text-base font-semibold text-textPrimary">Document genere</p>
            <p className="text-sm text-textMuted text-center">
              Le PDF a ete enregistre puis ajoute a la liste des documents.
            </p>
            <Button onClick={onClose} className="mt-2">Fermer</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
            <div className="grid grid-cols-2 gap-3">
              {cards.map((card) => {
                const Icon = card.icon
                const active = template === card.kind
                const disabled = card.count === 0

                return (
                  <button
                    key={card.kind}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setTemplate(card.kind)
                      setError('')
                    }}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      active
                        ? 'border-primary bg-primary/10'
                        : disabled
                          ? 'border-border/60 bg-surfaceHigh/40 opacity-60 cursor-not-allowed'
                          : 'border-border hover:border-primary/40 bg-surfaceHigh/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${active ? 'bg-primary/15' : 'bg-surface'} border border-border/60`}>
                        <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-textMuted'}`} />
                      </div>
                      <Badge variant={disabled ? 'muted' : 'default'}>{card.count} disponible{card.count > 1 ? 's' : ''}</Badge>
                    </div>
                    <p className="text-sm font-semibold text-textPrimary mt-3">{card.title}</p>
                    <p className="text-xs text-textMuted mt-1 leading-relaxed">{card.description}</p>
                  </button>
                )
              })}
            </div>

            {!template ? (
              <div className="rounded-xl border border-border bg-surfaceHigh/50 px-4 py-5 text-sm text-textMuted">
                Aucun modele ne peut etre genere pour le moment. Verifiez qu un paiement est marque paye, qu un bail est revisable
                ou qu un depot de garantie a ete encaisse ou restitue.
              </div>
            ) : (
              <>
                {template === 'payment_certificate' && (
                  <TemplateSection
                    label="Paiement"
                    selectValue={selectedId}
                    onSelect={(value) => setSelectedId(Number(value))}
                    options={payments.map((payment) => ({
                      id: payment.id,
                      label: `${payment.tenant_first_name} ${payment.tenant_last_name} · ${MONTHS[payment.period_month - 1]} ${payment.period_year} · ${payment.property_name}`,
                    }))}
                  >
                    {selectedPayment && <PaymentPreview payment={selectedPayment} />}
                  </TemplateSection>
                )}

                {template === 'rent_revision_notice' && (
                  <TemplateSection
                    label="Bail"
                    selectValue={selectedId}
                    onSelect={(value) => setSelectedId(Number(value))}
                    options={revisableLeases.map((entry) => ({
                      id: entry.lease.id,
                      label: `${entry.lease.tenant_first_name} ${entry.lease.tenant_last_name} · ${entry.lease.property_name}`,
                    }))}
                  >
                    {selectedRevisable && (
                      <RevisionPreview
                        lease={selectedRevisable.lease}
                        noticeDate={noticeDate}
                        effectiveDate={effectiveDate}
                        onNoticeDateChange={setNoticeDate}
                        onEffectiveDateChange={setEffectiveDate}
                        context={selectedRevisable.context}
                      />
                    )}
                  </TemplateSection>
                )}

                {template === 'deposit_receipt' && (
                  <TemplateSection
                    label="Bail"
                    selectValue={selectedId}
                    onSelect={(value) => setSelectedId(Number(value))}
                    options={depositReceiptLeases.map((lease) => ({
                      id: lease.id,
                      label: `${lease.tenant_first_name} ${lease.tenant_last_name} · ${lease.property_name}`,
                    }))}
                  >
                    {selectedDepositReceiptLease && <DepositReceiptPreview lease={selectedDepositReceiptLease} />}
                  </TemplateSection>
                )}

                {template === 'deposit_settlement' && (
                  <TemplateSection
                    label="Bail"
                    selectValue={selectedId}
                    onSelect={(value) => setSelectedId(Number(value))}
                    options={depositSettlementLeases.map((lease) => ({
                      id: lease.id,
                      label: `${lease.tenant_first_name} ${lease.tenant_last_name} · ${lease.property_name}`,
                    }))}
                  >
                    {selectedDepositSettlementLease && <DepositSettlementPreview lease={selectedDepositSettlementLease} />}
                  </TemplateSection>
                )}
              </>
            )}

            {error && <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Annuler</Button>
              <Button type="submit" disabled={!template || !selectedId || generating} className="flex-1">
                <Download className="w-3.5 h-3.5" />
                {generating ? 'Generation...' : 'Generer le PDF'}
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  )
}

function TemplateSection({
  label,
  selectValue,
  onSelect,
  options,
  children,
}: {
  label: string
  selectValue: number
  onSelect: (value: string) => void
  options: Array<{ id: number; label: string }>
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-textMuted">{label}</label>
        <div className="relative">
          <select
            value={selectValue}
            onChange={(event) => onSelect(event.target.value)}
            className="w-full appearance-none bg-surfaceHigh border border-border rounded-lg px-3 py-2 pr-8 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
          >
            <option value={0} disabled>Choisissez un element...</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted pointer-events-none" />
        </div>
      </div>

      {children}
    </div>
  )
}

function PaymentPreview({ payment }: { payment: Payment }) {
  const full = isFullPayment(payment)

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-surfaceHigh rounded-lg p-3 flex flex-col gap-1.5 text-xs text-textMuted">
        <div className="flex justify-between">
          <span>Locataire</span>
          <span className="text-textPrimary font-medium">{payment.tenant_first_name} {payment.tenant_last_name}</span>
        </div>
        <div className="flex justify-between">
          <span>Bien</span>
          <span className="text-textPrimary font-medium">{payment.property_name}</span>
        </div>
        <div className="flex justify-between">
          <span>Periode</span>
          <span className="text-textPrimary font-medium">{MONTHS[payment.period_month - 1]} {payment.period_year}</span>
        </div>
        <div className="flex justify-between">
          <span>Loyer du</span>
          <span className="text-textPrimary font-medium">{formatCurrency(payment.lease_rent_amount + payment.lease_charges_amount)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 mt-0.5">
          <span>Montant paye</span>
          <span className="text-textPrimary font-semibold">{formatCurrency(payment.rent_amount + payment.charges_amount)}</span>
        </div>
      </div>

      <div className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-xs ${full ? 'bg-primary/10 border border-primary/20' : 'bg-accent/10 border border-accent/20'}`}>
        <Info className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${full ? 'text-primary' : 'text-accent'}`} />
        <div>
          <p className={`font-semibold ${full ? 'text-primary' : 'text-accent'}`}>
            {full ? 'Quittance de loyer' : 'Recu de loyer'}
          </p>
          <p className="text-textMuted mt-0.5">
            {full
              ? 'Paiement integral : une quittance sera generee.'
              : 'Paiement partiel : un recu sera genere.'}
          </p>
        </div>
      </div>
    </div>
  )
}

function RevisionPreview({
  lease,
  context,
  noticeDate,
  effectiveDate,
  onNoticeDateChange,
  onEffectiveDateChange,
}: {
  lease: Lease
  context: NonNullable<ReturnType<typeof getRevisionTemplateContext>>
  noticeDate: string
  effectiveDate: string
  onNoticeDateChange: (value: string) => void
  onEffectiveDateChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-surfaceHigh rounded-lg p-3 flex flex-col gap-1.5 text-xs text-textMuted">
        <div className="flex justify-between">
          <span>Locataire</span>
          <span className="text-textPrimary font-medium">{lease.tenant_first_name} {lease.tenant_last_name}</span>
        </div>
        <div className="flex justify-between">
          <span>Bien</span>
          <span className="text-textPrimary font-medium">{lease.property_name}</span>
        </div>
        <div className="flex justify-between">
          <span>IRL reference</span>
          <span className="text-textPrimary font-medium">{context.revision.referenceLabel} ({context.revision.referenceIrl})</span>
        </div>
        <div className="flex justify-between">
          <span>Nouvel IRL</span>
          <span className="text-textPrimary font-medium">{context.revision.newLabel} ({context.revision.newIrl})</span>
        </div>
        <div className="flex justify-between">
          <span>Loyer actuel HC</span>
          <span className="text-textPrimary font-medium">{formatCurrency(context.revision.oldRent)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 mt-0.5">
          <span>Nouveau loyer HC</span>
          <span className="text-primary font-semibold">{formatCurrency(context.revision.newRent)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-textMuted">Date de l avis</label>
          <input
            type="date"
            value={noticeDate}
            onChange={(event) => onNoticeDateChange(event.target.value)}
            className="w-full bg-surfaceHigh border border-border rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-textMuted">Date d effet</label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(event) => onEffectiveDateChange(event.target.value)}
            className="w-full bg-surfaceHigh border border-border rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2.5 text-xs text-textMuted">
        Le document rappellera la formule de revision IRL et notifiera un nouveau loyer mensuel hors charges de
        {' '}<span className="text-primary font-semibold">{formatCurrency(context.revision.newRent)}</span> a compter du
        {' '}<span className="text-textPrimary font-medium">{effectiveDate ? formatDate(effectiveDate) : 'la date choisie'}</span>.
      </div>
    </div>
  )
}

function DepositReceiptPreview({ lease }: { lease: Lease }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-surfaceHigh rounded-lg p-3 flex flex-col gap-1.5 text-xs text-textMuted">
        <div className="flex justify-between">
          <span>Locataire</span>
          <span className="text-textPrimary font-medium">{lease.tenant_first_name} {lease.tenant_last_name}</span>
        </div>
        <div className="flex justify-between">
          <span>Bien</span>
          <span className="text-textPrimary font-medium">{lease.property_name}</span>
        </div>
        <div className="flex justify-between">
          <span>Depot encaisse</span>
          <span className="text-textPrimary font-medium">{formatCurrency(lease.deposit_amount)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 mt-0.5">
          <span>Date d encaissement</span>
          <span className="text-textPrimary font-semibold">{formatDate(lease.deposit_received_date!)}</span>
        </div>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2.5 text-xs text-textMuted">
        Le PDF constatera l encaissement du depot de garantie prevu au bail du {formatDate(lease.start_date)}.
      </div>
    </div>
  )
}

function DepositSettlementPreview({ lease }: { lease: Lease }) {
  const returnedAmount = getDepositReturnedAmount(lease)

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-surfaceHigh rounded-lg p-3 flex flex-col gap-1.5 text-xs text-textMuted">
        <div className="flex justify-between">
          <span>Locataire</span>
          <span className="text-textPrimary font-medium">{lease.tenant_first_name} {lease.tenant_last_name}</span>
        </div>
        <div className="flex justify-between">
          <span>Bien</span>
          <span className="text-textPrimary font-medium">{lease.property_name}</span>
        </div>
        <div className="flex justify-between">
          <span>Depot initial</span>
          <span className="text-textPrimary font-medium">{formatCurrency(lease.deposit_amount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Montant retenu</span>
          <span className="text-textPrimary font-medium">{formatCurrency(lease.deposit_retained_amount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Montant restitue</span>
          <span className="text-textPrimary font-medium">{formatCurrency(returnedAmount)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 mt-0.5">
          <span>Date de restitution</span>
          <span className="text-textPrimary font-semibold">{formatDate(lease.deposit_refund_date!)}</span>
        </div>
      </div>

      <div className="rounded-lg border border-warning/20 bg-warning/10 px-3 py-2.5 text-xs text-textMuted">
        {lease.deposit_notes?.trim()
          ? `Les observations enregistrees seront reprises dans le document : ${lease.deposit_notes.trim()}`
          : 'Le document mentionnera qu aucune observation complementaire n a ete renseignee.'}
      </div>
    </div>
  )
}
