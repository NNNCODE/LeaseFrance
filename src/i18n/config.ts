export const LANGUAGE_STORAGE_KEY = 'lf_language'

export const SUPPORTED_LANGUAGES = ['fr', 'en', 'zh'] as const

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE: AppLanguage = 'fr'

const LANGUAGE_TO_LOCALE: Record<AppLanguage, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  zh: 'zh-CN',
}

export function isSupportedLanguage(value: string): value is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(value as AppLanguage)
}

export function resolveLanguage(value: string | null | undefined): AppLanguage {
  return value && isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE
}

export function getStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  return resolveLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY))
}

export function getLocaleForLanguage(language: string | null | undefined): string {
  return LANGUAGE_TO_LOCALE[resolveLanguage(language)] ?? LANGUAGE_TO_LOCALE[DEFAULT_LANGUAGE]
}
