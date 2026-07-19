import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
  type Dispatch,
  type SetStateAction,
} from 'react'

export interface ApiQuery<T> {
  data: T
  loading: boolean
  error: string
  reload: () => Promise<void>
  setData: Dispatch<SetStateAction<T>>
}

interface ApiQueryOptions<T> {
  initial: T
  /**
   * Re-runs the fetcher when these values change, like a useEffect dependency
   * array. Must keep the same length across renders. Defaults to fetch-once.
   */
  deps?: DependencyList
}

/**
 * Shared state machine for loading renderer data from `window.api`.
 * Replaces the per-page `useState + useEffect + load()` boilerplate.
 *
 * The fetcher may be an inline closure: the latest one is always used,
 * without needing useCallback at the call site.
 */
export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  options: ApiQueryOptions<T>,
): ApiQuery<T> {
  const [data, setData] = useState<T>(options.initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  // Monotonic token: only the most recent request may write state,
  // so an overlapping reload can never be clobbered by a stale response.
  const requestIdRef = useRef(0)

  const reload = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError('')
    try {
      const next = await fetcherRef.current()
      if (requestId !== requestIdRef.current) return
      setData(next)
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is the caller's refetch trigger list; reload is stable
  }, options.deps ?? [])

  return { data, loading, error, reload, setData }
}
