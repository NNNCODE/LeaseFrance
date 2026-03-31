import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import i18n from '@/i18n'
import { getLocaleForLanguage } from '@/i18n/config'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function getCurrentLocale() {
  return getLocaleForLanguage(i18n.resolvedLanguage || i18n.language)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(getCurrentLocale(), {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat(getCurrentLocale(), {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatMonth(date: string | Date): string {
  return new Intl.DateTimeFormat(getCurrentLocale(), {
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat(getCurrentLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}
