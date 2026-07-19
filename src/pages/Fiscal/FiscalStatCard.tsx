import { Card, CardContent } from '@/components/ui/card'

export default function FiscalStatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  detail: string
  icon: React.ElementType
  tone: 'primary' | 'success' | 'warning' | 'danger'
}) {
  const tones = {
    primary: { bg: 'bg-primary/10', text: 'text-primary' },
    success: { bg: 'bg-success/10', text: 'text-success' },
    warning: { bg: 'bg-warning/10', text: 'text-warning' },
    danger: { bg: 'bg-danger/10', text: 'text-danger' },
  }
  const style = tones[tone]

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-textMuted">{label}</p>
            <p className="text-xl font-semibold text-textPrimary mt-1">{value}</p>
            <p className="text-xs text-textMuted mt-2">{detail}</p>
          </div>
          <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${style.bg}`}>
            <Icon className={`w-4 h-4 ${style.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
