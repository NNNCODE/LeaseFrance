import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, CheckCircle2, TrendingUp, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { calculateRevision, formatQuarter, parseQuarter, type RevisionResult } from '@/lib/irl'
import { formatCurrency } from '@/lib/utils'
import { typeLabel } from './leasePageUtils'

interface LeaseRevisionModalProps {
  lease: Lease
  irlIndices: IrlIndex[]
  onApply: (
    leaseId: number,
    newRent: number,
    newIrlValue: number,
    newIrlQuarter: string,
  ) => Promise<void>
  onManageIrl: () => void
  onClose: () => void
}

export default function LeaseRevisionModal({
  lease,
  irlIndices,
  onApply,
  onManageIrl,
  onClose,
}: LeaseRevisionModalProps) {
  const { t } = useTranslation()
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const referenceQuarter = lease.irl_reference_quarter ? parseQuarter(lease.irl_reference_quarter) : null
  const referenceValue = lease.irl_reference_index
  const latestIrl = referenceQuarter
    ? irlIndices
      .filter((index) => index.quarter === referenceQuarter.quarter && index.year > referenceQuarter.year)
      .sort((left, right) => right.year - left.year)[0]
    : null

  const revision: RevisionResult | null =
    referenceValue && latestIrl && referenceQuarter
      ? calculateRevision(
        lease.rent_amount,
        referenceValue,
        latestIrl.value,
        lease.irl_reference_quarter!,
        formatQuarter(latestIrl.year, latestIrl.quarter),
      )
      : null

  async function handleApply() {
    if (!revision || !latestIrl) return
    setApplying(true)
    setError('')
    try {
      await onApply(
        lease.id,
        revision.newRent,
        latestIrl.value,
        formatQuarter(latestIrl.year, latestIrl.quarter),
      )
      setDone(true)
    } catch (err) {
      setError(t('leases.revisionModal.error', { error: err instanceof Error ? err.message : String(err) }))
      setApplying(false)
    }
  }

  const unavailableReason = !referenceQuarter
    ? t('leases.revisionModal.missingReferenceQuarter')
    : !referenceValue
      ? t('leases.revisionModal.missingReferenceValue')
      : t('leases.revisionModal.missingNewIndex')

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
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-textPrimary">{t('leases.revisionModal.title')}</h2>
          </div>
          <button onClick={onClose} className="text-textMuted transition-colors hover:text-textPrimary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10">
              <CheckCircle2 className="h-7 w-7 text-success" />
            </div>
            <p className="text-base font-semibold text-textPrimary">{t('leases.revisionModal.doneTitle')}</p>
            <p className="text-center text-sm text-textMuted">
              {t('leases.revisionModal.doneDesc', { amount: formatCurrency(revision!.newRent) })}
            </p>
            <Button onClick={onClose} className="mt-2">
              {t('common.close')}
            </Button>
          </div>
        ) : !revision ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10">
              <AlertTriangle className="h-7 w-7 text-warning" />
            </div>
            <p className="text-base font-semibold text-textPrimary">{t('leases.revisionModal.unavailableTitle')}</p>
            <p className="text-center text-sm text-textMuted">
              {unavailableReason}
            </p>
            <p className="text-center text-xs text-textMuted">
              {t('leases.revisionModal.unavailableHelp')}
            </p>
            <div className="mt-2 flex gap-2">
              <Button variant="secondary" onClick={onManageIrl}>
                {t('leases.irlManager')}
              </Button>
              <Button variant="secondary" onClick={onClose}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-1.5 rounded-lg bg-surfaceHigh p-3 text-xs">
              <div className="flex justify-between text-textMuted">
                <span>{t('leases.revisionModal.property')}</span>
                <span className="font-medium text-textPrimary">{lease.property_name}</span>
              </div>
              <div className="flex justify-between text-textMuted">
                <span>{t('leases.revisionModal.tenant')}</span>
                <span className="font-medium text-textPrimary">
                  {lease.tenant_first_name} {lease.tenant_last_name}
                </span>
              </div>
              <div className="flex justify-between text-textMuted">
                <span>{t('leases.type')}</span>
                <span className="font-medium text-textPrimary">{typeLabel(lease.type, t)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg bg-surfaceHigh p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-textMuted">{t('leases.revisionModal.referenceIrl')}</p>
                <p className="mt-1 text-lg font-bold text-textPrimary">{revision.referenceIrl}</p>
                <p className="text-xs text-textMuted">{revision.referenceLabel}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
              <div className="flex-1 rounded-lg border border-primary/20 bg-primary/10 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-primary">{t('leases.revisionModal.newIrl')}</p>
                <p className="mt-1 text-lg font-bold text-primary">{revision.newIrl}</p>
                <p className="text-xs text-textMuted">{revision.newLabel}</p>
              </div>
            </div>

            <div className="rounded-lg bg-surfaceHigh p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-textMuted">{t('leases.revisionModal.currentRent')}</span>
                <span className="font-medium text-textPrimary">{formatCurrency(revision.oldRent)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-textMuted">{t('leases.revisionModal.newRent')}</span>
                <span className="text-base font-bold text-primary">{formatCurrency(revision.newRent)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
                <span className="text-textMuted">{t('leases.revisionModal.increase')}</span>
                <span className="font-semibold text-success">
                  +{formatCurrency(revision.difference)} (+{revision.percentChange}%)
                </span>
              </div>
            </div>

            <p className="text-[10px] leading-relaxed text-textMuted">
              {t('leases.revisionModal.formula', {
                oldRent: revision.oldRent,
                newIrl: revision.newIrl,
                referenceIrl: revision.referenceIrl,
                newRent: revision.newRent,
              })}
            </p>

            {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button onClick={() => void handleApply()} disabled={applying} className="flex-1">
                <TrendingUp className="h-3.5 w-3.5" />
                {applying ? t('leases.revisionModal.applying') : t('leases.revisionModal.apply')}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
