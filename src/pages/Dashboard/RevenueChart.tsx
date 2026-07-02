import { useTranslation } from 'react-i18next'
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface RevenueChartProps {
  data: Array<{ month: string; revenus: number }>
}

// Isolated in its own module so the heavy recharts bundle is split into a
// separate chunk and loaded only when the dashboard chart is rendered.
export default function RevenueChart({ data }: RevenueChartProps) {
  const { t } = useTranslation()

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-primary)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--chart-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis dataKey="month" tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}€`} />
        <Tooltip
          contentStyle={{
            background: 'var(--chart-tooltip-background)',
            border: '1px solid var(--chart-tooltip-border)',
            borderRadius: '8px',
            color: 'var(--chart-tooltip-text)',
            fontSize: '12px',
          }}
          formatter={(v: number) => [`${v} €`, t('dashboard.revenue')]}
        />
        <Area type="monotone" dataKey="revenus" stroke="var(--chart-primary)" strokeWidth={2} fill="url(#colorRev)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
