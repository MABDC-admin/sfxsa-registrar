import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// ============================================
// useDebounce Hook
// ============================================
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// ============================================
// useDebouncedCallback Hook
// ============================================
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  ) as T

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

// ============================================
// usePagination Hook
// ============================================
export interface PaginationOptions {
  totalItems: number
  pageSize?: number
  initialPage?: number
}

export interface PaginationState {
  currentPage: number
  pageSize: number
  totalPages: number
  totalItems: number
  startIndex: number
  endIndex: number
  hasNextPage: boolean
  hasPrevPage: boolean
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  setPageSize: (size: number) => void
}

export function usePagination({
  totalItems,
  pageSize: initialPageSize = 10,
  initialPage = 1,
}: PaginationOptions): PaginationState {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [pageSize, setPageSizeState] = useState(initialPageSize)

  const totalPages = Math.ceil(totalItems / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)
  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1

  // Reset to page 1 if total items change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [totalItems, pageSize, currentPage, totalPages])

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages || 1)))
  }, [totalPages])

  const nextPage = useCallback(() => {
    if (hasNextPage) setCurrentPage(p => p + 1)
  }, [hasNextPage])

  const prevPage = useCallback(() => {
    if (hasPrevPage) setCurrentPage(p => p - 1)
  }, [hasPrevPage])

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size)
    setCurrentPage(1)
  }, [])

  return {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    hasNextPage,
    hasPrevPage,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
  }
}

// ============================================
// useSearch Hook
// ============================================
export interface SearchOptions<T> {
  data: T[]
  searchKeys: (keyof T)[]
  debounceMs?: number
}

export interface SearchState<T> {
  searchTerm: string
  setSearchTerm: (term: string) => void
  filteredData: T[]
  isSearching: boolean
  clearSearch: () => void
}

export function useSearch<T>({
  data,
  searchKeys,
  debounceMs = 300,
}: SearchOptions<T>): SearchState<T> {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs)
  const isSearching = searchTerm !== debouncedSearchTerm

  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return data

    const lowerSearch = debouncedSearchTerm.toLowerCase()
    return data.filter(item =>
      searchKeys.some(key => {
        const value = item[key]
        if (typeof value === 'string') {
          return value.toLowerCase().includes(lowerSearch)
        }
        if (typeof value === 'number') {
          return value.toString().includes(lowerSearch)
        }
        return false
      })
    )
  }, [data, searchKeys, debouncedSearchTerm])

  const clearSearch = useCallback(() => setSearchTerm(''), [])

  return {
    searchTerm,
    setSearchTerm,
    filteredData,
    isSearching,
    clearSearch,
  }
}

// ============================================
// useLocalStorage Hook
// ============================================
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
        }
      } catch (error) {
        console.error('useLocalStorage error:', error)
      }
    },
    [key, storedValue]
  )

  return [storedValue, setValue]
}

// ============================================
// useKeyboardShortcut Hook
// ============================================
export interface ShortcutOptions {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  preventDefault?: boolean
}

export function useKeyboardShortcut(
  shortcut: ShortcutOptions,
  callback: () => void,
  deps: any[] = []
) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const { key, ctrl = false, shift = false, alt = false, meta = false, preventDefault = true } = shortcut

      const matchesKey = event.key.toLowerCase() === key.toLowerCase()
      const matchesCtrl = ctrl === event.ctrlKey
      const matchesShift = shift === event.shiftKey
      const matchesAlt = alt === event.altKey
      const matchesMeta = meta === event.metaKey

      if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
        if (preventDefault) event.preventDefault()
        callback()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcut, callback, ...deps])
}

// ============================================
// useClickOutside Hook
// ============================================
export function useClickOutside<T extends HTMLElement>(
  callback: () => void
): React.RefObject<T | null> {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback()
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [callback])

  return ref
}

// ============================================
// useMediaQuery Hook
// ============================================
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches)

    setMatches(mediaQuery.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}

// Convenience hooks for common breakpoints
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 639px)')
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 640px) and (max-width: 1023px)')
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}

// ============================================
// useToggle Hook
// ============================================
export function useToggle(initialValue: boolean = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue)
  const toggle = useCallback(() => setValue(v => !v), [])
  return [value, toggle, setValue]
}

// ============================================
// usePrevious Hook
// ============================================
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}

// ============================================
// useAsync Hook
// ============================================
export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  execute: (...args: any[]) => Promise<T>
}

export function useAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  immediate: boolean = false
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(
    async (...args: any[]) => {
      setLoading(true)
      setError(null)
      try {
        const result = await asyncFunction(...args)
        setData(result)
        return result
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)))
        throw e
      } finally {
        setLoading(false)
      }
    },
    [asyncFunction]
  )

  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [execute, immediate])

  return { data, loading, error, execute }
}
