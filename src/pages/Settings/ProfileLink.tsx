import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, UserCircle2 } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { Card, CardContent } from '@/components/ui/card'

export default function ProfileLink() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  const navigate = useNavigate()

  return (
    <Card
      className="cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => navigate('/profile')}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15">
              <UserCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-textPrimary">
                {profile?.name || t('settings.owner')}
              </p>
              <p className="text-xs text-textMuted">{profile?.email || t('settings.viewProfile')}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-textMuted" />
        </div>
      </CardContent>
    </Card>
  )
}
