import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Plus, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import IrlManagerModal from '@/components/irl/IrlManagerModal'
import { Button } from '@/components/ui/button'
import {
  getIrlDatasetStatus,
  isAnniversaryWithinDays,
  isRevisionEligible,
} from '@/lib/irl'
import ChargeReconciliationModal from './ChargeReconciliationModal'
import DepositManagementModal, { type DepositManagementInput } from './DepositManagementModal'
import LeaseDeleteModal from './LeaseDeleteModal'
import LeaseEmptyState from './LeaseEmptyState'
import LeaseFormModal from './LeaseFormModal'
import LeaseRevisionModal from './LeaseRevisionModal'
import LeaseRow from './LeaseRow'

export default function Leases() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [leases, setLeases] = useState<Lease[]>([])
  const [irlIndices, setIrlIndices] = useState<IrlIndex[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showIrlManager, setShowIrlManager] = useState(false)
  const [editing, setEditing] = useState<Lease | null>(null)
  const [deleting, setDeleting] = useState<Lease | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [revising, setRevising] = useState<Lease | null>(null)
  const [managingDeposit, setManagingDeposit] = useState<Lease | null>(null)
  const [managingCharges, setManagingCharges] = useState<Lease | null>(null)

  async function load() {
    setLoading(true)
    const [nextLeases, nextIrl] = await Promise.all([
      window.api.leases.getAll(),
      window.api.irl.getAll(),
    ])
    setLeases(nextLeases)
    setIrlIndices(nextIrl)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  function openAdd() {
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(lease: Lease) {
    setEditing(lease)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  function closeDelete() {
    setDeleting(null)
    setDeleteError('')
    setDeleteLoading(false)
  }

  function openContractFlow(lease: Lease) {
    navigate('/documents', {
      state: {
        initialTemplate: 'furnished_lease_contract',
        templateParams: { leaseId: lease.id },
      },
    })
  }

  async function importExistingContract(lease: Lease) {
    try {
      const result = await window.api.documents.importForLease(
        lease.id,
        lease.type === 'meuble' ? 'contrat_location_meublee' : 'contrat_location',
      )
      if (!result.imported) return
      navigate('/documents')
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleSave(data: LeaseInput) {
    if (editing) {
      await window.api.leases.update(editing.id, data, editing.updated_at)
    } else {
      await window.api.leases.create(data)
    }
    closeForm()
    await load()
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await window.api.leases.delete(deleting.id)
      closeDelete()
      await load()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err))
      setDeleteLoading(false)
    }
  }

  async function handleApplyRevision(
    leaseId: number,
    newRent: number,
    newIrlValue: number,
    newIrlQuarter: string,
  ) {
    const lease = leases.find((entry) => entry.id === leaseId)
    if (!lease) return
    try {
      await window.api.leases.update(
        leaseId,
        {
          property_id: lease.property_id,
          tenant_id: lease.tenant_id,
          owner_profile_id: lease.owner_profile_id,
          type: lease.type,
          start_date: lease.start_date,
          end_date: lease.end_date,
          rent_amount: newRent,
          charges_amount: lease.charges_amount,
          deposit_amount: lease.deposit_amount,
          deposit_received_date: lease.deposit_received_date,
          deposit_refund_date: lease.deposit_refund_date,
          deposit_retained_amount: lease.deposit_retained_amount,
          deposit_notes: lease.deposit_notes,
          irl_reference_index: newIrlValue,
          irl_reference_quarter: newIrlQuarter,
          contract_details: lease.contract_details,
          status: lease.status,
        },
        lease.updated_at,
      )
      setRevising(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    }
    await load()
  }

  async function handleSaveDeposit(leaseId: number, data: DepositManagementInput) {
    const lease = leases.find((entry) => entry.id === leaseId)
    if (!lease) return
    try {
      await window.api.leases.update(
        leaseId,
        {
          property_id: lease.property_id,
          tenant_id: lease.tenant_id,
          owner_profile_id: lease.owner_profile_id,
          type: lease.type,
          start_date: lease.start_date,
          end_date: lease.end_date,
          rent_amount: lease.rent_amount,
          charges_amount: lease.charges_amount,
          deposit_amount: lease.deposit_amount,
          deposit_received_date: data.deposit_received_date,
          deposit_refund_date: data.deposit_refund_date,
          deposit_retained_amount: data.deposit_retained_amount,
          deposit_notes: data.deposit_notes,
          irl_reference_index: lease.irl_reference_index,
          irl_reference_quarter: lease.irl_reference_quarter,
          contract_details: lease.contract_details,
          status: lease.status,
        },
        lease.updated_at,
      )
      setManagingDeposit(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    }
    await load()
  }

  const activeCount = leases.filter((lease) => lease.status === 'active').length
  const endedCount = leases.filter((lease) => lease.status !== 'active').length
  const revisionEligible = leases.filter(
    (lease) =>
      lease.status === 'active'
      && isRevisionEligible(
        lease.type,
        lease.start_date,
        lease.irl_reference_index,
        lease.irl_reference_quarter,
      )
      && isAnniversaryWithinDays(lease.start_date, 60),
  )
  const irlDatasetStatus = getIrlDatasetStatus(irlIndices)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">{t('leases.title')}</h1>
          <p className="mt-1 text-sm text-textMuted">
            {t('leases.summaryActive', { count: activeCount })}
            {endedCount > 0 && ` | ${t('leases.summaryEnded', { count: endedCount })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowIrlManager(true)}>
            <TrendingUp className="h-4 w-4" />
            {t('leases.irlManager')}
          </Button>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            {t('leases.add')}
          </Button>
        </div>
      </div>

      {irlDatasetStatus.isStale && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/10 p-4"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-textPrimary">
              {t('leases.irlStaleTitle', { latest: irlDatasetStatus.latestLabel ?? t('leases.unknownDate') })}
            </p>
            <p className="mt-0.5 text-xs text-textMuted">
              {t('leases.irlStaleDesc')}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowIrlManager(true)}>
            {t('leases.open')}
          </Button>
        </motion.div>
      )}

      {revisionEligible.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4"
        >
          <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-textPrimary">
              {t('leases.revisionEligibleTitle', { count: revisionEligible.length })}
            </p>
            <p className="mt-0.5 text-xs text-textMuted">
              {t('leases.revisionEligibleDesc')}
            </p>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((index) => (
            <div key={index} className="h-28 rounded-2xl border border-border bg-surface animate-pulse" />
          ))}
        </div>
      ) : leases.length === 0 ? (
        <LeaseEmptyState onAdd={openAdd} />
      ) : (
        <motion.div
          className="flex flex-col gap-3"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {leases.map((lease) => (
            <LeaseRow
              key={lease.id}
              lease={lease}
              onEdit={() => openEdit(lease)}
              onDelete={() => setDeleting(lease)}
              onOpenContract={() => openContractFlow(lease)}
              onImportContract={() => {
                void importExistingContract(lease)
              }}
              onManageDeposit={() => setManagingDeposit(lease)}
              onManageCharges={() => setManagingCharges(lease)}
              onRevise={() => setRevising(lease)}
            />
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {showForm && <LeaseFormModal initial={editing} onSave={handleSave} onClose={closeForm} />}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <LeaseDeleteModal
            lease={deleting}
            onConfirm={() => {
              void handleDelete()
            }}
            onClose={closeDelete}
            error={deleteError}
            loading={deleteLoading}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {revising && (
          <LeaseRevisionModal
            lease={revising}
            irlIndices={irlIndices}
            onApply={handleApplyRevision}
            onManageIrl={() => {
              setRevising(null)
              setShowIrlManager(true)
            }}
            onClose={() => setRevising(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIrlManager && (
          <IrlManagerModal
            indices={irlIndices}
            onChanged={load}
            onClose={() => setShowIrlManager(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {managingDeposit && (
          <DepositManagementModal
            lease={managingDeposit}
            onSave={(data) => handleSaveDeposit(managingDeposit.id, data)}
            onClose={() => setManagingDeposit(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {managingCharges && (
          <ChargeReconciliationModal
            lease={managingCharges}
            onClose={() => setManagingCharges(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
