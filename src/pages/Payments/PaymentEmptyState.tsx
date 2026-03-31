import { useTranslation } from 'react-i18next'
import { CreditCard } from 'lucide-react'

export default function PaymentEmptyState() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <CreditCard className="h-8 w-8 text-primary" />
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">{t('payments.empty')}</p>
        <p className="mt-1 text-sm text-textMuted">{t('payments.emptyDesc')}</p>
      </div>
    </div>
  )
}
