import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { useLanguageStore } from '@/stores/useLanguageStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const LANGUAGE_OPTIONS = [
  { value: 'fr', labelKey: 'settings.languageFr' },
  { value: 'en', labelKey: 'settings.languageEn' },
  { value: 'zh', labelKey: 'settings.languageZh' },
] as const

export default function LanguageSection() {
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguageStore()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <CardTitle>{t('settings.language')}</CardTitle>
        </div>
        <CardDescription>{t('settings.languageDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3">
        {LANGUAGE_OPTIONS.map((option) => {
          const active = language === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setLanguage(option.value)}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surfaceHigh/30 text-textMuted hover:border-primary/30 hover:text-textPrimary'
              }`}
            >
              <p className="text-sm font-medium">{t(option.labelKey)}</p>
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}
