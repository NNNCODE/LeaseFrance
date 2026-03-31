import { describe, expect, it } from 'vitest'
import {
  isSupportedLanguage,
  resolveLanguage,
  getLocaleForLanguage,
  DEFAULT_LANGUAGE,
} from '@/i18n/config'

describe('isSupportedLanguage', () => {
  it.each(['fr', 'en', 'zh'])('returns true for "%s"', (lang) => {
    expect(isSupportedLanguage(lang)).toBe(true)
  })

  it.each(['de', 'es', 'ja', '', 'FR'])('returns false for "%s"', (lang) => {
    expect(isSupportedLanguage(lang)).toBe(false)
  })
})

describe('resolveLanguage', () => {
  it('returns the language if supported', () => {
    expect(resolveLanguage('zh')).toBe('zh')
  })

  it('falls back to default for unsupported language', () => {
    expect(resolveLanguage('de')).toBe(DEFAULT_LANGUAGE)
  })

  it('falls back to default for null', () => {
    expect(resolveLanguage(null)).toBe(DEFAULT_LANGUAGE)
  })

  it('falls back to default for undefined', () => {
    expect(resolveLanguage(undefined)).toBe(DEFAULT_LANGUAGE)
  })

  it('falls back to default for empty string', () => {
    expect(resolveLanguage('')).toBe(DEFAULT_LANGUAGE)
  })
})

describe('getLocaleForLanguage', () => {
  it('returns fr-FR for French', () => {
    expect(getLocaleForLanguage('fr')).toBe('fr-FR')
  })

  it('returns en-US for English', () => {
    expect(getLocaleForLanguage('en')).toBe('en-US')
  })

  it('returns zh-CN for Chinese', () => {
    expect(getLocaleForLanguage('zh')).toBe('zh-CN')
  })

  it('falls back to fr-FR for unknown language', () => {
    expect(getLocaleForLanguage('de')).toBe('fr-FR')
  })

  it('falls back to fr-FR for null', () => {
    expect(getLocaleForLanguage(null)).toBe('fr-FR')
  })
})
