import { ScrollText } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function DocumentsEmptyState() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <ScrollText className="h-8 w-8 text-primary" />
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">{t('documents.emptySourcesTitle')}</p>
        <p className="mt-1 text-sm text-textMuted">
          {t('documents.emptySourcesDesc')}
        </p>
      </div>
    </div>
  )
}
