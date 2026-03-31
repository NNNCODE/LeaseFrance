export const THEME_STORAGE_KEY = 'leaseFrance.theme'

const THEME_OPTIONS = ['light', 'auto', 'dark'] as const
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

export type ThemePreference = (typeof THEME_OPTIONS)[number]
export type ResolvedTheme = Exclude<ThemePreference, 'auto'>

export function resolveThemePreference(theme: string | null | undefined): ThemePreference {
  return THEME_OPTIONS.includes(theme as ThemePreference) ? (theme as ThemePreference) : 'dark'
}

export function getSystemTheme(): ResolvedTheme {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(DARK_MEDIA_QUERY).matches
  ) {
    return 'dark'
  }

  return 'light'
}

export function resolveTheme(theme: ThemePreference): ResolvedTheme {
  return theme === 'auto' ? getSystemTheme() : theme
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'dark'
  return resolveThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY))
}

export function applyThemePreference(theme: ThemePreference): ResolvedTheme {
  const resolvedTheme = resolveTheme(theme)

  if (typeof document !== 'undefined') {
    const root = document.documentElement
    root.dataset.theme = resolvedTheme
    root.dataset.themePreference = theme
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.style.colorScheme = resolvedTheme
  }

  return resolvedTheme
}

export const SYSTEM_THEME_QUERY = DARK_MEDIA_QUERY
