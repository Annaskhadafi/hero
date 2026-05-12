'use client'

import * as React from 'react'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = Exclude<Theme, 'system'>

export type ThemeProviderProps = {
  children: React.ReactNode
  attribute?: 'class' | `data-${string}`
  defaultTheme?: Theme
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  storageKey?: string
}

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  systemTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyThemeToDocument(attribute: ThemeProviderProps['attribute'], theme: ResolvedTheme) {
  const root = document.documentElement

  if (attribute === 'class') {
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    return
  }

  root.setAttribute(attribute ?? 'data-theme', theme)
}

function withoutTransitions(disabled: boolean, callback: () => void) {
  if (!disabled || typeof document === 'undefined') {
    callback()
    return
  }

  const style = document.createElement('style')
  style.appendChild(
    document.createTextNode('*{transition:none!important;animation:none!important}')
  )

  document.head.appendChild(style)
  callback()

  // Force style recalculation before removing the transition guard.
  window.getComputedStyle(document.body)
  requestAnimationFrame(() => {
    style.remove()
  })
}

export function ThemeProvider({
  children,
  attribute = 'class',
  defaultTheme = 'system',
  enableSystem = true,
  disableTransitionOnChange = false,
  storageKey = 'theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>('light')

  React.useEffect(() => {
    const initialSystemTheme = getSystemTheme()
    setSystemTheme(initialSystemTheme)

    const storedTheme = window.localStorage.getItem(storageKey)
    const nextTheme =
      storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system'
        ? storedTheme
        : defaultTheme

    setThemeState(nextTheme)
  }, [defaultTheme, storageKey])

  React.useEffect(() => {
    if (!enableSystem) {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light')
    }

    updateSystemTheme()
    mediaQuery.addEventListener('change', updateSystemTheme)

    return () => {
      mediaQuery.removeEventListener('change', updateSystemTheme)
    }
  }, [enableSystem])

  const resolvedTheme: ResolvedTheme =
    theme === 'system' ? (enableSystem ? systemTheme : 'light') : theme

  React.useEffect(() => {
    withoutTransitions(disableTransitionOnChange, () => {
      applyThemeToDocument(attribute, resolvedTheme)
    })
  }, [attribute, disableTransitionOnChange, resolvedTheme])

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || event.newValue == null) {
        return
      }

      if (event.newValue === 'light' || event.newValue === 'dark' || event.newValue === 'system') {
        setThemeState(event.newValue)
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
    }
  }, [storageKey])

  const setTheme = React.useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme)
      window.localStorage.setItem(storageKey, nextTheme)
    },
    [storageKey]
  )

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      systemTheme,
      setTheme,
    }),
    [resolvedTheme, setTheme, systemTheme, theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)

  if (!context) {
    // Return safe defaults when rendered outside ThemeProvider (e.g. during SSR or module duplication)
    return {
      theme: 'system' as Theme,
      resolvedTheme: 'light' as ResolvedTheme,
      systemTheme: 'light' as ResolvedTheme,
      setTheme: () => {},
    }
  }

  return context
}
