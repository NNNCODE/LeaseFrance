// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useApiQuery } from '@/hooks/useApiQuery'

describe('useApiQuery', () => {
  it('starts with initial data and loading, then resolves', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a', 'b'])
    const { result } = renderHook(() => useApiQuery(fetcher, { initial: [] as string[] }))

    expect(result.current.data).toEqual([])
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual(['a', 'b'])
    expect(result.current.error).toBe('')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('captures a rejection as an error message and stops loading', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('db unavailable'))
    const { result } = renderHook(() => useApiQuery(fetcher, { initial: null }))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('db unavailable')
    expect(result.current.data).toBeNull()
  })

  it('reload refetches and clears a previous error', async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(42)
    const { result } = renderHook(() => useApiQuery(fetcher, { initial: 0 }))

    await waitFor(() => expect(result.current.error).toBe('boom'))

    await act(async () => { await result.current.reload() })
    expect(result.current.error).toBe('')
    expect(result.current.data).toBe(42)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('setData applies functional updates without refetching', async () => {
    const fetcher = vi.fn().mockResolvedValue([1, 2])
    const { result } = renderHook(() => useApiQuery(fetcher, { initial: [] as number[] }))

    await waitFor(() => expect(result.current.data).toEqual([1, 2]))

    act(() => { result.current.setData((current) => [...current, 3]) })
    expect(result.current.data).toEqual([1, 2, 3])
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('refetches when deps change, using the latest inline fetcher', async () => {
    const { result, rerender } = renderHook(
      ({ year }) => useApiQuery(() => Promise.resolve(year * 10), { initial: 0, deps: [year] }),
      { initialProps: { year: 2025 } },
    )

    await waitFor(() => expect(result.current.data).toBe(20250))

    rerender({ year: 2026 })
    await waitFor(() => expect(result.current.data).toBe(20260))
  })

  it('ignores a stale response that resolves after a newer reload', async () => {
    const resolvers: Array<(value: string) => void> = []
    const fetcher = vi.fn(() => new Promise<string>((resolve) => { resolvers.push(resolve) }))
    const { result } = renderHook(() => useApiQuery(fetcher, { initial: '' }))

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    act(() => { void result.current.reload() })
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))

    act(() => { resolvers[1]('fresh') })
    await waitFor(() => expect(result.current.data).toBe('fresh'))
    expect(result.current.loading).toBe(false)

    act(() => { resolvers[0]('stale') })
    await act(async () => {})
    expect(result.current.data).toBe('fresh')
    expect(result.current.loading).toBe(false)
  })
})
