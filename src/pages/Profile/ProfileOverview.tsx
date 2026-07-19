import { useTranslation } from 'react-i18next'
import { Building2, Mail, MapPin, MapPinned, Phone, UserCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { ownerDisplayName, ownerTypeLabel } from './profilePageUtils'

export default function ProfileOverview({
  profile,
}: {
  profile: UserProfile | OwnerProfile | null
}) {
  const { t } = useTranslation()

  if (!profile) return null

  const infoItems = [
    { icon: UserCircle2, label: t('profile.fullName'), value: ownerDisplayName(profile, t('nav.profile')) },
    { icon: Mail, label: t('profile.email'), value: profile.email || t('profile.notProvided') },
    { icon: MapPin, label: t('profile.address'), value: profile.address || t('profile.notProvidedF') },
    { icon: MapPinned, label: t('profile.city'), value: profile.city || t('profile.notProvidedF') },
    { icon: Phone, label: t('profile.phone'), value: profile.phone || t('profile.notProvided') },
    { icon: Building2, label: t('profile.ownerType'), value: ownerTypeLabel(profile, t) },
  ]

  return (
    <Card>
      <CardContent className="pt-6 pb-6">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
            <UserCircle2 className="h-8 w-8 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-textPrimary">
                {ownerDisplayName(profile, t('nav.profile'))}
              </h2>
              {'isPrimary' in profile && profile.isPrimary ? (
                <Badge variant="muted">{t('profile.primaryOwner')}</Badge>
              ) : null}
              {'familySci' in profile && profile.familySci ? (
                <Badge variant="default">{t('profile.familySci')}</Badge>
              ) : null}
            </div>
            {profile.createdAt ? (
              <p className="mt-0.5 text-xs text-textMuted">
                {t('profile.createdAt', { date: formatDate(profile.createdAt) })}
              </p>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {infoItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 rounded-lg bg-surfaceHigh/50 px-3 py-2"
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0 text-textMuted" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-textMuted">
                      {item.label}
                    </p>
                    <p className="truncate text-sm text-textPrimary">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
