import * as React from 'react'
import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getLocaleForLanguage, resolveLanguage, type AppLanguage } from '@/i18n/config'
import { cn } from '@/lib/utils'

export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'min' | 'max'> {
  value?: string | null
  onChange?: (value: string | null) => void
  min?: string
  max?: string
}

function isMonthFirst(language: AppLanguage) {
  return language !== 'fr'
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function isValidDateParts(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() + 1 === month
    && date.getUTCDate() === day
}

function normalizeIsoDate(value: string | null | undefined) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (!isValidDateParts(year, month, day)) return null
  return `${year.toString().padStart(4, '0')}-${pad(month)}-${pad(day)}`
}

function formatDateForLanguage(value: string | null | undefined, language: AppLanguage) {
  const normalized = normalizeIsoDate(value)
  if (!normalized) return ''

  const [, year, month, day] = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? []
  if (!year || !month || !day) return ''

  return isMonthFirst(language)
    ? `${month}/${day}/${year}`
    : `${day}/${month}/${year}`
}

function parseDateText(value: string, language: AppLanguage) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const isoDate = normalizeIsoDate(trimmed)
  if (isoDate) return isoDate

  const match = /^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/.exec(trimmed)
  if (!match) return null

  const first = Number(match[1])
  const second = Number(match[2])
  const year = Number(match[3])
  const month = isMonthFirst(language) ? first : second
  const day = isMonthFirst(language) ? second : first

  if (!isValidDateParts(year, month, day)) return null

  return `${year.toString().padStart(4, '0')}-${pad(month)}-${pad(day)}`
}

function isWithinRange(value: string, min?: string, max?: string) {
  if (min) {
    const normalizedMin = normalizeIsoDate(min)
    if (normalizedMin && value < normalizedMin) return false
  }
  if (max) {
    const normalizedMax = normalizeIsoDate(max)
    if (normalizedMax && value > normalizedMax) return false
  }
  return true
}

function getPlaceholder(language: AppLanguage) {
  return isMonthFirst(language) ? 'mm/dd/yyyy' : 'dd/mm/yyyy'
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, value, onChange, min, max, disabled, placeholder, name, onBlur, onKeyDown, ...props }, ref) => {
    const { i18n } = useTranslation()
    const language = resolveLanguage(i18n.resolvedLanguage || i18n.language)
    const locale = getLocaleForLanguage(language)
    const [draftValue, setDraftValue] = React.useState(() => formatDateForLanguage(value, language))

    React.useEffect(() => {
      setDraftValue(formatDateForLanguage(value, language))
    }, [language, value])

    function syncValue(nextDraftValue: string) {
      const trimmed = nextDraftValue.trim()
      if (!trimmed) {
        onChange?.(null)
        return
      }

      const parsedValue = parseDateText(trimmed, language)
      if (parsedValue && isWithinRange(parsedValue, min, max)) {
        onChange?.(parsedValue)
      }
    }

    function commitValue(nextDraftValue: string) {
      const trimmed = nextDraftValue.trim()
      if (!trimmed) {
        setDraftValue('')
        onChange?.(null)
        return
      }

      const parsedValue = parseDateText(trimmed, language)
      if (!parsedValue || !isWithinRange(parsedValue, min, max)) {
        setDraftValue(trimmed)
        return
      }

      setDraftValue(formatDateForLanguage(parsedValue, language))
      onChange?.(parsedValue)
    }

    return (
      <div
        className={cn(
          'relative flex h-10 w-full rounded-lg border border-border bg-surfaceHigh',
          'transition-colors duration-150 focus-within:border-transparent focus-within:ring-2 focus-within:ring-primary',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <input
          {...props}
          ref={ref}
          type="text"
          value={draftValue}
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder ?? getPlaceholder(language)}
          className={cn(
            'h-full w-full rounded-lg bg-transparent px-3 pr-10 text-sm text-textPrimary placeholder:text-textMuted',
            'focus:outline-none disabled:cursor-not-allowed',
            'no-drag',
          )}
          onChange={(event) => {
            const nextDraftValue = event.target.value
            setDraftValue(nextDraftValue)
            syncValue(nextDraftValue)
          }}
          onBlur={(event) => {
            commitValue(event.target.value)
            onBlur?.(event)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitValue(event.currentTarget.value)
            }
            onKeyDown?.(event)
          }}
        />

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <CalendarDays className="h-4 w-4 text-textMuted" />
        </div>

        <input
          type="date"
          value={normalizeIsoDate(value) ?? ''}
          name={name}
          min={min}
          max={max}
          lang={locale}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          onChange={(event) => {
            const nextValue = event.target.value || null
            onChange?.(nextValue)
            setDraftValue(formatDateForLanguage(nextValue, language))
          }}
        />
      </div>
    )
  },
)

DateInput.displayName = 'DateInput'

export default DateInput
