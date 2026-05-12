import { create } from 'zustand'
import { changeAppLanguage } from '@/i18n'
import { AppLanguage, getStoredLanguage, LANGUAGE_STORAGE_KEY, resolveLanguage } from '@/i18n/config'

interface LanguageStore {
  language: AppLanguage
  setLanguage: (lang: string) => void
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: getStoredLanguage(),
  setLanguage: (lang: string) => {
    const nextLanguage = resolveLanguage(lang)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
    void changeAppLanguage(nextLanguage)
    set({ language: nextLanguage })
  },
}))
