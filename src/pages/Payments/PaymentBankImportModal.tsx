import { useRef, useState, type ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRightLeft,
  CheckCircle2,
  FileSpreadsheet,
  Link2,
  Plus,
  Upload,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  allocateImportedAmount,
  buildImportedNote,
  parseBankCsv,
  suggestBankImport,
  type BankImportSuggestion,
  type ParsedBankTransaction,
} from './bankImport'

const MONTHS = [
  'Janvier',
  'Fevrier',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Aout',
  'Septembre',
  'Octobre',
  'Novembre',
  'Decembre',
]

interface ImportDraft {
  transaction: ParsedBankTransaction
  mode: BankImportSuggestion['mode']
  paymentId: number
  leaseId: number
  periodMonth: number
  periodYear: number
  confidence: BankImportSuggestion['confidence']
  reasons: string[]
}

interface PaymentBankImportModalProps {
  payments: Payment[]
  leases: Lease[]
  onApplied: () => Promise<void>
  onClose: () => void
}

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
  const [error, setError] = useState('')
  const [applying, setApplying] = useState(false)

  const activeLeases = leases.filter((lease) => lease.status === 'active')
  const editablePayments = payments.filter((payment) => payment.status !== 'paid')
  const actionableRows = rows.filter((row) => row.mode !== 'ignore')
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    setFileName(file.name)

    try {
      const text = await file.text()
      const parsed = parseBankCsv(text)
      const credits = parsed.filter((transaction) => transaction.direction === 'credit')

      setIgnoredCount(parsed.length - credits.length)
      setRows(credits.map((transaction) => {
        const suggestion = suggestBankImport(transaction, payments, leases)
        return {
          transaction,
          mode: suggestion.mode,
          paymentId: suggestion.paymentId ?? 0,
          leaseId: suggestion.leaseId ?? 0,
          periodMonth: suggestion.periodMonth,
          periodYear: suggestion.periodYear,
          confidence: suggestion.confidence,
          reasons: suggestion.reasons,
        }
      }))
    } catch (err) {
      setRows([])
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      event.target.value = ''
    }
  }

  function updateRow(transactionId: string, patch: Partial<ImportDraft>) {
    setRows((current) => current.map((row) => (
      row.transaction.id === transactionId
        ? { ...row, ...patch }
        : row
    )))
  }

  async function handleApply() {
    if (actionableRows.length === 0) {
      setError('Aucune ligne importable selectionnee.')
      return
    }

    setApplying(true)
    setError('')

    try {
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
        }

        if (row.mode === 'create_new') {
          const lease = activeLeases.find((entry) => entry.id === row.leaseId)
          if (!lease) continue

          const allocation = allocateImportedAmount(
            row.transaction.amount,
            lease.rent_amount,
            lease.charges_amount,
          )

          await window.api.payments.create({
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
        }
      }

      await onApplied()
      onClose()
    } catch (err) {
      setError(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
      setApplying(false)
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
        className="w-full max-w-5xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
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
          </div>

          {rows.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              <SummaryCard label="Transactions credit" value={String(rows.length)} />
              <SummaryCard label="A rapprocher" value={String(actionableRows.length)} />
              <SummaryCard label="Ignorees" value={String(ignoredCount)} />
              <SummaryCard label="Baux actifs" value={String(activeLeases.length)} />
            </div>
          )}

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surfaceHigh/40 px-5 py-10 text-center">
              <p className="text-sm font-semibold text-textPrimary">Aucune transaction importee pour le moment</p>
              <p className="text-xs text-textMuted mt-2">
                Les lignes de debit sont ignorees. Seuls les credits entrants sont proposes au rapprochement.
              </p>
            </div>
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

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Annuler</Button>
            <Button type="button" onClick={handleApply} disabled={rows.length === 0 || actionableRows.length === 0 || applying} className="flex-1">
              <Link2 className="w-3.5 h-3.5" />
              {applying ? 'Import en cours...' : `Appliquer ${actionableRows.length} rapprochement${actionableRows.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
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
  const selectedPayment = payments.find((payment) => payment.id === row.paymentId)
  const selectedLease = leases.find((lease) => lease.id === row.leaseId)

  return (
    <div className="rounded-2xl border border-border bg-surfaceHigh/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-textPrimary">{formatCurrency(row.transaction.amount)}</p>
            <ConfidenceBadge confidence={row.confidence} />
          </div>
          <p className="text-xs text-textMuted mt-1">
            {formatDate(row.transaction.date)} · {row.transaction.description}
          </p>
          <p className="text-[11px] text-textMuted mt-1">
            {row.reasons.join(' ')}
          </p>
        </div>

        <div className="flex gap-2">
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
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surfaceHigh/40 px-4 py-3">
      <p className="text-xs text-textMuted">{label}</p>
      <p className="text-lg font-semibold text-textPrimary mt-1">{value}</p>
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

function ConfidenceBadge({ confidence }: { confidence: ImportDraft['confidence'] }) {
  switch (confidence) {
    case 'high':
      return <Badge variant="success"><CheckCircle2 className="w-3 h-3" />Suggestion forte</Badge>
    case 'medium':
      return <Badge variant="default">Suggestion moyenne</Badge>
    case 'low':
      return <Badge variant="warning">Suggestion faible</Badge>
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
