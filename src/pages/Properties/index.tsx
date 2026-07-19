import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApiQuery, useProperties } from '@/hooks'
import { formatOwnerDisplayName, resolveOwnerProfileById } from '@/lib/ownerProfiles'
import { useOwnerStore } from '@/stores/useOwnerStore'
import PropertyCard from './PropertyCard'
import PropertyDeleteModal from './PropertyDeleteModal'
import PropertyDiagnosticsModal from './PropertyDiagnosticsModal'
import PropertyEmptyState from './PropertyEmptyState'
import PropertyFormModal from './PropertyFormModal'

export default function Properties() {
  const { t } = useTranslation()
  const owners = useOwnerStore((state) => state.owners)
  const activeOwner = useOwnerStore((state) => state.activeOwner)
  const propertiesQuery = useProperties()
  const diagnosticsQuery = useApiQuery(async () => {
    const diagnostics = await window.api.propertyDiagnostics.getAll()
    return new Map(diagnostics.map((entry) => [entry.property_id, entry]))
  }, { initial: new Map<number, PropertyDiagnostics>() })

  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<Property | null>(null)
  const [deleting, setDeleting]     = useState<Property | null>(null)
  const [managingDiagnostics, setManagingDiagnostics] = useState<Property | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const properties = propertiesQuery.data
  const diagnosticsByProperty = diagnosticsQuery.data
  const loading = propertiesQuery.loading || diagnosticsQuery.loading

  function reloadAll() {
    void propertiesQuery.reload()
    void diagnosticsQuery.reload()
  }

  function openAdd() { setEditing(null); setShowForm(true) }
  function openEdit(p: Property) { setEditing(p); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditing(null) }
  function closeDelete() {
    setDeleting(null)
    setDeleteError('')
    setDeleteLoading(false)
  }

  async function handleSave(data: PropertyInput) {
    if (editing) {
      await window.api.properties.update(editing.id, data, editing.updated_at)
    } else {
      await window.api.properties.create(data)
    }
    closeForm()
    reloadAll()
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await window.api.properties.delete(deleting.id)
      closeDelete()
      reloadAll()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err))
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">{t('properties.title')}</h1>
          <p className="text-textMuted text-sm mt-1">
            {t('properties.count', { count: properties.length })}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" />
          {t('properties.add')}
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-surface border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <PropertyEmptyState onAdd={openAdd} />
      ) : (
        <motion.div
          className="grid grid-cols-3 gap-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        >
          {properties.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              diagnostics={diagnosticsByProperty.get(p.id) ?? null}
              ownerLabel={formatOwnerDisplayName(
                resolveOwnerProfileById(owners, p.owner_profile_id),
                t('properties.ownerDefaultNone'),
              )}
              onEdit={() => openEdit(p)}
              onDiagnostics={() => setManagingDiagnostics(p)}
              onDelete={() => setDeleting(p)}
            />
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {showForm && (
          <PropertyFormModal
            initial={editing}
            owners={owners}
            defaultOwnerId={activeOwner?.id ?? null}
            onSave={handleSave}
            onClose={closeForm}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <PropertyDeleteModal
            property={deleting}
            onConfirm={handleDelete}
            onClose={closeDelete}
            error={deleteError}
            loading={deleteLoading}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {managingDiagnostics && (
          <PropertyDiagnosticsModal
            property={managingDiagnostics}
            initial={diagnosticsByProperty.get(managingDiagnostics.id) ?? null}
            onSave={async (propertyId, data) => {
              await window.api.propertyDiagnostics.upsert(propertyId, data)
              reloadAll()
            }}
            onClose={() => setManagingDiagnostics(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
