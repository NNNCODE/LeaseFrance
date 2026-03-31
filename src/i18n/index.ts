import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LANGUAGE, getStoredLanguage } from './config'
import fr from './locales/fr.json'
import en from './locales/en.json'
import zh from './locales/zh.json'

const savedLanguage = getStoredLanguage()

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: savedLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
