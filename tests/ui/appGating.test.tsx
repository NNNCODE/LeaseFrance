// @vitest-environment jsdom

import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import '@/i18n'
import { useAuthStore } from '@/stores/useAuthStore'
import { useLicenseStore } from '@/stores/useLicenseStore'

vi.mock('@/pages/Activation', () => ({
  default: () => <div>Activation screen</div>,
}))

vi.mock('@/pages/Login', () => ({
  default: () => <div>Login screen</div>,
}))

vi.mock('@/pages/Setup', () => ({
  default: () => <div>Setup screen</div>,
}))

vi.mock('@/components/layout/Layout', async () => {
  const { Outlet } = await import('react-router-dom')
  return {
    default: () => (
      <div>
        <div>Layout shell</div>
        <Outlet />
      </div>
    ),
  }
})

vi.mock('@/pages/Dashboard', () => ({ default: () => <div>Dashboard screen</div> }))
vi.mock('@/pages/Settings', () => ({ default: () => <div>Settings screen</div> }))
vi.mock('@/pages/Properties', () => ({ default: () => <div>Properties screen</div> }))
vi.mock('@/pages/Tenants', () => ({ default: () => <div>Tenants screen</div> }))
vi.mock('@/pages/Leases', () => ({ default: () => <div>Leases screen</div> }))
vi.mock('@/pages/Payments', () => ({ default: () => <div>Payments screen</div> }))
vi.mock('@/pages/Reminders', () => ({ default: () => <div>Reminders screen</div> }))
vi.mock('@/pages/Documents', () => ({ default: () => <div>Documents screen</div> }))
vi.mock('@/pages/Inspections', () => ({ default: () => <div>Inspections screen</div> }))
vi.mock('@/pages/Fiscal', () => ({ default: () => <div>Fiscal screen</div> }))
vi.mock('@/pages/Profile', () => ({ default: () => <div>Profile screen</div> }))

function makeLicenseState(
  overrides: Partial<LicenseState> = {},
): LicenseState {
  return {
    enabled: true,
    status: 'active',
    accessGranted: true,
    hasStoredToken: true,
    billingEmail: 'buyer@example.com',
    subscriptionStatus: 'active',
    refreshAfterSeconds: 86400,
    offlineGraceDays: 7,
    nextRefreshAt: '2026-04-07T18:14:49.000Z',
    offlineGraceUntil: '2026-04-13T18:14:49.000Z',
    currentPeriodEndsAt: '2026-04-18T18:40:00.000Z',
    trialEndsAt: null,
    lastValidatedAt: '2026-04-06T18:14:49.000Z',
    lastRefreshAttemptAt: '2026-04-06T18:14:49.000Z',
    lastErrorCode: null,
    lastErrorMessage: null,
    disabledReason: null,
    supportLogPath: 'C:\\Users\\test\\AppData\\Roaming\\Baillio\\logs\\license-runtime.log',
    endpointBaseUrl: 'https://rentflowapp.eu',
    ...overrides,
  }
}

function renderApp() {
  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
}

describe('App license gating', () => {
  beforeEach(() => {
    useAuthStore.setState({
      ...useAuthStore.getState(),
      status: 'loading',
      profile: null,
      error: null,
      init: vi.fn().mockResolvedValue(undefined),
    })

    useLicenseStore.setState({
      ...useLicenseStore.getState(),
      status: 'ready',
      license: makeLicenseState(),
      init: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('shows activation and skips auth init when the device is not entitled', async () => {
    const authInit = vi.fn().mockResolvedValue(undefined)
    useAuthStore.setState({ ...useAuthStore.getState(), init: authInit })
    useLicenseStore.setState({
      ...useLicenseStore.getState(),
      license: makeLicenseState({
        status: 'inactive',
        accessGranted: false,
        hasStoredToken: false,
        lastErrorCode: 'SUBSCRIPTION_INACTIVE',
      }),
    })

    renderApp()

    expect(await screen.findByText('Activation screen')).toBeTruthy()
    expect(authInit).not.toHaveBeenCalled()
  })

  it('continues into setup when license is valid and no local account exists', async () => {
    const authInit = vi.fn().mockImplementation(async () => {
      useAuthStore.setState({ ...useAuthStore.getState(), status: 'setup', profile: null, error: null })
    })

    useAuthStore.setState({ ...useAuthStore.getState(), init: authInit })

    renderApp()

    expect(await screen.findByText('Setup screen')).toBeTruthy()
    expect(authInit).toHaveBeenCalledTimes(1)
  })

  it('continues into login when license is valid and an account already exists', async () => {
    const authInit = vi.fn().mockImplementation(async () => {
      useAuthStore.setState({
        ...useAuthStore.getState(),
        status: 'locked',
        profile: {
          name: 'Alice Martin',
          email: 'alice@example.com',
          address: '',
          city: '',
          phone: '',
          signatureImage: '',
          createdAt: '2026-01-01 00:00:00',
        },
        error: null,
      })
    })

    useAuthStore.setState({ ...useAuthStore.getState(), init: authInit })

    renderApp()

    expect(await screen.findByText('Login screen')).toBeTruthy()
    expect(authInit).toHaveBeenCalledTimes(1)
  })

  it('returns to activation immediately when access is revoked after startup', async () => {
    useAuthStore.setState({
      ...useAuthStore.getState(),
      status: 'locked',
      profile: {
        name: 'Alice Martin',
        email: 'alice@example.com',
        address: '',
        city: '',
        phone: '',
        signatureImage: '',
        createdAt: '2026-01-01 00:00:00',
      },
      init: vi.fn().mockResolvedValue(undefined),
    })

    renderApp()
    expect(await screen.findByText('Login screen')).toBeTruthy()

    await act(async () => {
      useLicenseStore.setState({
        ...useLicenseStore.getState(),
        license: makeLicenseState({
          status: 'inactive',
          accessGranted: false,
          hasStoredToken: false,
          lastErrorCode: 'SUBSCRIPTION_INACTIVE',
          lastErrorMessage: 'The subscription attached to this license is inactive.',
        }),
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Activation screen')).toBeTruthy()
    })
  })
})
