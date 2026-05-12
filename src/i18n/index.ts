import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LANGUAGE, getStoredLanguage, isSupportedLanguage, type AppLanguage } from './config'

const savedLanguage = getStoredLanguage()
const loadedLanguages = new Set<AppLanguage>()

const localeLoaders: Record<AppLanguage, () => Promise<{ default: Record<string, unknown> }>> = {
  fr: () => import('./locales/fr.json'),
  en: () => import('./locales/en.json'),
  zh: () => import('./locales/zh.json'),
}

async function loadMessages(language: AppLanguage): Promise<Record<string, unknown>> {
  const module = await localeLoaders[language]()
  return module.default
}

async function buildInitialResources() {
  const resources: Partial<Record<AppLanguage, { translation: Record<string, unknown> }>> = {}

  resources[savedLanguage] = { translation: await loadMessages(savedLanguage) }
  loadedLanguages.add(savedLanguage)

  if (savedLanguage !== DEFAULT_LANGUAGE) {
    resources[DEFAULT_LANGUAGE] = { translation: await loadMessages(DEFAULT_LANGUAGE) }
    loadedLanguages.add(DEFAULT_LANGUAGE)
  }

  return resources
}

export async function loadLanguage(language: AppLanguage): Promise<void> {
  if (loadedLanguages.has(language) || i18n.hasResourceBundle(language, 'translation')) {
    loadedLanguages.add(language)
    return
  }

  i18n.addResourceBundle(language, 'translation', await loadMessages(language), true, true)
  loadedLanguages.add(language)
}

export async function changeAppLanguage(language: AppLanguage): Promise<void> {
  await loadLanguage(language)
  await i18n.changeLanguage(language)
}

await i18n.use(initReactI18next).init({
  resources: await buildInitialResources(),
  lng: savedLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
})

const originalChangeLanguage = i18n.changeLanguage.bind(i18n) as typeof i18n.changeLanguage
i18n.changeLanguage = (async (...args: Parameters<typeof originalChangeLanguage>) => {
  const [language] = args
  if (typeof language === 'string' && isSupportedLanguage(language)) {
    await loadLanguage(language)
  }

  return originalChangeLanguage(...args)
}) as typeof i18n.changeLanguage

export default i18n
