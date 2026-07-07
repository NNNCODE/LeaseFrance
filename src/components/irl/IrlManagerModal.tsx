import { type FormEvent, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Pencil, Plus, Save, Trash2, TrendingUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatQuarter, getIrlDatasetStatus } from '@/lib/irl'

interface IrlManagerModalProps {
  indices: IrlIndex[]
  onChanged: () => Promise<void>
  onClose: () => void
}

interface DraftState {
  year: string
  quarter: string
  value: string
}

const EMPTY_DRAFT: DraftState = {
  year: '',
  quarter: '1',
  value: '',
}

function sortIndices(indices: IrlIndex[]): IrlIndex[] {
  return [...indices].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year
    return b.quarter - a.quarter
  })
}

export default function IrlManagerModal({ indices, onChanged, onClose }: IrlManagerModalProps) {
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const sortedIndices = useMemo(() => sortIndices(indices), [indices])
  const datasetStatus = useMemo(() => getIrlDatasetStatus(indices), [indices])

  function setDraftField<K extends keyof DraftState>(field: K, value: DraftState[K]) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function resetDraft() {
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
    setError('')
  }

  function startEdit(index: IrlIndex) {
    setEditingId(index.id)
    setDraft({
      year: String(index.year),
      quarter: String(index.quarter),
      value: String(index.value),
    })
    setError('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    const year = Number.parseInt(draft.year, 10)
    const quarter = Number.parseInt(draft.quarter, 10)
    const value = Number.parseFloat(draft.value)

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      setError('L annee doit etre comprise entre 2000 et 2100.')
      return
    }
    if (![1, 2, 3, 4].includes(quarter)) {
      setError('Le trimestre doit etre compris entre 1 et 4.')
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('La valeur IRL doit etre strictement positive.')
      return
    }

    setSaving(true)
    try {
      await window.api.irl.upsert(year, quarter, Math.round(value * 100) / 100)
      await onChanged()
      resetDraft()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(index: IrlIndex) {
    const confirmed = window.confirm(
      `Supprimer l indice ${formatQuarter(index.year, index.quarter)} (${index.value.toFixed(2)}) ?`,
    )
    if (!confirmed) return

    setSaving(true)
    setError('')
    try {
      await window.api.irl.delete(index.id)
      await onChanged()
      if (editingId === index.id) resetDraft()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError))
    } finally {
      setSaving(false)
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
        className="w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <div>
              <h2 className="text-base font-semibold text-textPrimary">Gerer les indices IRL</h2>
              <p className="text-xs text-textMuted mt-0.5">
                Base locale utilisee pour les revisions de loyer et les documents.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.95fr] gap-0 min-h-0 flex-1">
          <div className="border-b lg:border-b-0 lg:border-r border-border min-h-0 flex flex-col">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-textMuted">Donnees locales</p>
                  <p className="text-sm text-textPrimary mt-1">
                    {datasetStatus.latestLabel
                      ? `Dernier indice: ${datasetStatus.latestLabel} (${datasetStatus.latestValue?.toFixed(2)})`
                      : 'Aucun indice IRL enregistre'}
                  </p>
                </div>
                {datasetStatus.latestLabel && (
                  <span className="text-[10px] text-textMuted rounded-full border border-border px-2 py-1">
                    {datasetStatus.quarterLag === 0
                      ? 'a jour'
                      : `${datasetStatus.quarterLag} trimestre${datasetStatus.quarterLag === 1 ? '' : 's'} de decalage`}
                  </span>
                )}
              </div>
              {datasetStatus.isStale && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-textPrimary">
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                  <p>
                    Les donnees IRL locales semblent dater. Ajoutez les derniers indices publies pour eviter
                    de bloquer les revisions et courriers.
                  </p>
                </div>
              )}
              <p className="mt-2 text-[11px] text-textMuted">
                Source officielle:{' '}
                <a
                  href="https://www.insee.fr/fr/statistiques/serie/001515333"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-textPrimary transition-colors"
                >
                  INSEE serie 001515333
                </a>
                {' '}- verifiez le dernier trimestre publie avant une revision.
              </p>
            </div>

            <div className="overflow-y-auto px-6 py-4 flex-1">
              {sortedIndices.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-textMuted">
                  Aucun indice IRL n est encore enregistre.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {sortedIndices.map((index) => (
                    <div
                      key={index.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surfaceHigh/40 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-textPrimary">{formatQuarter(index.year, index.quarter)}</p>
                        <p className="text-xs text-textMuted mt-0.5">
                          Valeur: {index.value.toFixed(2)}
                          {index.published_at ? `  |  maj ${index.published_at.slice(0, 10)}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(index)}
                          title="Modifier l indice"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => void handleDelete(index)}
                          title="Supprimer l indice"
                        >
                          <Trash2 className="w-4 h-4 text-danger" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 flex flex-col">
            <div className="px-6 py-4 border-b border-border">
              <p className="text-xs uppercase tracking-wide text-textMuted">
                {editingId ? 'Modifier' : 'Ajouter'}
              </p>
              <p className="text-sm text-textPrimary mt-1">
                {editingId
                  ? 'Mettez a jour un trimestre existant ou corrigez sa valeur.'
                  : 'Ajoutez un nouveau trimestre pour etendre la couverture locale.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-textMuted">Annee</label>
                  <Input
                    type="number"
                    min={2000}
                    max={2100}
                    value={draft.year}
                    onChange={(event) => setDraftField('year', event.target.value)}
                    placeholder="2026"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-textMuted">Trimestre</label>
                  <select
                    value={draft.quarter}
                    onChange={(event) => setDraftField('quarter', event.target.value)}
                    className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="1">T1</option>
                    <option value="2">T2</option>
                    <option value="3">T3</option>
                    <option value="4">T4</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-textMuted">Valeur</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={draft.value}
                    onChange={(event) => setDraftField('value', event.target.value)}
                    placeholder="146.60"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={resetDraft}>
                  <Plus className="w-4 h-4" />
                  {editingId ? 'Nouvelle saisie' : 'Vider'}
                </Button>

                <Button type="submit" disabled={saving}>
                  <Save className="w-4 h-4" />
                  {saving ? 'Enregistrement...' : editingId ? 'Mettre a jour' : 'Ajouter l indice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
