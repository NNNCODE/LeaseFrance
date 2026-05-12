import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useLicenseStore } from '@/stores/useLicenseStore'
import Layout from '@/components/layout/Layout'
import { SYSTEM_THEME_QUERY } from '@/theme/config'
import { useThemeStore } from '@/stores/useThemeStore'
import { useOwnerStore } from '@/stores/useOwnerStore'

const Activation = lazy(() => import('@/pages/Activation'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Login = lazy(() => import('@/pages/Login'))
const Setup = lazy(() => import('@/pages/Setup'))
const Settings = lazy(() => import('@/pages/Settings'))
const Properties = lazy(() => import('@/pages/Properties'))
const Tenants = lazy(() => import('@/pages/Tenants'))
const Leases = lazy(() => import('@/pages/Leases'))
const Payments = lazy(() => import('@/pages/Payments'))
const Reminders = lazy(() => import('@/pages/Reminders'))
const Documents = lazy(() => import('@/pages/Documents'))
const Inspections = lazy(() => import('@/pages/Inspections'))
const Fiscal = lazy(() => import('@/pages/Fiscal'))
const Profile = lazy(() => import('@/pages/Profile'))

export default function App() {
  const { t } = useTranslation()
  const { status, init } = useAuthStore()
  const { status: licenseStatus, license, init: initLicense } = useLicenseStore()
  const syncTheme = useThemeStore((state) => state.syncTheme)
  const initOwners = useOwnerStore((state) => state.init)
  const clearOwners = useOwnerStore((state) => state.clear)
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

  useEffect(() => {
    if (status === 'unlocked') {
      void initOwners()
      return
    }

    clearOwners()
  }, [clearOwners, initOwners, status])

  if (licenseStatus === 'loading') return <Splash />
  if (license?.enabled && !license.accessGranted) {
    return (
      <Suspense fallback={<Splash />}>
        <Activation />
      </Suspense>
    )
  }
  if (status === 'loading') return <Splash />

  if (status === 'setup') {
    return (
      <Suspense fallback={<Splash />}>
        <Setup
          onComplete={(email) => {
            setPrefilledEmail(email)
            setAuthNotice(t('auth.setup.accountCreated'))
            setShowRegister(false)
          }}
        />
      </Suspense>
    )
  }

  if (status === 'locked') {
    if (showRegister) {
      return (
        <Suspense fallback={<Splash />}>
          <Setup
            onBack={() => setShowRegister(false)}
            onComplete={(email) => {
              setPrefilledEmail(email)
              setAuthNotice(t('auth.setup.accountCreated'))
              setShowRegister(false)
            }}
          />
        </Suspense>
      )
    }

    return (
      <Suspense fallback={<Splash />}>
        <Login onRegister={() => setShowRegister(true)} initialEmail={prefilledEmail} notice={authNotice} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<Splash />}>
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
    </Suspense>
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
