import { useRef, useState, type ChangeEvent } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  FileSpreadsheet,
  Link2,
  Shield,
  Upload,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  allocateImportedAmount,
  detectBankPreset,
  parseBankCsv,
  suggestBankImport,
  BANK_PRESETS,
  type BankImportSuggestion,
  type MatchReason,
  type ParsedBankTransaction,
} from './bankImport'
import { monthLabel, paymentVersionToken } from './paymentPageUtils'

interface ImportDraft {
  transaction: ParsedBankTransaction
  mode: BankImportSuggestion['mode']
  paymentId: number
  leaseId: number
  periodMonth: number
  periodYear: number
  confidence: BankImportSuggestion['confidence']
  score: number
  reasons: MatchReason[]
  isDuplicate: boolean
}

interface PaymentBankImportModalProps {
  payments: Payment[]
  leases: Lease[]
  onApplied: () => Promise<void>
  onClose: () => void
}

function translateErrorMessage(t: TFunction, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.startsWith('payments.bankImport.') ? t(message) : message
}

function translateReasonDetail(t: TFunction, reason: MatchReason) {
  const values: Record<string, string | number> = { ...(reason.values ?? {}) }
  if (typeof values.expected === 'number') values.expected = formatCurrency(values.expected)
  if (typeof values.diff === 'number') values.diff = formatCurrency(values.diff)
  return t(reason.detailKey, values)
}

function importedNote(t: TFunction, description: string, rowNumber: number) {
  return t('payments.bankImport.importedNote', { row: rowNumber, description })
}

function presetLabel(t: TFunction, presetId: string) {
  const preset = BANK_PRESETS.find((entry) => entry.id === presetId)
  if (!preset) return presetId
  return preset.id === 'auto' ? t('payments.bankImport.preset.auto') : preset.name
}

export default function PaymentBankImportModal({
  payments,
  leases,
  onApplied,
  onClose,
}: PaymentBankImportModalProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ImportDraft[]>([])
  const [ignoredCount, setIgnoredCount] = useState(0)
  const [duplicateCount, setDuplicateCount] = useState(0)
  const [error, setError] = useState('')
  const [applying, setApplying] = useState(false)
  const [presetId, setPresetId] = useState('auto')
  const [detectedPreset, setDetectedPreset] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [rawText, setRawText] = useState('')

  const activeLeases = leases.filter((lease) => lease.status === 'active')
  const editablePayments = payments.filter((payment) => payment.status !== 'paid')
  const selectedRows = rows.filter((row) => row.mode !== 'ignore')
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  function isReadyForImport(row: ImportDraft) {
    if (row.mode === 'mark_existing') {
      return row.paymentId > 0 && editablePayments.some((payment) => payment.id === row.paymentId)
    }

    if (row.mode === 'create_new') {
      return (
        row.leaseId > 0
        && activeLeases.some((lease) => lease.id === row.leaseId)
        && row.periodMonth >= 1
        && row.periodMonth <= 12
        && Number.isInteger(row.periodYear)
      )
    }

    return false
  }

  const actionableRows = selectedRows.filter(isReadyForImport)
  const invalidSelectedRows = selectedRows.filter((row) => !isReadyForImport(row))

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    setFileName(file.name)
    setShowConfirm(false)

    try {
      const text = await file.text()
      setRawText(text)

      const detected = detectBankPreset(text)
      setDetectedPreset(detected)
      const effectivePreset = presetId === 'auto' ? detected : presetId

      await parseAndSuggest(text, effectivePreset)
    } catch (err) {
      setRows([])
      setError(translateErrorMessage(t, err))
    } finally {
      event.target.value = ''
    }
  }

  async function parseAndSuggest(text: string, preset: string) {
    const parsed = parseBankCsv(text, preset)
    const credits = parsed.filter((transaction) => transaction.direction === 'credit')

    setIgnoredCount(parsed.length - credits.length)

    const fingerprints = credits.map((transaction) => transaction.fingerprint)
    let duplicateFingerprints: string[] = []
    try {
      duplicateFingerprints = await window.api.bankImports.findDuplicates(fingerprints)
    } catch {
      duplicateFingerprints = []
    }
    const duplicates = new Set(duplicateFingerprints)
    setDuplicateCount(duplicateFingerprints.length)

    setRows(credits.map((transaction) => {
      const isDuplicate = duplicates.has(transaction.fingerprint)
      const suggestion = suggestBankImport(transaction, payments, leases)
      return {
        transaction,
        mode: isDuplicate ? 'ignore' : suggestion.mode,
        paymentId: suggestion.paymentId ?? 0,
        leaseId: suggestion.leaseId ?? 0,
        periodMonth: suggestion.periodMonth,
        periodYear: suggestion.periodYear,
        confidence: suggestion.confidence,
        score: suggestion.score,
        reasons: suggestion.reasons,
        isDuplicate,
      }
    }))
  }

  function handlePresetChange(nextPresetId: string) {
    setPresetId(nextPresetId)
    if (!rawText) return

    setError('')
    const effectivePreset = nextPresetId === 'auto' ? detectedPreset : nextPresetId
    void parseAndSuggest(rawText, effectivePreset).catch((err) => {
      setRows([])
      setError(translateErrorMessage(t, err))
    })
  }

  function updateRow(transactionId: string, patch: Partial<ImportDraft>) {
    setRows((current) => current.map((row) => (
      row.transaction.id === transactionId ? { ...row, ...patch } : row
    )))
  }

  function batchAcceptAll() {
    setRows((current) => current.map((row) => {
      if (row.isDuplicate) return row
      const suggestion = suggestBankImport(row.transaction, payments, leases)
      return {
        ...row,
        mode: suggestion.mode,
        paymentId: suggestion.paymentId ?? row.paymentId,
        leaseId: suggestion.leaseId ?? row.leaseId,
        periodMonth: suggestion.periodMonth,
        periodYear: suggestion.periodYear,
        confidence: suggestion.confidence,
        score: suggestion.score,
        reasons: suggestion.reasons,
      }
    }))
  }

  function batchAcceptConfident() {
    setRows((current) => current.map((row) => {
      if (row.isDuplicate) return row
      const suggestion = suggestBankImport(row.transaction, payments, leases)
      if (suggestion.confidence === 'high' || suggestion.confidence === 'medium') {
        return {
          ...row,
          mode: suggestion.mode,
          paymentId: suggestion.paymentId ?? row.paymentId,
          leaseId: suggestion.leaseId ?? row.leaseId,
          periodMonth: suggestion.periodMonth,
          periodYear: suggestion.periodYear,
          confidence: suggestion.confidence,
          score: suggestion.score,
          reasons: suggestion.reasons,
        }
      }
      return { ...row, mode: 'ignore' }
    }))
  }

  function batchIgnoreAll() {
    setRows((current) => current.map((row) => ({ ...row, mode: 'ignore' })))
  }
  function handleConfirmStep() {
    setError('')

    if (invalidSelectedRows.length > 0) {
      setError(t('payments.bankImport.errors.incompleteRows', { count: invalidSelectedRows.length }))
      return
    }

    if (actionableRows.length === 0) {
      setError(t('payments.bankImport.errors.noImportableRows'))
      return
    }

    setShowConfirm(true)
  }

  async function handleApply() {
    setApplying(true)
    setError('')

    try {
      const importedEntries: Array<{
        fingerprint: string
        tx_date: string
        description: string
        amount: number
        payment_id: number | null
      }> = []

      for (const row of actionableRows) {
        if (row.mode === 'mark_existing') {
          const payment = editablePayments.find((entry) => entry.id === row.paymentId)
          if (!payment) continue

          const allocation = allocateImportedAmount(
            row.transaction.amount,
            payment.lease_rent_amount,
            payment.lease_charges_amount,
          )

          await window.api.payments.update(payment.id, {
            rent_amount: allocation.rentAmount,
            charges_amount: allocation.chargesAmount,
            payment_date: row.transaction.date,
            payment_method: 'virement',
            status: 'paid',
            notes: appendImportedNote(
              payment.notes,
              importedNote(t, row.transaction.description, row.transaction.rowNumber),
            ),
          }, paymentVersionToken(payment))

          importedEntries.push({
            fingerprint: row.transaction.fingerprint,
            tx_date: row.transaction.date,
            description: row.transaction.description,
            amount: row.transaction.amount,
            payment_id: payment.id,
          })
        }

        if (row.mode === 'create_new') {
          const lease = activeLeases.find((entry) => entry.id === row.leaseId)
          if (!lease) continue

          const allocation = allocateImportedAmount(
            row.transaction.amount,
            lease.rent_amount,
            lease.charges_amount,
          )

          const created = await window.api.payments.create({
            lease_id: lease.id,
            period_month: row.periodMonth,
            period_year: row.periodYear,
            rent_amount: allocation.rentAmount,
            charges_amount: allocation.chargesAmount,
            payment_date: row.transaction.date,
            payment_method: 'virement',
            status: 'paid',
            notes: importedNote(t, row.transaction.description, row.transaction.rowNumber),
          })

          importedEntries.push({
            fingerprint: row.transaction.fingerprint,
            tx_date: row.transaction.date,
            description: row.transaction.description,
            amount: row.transaction.amount,
            payment_id: created.id,
          })
        }
      }

      if (importedEntries.length > 0) {
        try {
          await window.api.bankImports.recordImported(importedEntries)
        } catch {
        }
      } else {
        throw new Error('payments.bankImport.errors.noValidRows')
      }

      await onApplied()
      onClose()
    } catch (err) {
      setError(t('payments.bankImport.errors.generic', { error: translateErrorMessage(t, err) }))
      setApplying(false)
      setShowConfirm(false)
    }
  }

  const markExistingCount = actionableRows.filter((row) => row.mode === 'mark_existing').length
  const createNewCount = actionableRows.filter((row) => row.mode === 'create_new').length
  const ignoreCount = rows.filter((row) => row.mode === 'ignore').length
  const autoPresetHint = detectedPreset && detectedPreset !== 'auto'
    ? ` (${t('payments.bankImport.preset.detected', { name: presetLabel(t, detectedPreset) })})`
    : ''

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
        className="w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            <div>
              <h2 className="text-base font-semibold text-textPrimary">{t('payments.bankImport.title')}</h2>
              <p className="mt-0.5 text-xs text-textMuted">{t('payments.bankImport.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-textMuted transition-colors hover:text-textPrimary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex max-h-[85vh] flex-col gap-5 overflow-y-auto p-6">
          <div className="rounded-2xl border border-border bg-surfaceHigh/40 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-textPrimary">
                    {fileName || t('payments.bankImport.filePlaceholder')}
                  </p>
                  <p className="mt-1 text-xs text-textMuted">{t('payments.bankImport.expectedColumns')}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" />
                  {t('payments.bankImport.chooseCsv')}
                </Button>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <label className="shrink-0 text-xs font-medium text-textMuted">{t('payments.bankImport.presetLabel')}</label>
              <select
                value={presetId}
                onChange={(event) => handlePresetChange(event.target.value)}
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary transition-colors focus:border-primary focus:outline-none"
              >
                {BANK_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.id === 'auto' ? `${t('payments.bankImport.preset.auto')}${autoPresetHint}` : preset.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {rows.length > 0 && (
            <div className="grid grid-cols-5 gap-3">
              <SummaryCard label={t('payments.bankImport.summary.credits')} value={String(rows.length)} />
              <SummaryCard label={t('payments.bankImport.summary.toReview')} value={String(actionableRows.length)} accent="primary" />
              <SummaryCard label={t('payments.bankImport.summary.ignored')} value={String(ignoreCount + ignoredCount)} />
              <SummaryCard label={t('payments.bankImport.summary.duplicates')} value={String(duplicateCount)} accent={duplicateCount > 0 ? 'warning' : undefined} />
              <SummaryCard label={t('payments.bankImport.summary.activeLeases')} value={String(activeLeases.length)} />
            </div>
          )}

          {duplicateCount > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
              <Copy className="w-3.5 h-3.5 shrink-0" />
              <p>{t('payments.bankImport.duplicateBanner', { count: duplicateCount })}</p>
            </div>
          )}

          {invalidSelectedRows.length > 0 && !showConfirm && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <p>{t('payments.bankImport.invalidBanner', { count: invalidSelectedRows.length })}</p>
            </div>
          )}

          {rows.length > 0 && !showConfirm && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-medium text-textMuted">{t('payments.bankImport.batchLabel')}</span>
              <BatchButton onClick={batchAcceptAll}>
                <Check className="w-3 h-3" />
                {t('payments.bankImport.batch.acceptAll')}
              </BatchButton>
              <BatchButton onClick={batchAcceptConfident}>
                <Shield className="w-3 h-3" />
                {t('payments.bankImport.batch.acceptConfident')}
              </BatchButton>
              <BatchButton onClick={batchIgnoreAll}>
                <X className="w-3 h-3" />
                {t('payments.bankImport.batch.ignoreAll')}
              </BatchButton>
            </div>
          )}

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surfaceHigh/40 px-5 py-10 text-center">
              <p className="text-sm font-semibold text-textPrimary">{t('payments.bankImport.emptyTitle')}</p>
              <p className="mt-2 text-xs text-textMuted">{t('payments.bankImport.emptyDesc')}</p>
            </div>
          ) : showConfirm ? (
            <ConfirmationSummary
              rows={actionableRows}
              payments={editablePayments}
              leases={activeLeases}
              markExistingCount={markExistingCount}
              createNewCount={createNewCount}
              onBack={() => setShowConfirm(false)}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {rows.map((row) => (
                <ImportRowEditor
                  key={row.transaction.id}
                  row={row}
                  payments={editablePayments}
                  leases={activeLeases}
                  years={years}
                  onChange={updateRow}
                />
              ))}
            </div>
          )}

          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={showConfirm ? () => setShowConfirm(false) : onClose}
              className="flex-1"
            >
              {showConfirm ? t('payments.bankImport.back') : t('common.cancel')}
            </Button>
            {showConfirm ? (
              <Button type="button" onClick={handleApply} disabled={applying} className="flex-1">
                <Link2 className="w-3.5 h-3.5" />
                {applying
                  ? t('payments.bankImport.applying')
                  : t('payments.bankImport.confirmImport', { count: actionableRows.length })}
              </Button>
            ) : (
              <Button type="button" onClick={handleConfirmStep} disabled={rows.length === 0} className="flex-1">
                <Link2 className="w-3.5 h-3.5" />
                {t('payments.bankImport.reviewAndApply', { count: actionableRows.length })}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ConfirmationSummary({
  rows,
  payments,
  leases,
  markExistingCount,
  createNewCount,
  onBack,
}: {
  rows: ImportDraft[]
  payments: Payment[]
  leases: Lease[]
  markExistingCount: number
  createNewCount: number
  onBack: () => void
}) {
  const { t } = useTranslation()
  const totalAmount = rows.reduce((sum, row) => sum + row.transaction.amount, 0)

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-textPrimary">{t('payments.bankImport.confirmation.title')}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <p className="text-lg font-bold text-textPrimary">{rows.length}</p>
          <p className="text-xs text-textMuted">{t('payments.bankImport.confirmation.transactions', { count: rows.length })}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <p className="text-lg font-bold text-textPrimary">{formatCurrency(totalAmount)}</p>
          <p className="text-xs text-textMuted">{t('payments.bankImport.confirmation.totalAmount')}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <p className="text-sm font-semibold text-primary">{t('payments.bankImport.confirmation.linkExisting', { count: markExistingCount })}</p>
          <p className="mt-1 text-sm font-semibold text-textPrimary">{t('payments.bankImport.confirmation.createNew', { count: createNewCount })}</p>
        </div>
      </div>

      <div className="flex max-h-[200px] flex-col gap-2 overflow-y-auto">
        {rows.map((row) => {
          const target = row.mode === 'mark_existing'
            ? payments.find((payment) => payment.id === row.paymentId)
            : leases.find((lease) => lease.id === row.leaseId)
          const targetLabel = row.mode === 'mark_existing' && target
            ? `${(target as Payment).tenant_first_name} ${(target as Payment).tenant_last_name} | ${monthLabel((target as Payment).period_month, (target as Payment).period_year)}`
            : row.mode === 'create_new' && target
              ? `${(target as Lease).tenant_first_name} ${(target as Lease).tenant_last_name} | ${monthLabel(row.periodMonth, row.periodYear)} (${t('payments.bankImport.confirmation.newPayment')})`
              : '?'

          return (
            <div key={row.transaction.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 font-semibold text-textPrimary">{formatCurrency(row.transaction.amount)}</span>
                <span className="truncate text-textMuted">{row.transaction.description}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={row.mode === 'mark_existing' ? 'default' : 'success'}>
                  {row.mode === 'mark_existing' ? t('payments.bankImport.mode.link') : t('payments.bankImport.mode.create')}
                </Badge>
                <span className="text-textMuted">{targetLabel}</span>
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={onBack} className="self-start text-xs text-primary hover:underline">
        {t('payments.bankImport.confirmation.editRows')}
      </button>
    </div>
  )
}

function ImportRowEditor({
  row,
  payments,
  leases,
  years,
  onChange,
}: {
  row: ImportDraft
  payments: Payment[]
  leases: Lease[]
  years: number[]
  onChange: (transactionId: string, patch: Partial<ImportDraft>) => void
}) {
  const { t } = useTranslation()
  const [showReasons, setShowReasons] = useState(false)
  const selectedPayment = payments.find((payment) => payment.id === row.paymentId)
  const selectedLease = leases.find((lease) => lease.id === row.leaseId)
  const rowError = row.mode === 'mark_existing' && !selectedPayment
    ? t('payments.bankImport.row.errors.selectExistingPayment')
    : row.mode === 'create_new' && !selectedLease
      ? t('payments.bankImport.row.errors.selectLease')
      : ''

  return (
    <div className={`rounded-2xl border p-4 ${
      row.isDuplicate
        ? 'border-warning/40 bg-warning/5'
        : 'border-border bg-surfaceHigh/40'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-textPrimary">{formatCurrency(row.transaction.amount)}</p>
            <ConfidenceBadge confidence={row.confidence} score={row.score} />
            {row.isDuplicate && (
              <Badge variant="warning">
                <Copy className="w-3 h-3" />
                {t('payments.bankImport.row.duplicate')}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-textMuted">
            {formatDate(row.transaction.date)} | {row.transaction.description}
          </p>

          <button
            type="button"
            onClick={() => setShowReasons(!showReasons)}
            className="mt-1.5 flex items-center gap-1 text-[11px] text-primary/70 transition-colors hover:text-primary"
          >
            {showReasons ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {t('payments.bankImport.row.analysisCriteria', { count: row.reasons.length })}
          </button>

          <AnimatePresence>
            {showReasons && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 flex flex-col gap-1">
                  {row.reasons.map((reason, index) => (
                    <div key={index} className="flex items-center gap-2 text-[11px]">
                      <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                        reason.points >= 20
                          ? 'bg-success/15 text-success'
                          : reason.points >= 10
                            ? 'bg-primary/15 text-primary'
                            : 'bg-surfaceHigh text-textMuted'
                      }`}>
                        {reason.points > 0 ? `+${reason.points}` : '0'}
                      </span>
                      <span className="font-medium text-textPrimary">{t(reason.labelKey)}</span>
                      <span className="text-textMuted">{translateReasonDetail(t, reason)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 gap-2">
          <ModeButton active={row.mode === 'ignore'} onClick={() => onChange(row.transaction.id, { mode: 'ignore' })}>
            {t('payments.bankImport.mode.ignore')}
          </ModeButton>
          <ModeButton
            active={row.mode === 'mark_existing'}
            onClick={() => onChange(row.transaction.id, {
              mode: 'mark_existing',
              paymentId: row.paymentId || payments[0]?.id || 0,
            })}
          >
            {t('payments.bankImport.mode.link')}
          </ModeButton>
          <ModeButton
            active={row.mode === 'create_new'}
            onClick={() => onChange(row.transaction.id, {
              mode: 'create_new',
              leaseId: row.leaseId || leases[0]?.id || 0,
            })}
          >
            {t('payments.bankImport.mode.create')}
          </ModeButton>
        </div>
      </div>

      {row.mode === 'mark_existing' && (
        <div className="mt-4 grid grid-cols-[1fr_220px] gap-3">
          <select
            value={row.paymentId}
            onChange={(event) => onChange(row.transaction.id, { paymentId: Number(event.target.value) })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary transition-colors focus:border-primary focus:outline-none"
          >
            <option value={0} disabled>{t('payments.bankImport.row.existingPaymentPlaceholder')}</option>
            {payments.map((payment) => (
              <option key={payment.id} value={payment.id}>
                {payment.tenant_first_name} {payment.tenant_last_name} | {monthLabel(payment.period_month, payment.period_year)} | {payment.property_name}
              </option>
            ))}
          </select>
          <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-textMuted">
            {selectedPayment
              ? t('payments.bankImport.row.selectedPayment', {
                  status: t(`payments.status.${selectedPayment.status === 'late' ? 'late' : 'pending'}`),
                  amount: formatCurrency(selectedPayment.lease_rent_amount + selectedPayment.lease_charges_amount),
                })
              : t('payments.bankImport.row.noPaymentSelected')}
          </div>
        </div>
      )}

      {row.mode === 'create_new' && (
        <div className="mt-4 grid grid-cols-[1fr_140px_140px] gap-3">
          <select
            value={row.leaseId}
            onChange={(event) => onChange(row.transaction.id, { leaseId: Number(event.target.value) })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary transition-colors focus:border-primary focus:outline-none"
          >
            <option value={0} disabled>{t('payments.bankImport.row.leasePlaceholder')}</option>
            {leases.map((lease) => (
              <option key={lease.id} value={lease.id}>
                {lease.tenant_first_name} {lease.tenant_last_name} | {lease.property_name}
              </option>
            ))}
          </select>
          <select
            value={row.periodMonth}
            onChange={(event) => onChange(row.transaction.id, { periodMonth: Number(event.target.value) })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary transition-colors focus:border-primary focus:outline-none"
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <option key={month} value={month}>{monthLabel(month)}</option>
            ))}
          </select>
          <select
            value={row.periodYear}
            onChange={(event) => onChange(row.transaction.id, { periodYear: Number(event.target.value) })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary transition-colors focus:border-primary focus:outline-none"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      )}

      {row.mode === 'create_new' && selectedLease && (
        <p className="mt-2 text-[11px] text-textMuted">
          {t('payments.bankImport.row.newPaymentFor', {
            tenant: `${selectedLease.tenant_first_name} ${selectedLease.tenant_last_name}`,
            amount: formatCurrency(selectedLease.rent_amount + selectedLease.charges_amount),
          })}
        </p>
      )}
      {rowError ? <p className="mt-2 text-[11px] text-danger">{rowError}</p> : null}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'primary' | 'warning'
}) {
  return (
    <div className="rounded-2xl border border-border bg-surfaceHigh/40 px-4 py-3">
      <p className="text-xs text-textMuted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${
        accent === 'primary'
          ? 'text-primary'
          : accent === 'warning'
            ? 'text-warning'
            : 'text-textPrimary'
      }`}>{value}</p>
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-primary text-white'
          : 'border border-border bg-surface text-textMuted hover:text-textPrimary'
      }`}
    >
      {children}
    </button>
  )
}

function BatchButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-textMuted transition-colors hover:border-primary/40 hover:text-textPrimary"
    >
      {children}
    </button>
  )
}

function ConfidenceBadge({ confidence, score }: { confidence: ImportDraft['confidence']; score: number }) {
  const { t } = useTranslation()

  switch (confidence) {
    case 'high':
      return <Badge variant="success"><CheckCircle2 className="w-3 h-3" />{t('payments.bankImport.confidence.high', { score })}</Badge>
    case 'medium':
      return <Badge variant="default">{t('payments.bankImport.confidence.medium', { score })}</Badge>
    case 'low':
      return <Badge variant="warning">{t('payments.bankImport.confidence.low', { score })}</Badge>
    default:
      return <Badge variant="muted">{t('payments.bankImport.confidence.none')}</Badge>
  }
}

function appendImportedNote(existing: string | null, nextNote: string) {
  return existing?.trim() ? `${existing}\n${nextNote}` : nextNote
}
