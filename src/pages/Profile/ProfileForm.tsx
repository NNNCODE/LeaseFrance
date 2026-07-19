import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Building2, CheckCircle2, Save } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useOwnerStore } from '@/stores/useOwnerStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function ProfileForm({ profile }: { profile: OwnerProfile }) {
  const { t } = useTranslation()
  const updateOwner = useOwnerStore((state) => state.updateOwner)
  const refreshProfile = useAuthStore((state) => state.refreshProfile)
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [address, setAddress] = useState(profile.address)
  const [city, setCity] = useState(profile.city)
  const [phone, setPhone] = useState(profile.phone)
  const [legalType, setLegalType] = useState<OwnerProfile['legalType']>(profile.legalType)
  const [familySci, setFamilySci] = useState(profile.familySci)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setName(profile.name)
    setEmail(profile.email)
    setAddress(profile.address)
    setCity(profile.city)
    setPhone(profile.phone)
    setLegalType(profile.legalType)
    setFamilySci(profile.familySci)
    setStatus('idle')
    setErrorMessage('')
  }, [profile])

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()

    if (!name.trim()) {
      setStatus('error')
      setErrorMessage(t('profile.requiredName'))
      return
    }

    if (profile.isPrimary && !email.trim()) {
      setStatus('error')
      setErrorMessage(t('profile.requiredPrimaryEmail'))
      return
    }

    setLoading(true)
    const updated = await updateOwner(profile.id, {
      name,
      email,
      address,
      city,
      phone,
      legalType,
      familySci: legalType === 'personne_morale' ? familySci : false,
    })
    if (updated?.isPrimary) {
      await refreshProfile()
    }
    setLoading(false)

    if (updated) {
      setStatus('saved')
      setErrorMessage('')
    } else {
      setStatus('error')
      setErrorMessage(t('profile.ownerSaveError'))
    }

    window.setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <CardTitle>{t('profile.formTitle')}</CardTitle>
        </div>
        <CardDescription>{t('profile.formDesc')}</CardDescription>
        <p className="text-xs text-textMuted">
          {profile.isPrimary ? t('profile.primaryEmailHelp') : t('profile.emailOptional')}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">
                {t('profile.fullName')} <span className="text-danger">*</span>
              </label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('profile.fullNamePlaceholder')}
              />
              <p className="text-[10px] text-textMuted">{t('profile.fullNameHelp')}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">
                {t('profile.email')}
                {profile.isPrimary ? <span className="text-danger"> *</span> : null}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('profile.emailPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('profile.ownerType')}</label>
              <select
                value={legalType}
                onChange={(event) => {
                  const nextType = event.target.value === 'personne_morale' ? 'personne_morale' : 'personne_physique'
                  setLegalType(nextType)
                  if (nextType === 'personne_physique') {
                    setFamilySci(false)
                  }
                }}
                className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="personne_physique">{t('profile.ownerTypePerson')}</option>
                <option value="personne_morale">{t('profile.ownerTypeCompany')}</option>
              </select>
            </div>
            <label className="flex items-start gap-2 rounded-xl border border-border/70 bg-surfaceHigh/35 px-3 py-2.5 text-xs text-textMuted">
              <input
                type="checkbox"
                checked={familySci}
                onChange={(event) => setFamilySci(event.target.checked)}
                disabled={legalType !== 'personne_morale'}
                className="mt-0.5 h-4 w-4 rounded border-border bg-surface text-primary"
              />
              <span>
                <span className="block font-medium text-textPrimary">{t('profile.familySci')}</span>
                <span>{t('profile.familySciHelp')}</span>
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{t('profile.address')}</label>
            <Input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder={t('profile.addressPlaceholder')}
            />
            <p className="text-[10px] text-textMuted">{t('profile.addressHelp')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('profile.city')}</label>
              <Input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder={t('profile.cityPlaceholder')}
              />
              <p className="text-[10px] text-textMuted">{t('profile.cityHelp')}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('profile.phone')}</label>
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={t('profile.phonePlaceholder')}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm" disabled={loading}>
              <Save className="h-3.5 w-3.5" />
              {loading ? t('profile.saving') : t('profile.save')}
            </Button>
            <AnimatePresence>
              {status === 'saved' ? (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-success"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t('profile.ownerSaved')}
                </motion.span>
              ) : null}
              {status === 'error' ? (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-danger"
                >
                  {errorMessage || t('profile.ownerSaveError')}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
