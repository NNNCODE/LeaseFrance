import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useLicenseStore } from '@/stores/useLicenseStore'
import Layout from '@/components/layout/Layout'
import Activation from '@/pages/Activation'
import Dashboard from '@/pages/Dashboard'
import Login from '@/pages/Login'
import Setup from '@/pages/Setup'
import Settings from '@/pages/Settings'
import Properties from '@/pages/Properties'
import Tenants from '@/pages/Tenants'
import Leases from '@/pages/Leases'
import Payments from '@/pages/Payments'
import Reminders from '@/pages/Reminders'
import Documents from '@/pages/Documents'
import Inspections from '@/pages/Inspections'
import Fiscal from '@/pages/Fiscal'
import Profile from '@/pages/Profile'
import { SYSTEM_THEME_QUERY } from '@/theme/config'
import { useThemeStore } from '@/stores/useThemeStore'

export default function App() {
  const { t } = useTranslation()
  const { status, init } = useAuthStore()
  const { status: licenseStatus, license, init: initLicense } = useLicenseStore()
  const syncTheme = useThemeStore((state) => state.syncTheme)
  const [showRegister, setShowRegister] = useState(false)
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const [prefilledEmail, setPrefilledEmail] = useState('')

  useEffect(() => { void initLicense() }, [initLicense])
  useEffect(() => {
    if (licenseStatus !== 'ready') return
    if (status !== 'loading') return
    if (license?.enabled && !license.accessGranted) return
    void init()
  }, [init, license?.accessGranted, license?.enabled, licenseStatus, status])
  useEffect(() => {
    syncTheme()

    if (typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY)
    const handleChange = () => syncTheme()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [syncTheme])

  useEffect(() => {
    if (status === 'unlocked') {
      setAuthNotice(null)
    }
  }, [status])

  if (licenseStatus === 'loading') return <Splash />
  if (license?.enabled && !license.accessGranted) return <Activation />
  if (status === 'loading') return <Splash />

  if (status === 'setup') {
    return (
      <Setup
        onComplete={(email) => {
          setPrefilledEmail(email)
          setAuthNotice(t('auth.setup.accountCreated'))
          setShowRegister(false)
        }}
      />
    )
  }

  if (status === 'locked') {
    if (showRegister) {
      return (
        <Setup
          onBack={() => setShowRegister(false)}
          onComplete={(email) => {
            setPrefilledEmail(email)
            setAuthNotice(t('auth.setup.accountCreated'))
            setShowRegister(false)
          }}
        />
      )
    }

    return <Login onRegister={() => setShowRegister(true)} initialEmail={prefilledEmail} notice={authNotice} />
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"  element={<Dashboard />} />
        <Route path="properties" element={<Properties />} />
        <Route path="tenants"    element={<Tenants />} />
        <Route path="leases"     element={<Leases />} />
        <Route path="payments"   element={<Payments />} />
        <Route path="fiscal"     element={<Fiscal />} />
        <Route path="reminders"  element={<Reminders />} />
        <Route path="inspections" element={<Inspections />} />
        <Route path="documents"  element={<Documents />} />
        <Route path="profile"    element={<Profile />} />
        <Route path="settings"   element={<Settings />} />
      </Route>
    </Routes>
  )
}

function Splash() {
  const { t } = useTranslation()
  return (
    <div className="flex h-screen w-screen bg-background items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 animate-pulse" />
        <p className="text-sm text-textMuted">{t('splash.loading')}</p>
      </div>
    </div>
  )
}
