import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, Building2, Users, FileText, CreditCard,
  ChevronRight, CalendarClock, FolderOpen, ScrollText,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  category: Category
  title: string
  subtitle: string
  route: string
  badge?: string
  badgeColor?: string
}

type Category = 'properties' | 'tenants' | 'leases' | 'payments' | 'reminders' | 'inspections'

const CATEGORY_META: Record<Category, { label: string; icon: React.ElementType }> = {
  properties:  { label: 'Biens',           icon: Building2     },
  tenants:     { label: 'Locataires',      icon: Users         },
  leases:      { label: 'Baux',            icon: FileText      },
  payments:    { label: 'Paiements',       icon: CreditCard    },
  reminders:   { label: 'Echeances',       icon: CalendarClock },
  inspections: { label: 'Etats des lieux', icon: ScrollText    },
}

const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

type FilterKey = 'all' | Category
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',          label: 'Tout'           },
  { key: 'properties',   label: 'Biens'          },
  { key: 'tenants',      label: 'Locataires'     },
  { key: 'leases',       label: 'Baux'           },
  { key: 'payments',     label: 'Paiements'      },
  { key: 'reminders',    label: 'Echeances'      },
  { key: 'inspections',  label: 'Etats des lieux'},
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function matchesQuery(text: string, query: string): boolean {
  const nText = normalize(text)
  const parts = normalize(query).split(/\s+/).filter(Boolean)
  return parts.every((p) => nText.includes(p))
}

// ── Component ─────────────────────────────────────────────────────────────────

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

  const [query, setQuery]       = useState('')
  const [filter, setFilter]     = useState<FilterKey>('all')
  const [active, setActive]     = useState(0)
  const [loading, setLoading]   = useState(false)

  // Raw data
  const [properties, setProperties]   = useState<Property[]>([])
  const [tenants, setTenants]         = useState<Tenant[]>([])
  const [leases, setLeases]           = useState<Lease[]>([])
  const [payments, setPayments]       = useState<Payment[]>([])
  const [reminders, setReminders]     = useState<ManualReminder[]>([])
  const [inspections, setInspections] = useState<Inspection[]>([])

  // Fetch all data when opened
  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      window.api.properties.getAll(),
      window.api.tenants.getAll(),
      window.api.leases.getAll(),
      window.api.payments.getAll(),
      window.api.manualReminders.getAll(),
      window.api.inspections.getAll(),
    ]).then(([p, t, l, pay, r, i]) => {
      setProperties(p)
      setTenants(t)
      setLeases(l)
      setPayments(pay)
      setReminders(r)
      setInspections(i)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [open])

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setFilter('all')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // ── Build search results ──
  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim()
    const out: SearchResult[] = []

    if (filter === 'all' || filter === 'properties') {
      for (const p of properties) {
        const text = `${p.name} ${p.address} ${p.city} ${p.zip} ${p.type}`
        if (q && !matchesQuery(text, q)) continue
        out.push({
          id: `prop-${p.id}`,
          category: 'properties',
          title: p.name,
          subtitle: `${p.address}, ${p.city}`,
          route: '/properties',
          badge: p.type,
        })
      }
    }

    if (filter === 'all' || filter === 'tenants') {
      for (const t of tenants) {
        const text = `${t.first_name} ${t.last_name} ${t.email ?? ''} ${t.phone ?? ''} ${t.property_name ?? ''}`
        if (q && !matchesQuery(text, q)) continue
        out.push({
          id: `ten-${t.id}`,
          category: 'tenants',
          title: `${t.first_name} ${t.last_name}`,
          subtitle: t.property_name ?? 'Aucun bail actif',
          route: '/tenants',
        })
      }
    }

    if (filter === 'all' || filter === 'leases') {
      for (const l of leases) {
        const typeLabel = l.type === 'vide' ? 'Vide' : l.type === 'meuble' ? 'Meublé' : 'Mobilité'
        const text = `${l.tenant_first_name} ${l.tenant_last_name} ${l.property_name} ${l.type} ${l.status}`
        if (q && !matchesQuery(text, q)) continue
        out.push({
          id: `lea-${l.id}`,
          category: 'leases',
          title: `${l.tenant_first_name} ${l.tenant_last_name} · ${l.property_name}`,
          subtitle: `${typeLabel} · ${formatCurrency(l.rent_amount + l.charges_amount)}/mois`,
          route: '/leases',
          badge: l.status === 'active' ? 'Actif' : l.status === 'ended' ? 'Terminé' : 'Résilié',
          badgeColor: l.status === 'active' ? 'success' : 'muted',
        })
      }
    }

    if (filter === 'all' || filter === 'payments') {
      for (const p of payments) {
        const period = `${MONTHS_SHORT[p.period_month - 1]} ${p.period_year}`
        const text = `${p.tenant_first_name} ${p.tenant_last_name} ${p.property_name} ${period} ${p.status} ${p.period_year}`
        if (q && !matchesQuery(text, q)) continue
        out.push({
          id: `pay-${p.id}`,
          category: 'payments',
          title: `${p.tenant_first_name} ${p.tenant_last_name} · ${period}`,
          subtitle: `${p.property_name} · ${formatCurrency(p.rent_amount + p.charges_amount)}`,
          route: '/payments',
          badge: p.status === 'paid' ? 'Payé' : p.status === 'late' ? 'En retard' : 'En attente',
          badgeColor: p.status === 'paid' ? 'success' : p.status === 'late' ? 'danger' : 'warning',
        })
      }
    }

    if (filter === 'all' || filter === 'reminders') {
      for (const r of reminders) {
        const text = `${r.title} ${r.category} ${r.property_name ?? ''} ${r.tenant_first_name ?? ''} ${r.tenant_last_name ?? ''}`
        if (q && !matchesQuery(text, q)) continue
        out.push({
          id: `rem-${r.id}`,
          category: 'reminders',
          title: r.title,
          subtitle: `${r.due_date}${r.property_name ? ` · ${r.property_name}` : ''}`,
          route: '/reminders',
          badge: r.status === 'pending' ? 'En attente' : 'Fait',
          badgeColor: r.status === 'pending' ? 'warning' : 'success',
        })
      }
    }

    if (filter === 'all' || filter === 'inspections') {
      for (const i of inspections) {
        const kindLabel = i.kind === 'entry' ? 'Entree' : 'Sortie'
        const text = `${i.tenant_first_name} ${i.tenant_last_name} ${i.property_name} ${kindLabel} ${i.inspection_date}`
        if (q && !matchesQuery(text, q)) continue
        out.push({
          id: `ins-${i.id}`,
          category: 'inspections',
          title: `${i.tenant_first_name} ${i.tenant_last_name} · ${kindLabel}`,
          subtitle: `${i.property_name} · ${i.inspection_date}`,
          route: '/inspections',
          badge: kindLabel,
        })
      }
    }

    // If no query and "all" filter, limit to avoid flood
    if (!q && filter === 'all') return out.slice(0, 20)
    return out.slice(0, 50)
  }, [query, filter, properties, tenants, leases, payments, reminders, inspections])

  // Group results by category
  const grouped = useMemo(() => {
    const map = new Map<Category, SearchResult[]>()
    for (const r of results) {
      const list = map.get(r.category) ?? []
      list.push(r)
      map.set(r.category, list)
    }
    return map
  }, [results])

  // Flat list for keyboard navigation
  const flatResults = results

  // Reset active on query/filter change
  useEffect(() => { setActive(0) }, [query, filter])

  // Scroll active into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const handleSelect = useCallback((result: SearchResult) => {
    navigate(result.route)
    onClose()
  }, [navigate, onClose])

  // Keyboard nav
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flatResults[active]) handleSelect(flatResults[active])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }, [flatResults, active, handleSelect, onClose])

  // ── Render ──
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
              <Search className="w-4.5 h-4.5 text-textMuted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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

            {/* Filter tabs */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-border shrink-0 overflow-x-auto">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    filter === f.key
                      ? 'bg-primary/15 text-primary'
                      : 'text-textMuted hover:text-textPrimary hover:bg-surfaceHigh'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Results */}
            <div ref={listRef} className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-textMuted">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : flatResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-textMuted">
                  <Search className="w-8 h-8 opacity-20" />
                  <p className="text-xs">
                    {query ? 'Aucun résultat' : 'Commencez à taper pour rechercher'}
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
                        {items.map((r) => {
                          const idx = flatResults.indexOf(r)
                          return (
                            <button
                              key={r.id}
                              data-index={idx}
                              onClick={() => handleSelect(r)}
                              onMouseEnter={() => setActive(idx)}
                              className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                                idx === active ? 'bg-primary/10' : 'hover:bg-surfaceHigh/50'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-textPrimary truncate">{r.title}</p>
                                <p className="text-xs text-textMuted truncate">{r.subtitle}</p>
                              </div>
                              {r.badge && (
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0 ${
                                  r.badgeColor === 'success' ? 'bg-success/10 text-success'
                                  : r.badgeColor === 'danger' ? 'bg-danger/10 text-danger'
                                  : r.badgeColor === 'warning' ? 'bg-warning/10 text-warning'
                                  : 'bg-surfaceHigh text-textMuted'
                                }`}>
                                  {r.badge}
                                </span>
                              )}
                              <ChevronRight className={`w-3 h-3 shrink-0 transition-opacity ${idx === active ? 'text-primary opacity-100' : 'opacity-0'}`} />
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer hint */}
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
