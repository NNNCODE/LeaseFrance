import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  TrendingUp, Users, FileText, AlertTriangle,
  ArrowUpRight, Plus, CheckCircle2, Clock, XCircle,
  InboxIcon, Building2, UserPlus, ScrollText, CreditCard,
  ChevronRight, Sparkles, CalendarClock, Shield, FolderOpen,
  CalendarDays, Bell, Wallet,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { isRevisionEligible, isAnniversaryWithinDays } from '@/lib/irl'
import { getDepositStatus } from '@/pages/Leases/depositUtils'
import { getCompletedDossierCount, DOSSIER_ITEMS } from '@/pages/Tenants/tenantFileHelpers'
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

// ── Types locaux ───────────────────────────────────────────────────────────────

interface DashboardData {
  propertiesCount: number
  tenantsCount: number
  leasesCount: number
  payments: Payment[]
  leases: Lease[]
  tenants: Tenant[]
  reminders: ManualReminder[]
}

const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

// ── Onboarding ────────────────────────────────────────────────────────────────

const STEPS = [
  { key: 'properties', icon: Building2, label: 'Ajouter un bien',      description: 'Enregistrez votre premier logement.', route: '/properties', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  { key: 'tenants',    icon: UserPlus,  label: 'Ajouter un locataire',  description: 'Créez le profil de votre locataire.', route: '/tenants',    color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
  { key: 'leases',     icon: ScrollText,label: 'Créer un bail',         description: 'Associez bien et locataire.',         route: '/leases',     color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
  { key: 'payments',   icon: CreditCard,label: 'Enregistrer un loyer',  description: 'Saisissez votre premier paiement.',   route: '/payments',   color: 'text-accent',  bg: 'bg-accent/10',  border: 'border-accent/20'  },
]

function OnboardingGuide({ counts }: { counts: Record<string, number> }) {
  const navigate = useNavigate()
  const completedCount = STEPS.filter((s) => counts[s.key] > 0).length
  if (completedCount === STEPS.length) return null

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Démarrer avec LeaseFrance</CardTitle>
          </div>
          <CardDescription>
            {completedCount} / {STEPS.length} étapes complétées
          </CardDescription>
          <div className="flex gap-1 mt-2">
            {STEPS.map((s) => (
              <div key={s.key} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${counts[s.key] > 0 ? 'bg-primary' : 'bg-surfaceHigh'}`} />
            ))}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {STEPS.map((step, i) => {
            const done   = counts[step.key] > 0
            const locked = i > 0 && counts[STEPS[i - 1].key] === 0
            const Icon   = step.icon
            return (
              <button
                key={step.key}
                onClick={() => !locked && !done && navigate(step.route)}
                disabled={locked}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
                  done   ? 'border-success/20 bg-success/5 opacity-60 cursor-default'
                  : locked ? 'border-border bg-surfaceHigh/30 opacity-40 cursor-not-allowed'
                  : `${step.border} ${step.bg} hover:brightness-110 cursor-pointer`
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${done ? 'bg-success/10' : step.bg}`}>
                  {done ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Icon className={`w-4 h-4 ${step.color}`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${done ? 'text-success line-through' : 'text-textPrimary'}`}>{step.label}</p>
                  <p className="text-xs text-textMuted truncate">{step.description}</p>
                </div>
                {!done && !locked && <ChevronRight className="w-3.5 h-3.5 text-textMuted shrink-0" />}
              </button>
            )
          })}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const statusConfig = {
  paid:    { label: 'Payé',       variant: 'success', icon: CheckCircle2 },
  late:    { label: 'En retard',  variant: 'danger',  icon: XCircle      },
  pending: { label: 'En attente', variant: 'warning', icon: Clock        },
} as const

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-textMuted">
      <InboxIcon className="w-8 h-8 opacity-30" />
      <p className="text-xs">{message}</p>
    </div>
  )
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } }

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData>({
    propertiesCount: 0,
    tenantsCount: 0,
    leasesCount: 0,
    payments: [],
    leases: [],
    tenants: [],
    reminders: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      window.api.properties.count(),
      window.api.tenants.count(),
      window.api.leases.count(),
      window.api.payments.getAll(),
      window.api.leases.getAll(),
      window.api.tenants.getAll(),
      window.api.manualReminders.getAll(),
    ]).then(([propertiesCount, tenantsCount, leasesCount, payments, leases, tenants, reminders]) => {
      setData({ propertiesCount, tenantsCount, leasesCount, payments, leases, tenants, reminders })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // ── KPIs ──
  const now = new Date()
  const thisMonth = now.getMonth() + 1
  const thisYear  = now.getFullYear()

  const monthPayments = data.payments.filter(
    (p) => p.period_month === thisMonth && p.period_year === thisYear
  )
  const monthRevenue  = monthPayments.filter((p) => p.status === 'paid')
    .reduce((s, p) => s + p.rent_amount + p.charges_amount, 0)
  const latePayments  = data.payments.filter((p) => p.status === 'late')
  const lateAmount    = latePayments.reduce((s, p) => s + p.rent_amount + p.charges_amount, 0)
  const lateCount     = latePayments.length

  // ── Revenus 6 mois glissants ──
  const revenueData = useMemo(() => {
    const months: { month: string; revenus: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - 1 - i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const total = data.payments
        .filter((p) => p.status === 'paid' && p.period_month === m && p.period_year === y)
        .reduce((s, p) => s + p.rent_amount + p.charges_amount, 0)
      months.push({ month: MONTHS_SHORT[m - 1], revenus: total })
    }
    return months
  }, [data.payments, thisMonth, thisYear])

  const hasChartData = revenueData.some((d) => d.revenus > 0)

  // ── Paiements récents (5 derniers) ──
  const recentPayments = useMemo(() =>
    [...data.payments]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5),
    [data.payments]
  )

  // ── Baux éligibles révision IRL ──
  const irlRevisionLeases = useMemo(() =>
    data.leases.filter((l) =>
      l.status === 'active' &&
      isRevisionEligible(l.type, l.start_date, l.irl_reference_index, l.irl_reference_quarter) &&
      isAnniversaryWithinDays(l.start_date, 60)
    ),
    [data.leases]
  )

  // ── Baux à échéance (fin dans 90 jours ou dépassée de 30 jours) ──
  const expiringLeases = useMemo(() =>
    data.leases
      .filter((l) => l.status === 'active' && l.end_date)
      .map((l) => ({ ...l, _days: daysUntil(l.end_date!) }))
      .filter((l) => l._days >= -30 && l._days <= 90)
      .sort((a, b) => a._days - b._days),
    [data.leases]
  )

  // ── Dépôts à restituer (bail terminé, dépôt toujours détenu) ──
  const depositsToReturn = useMemo(() =>
    data.leases.filter((l) => {
      if (l.status === 'active') return false
      const status = getDepositStatus(l)
      return status === 'held'
    }),
    [data.leases]
  )

  // ── Dépôts en attente d'encaissement ──
  const depositsAwaiting = useMemo(() =>
    data.leases.filter((l) => {
      if (l.status !== 'active') return false
      return getDepositStatus(l) === 'awaiting'
    }),
    [data.leases]
  )

  // ── Dossiers locatifs incomplets (locataires avec bail actif) ──
  const incompleteDossiers = useMemo(() => {
    const activeLeasesTenantIds = new Set(
      data.leases.filter((l) => l.status === 'active').map((l) => l.tenant_id)
    )
    return data.tenants
      .filter((t) => activeLeasesTenantIds.has(t.id))
      .map((t) => ({ ...t, _completed: getCompletedDossierCount(t) }))
      .filter((t) => t._completed < DOSSIER_ITEMS.length)
      .sort((a, b) => a._completed - b._completed)
  }, [data.tenants, data.leases])

  // ── Rappels en attente ──
  const pendingReminders = useMemo(() =>
    data.reminders
      .filter((r) => r.status === 'pending')
      .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [data.reminders]
  )

  // ── Onboarding counts ──
  const counts = {
    properties: data.propertiesCount,
    tenants:    data.tenantsCount,
    leases:     data.leasesCount,
    payments:   data.payments.length,
  }

  // Total action items for the command center badge
  const totalActions = lateCount
    + expiringLeases.length
    + depositsToReturn.length
    + depositsAwaiting.length
    + incompleteDossiers.length
    + pendingReminders.length
    + irlRevisionLeases.length

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">Tableau de bord</h1>
          <p className="text-textMuted text-sm mt-1 capitalize">{today}</p>
        </div>
        <Button onClick={() => navigate('/payments')}>
          <Plus className="w-4 h-4" />
          Nouveau paiement
        </Button>
      </motion.div>

      {/* Onboarding (disparaît quand tout est rempli) */}
      {!loading && (
        <motion.div variants={item}>
          <OnboardingGuide counts={counts} />
        </motion.div>
      )}

      {/* KPI Cards */}
      <motion.div variants={item} className="grid grid-cols-4 gap-4">
        <KpiCard
          title="Revenus du mois"
          value={formatCurrency(monthRevenue)}
          delta={monthPayments.length > 0 ? `${monthPayments.filter((p) => p.status === 'paid').length}/${monthPayments.length} payés` : 'Aucun paiement'}
          icon={TrendingUp}
          color="primary"
          positive={monthRevenue > 0}
        />
        <KpiCard
          title="Locataires actifs"
          value={String(data.tenantsCount)}
          delta={data.tenantsCount > 0 ? `${data.leasesCount} bail${data.leasesCount !== 1 ? 's' : ''} actif${data.leasesCount !== 1 ? 's' : ''}` : 'Aucun locataire'}
          icon={Users}
          color="success"
          positive={data.tenantsCount > 0}
        />
        <KpiCard
          title="Baux en cours"
          value={String(data.leasesCount)}
          delta={data.leasesCount > 0 ? `${data.propertiesCount} bien${data.propertiesCount !== 1 ? 's' : ''}` : 'Aucun bail'}
          icon={FileText}
          color="warning"
          positive={data.leasesCount > 0}
        />
        <KpiCard
          title="Impayés"
          value={formatCurrency(lateAmount)}
          delta={lateCount > 0 ? `${lateCount} loyer${lateCount > 1 ? 's' : ''} en retard` : 'Aucun impayé'}
          icon={AlertTriangle}
          color="danger"
          positive={lateCount === 0}
        />
      </motion.div>

      {/* Chart + Alertes */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div variants={item} className="col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Revenus locatifs</CardTitle>
              <CardDescription>6 derniers mois — loyers encaissés</CardDescription>
            </CardHeader>
            <CardContent>
              {!hasChartData ? (
                <EmptyState message="Aucune donnée de revenus disponible" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={revenueData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" />
                    <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}€`} />
                    <Tooltip
                      contentStyle={{ background: '#1A1A24', border: '1px solid #2A2A3A', borderRadius: '8px', color: '#E2E8F0', fontSize: '12px' }}
                      formatter={(v: number) => [`${v} €`, 'Revenus']}
                    />
                    <Area type="monotone" dataKey="revenus" stroke="#6366F1" strokeWidth={2} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Actions requises</CardTitle>
                  <CardDescription>Vue d'ensemble</CardDescription>
                </div>
                {totalActions > 0 && (
                  <Badge variant="danger" className="text-xs">{totalActions}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {totalActions === 0 ? (
                <EmptyState message="Aucune action requise" />
              ) : (
                <>
                  {lateCount > 0 && (
                    <AlertRow icon={AlertTriangle} color="danger" onClick={() => navigate('/payments')}>
                      {lateCount} impayé{lateCount > 1 ? 's' : ''} — {formatCurrency(lateAmount)}
                    </AlertRow>
                  )}
                  {expiringLeases.length > 0 && (
                    <AlertRow icon={CalendarDays} color="warning" onClick={() => navigate('/leases')}>
                      {expiringLeases.length} bail{expiringLeases.length > 1 ? 'x' : ''} à échéance
                    </AlertRow>
                  )}
                  {depositsToReturn.length > 0 && (
                    <AlertRow icon={Wallet} color="warning" onClick={() => navigate('/leases')}>
                      {depositsToReturn.length} dépôt{depositsToReturn.length > 1 ? 's' : ''} à restituer
                    </AlertRow>
                  )}
                  {depositsAwaiting.length > 0 && (
                    <AlertRow icon={Wallet} color="primary" onClick={() => navigate('/leases')}>
                      {depositsAwaiting.length} dépôt{depositsAwaiting.length > 1 ? 's' : ''} à encaisser
                    </AlertRow>
                  )}
                  {incompleteDossiers.length > 0 && (
                    <AlertRow icon={FolderOpen} color="warning" onClick={() => navigate('/tenants')}>
                      {incompleteDossiers.length} dossier{incompleteDossiers.length > 1 ? 's' : ''} incomplet{incompleteDossiers.length > 1 ? 's' : ''}
                    </AlertRow>
                  )}
                  {pendingReminders.length > 0 && (
                    <AlertRow icon={Bell} color="primary" onClick={() => navigate('/reminders')}>
                      {pendingReminders.length} rappel{pendingReminders.length > 1 ? 's' : ''} en attente
                    </AlertRow>
                  )}
                  {irlRevisionLeases.length > 0 && (
                    <AlertRow icon={TrendingUp} color="primary" onClick={() => navigate('/leases')}>
                      {irlRevisionLeases.length} révision{irlRevisionLeases.length > 1 ? 's' : ''} IRL éligible{irlRevisionLeases.length > 1 ? 's' : ''}
                    </AlertRow>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Suivi opérationnel ── */}
      {totalActions > 0 && (
        <motion.div variants={item} className="grid grid-cols-2 gap-4">

          {/* Impayés */}
          {lateCount > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-danger/10">
                      <AlertTriangle className="w-3.5 h-3.5 text-danger" />
                    </div>
                    <CardTitle className="text-sm">Loyers impayés</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/payments')} className="text-xs text-primary gap-1">
                    Voir <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {latePayments.slice(0, 4).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-danger/5 border border-danger/10">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-textPrimary truncate">{p.tenant_first_name} {p.tenant_last_name}</p>
                      <p className="text-[11px] text-textMuted">{p.property_name} · {MONTHS_SHORT[p.period_month - 1]} {p.period_year}</p>
                    </div>
                    <p className="text-xs font-semibold text-danger shrink-0">{formatCurrency(p.rent_amount + p.charges_amount)}</p>
                  </div>
                ))}
                {lateCount > 4 && (
                  <p className="text-[11px] text-textMuted text-center mt-1">+ {lateCount - 4} autre{lateCount - 4 > 1 ? 's' : ''}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Baux à échéance */}
          {expiringLeases.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-warning/10">
                      <CalendarDays className="w-3.5 h-3.5 text-warning" />
                    </div>
                    <CardTitle className="text-sm">Baux à échéance</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/leases')} className="text-xs text-primary gap-1">
                    Voir <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {expiringLeases.slice(0, 4).map((l) => {
                  const overdue = l._days < 0
                  return (
                    <div key={l.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${overdue ? 'bg-danger/5 border-danger/10' : 'bg-warning/5 border-warning/10'}`}>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-textPrimary truncate">{l.tenant_first_name} {l.tenant_last_name}</p>
                        <p className="text-[11px] text-textMuted">{l.property_name}</p>
                      </div>
                      <Badge variant={overdue ? 'danger' : 'warning'} className="text-[10px] shrink-0">
                        {overdue ? `Expiré ${Math.abs(l._days)}j` : `${l._days}j`}
                      </Badge>
                    </div>
                  )
                })}
                {expiringLeases.length > 4 && (
                  <p className="text-[11px] text-textMuted text-center mt-1">+ {expiringLeases.length - 4} autre{expiringLeases.length - 4 > 1 ? 's' : ''}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dépôts à restituer / encaisser */}
          {(depositsToReturn.length > 0 || depositsAwaiting.length > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-warning/10">
                      <Shield className="w-3.5 h-3.5 text-warning" />
                    </div>
                    <CardTitle className="text-sm">Dépôts de garantie</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/leases')} className="text-xs text-primary gap-1">
                    Voir <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {depositsToReturn.slice(0, 3).map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-warning/5 border border-warning/10">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-textPrimary truncate">{l.tenant_first_name} {l.tenant_last_name}</p>
                      <p className="text-[11px] text-textMuted">{l.property_name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <p className="text-xs font-semibold text-warning">{formatCurrency(l.deposit_amount)}</p>
                      <Badge variant="warning" className="text-[10px]">A restituer</Badge>
                    </div>
                  </div>
                ))}
                {depositsAwaiting.slice(0, 3 - Math.min(depositsToReturn.length, 3)).map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-textPrimary truncate">{l.tenant_first_name} {l.tenant_last_name}</p>
                      <p className="text-[11px] text-textMuted">{l.property_name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <p className="text-xs font-semibold text-primary">{formatCurrency(l.deposit_amount)}</p>
                      <Badge variant="default" className="text-[10px]">A encaisser</Badge>
                    </div>
                  </div>
                ))}
                {depositsToReturn.length + depositsAwaiting.length > 3 && (
                  <p className="text-[11px] text-textMuted text-center mt-1">+ {depositsToReturn.length + depositsAwaiting.length - 3} autre{depositsToReturn.length + depositsAwaiting.length - 3 > 1 ? 's' : ''}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dossiers incomplets */}
          {incompleteDossiers.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-warning/10">
                      <FolderOpen className="w-3.5 h-3.5 text-warning" />
                    </div>
                    <CardTitle className="text-sm">Dossiers locatifs incomplets</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/tenants')} className="text-xs text-primary gap-1">
                    Voir <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {incompleteDossiers.slice(0, 4).map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-warning/5 border border-warning/10">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-textPrimary truncate">{t.first_name} {t.last_name}</p>
                      <p className="text-[11px] text-textMuted">{t.property_name ?? 'Aucun bien'}</p>
                    </div>
                    <Badge variant={t._completed === 0 ? 'danger' : 'warning'} className="text-[10px] shrink-0">
                      {t._completed}/{DOSSIER_ITEMS.length}
                    </Badge>
                  </div>
                ))}
                {incompleteDossiers.length > 4 && (
                  <p className="text-[11px] text-textMuted text-center mt-1">+ {incompleteDossiers.length - 4} autre{incompleteDossiers.length - 4 > 1 ? 's' : ''}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rappels en attente */}
          {pendingReminders.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                      <Bell className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <CardTitle className="text-sm">Rappels en attente</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/reminders')} className="text-xs text-primary gap-1">
                    Voir <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {pendingReminders.slice(0, 4).map((r) => {
                  const d = daysUntil(r.due_date)
                  const overdue = d < 0
                  return (
                    <div key={r.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${overdue ? 'bg-danger/5 border-danger/10' : 'bg-primary/5 border-primary/10'}`}>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-textPrimary truncate">{r.title}</p>
                        <p className="text-[11px] text-textMuted">{formatDate(r.due_date)}{r.property_name ? ` · ${r.property_name}` : ''}</p>
                      </div>
                      <Badge variant={overdue ? 'danger' : 'default'} className="text-[10px] shrink-0">
                        {overdue ? `En retard ${Math.abs(d)}j` : d === 0 ? "Aujourd'hui" : `${d}j`}
                      </Badge>
                    </div>
                  )
                })}
                {pendingReminders.length > 4 && (
                  <p className="text-[11px] text-textMuted text-center mt-1">+ {pendingReminders.length - 4} autre{pendingReminders.length - 4 > 1 ? 's' : ''}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Révisions IRL */}
          {irlRevisionLeases.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                      <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <CardTitle className="text-sm">Révisions IRL éligibles</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/leases')} className="text-xs text-primary gap-1">
                    Voir <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {irlRevisionLeases.slice(0, 4).map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-textPrimary truncate">{l.tenant_first_name} {l.tenant_last_name}</p>
                      <p className="text-[11px] text-textMuted">{l.property_name} · {formatCurrency(l.rent_amount)}/mois</p>
                    </div>
                    <Badge variant="default" className="text-[10px] shrink-0">IRL</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Recent payments */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Paiements récents</CardTitle>
                <CardDescription>Derniers mouvements</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => navigate('/payments')} className="gap-1 text-primary text-xs">
                Voir tout <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentPayments.length === 0 ? (
              <div className="px-5 pb-5"><EmptyState message="Aucun paiement enregistré" /></div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-textMuted font-medium px-5 py-2.5">Locataire</th>
                    <th className="text-left text-xs text-textMuted font-medium px-5 py-2.5">Bien</th>
                    <th className="text-left text-xs text-textMuted font-medium px-5 py-2.5">Période</th>
                    <th className="text-right text-xs text-textMuted font-medium px-5 py-2.5">Montant</th>
                    <th className="text-right text-xs text-textMuted font-medium px-5 py-2.5">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p) => {
                    const cfg  = statusConfig[p.status]
                    const Icon = cfg.icon
                    return (
                      <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-surfaceHigh/50 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-textPrimary">{p.tenant_first_name} {p.tenant_last_name}</td>
                        <td className="px-5 py-3 text-sm text-textMuted">{p.property_name}</td>
                        <td className="px-5 py-3 text-sm text-textMuted">
                          {MONTHS_SHORT[p.period_month - 1]} {p.period_year}
                          {p.payment_date && <span className="ml-1 opacity-60">· {formatDate(p.payment_date)}</span>}
                        </td>
                        <td className="px-5 py-3 text-sm font-semibold text-textPrimary text-right">
                          {formatCurrency(p.rent_amount + p.charges_amount)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Badge variant={cfg.variant} className="ml-auto inline-flex items-center gap-1">
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ title, value, delta, positive, icon: Icon, color }: {
  title: string
  value: string
  delta: string
  positive?: boolean
  icon: React.ElementType
  color: 'primary' | 'success' | 'warning' | 'danger'
}) {
  const colorMap = {
    primary: { icon: 'text-primary', bg: 'bg-primary/10' },
    success: { icon: 'text-success', bg: 'bg-success/10' },
    warning: { icon: 'text-warning', bg: 'bg-warning/10' },
    danger:  { icon: 'text-danger',  bg: 'bg-danger/10'  },
  }
  const c = colorMap[color]
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-textMuted font-medium">{title}</p>
            <p className="text-2xl font-bold text-textPrimary">{value}</p>
            <p className={`text-xs font-medium ${positive ? 'text-success' : 'text-textMuted'}`}>{delta}</p>
          </div>
          <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${c.bg}`}>
            <Icon className={`w-4 h-4 ${c.icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Alert Row ─────────────────────────────────────────────────────────────────

function AlertRow({ icon: Icon, color, onClick, children }: {
  icon: React.ElementType
  color: 'danger' | 'warning' | 'primary'
  onClick: () => void
  children: React.ReactNode
}) {
  const styles = {
    danger:  { bg: 'bg-danger/10',  text: 'text-danger'  },
    warning: { bg: 'bg-warning/10', text: 'text-warning' },
    primary: { bg: 'bg-primary/10', text: 'text-primary' },
  }
  const s = styles[color]
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full p-2.5 rounded-lg text-left transition-all hover:brightness-110 ${s.bg}`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${s.text}`} />
      <p className={`text-xs font-medium flex-1 ${s.text}`}>{children}</p>
      <ChevronRight className={`w-3 h-3 shrink-0 opacity-50 ${s.text}`} />
    </button>
  )
}
