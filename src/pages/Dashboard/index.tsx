import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  TrendingUp, Users, FileText, AlertTriangle,
  ArrowUpRight, Plus, CheckCircle2, Clock, XCircle,
  InboxIcon, Building2, UserPlus, ScrollText, CreditCard,
  ChevronRight, Sparkles, CalendarClock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { isRevisionEligible, isAnniversaryWithinDays } from '@/lib/irl'
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
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      window.api.properties.count(),
      window.api.tenants.count(),
      window.api.leases.count(),
      window.api.payments.getAll(),
      window.api.leases.getAll(),
    ]).then(([propertiesCount, tenantsCount, leasesCount, payments, leases]) => {
      setData({ propertiesCount, tenantsCount, leasesCount, payments, leases })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // KPIs
  const now = new Date()
  const thisMonth = now.getMonth() + 1
  const thisYear  = now.getFullYear()

  const monthPayments = data.payments.filter(
    (p) => p.period_month === thisMonth && p.period_year === thisYear
  )
  const monthRevenue  = monthPayments.filter((p) => p.status === 'paid')
    .reduce((s, p) => s + p.rent_amount + p.charges_amount, 0)
  const lateAmount    = data.payments.filter((p) => p.status === 'late')
    .reduce((s, p) => s + p.rent_amount + p.charges_amount, 0)
  const lateCount     = data.payments.filter((p) => p.status === 'late').length

  // Revenus sur 6 mois glissants
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

  // Paiements récents (5 derniers)
  const recentPayments = useMemo(() =>
    [...data.payments]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5),
    [data.payments]
  )

  // Baux éligibles à la révision IRL (anniversaire dans les 60 jours)
  const irlRevisionCount = useMemo(() =>
    data.leases.filter((l) =>
      l.status === 'active' &&
      isRevisionEligible(l.type, l.start_date, l.irl_reference_index, l.irl_reference_quarter) &&
      isAnniversaryWithinDays(l.start_date, 60)
    ).length,
    [data.leases]
  )

  // Alertes dynamiques
  const alerts = useMemo(() => {
    const list: { type: 'overdue' | 'pending' | 'irl'; message: string; icon: typeof AlertTriangle }[] = []
    if (lateCount > 0) {
      list.push({
        type: 'overdue',
        message: `${lateCount} loyer${lateCount > 1 ? 's' : ''} en retard — ${formatCurrency(lateAmount)} à encaisser`,
        icon: AlertTriangle,
      })
    }
    const pendingThisMonth = monthPayments.filter((p) => p.status === 'pending').length
    if (pendingThisMonth > 0) {
      list.push({
        type: 'pending',
        message: `${pendingThisMonth} paiement${pendingThisMonth > 1 ? 's' : ''} en attente ce mois-ci`,
        icon: CalendarClock,
      })
    }
    if (irlRevisionCount > 0) {
      list.push({
        type: 'irl',
        message: `${irlRevisionCount} bail${irlRevisionCount > 1 ? 'x' : ''} éligible${irlRevisionCount > 1 ? 's' : ''} à la révision IRL`,
        icon: TrendingUp,
      })
    }
    return list
  }, [lateCount, lateAmount, monthPayments, irlRevisionCount])

  // Compteurs pour l'onboarding
  const counts = {
    properties: data.propertiesCount,
    tenants:    data.tenantsCount,
    leases:     data.leasesCount,
    payments:   data.payments.length,
  }

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

      {/* Chart + Alerts */}
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
              <CardTitle>Alertes</CardTitle>
              <CardDescription>Actions requises</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {alerts.length === 0 ? (
                <EmptyState message="Aucune alerte" />
              ) : (
                alerts.map((a, i) => {
                  const Icon = a.icon
                  const bg   = a.type === 'overdue' ? 'bg-danger/10' : a.type === 'irl' ? 'bg-primary/10' : 'bg-warning/10'
                  const text = a.type === 'overdue' ? 'text-danger'  : a.type === 'irl' ? 'text-primary'  : 'text-warning'
                  return (
                    <div key={i} className={`flex items-start gap-2 p-3 rounded-lg ${bg}`}>
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${text}`} />
                      <p className={`text-xs font-medium ${text}`}>{a.message}</p>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

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
