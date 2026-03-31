import { Plus, ScrollText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface LeaseEmptyStateProps {
  onAdd: () => void
}

export default function LeaseEmptyState({ onAdd }: LeaseEmptyStateProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/10">
        <ScrollText className="h-8 w-8 text-warning" />
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">{t('leases.empty')}</p>
        <p className="mt-1 text-sm text-textMuted">
          {t('leases.emptyDesc')}
        </p>
      </div>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4" />
        {t('leases.add')}
      </Button>
    </div>
  )
}
