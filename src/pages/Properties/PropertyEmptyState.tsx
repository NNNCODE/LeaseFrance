import { useTranslation } from 'react-i18next'
import { Building2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PropertyEmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
        <Building2 className="w-8 h-8 text-primary" />
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">{t('properties.empty')}</p>
        <p className="text-sm text-textMuted mt-1">{t('properties.emptyDesc')}</p>
      </div>
      <Button onClick={onAdd}>
        <Plus className="w-4 h-4" />
        {t('properties.add')}
      </Button>
    </div>
  )
}
