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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ── Mock data ─────────────────────────────────────────────────────────────────

const revenueData = [
  { month: 'Jan', revenus: 3200 },
  { month: 'Fév', revenus: 3200 },
  { month: 'Mar', revenus: 3400 },
  { month: 'Avr', revenus: 3400 },
  { month: 'Mai', revenus: 3600 },
  { month: 'Jun', revenus: 3600 },
  { month: 'Jul', revenus: 3600 },
  { month: 'Aoû', revenus: 3600 },
  { month: 'Sep', revenus: 3800 },
  { month: 'Oct', revenus: 3800 },
  { month: 'Nov', revenus: 3800 },
  { month: 'Déc', revenus: 3800 },
]

const recentPayments = [
  { tenant: 'Sophie Martin',   property: 'Apt. Marais 3P',    amount: 1250, date: '2026-03-05', status: 'paid'    },
  { tenant: 'Lucas Bernard',   property: 'Studio Bastille',   amount:  780, date: '2026-03-03', status: 'paid'    },
  { tenant: 'Emma Dupont',     property: 'T2 République',     amount: 1100, date: '2026-03-01', status: 'paid'    },
  { tenant: 'Thomas Leclerc',  property: 'Apt. Nation 2P',    amount:  950, date: '2026-02-28', status: 'late'    },
  { tenant: 'Chloé Rousseau',  property: 'Studio Oberkampf',  amount:  720, date: '2026-02-28', status: 'pending' },
]

const alerts = [
  { type: 'irl',      message: 'Révision IRL possible pour Apt. Marais 3P',   date: '2026-03-18' },
  { type: 'renewal',  message: 'Bail de Lucas Bernard expire dans 2 mois',    date: '2026-05-01' },
  { type: 'overdue',  message: 'Loyer impayé — Thomas Leclerc (fév. 2026)',   date: '2026-03-01' },
]

// ── Components ────────────────────────────────────────────────────────────────

const statusConfig = {
  paid:    { label: 'Payé',      variant: 'success', icon: CheckCircle2 },
  late:    { label: 'En retard', variant: 'danger',  icon: XCircle      },
  pending: { label: 'En attente',variant: 'warning', icon: Clock        },
} as const

const alertConfig = {
  irl:     { color: 'text-primary', bg: 'bg-primary/10'  },
  renewal: { color: 'text-warning', bg: 'bg-warning/10'  },
  overdue: { color: 'text-danger',  bg: 'bg-danger/10'   },
} as const

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
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

      {/* KPI Cards */}
      <motion.div variants={item} className="grid grid-cols-4 gap-4">
        <KpiCard
          title="Revenus du mois"
          value={formatCurrency(3800)}
          delta="+5.6%"
          positive
          icon={TrendingUp}
          color="primary"
        />
        <KpiCard
          title="Locataires actifs"
          value="5"
          delta="stable"
          icon={Users}
          color="success"
        />
        <KpiCard
          title="Baux en cours"
          value="5"
          delta="1 expire bientôt"
          icon={FileText}
          color="warning"
        />
        <KpiCard
          title="Impayés"
          value={formatCurrency(950)}
          delta="1 loyer"
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
                <Badge variant="success">+5.6% vs 2025</Badge>
              </div>
            </CardHeader>
            <CardContent>
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
              {alerts.map((alert, i) => {
                const cfg = alertConfig[alert.type as keyof typeof alertConfig]
                return (
                  <div
                    key={i}
                    className={`flex flex-col gap-1 p-3 rounded-lg ${cfg.bg}`}
                  >
                    <p className={`text-xs font-medium ${cfg.color}`}>{alert.message}</p>
                    <p className="text-xs text-textMuted">{formatDate(alert.date)}</p>
                  </div>
                )
              })}
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
                <CardDescription>Mars 2026</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                Voir tout <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
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
                  const cfg = statusConfig[p.status as keyof typeof statusConfig]
                  const Icon = cfg.icon
                  return (
                    <tr
                      key={i}
                      className="border-b border-border/50 last:border-0 hover:bg-surfaceHigh/50 transition-colors"
                    >
                      <td className="px-5 py-3 text-sm font-medium text-textPrimary">{p.tenant}</td>
                      <td className="px-5 py-3 text-sm text-textMuted">{p.property}</td>
                      <td className="px-5 py-3 text-sm text-textMuted">{formatDate(p.date)}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-textPrimary text-right">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Badge variant={cfg.variant as 'success' | 'danger' | 'warning'} className="ml-auto">
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
