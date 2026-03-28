import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, Building2, Users, FileText, CreditCard,
  ChevronRight, CalendarClock, ScrollText,
} from 'lucide-react'

const CATEGORY_META: Record<SearchCategory, { label: string; icon: React.ElementType }> = {
  properties:  { label: 'Biens',           icon: Building2     },
  tenants:     { label: 'Locataires',      icon: Users         },
  leases:      { label: 'Baux',            icon: FileText      },
  payments:    { label: 'Paiements',       icon: CreditCard    },
  reminders:   { label: 'Echeances',       icon: CalendarClock },
  inspections: { label: 'Etats des lieux', icon: ScrollText    },
}

const FILTERS: { key: SearchFilterKey; label: string }[] = [
  { key: 'all',          label: 'Tout'            },
  { key: 'properties',   label: 'Biens'           },
  { key: 'tenants',      label: 'Locataires'      },
  { key: 'leases',       label: 'Baux'            },
  { key: 'payments',     label: 'Paiements'       },
  { key: 'reminders',    label: 'Echeances'       },
  { key: 'inspections',  label: 'Etats des lieux' },
]

export default function SearchCommand({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<SearchFilterKey>('all')
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])

  useEffect(() => {
    if (open) {
      setQuery('')
      setFilter('all')
      setActive(0)
      window.setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setResults([])
      setLoading(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      setLoading(true)
      window.api.search.query(query, filter)
        .then((nextResults) => {
          if (!cancelled) {
            setResults(nextResults)
            setLoading(false)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setLoading(false)
          }
        })
    }, 120)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [open, query, filter])

  const grouped = useMemo(() => {
    const map = new Map<SearchCategory, SearchResult[]>()
    for (const result of results) {
      const list = map.get(result.category) ?? []
      list.push(result)
      map.set(result.category, list)
    }
    return map
  }, [results])

  const flatResults = results

  useEffect(() => {
    setActive(0)
  }, [query, filter])

  useEffect(() => {
    const element = listRef.current?.querySelector(`[data-index="${active}"]`)
    element?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const handleSelect = useCallback((result: SearchResult) => {
    navigate(result.route)
    onClose()
  }, [navigate, onClose])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => Math.min(index + 1, flatResults.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (flatResults[active]) {
        handleSelect(flatResults[active])
      }
    } else if (event.key === 'Escape') {
      onClose()
    }
  }, [flatResults, active, handleSelect, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
          onClick={(event) => event.target === event.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
            onKeyDown={handleKeyDown}
          >
            <div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
              <Search className="w-4.5 h-4.5 text-textMuted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un bien, locataire, bail, paiement..."
                className="flex-1 bg-transparent text-sm text-textPrimary placeholder:text-textMuted outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="p-1 rounded hover:bg-surfaceHigh text-textMuted">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surfaceHigh border border-border text-[10px] text-textMuted font-mono">
                ESC
              </kbd>
            </div>

            <div className="flex items-center gap-1 px-4 py-2 border-b border-border shrink-0 overflow-x-auto">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setFilter(item.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    filter === item.key
                      ? 'bg-primary/15 text-primary'
                      : 'text-textMuted hover:text-textPrimary hover:bg-surfaceHigh'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-textMuted">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : flatResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-textMuted">
                  <Search className="w-8 h-8 opacity-20" />
                  <p className="text-xs">
                    {query ? 'Aucun resultat' : 'Commencez a taper pour rechercher'}
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {Array.from(grouped.entries()).map(([category, items]) => {
                    const meta = CATEGORY_META[category]
                    const Icon = meta.icon

                    return (
                      <div key={category}>
                        <div className="flex items-center gap-2 px-4 py-1.5">
                          <Icon className="w-3 h-3 text-textMuted" />
                          <p className="text-[11px] uppercase tracking-wider text-textMuted font-medium">{meta.label}</p>
                          <span className="text-[10px] text-textMuted/60">{items.length}</span>
                        </div>
                        {items.map((result) => {
                          const index = flatResults.indexOf(result)
                          return (
                            <button
                              key={result.id}
                              data-index={index}
                              onClick={() => handleSelect(result)}
                              onMouseEnter={() => setActive(index)}
                              className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                                index === active ? 'bg-primary/10' : 'hover:bg-surfaceHigh/50'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-textPrimary truncate">{result.title}</p>
                                <p className="text-xs text-textMuted truncate">{result.subtitle}</p>
                              </div>
                              {result.badge && (
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0 ${
                                  result.badgeColor === 'success' ? 'bg-success/10 text-success'
                                  : result.badgeColor === 'danger' ? 'bg-danger/10 text-danger'
                                  : result.badgeColor === 'warning' ? 'bg-warning/10 text-warning'
                                  : 'bg-surfaceHigh text-textMuted'
                                }`}>
                                  {result.badge}
                                </span>
                              )}
                              <ChevronRight className={`w-3 h-3 shrink-0 transition-opacity ${index === active ? 'text-primary opacity-100' : 'opacity-0'}`} />
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 px-4 py-2 border-t border-border shrink-0 text-[10px] text-textMuted">
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-surfaceHigh border border-border font-mono">↑↓</kbd> naviguer</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-surfaceHigh border border-border font-mono">↵</kbd> ouvrir</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-surfaceHigh border border-border font-mono">esc</kbd> fermer</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
