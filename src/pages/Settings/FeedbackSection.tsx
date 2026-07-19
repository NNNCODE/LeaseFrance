import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const FEEDBACK_EMAIL = 'support@baillio.space'

function buildFeedbackMailto(t: (key: string, opts?: Record<string, unknown>) => string, version: string): string {
  const subject = encodeURIComponent(t('settings.feedback.subject'))
  const body = encodeURIComponent(
    [
      t('settings.feedback.bodyIntro', { version: version || '?' }),
      '',
      t('settings.feedback.bodyLike'),
      '',
      t('settings.feedback.bodyImprove'),
      '',
      t('settings.feedback.bodyIssue'),
    ].join('\n')
  )
  return `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`
}

export default function FeedbackSection() {
  const { t } = useTranslation()
  const [version, setVersion] = useState('')

  useEffect(() => {
    let mounted = true
    window.api.updates.getState()
      .then((state) => { if (mounted) setVersion(state.currentVersion) })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <CardTitle>{t('settings.feedback.title')}</CardTitle>
        </div>
        <CardDescription>{t('settings.feedback.desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="sm">
          <a href={buildFeedbackMailto(t, version)} target="_blank" rel="noreferrer">
            <Mail className="w-3.5 h-3.5" />
            {t('settings.feedback.send')}
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
