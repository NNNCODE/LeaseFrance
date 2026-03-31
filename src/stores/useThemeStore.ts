import { create } from 'zustand'
import {
  THEME_STORAGE_KEY,
  ThemePreference,
  ResolvedTheme,
  applyThemePreference,
  getStoredThemePreference,
  resolveTheme,
  resolveThemePreference,
} from '@/theme/config'

interface ThemeStore {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  setTheme: (theme: string) => void
  syncTheme: () => void
}

const initialTheme = getStoredThemePreference()

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: initialTheme,
  resolvedTheme: resolveTheme(initialTheme),
  setTheme: (theme: string) => {
    const nextTheme = resolveThemePreference(theme)
    const nextResolvedTheme = applyThemePreference(nextTheme)

    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    set({ theme: nextTheme, resolvedTheme: nextResolvedTheme })
  },
  syncTheme: () => {
    const { theme } = get()
    set({ resolvedTheme: applyThemePreference(theme) })
  },
}))
