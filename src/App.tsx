import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import Login from '@/pages/Login'
import Setup from '@/pages/Setup'
import Settings from '@/pages/Settings'
import Properties from '@/pages/Properties'

export default function App() {
  const { status, init } = useAuthStore()
  const [showRegister, setShowRegister] = useState(false)

  useEffect(() => { init() }, [init])

  if (status === 'loading') return <Splash />

  // Toujours afficher Login en premier (setup ou locked)
  if (status === 'setup' || status === 'locked') {
    if (showRegister) {
      return <Setup onBack={() => setShowRegister(false)} />
    }
    return <Login onRegister={() => setShowRegister(true)} />
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"  element={<Dashboard />} />
        <Route path="properties" element={<Properties />} />
        <Route path="tenants"    element={<PlaceholderPage title="Locataires" />} />
        <Route path="leases"     element={<PlaceholderPage title="Baux" />} />
        <Route path="payments"   element={<PlaceholderPage title="Paiements" />} />
        <Route path="documents"  element={<PlaceholderPage title="Documents" />} />
        <Route path="settings"   element={<Settings />} />
      </Route>
    </Routes>
  )
}

function Splash() {
  return (
    <div className="flex h-screen w-screen bg-background items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 animate-pulse" />
        <p className="text-sm text-textMuted">Chargement...</p>
      </div>
    </div>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <p className="text-2xl font-semibold text-textPrimary">{title}</p>
      <p className="text-textMuted text-sm">Page en cours de développement</p>
    </div>
  )
}
