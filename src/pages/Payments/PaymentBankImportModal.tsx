import { useRef, useState, type ChangeEvent } from 'react'
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
  Plus,
  Shield,
  Upload,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  allocateImportedAmount,
  buildImportedNote,
  detectBankPreset,
  parseBankCsv,
  suggestBankImport,
  BANK_PRESETS,
  type BankImportSuggestion,
  type MatchReason,
  type ParsedBankTransaction,
} from './bankImport'

const MONTHS = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
]

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Main Modal ───────────────────────────────────────────────────────────────

export default function PaymentBankImportModal({
  payments,
  leases,
  onApplied,
  onClose,
}: PaymentBankImportModalProps) {
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
  const isReadyForImport = (row: ImportDraft) => {
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
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    setFileName(file.name)
    setShowConfirm(false)

    try {
      const text = await file.text()
      setRawText(text)

      // Auto-detect bank
      const detected = detectBankPreset(text)
      setDetectedPreset(detected)
      const effectivePreset = presetId === 'auto' ? detected : presetId

      await parseAndSuggest(text, effectivePreset)
    } catch (err) {
      setRows([])
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      event.target.value = ''
    }
  }

  async function parseAndSuggest(text: string, preset: string) {
    const parsed = parseBankCsv(text, preset)
    const credits = parsed.filter((transaction) => transaction.direction === 'credit')

    setIgnoredCount(parsed.length - credits.length)

    // Check duplicates against stored fingerprints
    const fingerprints = credits.map((tx) => tx.fingerprint)
    let duplicateFingerprints: string[] = []
    try {
      duplicateFingerprints = await window.api.bankImports.findDuplicates(fingerprints)
    } catch {
      // If the table doesn't exist yet, skip dedup
    }
    const dupSet = new Set(duplicateFingerprints)
    setDuplicateCount(duplicateFingerprints.length)

    setRows(credits.map((transaction) => {
      const isDuplicate = dupSet.has(transaction.fingerprint)
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

  function handlePresetChange(newPresetId: string) {
    setPresetId(newPresetId)
    if (rawText) {
      setError('')
      const effective = newPresetId === 'auto' ? detectedPreset : newPresetId
      parseAndSuggest(rawText, effective).catch((err) => {
        setRows([])
        setError(err instanceof Error ? err.message : String(err))
      })
    }
  }

  function updateRow(transactionId: string, patch: Partial<ImportDraft>) {
    setRows((current) => current.map((row) => (
      row.transaction.id === transactionId
        ? { ...row, ...patch }
        : row
    )))
  }

  // ── Batch operations ─────────────────────────────────────────────────────

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
      }
    }))
  }

  function batchAcceptHighConfidence() {
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
        }
      }
      return { ...row, mode: 'ignore' }
    }))
  }

  function batchIgnoreAll() {
    setRows((current) => current.map((row) => ({ ...row, mode: 'ignore' })))
  }

  // ── Apply ────────────────────────────────────────────────────────────────

  function handleConfirmStep() {
    setError('')

    if (invalidSelectedRows.length > 0) {
      setError(`Completez ${invalidSelectedRows.length} ligne${invalidSelectedRows.length > 1 ? 's' : ''} avant de confirmer l'import.`)
      return
    }

    if (actionableRows.length === 0) {
      setError('Aucune ligne importable selectionnee.')
      return
    }
    setShowConfirm(true)
  }

  async function handleApply() {
    setApplying(true)
    setError('')

    try {
      const importedEntries: Array<{ fingerprint: string; tx_date: string; description: string; amount: number; payment_id: number | null }> = []

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
            notes: appendImportedNote(payment.notes, row.transaction.description, row.transaction.rowNumber),
          })

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
            notes: buildImportedNote(row.transaction.description, row.transaction.rowNumber),
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

      // Record fingerprints to prevent future re-imports
      if (importedEntries.length > 0) {
        try {
          await window.api.bankImports.recordImported(importedEntries)
        } catch {
          // Non-blocking: dedup is best-effort
        }
      } else {
        throw new Error("Aucune ligne valide n'a pu etre importee.")
      }

      await onApplied()
      onClose()
    } catch (err) {
      setError(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
      setApplying(false)
      setShowConfirm(false)
    }
  }

  // ── Counts for summary ───────────────────────────────────────────────────

  const markExistingCount = actionableRows.filter((r) => r.mode === 'mark_existing').length
  const createNewCount = actionableRows.filter((r) => r.mode === 'create_new').length
  const ignoreCount = rows.filter((r) => r.mode === 'ignore').length

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
        className="w-full max-w-5xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            <div>
              <h2 className="text-base font-semibold text-textPrimary">Import banque CSV</h2>
              <p className="text-xs text-textMuted mt-0.5">
                Importez des credits bancaires et rapprochez-les des paiements.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5 p-6 max-h-[85vh] overflow-y-auto">
          {/* File selection + bank preset */}
          <div className="rounded-2xl border border-border bg-surfaceHigh/40 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-textPrimary">
                    {fileName || 'Selectionnez un fichier CSV bancaire'}
                  </p>
                  <p className="text-xs text-textMuted mt-1">
                    Colonnes attendues : date, libelle/description, montant ou credit/debit.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" />
                  Choisir un CSV
                </Button>
              </div>
            </div>

            {/* Bank preset selector */}
            <div className="mt-4 flex items-center gap-3">
              <label className="text-xs font-medium text-textMuted shrink-0">Format bancaire</label>
              <select
                value={presetId}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
              >
                {BANK_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                    {preset.id === 'auto' && detectedPreset && detectedPreset !== 'auto'
                      ? ` (detecte : ${BANK_PRESETS.find((p) => p.id === detectedPreset)?.name ?? detectedPreset})`
                      : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary cards */}
          {rows.length > 0 && (
            <div className="grid grid-cols-5 gap-3">
              <SummaryCard label="Credits" value={String(rows.length)} />
              <SummaryCard label="A rapprocher" value={String(actionableRows.length)} accent="primary" />
              <SummaryCard label="Ignores" value={String(ignoreCount)} />
              <SummaryCard label="Doublons" value={String(duplicateCount)} accent={duplicateCount > 0 ? 'warning' : undefined} />
              <SummaryCard label="Baux actifs" value={String(activeLeases.length)} />
            </div>
          )}

          {/* Duplicate warning banner */}
          {duplicateCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-warning/30 bg-warning/10 text-xs text-warning">
              <Copy className="w-3.5 h-3.5 shrink-0" />
              <p>
                <strong>{duplicateCount} transaction{duplicateCount > 1 ? 's' : ''} deja importee{duplicateCount > 1 ? 's' : ''}</strong> detectee{duplicateCount > 1 ? 's' : ''} — automatiquement ignoree{duplicateCount > 1 ? 's' : ''}.
                Vous pouvez les forcer manuellement si necessaire.
              </p>
            </div>
          )}

          {invalidSelectedRows.length > 0 && !showConfirm && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-danger/30 bg-danger/10 text-xs text-danger">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <p>
                {invalidSelectedRows.length} ligne{invalidSelectedRows.length > 1 ? 's' : ''} selectionnee{invalidSelectedRows.length > 1 ? 's' : ''} {invalidSelectedRows.length > 1 ? 'doivent' : 'doit'} encore etre completee{invalidSelectedRows.length > 1 ? 's' : ''} avant import.
              </p>
            </div>
          )}

          {/* Batch action bar */}
          {rows.length > 0 && !showConfirm && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-textMuted mr-1">Actions groupees :</span>
              <BatchButton onClick={batchAcceptAll}>
                <Check className="w-3 h-3" />
                Tout accepter
              </BatchButton>
              <BatchButton onClick={batchAcceptHighConfidence}>
                <Shield className="w-3 h-3" />
                Confiance haute/moyenne
              </BatchButton>
              <BatchButton onClick={batchIgnoreAll}>
                <X className="w-3 h-3" />
                Tout ignorer
              </BatchButton>
            </div>
          )}

          {/* Transaction rows */}
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surfaceHigh/40 px-5 py-10 text-center">
              <p className="text-sm font-semibold text-textPrimary">Aucune transaction importee pour le moment</p>
              <p className="text-xs text-textMuted mt-2">
                Les lignes de debit sont ignorees. Seuls les credits entrants sont proposes au rapprochement.
              </p>
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

          {error && <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

          {/* Footer buttons */}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={showConfirm ? () => setShowConfirm(false) : onClose} className="flex-1">
              {showConfirm ? 'Retour' : 'Annuler'}
            </Button>
            {showConfirm ? (
              <Button
                type="button"
                onClick={handleApply}
                disabled={applying}
                className="flex-1"
              >
                <Link2 className="w-3.5 h-3.5" />
                {applying
                  ? 'Import en cours...'
                  : `Confirmer ${actionableRows.length} rapprochement${actionableRows.length > 1 ? 's' : ''}`}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleConfirmStep}
                disabled={rows.length === 0}
                className="flex-1"
              >
                <Link2 className="w-3.5 h-3.5" />
                Verifier et appliquer ({actionableRows.length})
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Confirmation Summary ─────────────────────────────────────────────────────

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
  const totalAmount = rows.reduce((sum, r) => sum + r.transaction.amount, 0)

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-textPrimary">Resume avant application</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-surface border border-border p-3 text-center">
          <p className="text-lg font-bold text-textPrimary">{rows.length}</p>
          <p className="text-xs text-textMuted">Transaction{rows.length > 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-xl bg-surface border border-border p-3 text-center">
          <p className="text-lg font-bold text-textPrimary">{formatCurrency(totalAmount)}</p>
          <p className="text-xs text-textMuted">Montant total</p>
        </div>
        <div className="rounded-xl bg-surface border border-border p-3 text-center">
          <p className="text-lg font-bold text-primary">{markExistingCount} associer · {createNewCount} creer</p>
          <p className="text-xs text-textMuted">Repartition des actions</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
        {rows.map((row) => {
          const target = row.mode === 'mark_existing'
            ? payments.find((p) => p.id === row.paymentId)
            : leases.find((l) => l.id === row.leaseId)
          const targetLabel = row.mode === 'mark_existing' && target
            ? `${(target as Payment).tenant_first_name} ${(target as Payment).tenant_last_name} · ${MONTHS[(target as Payment).period_month - 1]} ${(target as Payment).period_year}`
            : row.mode === 'create_new' && target
              ? `${(target as Lease).tenant_first_name} ${(target as Lease).tenant_last_name} · ${MONTHS[row.periodMonth - 1]} ${row.periodYear} (nouveau)`
              : '?'
          return (
            <div key={row.transaction.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-surface border border-border text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-textPrimary shrink-0">{formatCurrency(row.transaction.amount)}</span>
                <span className="text-textMuted truncate">{row.transaction.description}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={row.mode === 'mark_existing' ? 'default' : 'success'}>
                  {row.mode === 'mark_existing' ? 'Associer' : 'Creer'}
                </Badge>
                <span className="text-textMuted">{targetLabel}</span>
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={onBack} className="text-xs text-primary hover:underline self-start">
        Modifier les lignes
      </button>
    </div>
  )
}

// ── Import Row Editor ────────────────────────────────────────────────────────

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
  const [showReasons, setShowReasons] = useState(false)
  const selectedPayment = payments.find((payment) => payment.id === row.paymentId)
  const selectedLease = leases.find((lease) => lease.id === row.leaseId)
  const rowError = row.mode === 'mark_existing' && !selectedPayment
    ? 'Choisissez un paiement existant a associer.'
    : row.mode === 'create_new' && !selectedLease
      ? 'Choisissez un bail actif pour creer ce paiement.'
      : ''

  return (
    <div className={`rounded-2xl border p-4 ${
      row.isDuplicate
        ? 'border-warning/40 bg-warning/5'
        : 'border-border bg-surfaceHigh/40'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-textPrimary">{formatCurrency(row.transaction.amount)}</p>
            <ConfidenceBadge confidence={row.confidence} score={row.score} />
            {row.isDuplicate && (
              <Badge variant="warning">
                <Copy className="w-3 h-3" />
                Doublon
              </Badge>
            )}
          </div>
          <p className="text-xs text-textMuted mt-1">
            {formatDate(row.transaction.date)} · {row.transaction.description}
          </p>

          {/* Expandable match reasons */}
          <button
            type="button"
            onClick={() => setShowReasons(!showReasons)}
            className="mt-1.5 flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors"
          >
            {showReasons ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {row.reasons.length} critere{row.reasons.length > 1 ? 's' : ''} d'analyse
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
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold shrink-0 ${
                        reason.points >= 20 ? 'bg-success/15 text-success'
                          : reason.points >= 10 ? 'bg-primary/15 text-primary'
                            : reason.points > 0 ? 'bg-surfaceHigh text-textMuted'
                              : 'bg-surfaceHigh text-textMuted'
                      }`}>
                        {reason.points > 0 ? `+${reason.points}` : '0'}
                      </span>
                      <span className="font-medium text-textPrimary">{reason.label}</span>
                      <span className="text-textMuted">{reason.detail}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-2 shrink-0">
          <ModeButton active={row.mode === 'ignore'} onClick={() => onChange(row.transaction.id, { mode: 'ignore' })}>
            Ignorer
          </ModeButton>
          <ModeButton
            active={row.mode === 'mark_existing'}
            onClick={() => onChange(row.transaction.id, {
              mode: 'mark_existing',
              paymentId: row.paymentId || payments[0]?.id || 0,
            })}
          >
            Associer
          </ModeButton>
          <ModeButton
            active={row.mode === 'create_new'}
            onClick={() => onChange(row.transaction.id, {
              mode: 'create_new',
              leaseId: row.leaseId || leases[0]?.id || 0,
            })}
          >
            Creer
          </ModeButton>
        </div>
      </div>

      {row.mode === 'mark_existing' && (
        <div className="grid grid-cols-[1fr_220px] gap-3 mt-4">
          <select
            value={row.paymentId}
            onChange={(event) => onChange(row.transaction.id, { paymentId: Number(event.target.value) })}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
          >
            <option value={0} disabled>Choisissez un paiement existant...</option>
            {payments.map((payment) => (
              <option key={payment.id} value={payment.id}>
                {payment.tenant_first_name} {payment.tenant_last_name} · {MONTHS[payment.period_month - 1]} {payment.period_year} · {payment.property_name}
              </option>
            ))}
          </select>
          <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-textMuted">
            {selectedPayment
              ? `${selectedPayment.status === 'late' ? 'Retard' : 'Attente'} · ${formatCurrency(selectedPayment.lease_rent_amount + selectedPayment.lease_charges_amount)} attendu`
              : 'Aucun paiement selectionne'}
          </div>
        </div>
      )}

      {row.mode === 'create_new' && (
        <div className="grid grid-cols-[1fr_140px_140px] gap-3 mt-4">
          <select
            value={row.leaseId}
            onChange={(event) => onChange(row.transaction.id, { leaseId: Number(event.target.value) })}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
          >
            <option value={0} disabled>Choisissez un bail...</option>
            {leases.map((lease) => (
              <option key={lease.id} value={lease.id}>
                {lease.tenant_first_name} {lease.tenant_last_name} · {lease.property_name}
              </option>
            ))}
          </select>
          <select
            value={row.periodMonth}
            onChange={(event) => onChange(row.transaction.id, { periodMonth: Number(event.target.value) })}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index + 1}>{month}</option>
            ))}
          </select>
          <select
            value={row.periodYear}
            onChange={(event) => onChange(row.transaction.id, { periodYear: Number(event.target.value) })}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      )}

      {row.mode === 'create_new' && selectedLease && (
        <p className="text-[11px] text-textMuted mt-2">
          Nouveau paiement pour {selectedLease.tenant_first_name} {selectedLease.tenant_last_name}
          {' '}· {formatCurrency(selectedLease.rent_amount + selectedLease.charges_amount)} attendu sur ce bail.
        </p>
      )}
      {rowError ? (
        <p className="text-[11px] text-danger mt-2">{rowError}</p>
      ) : null}
    </div>
  )
}

// ── Small Components ─────────────────────────────────────────────────────────

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: 'primary' | 'warning' }) {
  return (
    <div className="rounded-2xl border border-border bg-surfaceHigh/40 px-4 py-3">
      <p className="text-xs text-textMuted">{label}</p>
      <p className={`text-lg font-semibold mt-1 ${
        accent === 'primary' ? 'text-primary'
          : accent === 'warning' ? 'text-warning'
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
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active
          ? 'bg-primary text-white'
          : 'bg-surface border border-border text-textMuted hover:text-textPrimary'
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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-textMuted hover:text-textPrimary hover:border-primary/40 transition-colors"
    >
      {children}
    </button>
  )
}

function ConfidenceBadge({ confidence, score }: { confidence: ImportDraft['confidence']; score: number }) {
  switch (confidence) {
    case 'high':
      return <Badge variant="success"><CheckCircle2 className="w-3 h-3" />Forte ({score}pts)</Badge>
    case 'medium':
      return <Badge variant="default">Moyenne ({score}pts)</Badge>
    case 'low':
      return <Badge variant="warning">Faible ({score}pts)</Badge>
    default:
      return <Badge variant="muted">A verifier</Badge>
  }
}

function appendImportedNote(existing: string | null, description: string, rowNumber: number) {
  const importedNote = buildImportedNote(description, rowNumber)
  return existing?.trim()
    ? `${existing}\n${importedNote}`
    : importedNote
}
