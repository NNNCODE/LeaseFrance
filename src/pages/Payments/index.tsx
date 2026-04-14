import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { pdf } from '@react-pdf/renderer'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRightLeft, CheckCircle2, CreditCard, Plus, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resolveOwnerProfileForLease } from '@/lib/ownerProfiles'
import { formatCurrency } from '@/lib/utils'
import { QuittancePDF, type QuittanceData } from '@/lib/pdf/quittance'
import { RecuPDF, type RecuData } from '@/lib/pdf/recu'
import { useAuthStore } from '@/stores/useAuthStore'
import { useOwnerStore } from '@/stores/useOwnerStore'
import PaymentBankImportModal from './PaymentBankImportModal'
import PaymentDeleteModal from './PaymentDeleteModal'
import PaymentEmptyState from './PaymentEmptyState'
import PaymentFormModal from './PaymentFormModal'
import PaymentReminderModal from './PaymentReminderModal'
import PaymentRow from './PaymentRow'
import { monthLabel, paymentVersionToken, today } from './paymentPageUtils'

export default function Payments() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  const owners = useOwnerStore((state) => state.owners)
  const activeOwner = useOwnerStore((state) => state.activeOwner)
  const fallbackOwnerProfile = activeOwner ?? profile
  const [payments, setPayments] = useState<Payment[]>([])
  const [leases, setLeases] = useState<Lease[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'late'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Payment | null>(null)
  const [deleting, setDeleting] = useState<Payment | null>(null)
  const [reminding, setReminding] = useState<Payment | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [syncResult, setSyncResult] = useState<AutoRentResult | null>(null)
  const [syncing, setSyncing] = useState(false)

  async function syncAndLoad() {
    setLoading(true)
    setSyncing(true)
    try {
      const result = await window.api.payments.generateMissing()
      if (result.created > 0 || result.markedLate > 0) {
        setSyncResult(result)
        setTimeout(() => setSyncResult(null), 5000)
      }
    } finally {
      setSyncing(false)
    }

    const [nextPayments, nextLeases] = await Promise.all([
      window.api.payments.getAll(),
      window.api.leases.getAll(),
    ])
    setPayments(nextPayments)
    setLeases(nextLeases)
    setLoading(false)
  }

  async function load() {
    setLoading(true)
    const [nextPayments, nextLeases] = await Promise.all([
      window.api.payments.getAll(),
      window.api.leases.getAll(),
    ])
    setPayments(nextPayments)
    setLeases(nextLeases)
    setLoading(false)
  }

  useEffect(() => {
    void syncAndLoad()
  }, [])

  const filtered = useMemo(
    () => (filter === 'all' ? payments : payments.filter((payment) => payment.status === filter)),
    [payments, filter],
  )

  const grouped = useMemo(() => {
    const map = new Map<string, Payment[]>()
    for (const payment of filtered) {
      const key = `${payment.period_year}-${String(payment.period_month).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(payment)
    }
    return Array.from(map.entries()).sort((left, right) => right[0].localeCompare(left[0]))
  }, [filtered])

  const summary = useMemo(
    () => ({
      paid: payments.filter((payment) => payment.status === 'paid').length,
      pending: payments.filter((payment) => payment.status === 'pending').length,
      late: payments.filter((payment) => payment.status === 'late').length,
      totalPaid: payments
        .filter((payment) => payment.status === 'paid')
        .reduce((sum, payment) => sum + payment.rent_amount + payment.charges_amount, 0),
    }),
    [payments],
  )

  async function handleSave(data: PaymentInput) {
    if (editing) {
      await window.api.payments.update(editing.id, data, paymentVersionToken(editing))
    } else {
      await window.api.payments.create(data)
    }
    setShowForm(false)
    setEditing(null)
    await load()
  }

  async function handleMarkPaid(payment: Payment) {
    try {
      await window.api.payments.markPaid(payment.id, today(), paymentVersionToken(payment))
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    }
    await load()
  }

  async function handleDelete() {
    if (!deleting) return
    await window.api.payments.delete(deleting.id)
    setDeleting(null)
    await load()
  }

  async function handleGenerateDocument(payment: Payment) {
    const lease = leases.find((entry) => entry.id === payment.lease_id)
    if (!lease) return
    const ownerProfile = resolveOwnerProfileForLease(owners, lease, fallbackOwnerProfile)

    const isFullPayment =
      payment.rent_amount >= payment.lease_rent_amount
      && payment.charges_amount >= payment.lease_charges_amount

    const baseData = {
      landlordName: ownerProfile?.name ?? t('nav.profile'),
      landlordAddress: ownerProfile?.address,
      landlordCity: ownerProfile?.city,
      landlordPhone: ownerProfile?.phone,
      landlordSignature: ownerProfile?.signatureImage,
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

    const periodToken = `${payment.period_year}-${String(payment.period_month).padStart(2, '0')}`
    let blob: Blob
    let fileName: string
    let docType: string

    if (isFullPayment) {
      blob = await pdf(<QuittancePDF data={baseData as QuittanceData} />).toBlob()
      fileName = `quittance_${payment.tenant_last_name}_${periodToken}.pdf`
      docType = 'quittance'
    } else {
      blob = await pdf(<RecuPDF data={baseData as RecuData} />).toBlob()
      fileName = `recu_${payment.tenant_last_name}_${periodToken}.pdf`
      docType = 'recu'
    }

    const buffer = new Uint8Array(await blob.arrayBuffer())
    await window.api.documents.savePdf(payment.lease_id, fileName, buffer, docType)
  }

  const noLeases = leases.filter((lease) => lease.status === 'active').length === 0
  const canImport =
    leases.some((lease) => lease.status === 'active')
    || payments.some((payment) => payment.status !== 'paid')
  const summaryParts = [
    t('payments.summary.paid', { count: summary.paid }),
    summary.pending > 0 ? t('payments.summary.pending', { count: summary.pending }) : null,
    summary.late > 0 ? t('payments.summary.late', { count: summary.late }) : null,
    summary.totalPaid > 0
      ? t('payments.summary.collectedAmount', { amount: formatCurrency(summary.totalPaid) })
      : null,
  ].filter(Boolean) as string[]
  const syncParts = syncResult
    ? [
        syncResult.created > 0 ? t('payments.syncCreated', { count: syncResult.created }) : null,
        syncResult.markedLate > 0 ? t('payments.syncLate', { count: syncResult.markedLate }) : null,
      ].filter(Boolean) as string[]
    : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">{t('payments.title')}</h1>
          <p className="mt-1 text-sm text-textMuted">{summaryParts.join(' | ')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              void syncAndLoad()
            }}
            disabled={syncing}
            title={t('payments.actions.syncPayments')}
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="secondary" onClick={() => setShowImport(true)} disabled={!canImport}>
            <ArrowRightLeft className="h-4 w-4" />
            {t('payments.importCsv')}
          </Button>
          <Button
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
            disabled={noLeases}
          >
            <Plus className="h-4 w-4" />
            {t('payments.add')}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {syncResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{syncParts.join(' | ')}</span>
            <button onClick={() => setSyncResult(null)} className="ml-auto rounded p-0.5 hover:bg-primary/10">
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {noLeases && payments.length === 0 ? (
        <PaymentEmptyState />
      ) : (
        <>
          <div className="flex gap-2">
            {(['all', 'paid', 'pending', 'late'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === status
                    ? 'bg-primary text-white'
                    : 'border border-border bg-surface text-textMuted hover:text-textPrimary'
                }`}
              >
                {t(`payments.filter.${status}`)}
                {status !== 'all' && (
                  <span className="ml-1.5 opacity-70">
                    {status === 'paid'
                      ? summary.paid
                      : status === 'pending'
                        ? summary.pending
                        : summary.late}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((index) => (
                <div key={index} className="h-20 rounded-2xl border border-border bg-surface animate-pulse" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-textMuted">
              <CreditCard className="h-8 w-8 opacity-30" />
              <p className="text-sm">{t('payments.emptyFiltered')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {grouped.map(([key, group]) => {
                const [year, month] = key.split('-').map(Number)
                const groupTotal = group.reduce(
                  (sum, payment) => sum + payment.rent_amount + payment.charges_amount,
                  0,
                )

                return (
                  <div key={key}>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-textMuted">
                        {monthLabel(month, year)}
                      </h2>
                      <span className="text-xs text-textMuted">{formatCurrency(groupTotal)}</span>
                    </div>
                    <motion.div
                      className="flex flex-col gap-2"
                      initial="hidden"
                      animate="show"
                      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                    >
                      {group.map((payment) => (
                        <PaymentRow
                          key={payment.id}
                          payment={payment}
                          onMarkPaid={() => {
                            void handleMarkPaid(payment)
                          }}
                          onReminder={() => setReminding(payment)}
                          onEdit={() => {
                            setEditing(payment)
                            setShowForm(true)
                          }}
                          onDelete={() => setDeleting(payment)}
                          onGenerateDocument={() => {
                            void handleGenerateDocument(payment)
                          }}
                        />
                      ))}
                    </motion.div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showForm && (
          <PaymentFormModal
            initial={editing}
            leases={leases.filter((lease) => lease.status === 'active')}
            payments={payments}
            onSave={handleSave}
            onClose={() => {
              setShowForm(false)
              setEditing(null)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <PaymentDeleteModal
            payment={deleting}
            onConfirm={() => {
              void handleDelete()
            }}
            onClose={() => setDeleting(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reminding && (
          <PaymentReminderModal
            payment={reminding}
            profile={resolveOwnerProfileForLease(
              owners,
              leases.find((lease) => lease.id === reminding.lease_id) ?? {
                owner_profile_id: null,
                property_owner_profile_id: null,
              },
              fallbackOwnerProfile,
            )}
            onClose={() => setReminding(null)}
            onSaved={load}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showImport && (
          <PaymentBankImportModal
            payments={payments}
            leases={leases}
            onApplied={load}
            onClose={() => setShowImport(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
