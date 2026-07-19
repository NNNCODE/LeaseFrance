import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Info,
  Receipt,
  ScrollText,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import DateInput from '@/components/ui/date-input'
import FurnishedLeaseContractEditor from './FurnishedLeaseContractEditor'
import {
  getFurnishedLeaseContractAdvisories,
  getFurnishedLeaseContractBlockingIssues,
  prepareLeaseContractDetails,
} from '@/lib/leaseContractDocument'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  canGenerateFurnishedLeaseContract,
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
  | { kind: 'furnished_lease_contract'; leaseId: number; contractDetails: LeaseContractDetails }

interface GenerateDocumentModalProps {
  profile: UserProfile | null
  resolveLeaseProfile: (lease: Lease) => UserProfile | OwnerProfile | null
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
  titleKey: string
  descriptionKey: string
  count: number
  icon: typeof FileText
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function GenerateDocumentModal({
  profile,
  resolveLeaseProfile,
  payments,
  leases,
  irlIndices,
  onGenerate,
  onClose,
  initialTemplate,
  getTemplateParams,
}: GenerateDocumentModalProps) {
  const { t } = useTranslation()
  const revisableLeases = useMemo(
    () => leases
      .map((lease) => ({ lease, context: getRevisionTemplateContext(lease, irlIndices) }))
      .filter((entry): entry is { lease: Lease; context: NonNullable<ReturnType<typeof getRevisionTemplateContext>> } => Boolean(entry.context)),
    [leases, irlIndices],
  )
  const furnishedContractLeases = useMemo(() => leases.filter(canGenerateFurnishedLeaseContract), [leases])
  const depositReceiptLeases = useMemo(() => leases.filter(canGenerateDepositReceipt), [leases])
  const depositSettlementLeases = useMemo(() => leases.filter(canGenerateDepositSettlement), [leases])

  const cards: TemplateCard[] = useMemo(() => [
    {
      kind: 'payment_certificate',
      titleKey: 'documents.modal.cards.payment_certificate.title',
      descriptionKey: 'documents.modal.cards.payment_certificate.description',
      count: payments.length,
      icon: Receipt,
    },
    {
      kind: 'rent_revision_notice',
      titleKey: 'documents.modal.cards.rent_revision_notice.title',
      descriptionKey: 'documents.modal.cards.rent_revision_notice.description',
      count: revisableLeases.length,
      icon: TrendingUp,
    },
    {
      kind: 'furnished_lease_contract',
      titleKey: 'documents.modal.cards.furnished_lease_contract.title',
      descriptionKey: 'documents.modal.cards.furnished_lease_contract.description',
      count: furnishedContractLeases.length,
      icon: ScrollText,
    },
    {
      kind: 'deposit_receipt',
      titleKey: 'documents.modal.cards.deposit_receipt.title',
      descriptionKey: 'documents.modal.cards.deposit_receipt.description',
      count: depositReceiptLeases.length,
      icon: ShieldCheck,
    },
    {
      kind: 'deposit_settlement',
      titleKey: 'documents.modal.cards.deposit_settlement.title',
      descriptionKey: 'documents.modal.cards.deposit_settlement.description',
      count: depositSettlementLeases.length,
      icon: FileText,
    },
  ], [
    payments.length,
    revisableLeases.length,
    furnishedContractLeases.length,
    depositReceiptLeases.length,
    depositSettlementLeases.length,
  ])

  const [template, setTemplate] = useState<DocumentTemplateKind | null>(null)
  const [selectedId, setSelectedId] = useState(0)
  const [noticeDate, setNoticeDate] = useState(today())
  const [effectiveDate, setEffectiveDate] = useState(today())
  const [contractDetails, setContractDetails] = useState<LeaseContractDetails | null>(null)
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
    setMemoryApplied(false)
  }, [template])

  useEffect(() => {
    if (!template) return

    switch (template) {
      case 'payment_certificate':
        setSelectedId((current) => payments.some((payment) => payment.id === current) ? current : (payments[0]?.id ?? 0))
        break
      case 'rent_revision_notice':
        setSelectedId((current) => revisableLeases.some((entry) => entry.lease.id === current) ? current : (revisableLeases[0]?.lease.id ?? 0))
        break
      case 'furnished_lease_contract':
        setSelectedId((current) => furnishedContractLeases.some((lease) => lease.id === current) ? current : (furnishedContractLeases[0]?.id ?? 0))
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
  }, [depositReceiptLeases, depositSettlementLeases, furnishedContractLeases, payments, revisableLeases, template])

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
      case 'furnished_lease_contract': {
        const lid = params.leaseId as number
        if (lid && furnishedContractLeases.some((l) => l.id === lid)) setSelectedId(lid)
        break
      }
      case 'deposit_settlement': {
        const lid = params.leaseId as number
        if (lid && depositSettlementLeases.some((l) => l.id === lid)) setSelectedId(lid)
        break
      }
    }
  }, [template, memoryApplied, getTemplateParams, payments, revisableLeases, furnishedContractLeases, depositReceiptLeases, depositSettlementLeases])

  const selectedPayment = payments.find((payment) => payment.id === selectedId) ?? null
  const selectedRevisable = revisableLeases.find((entry) => entry.lease.id === selectedId) ?? null
  const selectedFurnishedLease = furnishedContractLeases.find((lease) => lease.id === selectedId) ?? null
  const selectedDepositReceiptLease = depositReceiptLeases.find((lease) => lease.id === selectedId) ?? null
  const selectedDepositSettlementLease = depositSettlementLeases.find((lease) => lease.id === selectedId) ?? null
  const selectedPaymentLease = selectedPayment
    ? leases.find((lease) => lease.id === selectedPayment.lease_id) ?? null
    : null
  const selectedLeaseProfile = selectedFurnishedLease
    ? resolveLeaseProfile(selectedFurnishedLease)
    : selectedRevisable
      ? resolveLeaseProfile(selectedRevisable.lease)
      : selectedDepositReceiptLease
        ? resolveLeaseProfile(selectedDepositReceiptLease)
        : selectedDepositSettlementLease
          ? resolveLeaseProfile(selectedDepositSettlementLease)
          : selectedPaymentLease
            ? resolveLeaseProfile(selectedPaymentLease)
            : profile

  useEffect(() => {
    if (template !== 'furnished_lease_contract' || !selectedFurnishedLease) return
    setContractDetails(prepareLeaseContractDetails(selectedFurnishedLease, selectedLeaseProfile))
  }, [template, selectedFurnishedLease, selectedLeaseProfile])

  useEffect(() => {
    if (template !== 'rent_revision_notice' || !selectedRevisable) return
    setEffectiveDate(selectedRevisable.context.effectiveDate)
  }, [selectedId, selectedRevisable, template])

  const contractBlockingIssues = useMemo(
    () => template === 'furnished_lease_contract' && selectedFurnishedLease && contractDetails
      ? getFurnishedLeaseContractBlockingIssues(selectedFurnishedLease, contractDetails, selectedLeaseProfile)
      : [],
    [template, selectedFurnishedLease, contractDetails, selectedLeaseProfile],
  )
  const contractAdvisories = useMemo(
    () => template === 'furnished_lease_contract' && selectedFurnishedLease && contractDetails
      ? getFurnishedLeaseContractAdvisories(selectedFurnishedLease, contractDetails)
      : [],
    [template, selectedFurnishedLease, contractDetails],
  )

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!template) return setError(t('documents.modal.errors.noTemplate'))
    if (!selectedId) return setError(t('documents.modal.errors.selectItem'))

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
            return setError(t('documents.modal.errors.fillRevisionDates'))
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
        case 'furnished_lease_contract':
          if (!selectedFurnishedLease || !contractDetails) {
            setGenerating(false)
            return setError(t('documents.modal.errors.selectFurnishedLease'))
          }
          if (contractBlockingIssues.length > 0) {
            setGenerating(false)
            return setError(t('documents.modal.errors.missingRequiredMentions'))
          }
          saved = await onGenerate({
            kind: 'furnished_lease_contract',
            leaseId: selectedId,
            contractDetails,
          })
          break
      }

      if (saved) {
        setDone(true)
      }
    } catch (err) {
      setError(t('documents.modal.errors.generic', { error: err instanceof Error ? err.message : String(err) }))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-6"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="flex min-h-full items-start justify-center sm:items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl sm:max-h-[calc(100vh-3rem)]"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-textPrimary">{t('documents.modal.title')}</h2>
            </div>
            <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {done ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-success/10">
                <CheckCircle2 className="w-7 h-7 text-success" />
              </div>
              <p className="text-base font-semibold text-textPrimary">{t('documents.modal.doneTitle')}</p>
              <p className="text-sm text-textMuted">
                {t('documents.modal.doneDesc')}
              </p>
              <Button onClick={onClose} className="mt-2">{t('common.close')}</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div className="flex flex-col gap-5 pr-1">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                      <Badge variant={disabled ? 'muted' : 'default'}>
                        {t('documents.modal.availableCount', { count: card.count })}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-textPrimary mt-3">{t(card.titleKey)}</p>
                    <p className="text-xs text-textMuted mt-1 leading-relaxed">{t(card.descriptionKey)}</p>
                  </button>
                )
              })}
                  </div>

                  {!template ? (
                    <div className="rounded-xl border border-border bg-surfaceHigh/50 px-4 py-5 text-sm text-textMuted">
                      {t('documents.modal.noTemplate')}
                    </div>
                  ) : (
                    <>
                {template === 'payment_certificate' && (
                  <TemplateSection
                    label={t('documents.modal.labels.payment')}
                    selectValue={selectedId}
                    onSelect={(value) => setSelectedId(Number(value))}
                    options={payments.map((payment) => ({
                      id: payment.id,
                      label: `${payment.tenant_first_name} ${payment.tenant_last_name} | ${MONTHS[payment.period_month - 1]} ${payment.period_year} | ${payment.property_name}`,
                    }))}
                  >
                    {selectedPayment && <PaymentPreview payment={selectedPayment} />}
                  </TemplateSection>
                )}

                {template === 'rent_revision_notice' && (
                  <TemplateSection
                    label={t('documents.modal.labels.lease')}
                    selectValue={selectedId}
                    onSelect={(value) => setSelectedId(Number(value))}
                    options={revisableLeases.map((entry) => ({
                      id: entry.lease.id,
                      label: `${entry.lease.tenant_first_name} ${entry.lease.tenant_last_name} | ${entry.lease.property_name}`,
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

                {template === 'furnished_lease_contract' && (
                  <TemplateSection
                    label={t('documents.modal.labels.furnishedLease')}
                    selectValue={selectedId}
                    onSelect={(value) => setSelectedId(Number(value))}
                    options={furnishedContractLeases.map((lease) => ({
                      id: lease.id,
                      label: `${lease.tenant_first_name} ${lease.tenant_last_name} | ${lease.property_name}`,
                    }))}
                  >
                    {selectedFurnishedLease && contractDetails && (
                      <FurnishedLeaseContractEditor
                        lease={selectedFurnishedLease}
                        details={contractDetails}
                        blockingIssues={contractBlockingIssues}
                        advisories={contractAdvisories}
                        onChange={setContractDetails}
                      />
                    )}
                  </TemplateSection>
                )}

                {template === 'deposit_receipt' && (
                  <TemplateSection
                    label={t('documents.modal.labels.lease')}
                    selectValue={selectedId}
                    onSelect={(value) => setSelectedId(Number(value))}
                    options={depositReceiptLeases.map((lease) => ({
                      id: lease.id,
                      label: `${lease.tenant_first_name} ${lease.tenant_last_name} | ${lease.property_name}`,
                    }))}
                  >
                    {selectedDepositReceiptLease && <DepositReceiptPreview lease={selectedDepositReceiptLease} />}
                  </TemplateSection>
                )}

                {template === 'deposit_settlement' && (
                  <TemplateSection
                    label={t('documents.modal.labels.lease')}
                    selectValue={selectedId}
                    onSelect={(value) => setSelectedId(Number(value))}
                    options={depositSettlementLeases.map((lease) => ({
                      id: lease.id,
                      label: `${lease.tenant_first_name} ${lease.tenant_last_name} | ${lease.property_name}`,
                    }))}
                  >
                    {selectedDepositSettlementLease && <DepositSettlementPreview lease={selectedDepositSettlementLease} />}
                  </TemplateSection>
                )}
                    </>
                  )}

                  {error && <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}
                </div>
              </div>

              <div className="shrink-0 border-t border-border px-6 py-4">
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t('common.cancel')}</Button>
                  <Button
                    type="submit"
                    disabled={!template || !selectedId || generating || (template === 'furnished_lease_contract' && contractBlockingIssues.length > 0)}
                    className="flex-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {generating ? t('documents.modal.generating') : t('documents.modal.generatePdf')}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </div>
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
  const { t } = useTranslation()

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
            <option value={0} disabled>{t('documents.modal.selectPlaceholder')}</option>
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
  const { t } = useTranslation()
  const full = isFullPayment(payment)

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-surfaceHigh rounded-lg p-3 flex flex-col gap-1.5 text-xs text-textMuted">
        <div className="flex justify-between">
          <span>{t('documents.modal.payment.tenant')}</span>
          <span className="text-textPrimary font-medium">{payment.tenant_first_name} {payment.tenant_last_name}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('documents.modal.payment.property')}</span>
          <span className="text-textPrimary font-medium">{payment.property_name}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('documents.modal.payment.period')}</span>
          <span className="text-textPrimary font-medium">{MONTHS[payment.period_month - 1]} {payment.period_year}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('documents.modal.payment.rentDue')}</span>
          <span className="text-textPrimary font-medium">{formatCurrency(payment.lease_rent_amount + payment.lease_charges_amount)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 mt-0.5">
          <span>{t('documents.modal.payment.paidAmount')}</span>
          <span className="text-textPrimary font-semibold">{formatCurrency(payment.rent_amount + payment.charges_amount)}</span>
        </div>
      </div>

      <div className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-xs ${full ? 'bg-primary/10 border border-primary/20' : 'bg-accent/10 border border-accent/20'}`}>
        <Info className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${full ? 'text-primary' : 'text-accent'}`} />
        <div>
          <p className={`font-semibold ${full ? 'text-primary' : 'text-accent'}`}>
            {full ? t('documents.modal.payment.fullTitle') : t('documents.modal.payment.partialTitle')}
          </p>
          <p className="text-textMuted mt-0.5">
            {full
              ? t('documents.modal.payment.fullDesc')
              : t('documents.modal.payment.partialDesc')}
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
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-surfaceHigh rounded-lg p-3 flex flex-col gap-1.5 text-xs text-textMuted">
        <div className="flex justify-between">
          <span>{t('documents.modal.revision.tenant')}</span>
          <span className="text-textPrimary font-medium">{lease.tenant_first_name} {lease.tenant_last_name}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('documents.modal.revision.property')}</span>
          <span className="text-textPrimary font-medium">{lease.property_name}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('documents.modal.revision.referenceIrl')}</span>
          <span className="text-textPrimary font-medium">{context.revision.referenceLabel} ({context.revision.referenceIrl})</span>
        </div>
        <div className="flex justify-between">
          <span>{t('documents.modal.revision.newIrl')}</span>
          <span className="text-textPrimary font-medium">{context.revision.newLabel} ({context.revision.newIrl})</span>
        </div>
        <div className="flex justify-between">
          <span>{t('documents.modal.revision.currentRent')}</span>
          <span className="text-textPrimary font-medium">{formatCurrency(context.revision.oldRent)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 mt-0.5">
          <span>{t('documents.modal.revision.newRent')}</span>
          <span className="text-primary font-semibold">{formatCurrency(context.revision.newRent)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-textMuted">{t('documents.modal.revision.noticeDate')}</label>
          <DateInput
            value={noticeDate}
            onChange={(value) => onNoticeDateChange(value ?? '')}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-textMuted">{t('documents.modal.revision.effectiveDate')}</label>
          <DateInput
            value={effectiveDate}
            onChange={(value) => onEffectiveDateChange(value ?? '')}
          />
        </div>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2.5 text-xs text-textMuted">
        {t('documents.modal.revision.summary', {
          amount: formatCurrency(context.revision.newRent),
          date: effectiveDate ? formatDate(effectiveDate) : t('documents.modal.revision.dateChosen'),
        })}
      </div>
    </div>
  )
}

function DepositReceiptPreview({ lease }: { lease: Lease }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-surfaceHigh rounded-lg p-3 flex flex-col gap-1.5 text-xs text-textMuted">
        <div className="flex justify-between">
          <span>{t('documents.modal.depositReceipt.tenant')}</span>
          <span className="text-textPrimary font-medium">{lease.tenant_first_name} {lease.tenant_last_name}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('documents.modal.depositReceipt.property')}</span>
          <span className="text-textPrimary font-medium">{lease.property_name}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('documents.modal.depositReceipt.amount')}</span>
          <span className="text-textPrimary font-medium">{formatCurrency(lease.deposit_amount)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 mt-0.5">
          <span>{t('documents.modal.depositReceipt.date')}</span>
          <span className="text-textPrimary font-semibold">{formatDate(lease.deposit_received_date!)}</span>
        </div>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2.5 text-xs text-textMuted">
        {t('documents.modal.depositReceipt.summary', { date: formatDate(lease.start_date) })}
      </div>
    </div>
  )
}

function DepositSettlementPreview({ lease }: { lease: Lease }) {
  const { t } = useTranslation()
  const returnedAmount = getDepositReturnedAmount(lease)

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-surfaceHigh rounded-lg p-3 flex flex-col gap-1.5 text-xs text-textMuted">
        <div className="flex justify-between">
          <span>{t('documents.modal.depositSettlement.tenant')}</span>
          <span className="text-textPrimary font-medium">{lease.tenant_first_name} {lease.tenant_last_name}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('documents.modal.depositSettlement.property')}</span>
          <span className="text-textPrimary font-medium">{lease.property_name}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('documents.modal.depositSettlement.initialAmount')}</span>
          <span className="text-textPrimary font-medium">{formatCurrency(lease.deposit_amount)}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('documents.modal.depositSettlement.retainedAmount')}</span>
          <span className="text-textPrimary font-medium">{formatCurrency(lease.deposit_retained_amount)}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('documents.modal.depositSettlement.returnedAmount')}</span>
          <span className="text-textPrimary font-medium">{formatCurrency(returnedAmount)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 mt-0.5">
          <span>{t('documents.modal.depositSettlement.date')}</span>
          <span className="text-textPrimary font-semibold">{formatDate(lease.deposit_refund_date!)}</span>
        </div>
      </div>

      <div className="rounded-lg border border-warning/20 bg-warning/10 px-3 py-2.5 text-xs text-textMuted">
        {lease.deposit_notes?.trim()
          ? t('documents.modal.depositSettlement.summaryWithNotes', { notes: lease.deposit_notes.trim() })
          : t('documents.modal.depositSettlement.summaryWithoutNotes')}
      </div>
    </div>
  )
}
