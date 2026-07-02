import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { DOSSIER_ITEMS } from '@/pages/Tenants/tenantFileHelpers'

const RevenueChart = lazy(() => import('./RevenueChart'))

// ── Types locaux ───────────────────────────────────────────────────────────────

// ── Onboarding ────────────────────────────────────────────────────────────────

const EMPTY_SNAPSHOT: DashboardSnapshot = {
  counts: {
    properties: 0,
    tenants: 0,
    leases: 0,
    payments: 0,
  },
  monthRevenue: 0,
  monthPaymentsTotal: 0,
  monthPaymentsPaid: 0,
  lateAmount: 0,
  lateCount: 0,
  revenueData: [],
  recentPayments: [],
  latePaymentsPreview: [],
  expiringLeasesCount: 0,
  expiringLeasesPreview: [],
  depositsToReturnCount: 0,
  depositsToReturnPreview: [],
  depositsAwaitingCount: 0,
  depositsAwaitingPreview: [],
  incompleteDossiersCount: 0,
  incompleteDossiersPreview: [],
  pendingRemindersCount: 0,
  pendingRemindersPreview: [],
  irlRevisionLeasesCount: 0,
  irlRevisionLeasesPreview: [],
  totalActions: 0,
}

const STEPS = [
  { key: 'properties', icon: Building2, labelKey: 'dashboard.onboarding.addProperty', descKey: 'dashboard.onboarding.addPropertyDesc', route: '/properties', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  { key: 'tenants',    icon: UserPlus,  labelKey: 'dashboard.onboarding.addTenant',   descKey: 'dashboard.onboarding.addTenantDesc',  route: '/tenants',    color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
  { key: 'leases',     icon: ScrollText,labelKey: 'dashboard.onboarding.createLease',  descKey: 'dashboard.onboarding.createLeaseDesc', route: '/leases',     color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
  { key: 'payments',   icon: CreditCard,labelKey: 'dashboard.onboarding.recordPayment', descKey: 'dashboard.onboarding.recordPaymentDesc', route: '/payments',   color: 'text-accent',  bg: 'bg-accent/10',  border: 'border-accent/20'  },
]

function OnboardingGuide({ counts }: { counts: Record<string, number> }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const completedCount = STEPS.filter((s) => counts[s.key] > 0).length
  if (completedCount === STEPS.length) return null

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">{t('dashboard.onboarding.title')}</CardTitle>
          </div>
          <CardDescription>
            {t('dashboard.onboarding.stepsCompleted', { completed: completedCount, total: STEPS.length })}
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
                  <p className={`text-xs font-semibold ${done ? 'text-success line-through' : 'text-textPrimary'}`}>{t(step.labelKey)}</p>
                  <p className="text-xs text-textMuted truncate">{t(step.descKey)}</p>
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
  paid:    { labelKey: 'dashboard.statusPaid',    variant: 'success', icon: CheckCircle2 },
  late:    { labelKey: 'dashboard.statusLate',    variant: 'danger',  icon: XCircle      },
  pending: { labelKey: 'dashboard.statusPending', variant: 'warning', icon: Clock        },
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
  const { t } = useTranslation()
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(EMPTY_SNAPSHOT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.dashboard.getSnapshot()
      .then((nextSnapshot) => {
        setSnapshot(nextSnapshot)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // ── KPIs ──
  const counts = snapshot.counts
  const monthRevenue = snapshot.monthRevenue
  const monthPaymentsTotal = snapshot.monthPaymentsTotal
  const monthPaymentsPaid = snapshot.monthPaymentsPaid
  const latePayments = snapshot.latePaymentsPreview
  const lateAmount = snapshot.lateAmount
  const lateCount = snapshot.lateCount

  // ── Revenus 6 mois glissants ──
  const revenueData = snapshot.revenueData

  const hasChartData = revenueData.some((d) => d.revenus > 0)

  // ── Paiements récents (5 derniers) ──
  const recentPayments = snapshot.recentPayments

  // ── Baux éligibles révision IRL ──
  const irlRevisionLeases = snapshot.irlRevisionLeasesPreview
  const irlRevisionLeasesCount = snapshot.irlRevisionLeasesCount

  // ── Baux à échéance (fin dans 90 jours ou dépassée de 30 jours) ──
  const expiringLeases = snapshot.expiringLeasesPreview
  const expiringLeasesCount = snapshot.expiringLeasesCount

  // ── Dépôts à restituer (bail terminé, dépôt toujours détenu) ──
  const depositsToReturn = snapshot.depositsToReturnPreview
  const depositsToReturnCount = snapshot.depositsToReturnCount

  // ── Dépôts en attente d'encaissement ──
  const depositsAwaiting = snapshot.depositsAwaitingPreview
  const depositsAwaitingCount = snapshot.depositsAwaitingCount

  // ── Dossiers locatifs incomplets (locataires avec bail actif) ──
  const incompleteDossiers = snapshot.incompleteDossiersPreview
  const incompleteDossiersCount = snapshot.incompleteDossiersCount

  // ── Rappels en attente ──
  const pendingReminders = snapshot.pendingRemindersPreview
  const pendingRemindersCount = snapshot.pendingRemindersCount

  // ── Onboarding counts ──
  const totalActions = snapshot.totalActions

  const lang = localStorage.getItem('lf_language') || 'fr'
  const localeMap: Record<string, string> = { fr: 'fr-FR', en: 'en-US', zh: 'zh-CN' }
  const today = new Date().toLocaleDateString(localeMap[lang] || 'fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const monthsShort = t('dashboard.monthsShort', { returnObjects: true }) as string[]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">{t('dashboard.title')}</h1>
          <p className="text-textMuted text-sm mt-1 capitalize">{today}</p>
        </div>
        <Button onClick={() => navigate('/payments')}>
          <Plus className="w-4 h-4" />
          {t('dashboard.newPayment')}
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
          title={t('dashboard.monthRevenue')}
          value={formatCurrency(monthRevenue)}
          delta={monthPaymentsTotal > 0 ? t('dashboard.paidOf', { paid: monthPaymentsPaid, total: monthPaymentsTotal }) : t('dashboard.noPayment')}
          icon={TrendingUp}
          color="primary"
          positive={monthRevenue > 0}
        />
        <KpiCard
          title={t('dashboard.activeTenants')}
          value={String(counts.tenants)}
          delta={counts.tenants > 0 ? t('dashboard.activeLeaseCount', { count: counts.leases }) : t('dashboard.noTenant')}
          icon={Users}
          color="success"
          positive={counts.tenants > 0}
        />
        <KpiCard
          title={t('dashboard.activeLeases')}
          value={String(counts.leases)}
          delta={counts.leases > 0 ? t('dashboard.propertyCount', { count: counts.properties }) : t('dashboard.noLease')}
          icon={FileText}
          color="warning"
          positive={counts.leases > 0}
        />
        <KpiCard
          title={t('dashboard.unpaid')}
          value={formatCurrency(lateAmount)}
          delta={lateCount > 0 ? t('dashboard.lateRentCount', { count: lateCount }) : t('dashboard.noUnpaid')}
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
              <CardTitle>{t('dashboard.rentalIncome')}</CardTitle>
              <CardDescription>{t('dashboard.rentalIncomeDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {!hasChartData ? (
                <EmptyState message={t('dashboard.noRevenueData')} />
              ) : (
                <Suspense fallback={<div className="h-[200px] w-full animate-pulse rounded-xl bg-muted/40" />}>
                  <RevenueChart data={revenueData} />
                </Suspense>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('dashboard.actionsRequired')}</CardTitle>
                  <CardDescription>{t('dashboard.overview')}</CardDescription>
                </div>
                {totalActions > 0 && (
                  <Badge variant="danger" className="text-xs">{totalActions}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {totalActions === 0 ? (
                <EmptyState message={t('dashboard.noActionRequired')} />
              ) : (
                <>
                  {lateCount > 0 && (
                    <AlertRow icon={AlertTriangle} color="danger" onClick={() => navigate('/payments')}>
                      {t('dashboard.unpaidCount', { count: lateCount })} — {formatCurrency(lateAmount)}
                    </AlertRow>
                  )}
                  {expiringLeasesCount > 0 && (
                    <AlertRow icon={CalendarDays} color="warning" onClick={() => navigate('/leases')}>
                      {t('dashboard.leaseExpiring', { count: expiringLeasesCount })}
                    </AlertRow>
                  )}
                  {depositsToReturnCount > 0 && (
                    <AlertRow icon={Wallet} color="warning" onClick={() => navigate('/leases')}>
                      {t('dashboard.depositToReturn', { count: depositsToReturnCount })}
                    </AlertRow>
                  )}
                  {depositsAwaitingCount > 0 && (
                    <AlertRow icon={Wallet} color="primary" onClick={() => navigate('/leases')}>
                      {t('dashboard.depositToCollect', { count: depositsAwaitingCount })}
                    </AlertRow>
                  )}
                  {incompleteDossiersCount > 0 && (
                    <AlertRow icon={FolderOpen} color="warning" onClick={() => navigate('/tenants')}>
                      {t('dashboard.incompleteDossier', { count: incompleteDossiersCount })}
                    </AlertRow>
                  )}
                  {pendingRemindersCount > 0 && (
                    <AlertRow icon={Bell} color="primary" onClick={() => navigate('/reminders')}>
                      {t('dashboard.pendingReminder', { count: pendingRemindersCount })}
                    </AlertRow>
                  )}
                  {irlRevisionLeasesCount > 0 && (
                    <AlertRow icon={TrendingUp} color="primary" onClick={() => navigate('/leases')}>
                      {t('dashboard.irlRevision', { count: irlRevisionLeasesCount })}
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
                    <CardTitle className="text-sm">{t('dashboard.unpaidRent')}</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/payments')} className="text-xs text-primary gap-1">
                    {t('common.view')} <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {latePayments.slice(0, 4).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-danger/5 border border-danger/10">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-textPrimary truncate">{p.tenant_first_name} {p.tenant_last_name}</p>
                      <p className="text-[11px] text-textMuted">{p.property_name} · {monthsShort[p.period_month - 1]} {p.period_year}</p>
                    </div>
                    <p className="text-xs font-semibold text-danger shrink-0">{formatCurrency(p.rent_amount + p.charges_amount)}</p>
                  </div>
                ))}
                {lateCount > 4 && (
                  <p className="text-[11px] text-textMuted text-center mt-1">{t('common.andMore', { count: lateCount - 4 })}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Baux à échéance */}
          {expiringLeasesCount > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-warning/10">
                      <CalendarDays className="w-3.5 h-3.5 text-warning" />
                    </div>
                    <CardTitle className="text-sm">{t('dashboard.expiringLeases')}</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/leases')} className="text-xs text-primary gap-1">
                    {t('common.view')} <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {expiringLeases.slice(0, 4).map((l) => {
                  const overdue = l.days_until_end < 0
                  return (
                    <div key={l.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${overdue ? 'bg-danger/5 border-danger/10' : 'bg-warning/5 border-warning/10'}`}>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-textPrimary truncate">{l.tenant_first_name} {l.tenant_last_name}</p>
                        <p className="text-[11px] text-textMuted">{l.property_name}</p>
                      </div>
                      <Badge variant={overdue ? 'danger' : 'warning'} className="text-[10px] shrink-0">
                        {overdue ? t('dashboard.expired', { days: Math.abs(l.days_until_end) }) : t('dashboard.daysLeft', { days: l.days_until_end })}
                      </Badge>
                    </div>
                  )
                })}
                {expiringLeasesCount > 4 && (
                  <p className="text-[11px] text-textMuted text-center mt-1">{t('common.andMore', { count: expiringLeasesCount - 4 })}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dépôts à restituer / encaisser */}
          {(depositsToReturnCount > 0 || depositsAwaitingCount > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-warning/10">
                      <Shield className="w-3.5 h-3.5 text-warning" />
                    </div>
                    <CardTitle className="text-sm">{t('dashboard.securityDeposits')}</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/leases')} className="text-xs text-primary gap-1">
                    {t('common.view')} <ArrowUpRight className="w-3 h-3" />
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
                      <Badge variant="warning" className="text-[10px]">{t('dashboard.toReturn')}</Badge>
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
                      <Badge variant="default" className="text-[10px]">{t('dashboard.toCollect')}</Badge>
                    </div>
                  </div>
                ))}
                {depositsToReturnCount + depositsAwaitingCount > 3 && (
                  <p className="text-[11px] text-textMuted text-center mt-1">{t('common.andMore', { count: depositsToReturnCount + depositsAwaitingCount - 3 })}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dossiers incomplets */}
          {incompleteDossiersCount > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-warning/10">
                      <FolderOpen className="w-3.5 h-3.5 text-warning" />
                    </div>
                    <CardTitle className="text-sm">{t('dashboard.incompleteDossiers')}</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/tenants')} className="text-xs text-primary gap-1">
                    {t('common.view')} <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {incompleteDossiers.slice(0, 4).map((t_) => (
                  <div key={t_.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-warning/5 border border-warning/10">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-textPrimary truncate">{t_.first_name} {t_.last_name}</p>
                      <p className="text-[11px] text-textMuted">{t_.property_name ?? 'Aucun bien'}{t_.attachment_count > 0 ? ` · ${t_.attachment_count} fichier${t_.attachment_count > 1 ? 's' : ''}` : ' · 0 fichier'}</p>
                    </div>
                    <Badge variant={t_.completed_dossier_count === 0 ? 'danger' : 'warning'} className="text-[10px] shrink-0">
                      {t_.completed_dossier_count}/{DOSSIER_ITEMS.length}
                    </Badge>
                  </div>
                ))}
                {incompleteDossiersCount > 4 && (
                  <p className="text-[11px] text-textMuted text-center mt-1">{t('common.andMore', { count: incompleteDossiersCount - 4 })}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rappels en attente */}
          {pendingRemindersCount > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                      <Bell className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <CardTitle className="text-sm">{t('dashboard.pendingReminders')}</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/reminders')} className="text-xs text-primary gap-1">
                    {t('common.view')} <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {pendingReminders.slice(0, 4).map((r) => {
                  const overdue = r.days_until_due < 0
                  return (
                    <div key={r.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${overdue ? 'bg-danger/5 border-danger/10' : 'bg-primary/5 border-primary/10'}`}>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-textPrimary truncate">{r.title}</p>
                        <p className="text-[11px] text-textMuted">{formatDate(r.due_date)}{r.property_name ? ` · ${r.property_name}` : ''}</p>
                      </div>
                      <Badge variant={overdue ? 'danger' : 'default'} className="text-[10px] shrink-0">
                        {overdue ? t('dashboard.overdue', { days: Math.abs(r.days_until_due) }) : r.days_until_due === 0 ? t('dashboard.dueToday') : t('dashboard.dueInDays', { days: r.days_until_due })}
                      </Badge>
                    </div>
                  )
                })}
                {pendingRemindersCount > 4 && (
                  <p className="text-[11px] text-textMuted text-center mt-1">{t('common.andMore', { count: pendingRemindersCount - 4 })}</p>
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
                    <CardTitle className="text-sm">{t('dashboard.irlRevisions')}</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/leases')} className="text-xs text-primary gap-1">
                    {t('common.view')} <ArrowUpRight className="w-3 h-3" />
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
                <CardTitle>{t('dashboard.recentPayments')}</CardTitle>
              </div>
              <Button variant="ghost" onClick={() => navigate('/payments')} className="gap-1 text-primary text-xs">
                {t('common.view')} <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentPayments.length === 0 ? (
              <div className="px-5 pb-5"><EmptyState message={t('dashboard.noRecentPayment')} /></div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-textMuted font-medium px-5 py-2.5">{t('leases.tenant')}</th>
                    <th className="text-left text-xs text-textMuted font-medium px-5 py-2.5">{t('leases.property')}</th>
                    <th className="text-left text-xs text-textMuted font-medium px-5 py-2.5">{t('payments.period')}</th>
                    <th className="text-right text-xs text-textMuted font-medium px-5 py-2.5">{t('fiscal.amount')}</th>
                    <th className="text-right text-xs text-textMuted font-medium px-5 py-2.5">{t('payments.statusLabel')}</th>
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
                          {monthsShort[p.period_month - 1]} {p.period_year}
                          {p.payment_date && <span className="ml-1 opacity-60">· {formatDate(p.payment_date)}</span>}
                        </td>
                        <td className="px-5 py-3 text-sm font-semibold text-textPrimary text-right">
                          {formatCurrency(p.rent_amount + p.charges_amount)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Badge variant={cfg.variant} className="ml-auto inline-flex items-center gap-1">
                            <Icon className="w-3 h-3" />
                            {t(cfg.labelKey)}
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
