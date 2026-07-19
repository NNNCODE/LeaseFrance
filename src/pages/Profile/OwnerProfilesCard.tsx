import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ownerDisplayName, ownerTypeLabel } from './profilePageUtils'

export default function OwnerProfilesCard({
  owners,
  activeOwnerId,
  loading,
  onAdd,
  onUse,
  onDelete,
}: {
  owners: OwnerProfile[]
  activeOwnerId: string | null
  loading: boolean
  onAdd: () => void
  onUse: (ownerId: string) => void
  onDelete: (owner: OwnerProfile) => void
}) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{t('profile.ownersTitle')}</CardTitle>
            <CardDescription>{t('profile.ownersDesc')}</CardDescription>
          </div>
          <Button size="sm" onClick={onAdd} disabled={loading}>
            <Plus className="h-3.5 w-3.5" />
            {t('profile.addOwner')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {loading && owners.length === 0 ? (
          <div className="rounded-xl border border-border bg-surfaceHigh/20 px-4 py-5 text-sm text-textMuted">
            {t('common.loading')}
          </div>
        ) : owners.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surfaceHigh/20 px-4 py-5 text-sm text-textMuted">
            {t('common.noData')}
          </div>
        ) : (
          owners.map((owner) => (
            <div
              key={owner.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surfaceHigh/20 px-4 py-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-textPrimary">
                    {ownerDisplayName(owner, t('profile.unnamedOwner'))}
                  </p>
                  {owner.id === activeOwnerId ? (
                    <Badge variant="default">{t('profile.activeOwner')}</Badge>
                  ) : null}
                  {owner.isPrimary ? (
                    <Badge variant="muted">{t('profile.primaryOwner')}</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-textMuted">
                  {owner.email || t('profile.notProvided')}
                </p>
                <p className="mt-2 text-xs text-textMuted">
                  {ownerTypeLabel(owner, t)}
                  {owner.familySci ? ` | ${t('profile.familySci')}` : ''}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {owner.id !== activeOwnerId ? (
                  <Button size="sm" variant="secondary" onClick={() => onUse(owner.id)} disabled={loading}>
                    {t('profile.useOwner')}
                  </Button>
                ) : null}
                {!owner.isPrimary ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(owner)}
                    disabled={loading}
                    className="text-danger hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('profile.deleteOwner')}
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
