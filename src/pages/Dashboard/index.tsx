import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Users,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  InboxIcon,
  Building2,
  UserPlus,
  ScrollText,
  CreditCard,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ── Onboarding guide ──────────────────────────────────────────────────────────

const STEPS = [
  {
    key: 'properties',
    icon: Building2,
    label: 'Ajouter un bien immobilier',
    description: 'Enregistrez votre premier appartement ou maison.',
    route: '/properties',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
  },
  {
    key: 'tenants',
    icon: UserPlus,
    label: 'Ajouter un locataire',
    description: 'Créez le profil de votre locataire.',
    route: '/tenants',
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/20',
  },
  {
    key: 'leases',
    icon: ScrollText,
    label: 'Créer un bail',
    description: 'Associez un bien à un locataire avec les conditions du bail.',
    route: '/leases',
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/20',
  },
  {
    key: 'payments',
    icon: CreditCard,
    label: 'Enregistrer un paiement',
    description: 'Saisissez votre premier loyer reçu.',
    route: '/payments',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/20',
  },
]

// Simule les compteurs — à remplacer par de vraies données SQLite plus tard
const counts = { properties: 0, tenants: 0, leases: 0, payments: 0 }

function OnboardingGuide() {
  const navigate = useNavigate()
  const completedCount = Object.values(counts).filter((v) => v > 0).length
  const allDone = completedCount === STEPS.length
  if (allDone) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Démarrer avec LeaseFrance</CardTitle>
          </div>
          <CardDescription>
            {completedCount} / {STEPS.length} étapes complétées — suivez le guide pour configurer votre espace.
          </CardDescription>
          {/* Barre de progression */}
          <div className="flex gap-1 mt-2">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                  counts[s.key as keyof typeof counts] > 0 ? 'bg-primary' : i < completedCount ? 'bg-primary' : 'bg-surfaceHigh'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {STEPS.map((step, i) => {
            const done = counts[step.key as keyof typeof counts] > 0
            const Icon = step.icon
            const locked = i > 0 && counts[STEPS[i - 1].key as keyof typeof counts] === 0

            return (
              <button
                key={step.key}
                onClick={() => !locked && navigate(step.route)}
                disabled={locked}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
                  done
                    ? 'border-success/20 bg-success/5 opacity-70'
                    : locked
                    ? 'border-border bg-surfaceHigh/30 opacity-40 cursor-not-allowed'
                    : `${step.border} ${step.bg} hover:brightness-110 cursor-pointer`
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${done ? 'bg-success/10' : step.bg}`}>
                  {done
                    ? <CheckCircle2 className="w-4 h-4 text-success" />
                    : <Icon className={`w-4 h-4 ${step.color}`} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${done ? 'text-success line-through' : 'text-textPrimary'}`}>
                    {step.label}
                  </p>
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

// ── Empty data ─────────────────────────────────────────────────────────────────

const revenueData: { month: string; revenus: number }[] = []

const recentPayments: {
  tenant: string
  property: string
  amount: number
  date: string
  status: 'paid' | 'late' | 'pending'
}[] = []

const alerts: { type: 'irl' | 'renewal' | 'overdue'; message: string; date: string }[] = []

// ── Components ────────────────────────────────────────────────────────────────

const statusConfig = {
  paid:    { label: 'Payé',       variant: 'success', icon: CheckCircle2 },
  late:    { label: 'En retard',  variant: 'danger',  icon: XCircle      },
  pending: { label: 'En attente', variant: 'warning', icon: Clock        },
} as const

const alertConfig = {
  irl:     { color: 'text-primary', bg: 'bg-primary/10' },
  renewal: { color: 'text-warning', bg: 'bg-warning/10' },
  overdue: { color: 'text-danger',  bg: 'bg-danger/10'  },
} as const

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-textMuted">
      <InboxIcon className="w-8 h-8 opacity-30" />
      <p className="text-xs">{message}</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">Tableau de bord</h1>
          <p className="text-textMuted text-sm mt-1 capitalize">{today}</p>
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          Nouveau paiement
        </Button>
      </motion.div>

      {/* Onboarding */}
      <motion.div variants={item}>
        <OnboardingGuide />
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid grid-cols-4 gap-4">
        <KpiCard
          title="Revenus du mois"
          value={formatCurrency(0)}
          delta="Aucun paiement"
          icon={TrendingUp}
          color="primary"
        />
        <KpiCard
          title="Locataires actifs"
          value="0"
          delta="Aucun locataire"
          icon={Users}
          color="success"
        />
        <KpiCard
          title="Baux en cours"
          value="0"
          delta="Aucun bail"
          icon={FileText}
          color="warning"
        />
        <KpiCard
          title="Impayés"
          value={formatCurrency(0)}
          delta="Aucun impayé"
          icon={AlertTriangle}
          color="danger"
        />
      </motion.div>

      {/* Chart + Alerts */}
      <div className="grid grid-cols-3 gap-4">
        {/* Revenue chart */}
        <motion.div variants={item} className="col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Revenus locatifs</CardTitle>
                  <CardDescription>Évolution sur 12 mois</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {revenueData.length === 0 ? (
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
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}€`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#1A1A24',
                        border: '1px solid #2A2A3A',
                        borderRadius: '8px',
                        color: '#E2E8F0',
                        fontSize: '12px',
                      }}
                      formatter={(v: number) => [`${v} €`, 'Revenus']}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenus"
                      stroke="#6366F1"
                      strokeWidth={2}
                      fill="url(#colorRev)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Alerts */}
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
                alerts.map((alert, i) => {
                  const cfg = alertConfig[alert.type]
                  return (
                    <div key={i} className={`flex flex-col gap-1 p-3 rounded-lg ${cfg.bg}`}>
                      <p className={`text-xs font-medium ${cfg.color}`}>{alert.message}</p>
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
              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                Voir tout <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentPayments.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState message="Aucun paiement enregistré" />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-textMuted font-medium px-5 py-2.5">Locataire</th>
                    <th className="text-left text-xs text-textMuted font-medium px-5 py-2.5">Bien</th>
                    <th className="text-left text-xs text-textMuted font-medium px-5 py-2.5">Date</th>
                    <th className="text-right text-xs text-textMuted font-medium px-5 py-2.5">Montant</th>
                    <th className="text-right text-xs text-textMuted font-medium px-5 py-2.5">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p, i) => {
                    const cfg = statusConfig[p.status]
                    const Icon = cfg.icon
                    return (
                      <tr
                        key={i}
                        className="border-b border-border/50 last:border-0 hover:bg-surfaceHigh/50 transition-colors"
                      >
                        <td className="px-5 py-3 text-sm font-medium text-textPrimary">{p.tenant}</td>
                        <td className="px-5 py-3 text-sm text-textMuted">{p.property}</td>
                        <td className="px-5 py-3 text-sm text-textMuted">{p.date}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-textPrimary text-right">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Badge variant={cfg.variant} className="ml-auto">
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

function KpiCard({
  title,
  value,
  delta,
  positive,
  icon: Icon,
  color,
}: {
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
            <p className={`text-xs font-medium ${positive ? 'text-success' : 'text-textMuted'}`}>
              {delta}
            </p>
          </div>
          <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${c.bg}`}>
            <Icon className={`w-4.5 h-4.5 ${c.icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
