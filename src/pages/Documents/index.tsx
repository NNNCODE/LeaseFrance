import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { pdf } from '@react-pdf/renderer'
import {
  FileText, Download, Trash2, AlertTriangle,
  CheckCircle2, FolderOpen, Plus, X, ChevronDown,
  ScrollText, Receipt, Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { QuittancePDF, type QuittanceData } from '@/lib/pdf/quittance'
import { RecuPDF, type RecuData } from '@/lib/pdf/recu'
import { useAuthStore } from '@/stores/useAuthStore'

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

/** Full payment → quittance, partial → reçu (Loi du 6 juillet 1989, art. 21) */
function isFullPayment(p: Payment): boolean {
  return p.rent_amount >= p.lease_rent_amount && p.charges_amount >= p.lease_charges_amount
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Documents() {
  const { profile } = useAuthStore()
  const [docs,     setDocs]     = useState<DocumentRecord[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [leases,   setLeases]   = useState<Lease[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<DocumentRecord | null>(null)

  async function load() {
    setLoading(true)
    const [d, p, l] = await Promise.all([
      window.api.documents.getAll(),
      window.api.payments.getAll(),
      window.api.leases.getAll(),
    ])
    setDocs(d)
    setPayments(p)
    setLeases(l)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const paidPayments = payments.filter((p) => p.status === 'paid')

  async function handleGenerate(payment: Payment) {
    const lease = leases.find((l) => l.id === payment.lease_id)
    if (!lease) return

    const full = isFullPayment(payment)

    const baseData = {
      landlordName:      profile?.name ?? 'Propriétaire',
      landlordAddress:   profile?.address,
      landlordCity:      profile?.city,
      landlordPhone:     profile?.phone,
      landlordSignature: profile?.signatureImage,
      tenantFirstName: payment.tenant_first_name,
      tenantLastName:  payment.tenant_last_name,
      propertyName:    payment.property_name,
      propertyAddress: lease.property_address,
      propertyCity:    payment.property_city,
      propertyZip:     lease.property_zip ?? '',
      periodMonth:     payment.period_month,
      periodYear:      payment.period_year,
      rentAmount:      payment.rent_amount,
      chargesAmount:   payment.charges_amount,
      paymentDate:     payment.payment_date,
      paymentMethod:   payment.payment_method,
      leaseType:       lease.type,
    }

    let blob: Blob
    let fileName: string
    let docType: string
    const month = MONTHS[payment.period_month - 1]

    if (full) {
      blob     = await pdf(<QuittancePDF data={baseData as QuittanceData} />).toBlob()
      fileName = `Quittance_${payment.tenant_last_name}_${month}_${payment.period_year}.pdf`
      docType  = 'quittance'
    } else {
      blob     = await pdf(<RecuPDF data={baseData as RecuData} />).toBlob()
      fileName = `Recu_${payment.tenant_last_name}_${month}_${payment.period_year}.pdf`
      docType  = 'recu'
    }

    const buffer = Array.from(new Uint8Array(await blob.arrayBuffer()))
    const result = await window.api.documents.savePdf(payment.lease_id, fileName, buffer, docType)
    if (result.saved) {
      setShowForm(false)
      load()
    }
  }

  async function handleDelete() {
    if (!deleting) return
    await window.api.documents.delete(deleting.id)
    setDeleting(null)
    load()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">Documents</h1>
          <p className="text-textMuted text-sm mt-1">
            {docs.length} document{docs.length !== 1 ? 's' : ''} généré{docs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={paidPayments.length === 0}>
          <Plus className="w-4 h-4" />
          Nouveau document
        </Button>
      </div>

      {paidPayments.length === 0 && docs.length === 0 ? (
        <EmptyState />
      ) : loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
            <FileText className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold text-textPrimary">Aucun document généré</p>
            <p className="text-sm text-textMuted mt-1">Cliquez sur « Nouveau document » pour générer votre premier PDF.</p>
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

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <GenerateModal
            payments={paidPayments}
            onGenerate={handleGenerate}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleting && (
          <DeleteModal doc={deleting} onConfirm={handleDelete} onClose={() => setDeleting(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
        <ScrollText className="w-8 h-8 text-primary" />
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">Aucun paiement payé</p>
        <p className="text-sm text-textMuted mt-1">
          Les documents ne peuvent être générés que pour les loyers marqués « Payé ».
        </p>
      </div>
    </div>
  )
}

// ── Doc row ────────────────────────────────────────────────────────────────────

function DocRow({ doc, onOpen, onDelete }: {
  doc: DocumentRecord
  onOpen: () => void
  onDelete: () => void
}) {
  const isRecu = doc.type === 'recu'

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: -8 },
        show:   { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' } },
      }}
    >
      <Card className="group hover:border-primary/30 transition-colors duration-200">
        <CardContent className="py-3 px-4 flex items-center gap-4">
          <div className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${isRecu ? 'bg-accent/10' : 'bg-primary/10'}`}>
            {isRecu
              ? <Receipt className="w-4 h-4 text-accent" />
              : <FileText className="w-4 h-4 text-primary" />
            }
          </div>
          <div className="flex-1 min-w-0 grid grid-cols-3 gap-3 items-center">
            <div className="min-w-0">
              <p className="text-sm font-medium text-textPrimary truncate">
                {doc.tenant_first_name} {doc.tenant_last_name}
              </p>
              <p className="text-xs text-textMuted truncate">{doc.property_name}</p>
            </div>
            <div>
              <Badge variant={isRecu ? 'warning' : 'muted'}>
                {isRecu ? 'Reçu' : 'Quittance'}
              </Badge>
            </div>
            <div className="text-xs text-textMuted">
              Généré le {formatDate(doc.generated_at)}
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

// ── Generate modal ─────────────────────────────────────────────────────────────

function GenerateModal({ payments, onGenerate, onClose }: {
  payments: Payment[]
  onGenerate: (p: Payment) => Promise<void>
  onClose: () => void
}) {
  const [selected, setSelected] = useState<number>(0)
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const selectedPayment = payments.find((p) => p.id === selected)
  const detectedType = selectedPayment ? (isFullPayment(selectedPayment) ? 'quittance' : 'recu') : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return setError('Sélectionnez un paiement.')
    const payment = payments.find((p) => p.id === selected)
    if (!payment) return
    setGenerating(true)
    setError('')
    try {
      await onGenerate(payment)
      setDone(true)
    } catch (err) {
      setError(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
      setGenerating(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-textPrimary">Générer un document</h2>
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
            <p className="text-base font-semibold text-textPrimary">
              {detectedType === 'quittance' ? 'Quittance générée !' : 'Reçu généré !'}
            </p>
            <p className="text-sm text-textMuted">Le fichier PDF a été enregistré sur votre ordinateur.</p>
            <Button onClick={onClose} className="mt-2">Fermer</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">Sélectionnez le paiement</label>
              <div className="relative">
                <select
                  value={selected}
                  onChange={(e) => setSelected(Number(e.target.value))}
                  className="w-full appearance-none bg-surfaceHigh border border-border rounded-lg px-3 py-2 pr-8 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
                >
                  <option value={0} disabled>Choisissez un loyer payé…</option>
                  {payments.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.tenant_first_name} {p.tenant_last_name} · {MONTHS[p.period_month - 1]} {p.period_year} · {p.property_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted pointer-events-none" />
              </div>
            </div>

            {selectedPayment && (() => {
              const p = selectedPayment
              const full = isFullPayment(p)
              return (
                <div className="flex flex-col gap-3">
                  <div className="bg-surfaceHigh rounded-lg p-3 flex flex-col gap-1.5 text-xs text-textMuted">
                    <div className="flex justify-between">
                      <span>Locataire</span>
                      <span className="text-textPrimary font-medium">{p.tenant_first_name} {p.tenant_last_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bien</span>
                      <span className="text-textPrimary font-medium">{p.property_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Période</span>
                      <span className="text-textPrimary font-medium">{MONTHS[p.period_month - 1]} {p.period_year}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Loyer dû (HC + charges)</span>
                      <span className="text-textPrimary font-medium">{(p.lease_rent_amount + p.lease_charges_amount).toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1.5 mt-0.5">
                      <span>Montant payé</span>
                      <span className="text-textPrimary font-semibold">
                        {(p.rent_amount + p.charges_amount).toFixed(2)} €
                      </span>
                    </div>
                  </div>

                  {/* Auto-detected document type */}
                  <div className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-xs ${full ? 'bg-primary/10 border border-primary/20' : 'bg-accent/10 border border-accent/20'}`}>
                    <Info className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${full ? 'text-primary' : 'text-accent'}`} />
                    <div>
                      <p className={`font-semibold ${full ? 'text-primary' : 'text-accent'}`}>
                        {full ? 'Quittance de loyer' : 'Reçu de loyer'}
                      </p>
                      <p className="text-textMuted mt-0.5">
                        {full
                          ? 'Paiement intégral — une quittance sera générée (art. 21, Loi du 6 juillet 1989).'
                          : 'Paiement partiel — un reçu sera généré (le montant payé est inférieur au loyer dû).'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {error && <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Annuler</Button>
              <Button type="submit" disabled={!selected || generating} className="flex-1">
                <Download className="w-3.5 h-3.5" />
                {generating ? 'Génération...' : 'Générer le PDF'}
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Delete modal ───────────────────────────────────────────────────────────────

function DeleteModal({ doc, onConfirm, onClose }: {
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
      onClick={(e) => e.target === e.currentTarget && onClose()}
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
              {doc.tenant_first_name} {doc.tenant_last_name} · {doc.property_name}
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
