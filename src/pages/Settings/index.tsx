import { useTranslation } from 'react-i18next'
import { useLicenseStore } from '@/stores/useLicenseStore'
import ProfileLink from './ProfileLink'
import LanguageSection from './LanguageSection'
import AppearanceSection from './AppearanceSection'
import UpdatesSection from './UpdatesSection'
import LicenseSection from './LicenseSection'
import DiagnosticsSection from './DiagnosticsSection'
import FeedbackSection from './FeedbackSection'
import BackupSection from './BackupSection'
import PasswordSection from './PasswordSection'
import RecoveryKeySection from './RecoveryKeySection'
import DangerZone from './DangerZone'

export default function Settings() {
  const { t } = useTranslation()
  const licenseEnabled = useLicenseStore((state) => state.license?.enabled === true)

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">{t('settings.title')}</h1>
        <p className="text-textMuted text-sm mt-1">{t('settings.subtitle')}</p>
      </div>
      <ProfileLink />
      <LanguageSection />
      <AppearanceSection />
      <UpdatesSection />
      {licenseEnabled ? <LicenseSection /> : null}
      <DiagnosticsSection />
      <FeedbackSection />
      <BackupSection />
      <PasswordSection />
      <RecoveryKeySection />
      <DangerZone />
    </div>
  )
}
