// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DateInput from '@/components/ui/date-input'
import i18n from '@/i18n'
import '@/i18n'

describe('DateInput', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('fr')
  })

  it('shows French dates in day-first format', () => {
    render(<DateInput aria-label="date" value="2025-11-01" onChange={vi.fn()} />)

    const input = screen.getByRole('textbox', { name: 'date' }) as HTMLInputElement

    expect(input.value).toBe('01/11/2025')
    expect(input.placeholder).toBe('dd/mm/yyyy')
  })

  it.each([
    ['en', '11/01/2025', 'mm/dd/yyyy'],
    ['zh', '11/01/2025', 'mm/dd/yyyy'],
  ] as const)('updates the displayed format when the language is %s', async (language, expectedValue, expectedPlaceholder) => {
    render(<DateInput aria-label="date" value="2025-11-01" onChange={vi.fn()} />)

    await i18n.changeLanguage(language)

    await waitFor(() => {
      const input = screen.getByRole('textbox', { name: 'date' }) as HTMLInputElement
      expect(input.value).toBe(expectedValue)
      expect(input.placeholder).toBe(expectedPlaceholder)
    })
  })

  it('parses manual French input back to an ISO date', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<DateInput aria-label="date" value={null} onChange={onChange} />)

    const input = screen.getByRole('textbox', { name: 'date' }) as HTMLInputElement

    await user.type(input, '2/11/2025')
    await user.tab()

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith('2025-11-02')
      expect(input.value).toBe('02/11/2025')
    })
  })
})
