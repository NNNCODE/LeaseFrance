import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useOwnerStore } from '@/stores/useOwnerStore'
import { Card, CardContent } from '@/components/ui/card'
import OwnerProfilesCard from './OwnerProfilesCard'
import ProfileForm from './ProfileForm'
import ProfileOverview from './ProfileOverview'
import SignatureCard from './SignatureCard'
import { ownerDisplayName } from './profilePageUtils'

interface FeedbackState {
  type: 'success' | 'error'
  message: string
}

export default function Profile() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  const ownerStatus = useOwnerStore((state) => state.status)
  const owners = useOwnerStore((state) => state.owners)
  const activeOwner = useOwnerStore((state) => state.activeOwner)
  const createOwner = useOwnerStore((state) => state.createOwner)
  const setActiveOwner = useOwnerStore((state) => state.setActiveOwner)
  const deleteOwner = useOwnerStore((state) => state.deleteOwner)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [ownerBusy, setOwnerBusy] = useState(false)

  const currentProfile = activeOwner ?? profile

  useEffect(() => {
    if (!feedback) return undefined
    const timeout = window.setTimeout(() => setFeedback(null), 3200)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  async function handleCreateOwner() {
    setOwnerBusy(true)
    try {
      await createOwner()
      setFeedback({ type: 'success', message: t('profile.createOwnerNotice') })
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : t('profile.ownerSaveError'),
      })
    } finally {
      setOwnerBusy(false)
    }
  }

  async function handleActivateOwner(ownerId: string) {
    setOwnerBusy(true)
    try {
      const nextOwner = await setActiveOwner(ownerId)
      setFeedback({
        type: nextOwner ? 'success' : 'error',
        message: nextOwner ? t('profile.activateOwnerNotice') : t('profile.ownerSaveError'),
      })
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : t('profile.ownerSaveError'),
      })
    } finally {
      setOwnerBusy(false)
    }
  }

  async function handleDeleteOwner(owner: OwnerProfile) {
    if (owner.isPrimary) {
      setFeedback({ type: 'error', message: t('profile.cannotDeletePrimary') })
      return
    }

    const confirmed = window.confirm(
      t('profile.deleteOwnerConfirm', {
        name: ownerDisplayName(owner, t('profile.unnamedOwner')),
      }),
    )
    if (!confirmed) return

    setOwnerBusy(true)
    try {
      const deleted = await deleteOwner(owner.id)
      setFeedback({
        type: deleted ? 'success' : 'error',
        message: deleted ? t('profile.deleteOwnerNotice') : t('profile.deleteOwnerError'),
      })
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : t('profile.deleteOwnerError'),
      })
    } finally {
      setOwnerBusy(false)
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">{t('profile.title')}</h1>
        <p className="mt-1 text-sm text-textMuted">{t('profile.subtitle')}</p>
      </div>

      {feedback ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-danger/30 bg-danger/10 text-danger'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <OwnerProfilesCard
        owners={owners}
        activeOwnerId={activeOwner?.id ?? null}
        loading={ownerStatus !== 'ready' || ownerBusy}
        onAdd={handleCreateOwner}
        onUse={handleActivateOwner}
        onDelete={handleDeleteOwner}
      />

      <ProfileOverview profile={currentProfile} />

      {activeOwner ? (
        <>
          <ProfileForm profile={activeOwner} />
          <SignatureCard profile={activeOwner} />
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-textMuted">
            {t('common.loading')}
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5 pb-5">
          <div className="flex gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="mb-1 text-sm font-medium text-textPrimary">{t('profile.infoTitle')}</p>
              <p className="text-xs leading-relaxed text-textMuted">{t('profile.infoDesc')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
