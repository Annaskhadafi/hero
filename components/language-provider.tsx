'use client'

import * as React from 'react'
import { type Language, translate, translations } from '@/lib/i18n'

type LanguageContextValue = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, fallback?: string) => string
  isIndonesian: boolean
  isEnglish: boolean
}

const LanguageContext = React.createContext<LanguageContextValue | null>(null)

const STORAGE_KEY = 'hero_lang'
const COOKIE_KEY = 'hero_lang'

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'id'
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'id' || stored === 'en') {
      return stored
    }

    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + COOKIE_KEY + ')=([^;]*)'))
    if (match && (match[3] === 'id' || match[3] === 'en')) {
      return match[3] as Language
    }

    // Default to 'id' (Bahasa Indonesia)
    return 'id'
  } catch {
    return 'id'
  }
}

export function LanguageProvider({
  children,
  defaultLanguage = 'id',
}: {
  children: React.ReactNode
  defaultLanguage?: Language
}) {
  const [language, setLanguageState] = React.useState<Language>(defaultLanguage)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    const initLang = getInitialLanguage()
    setLanguageState(initLang)
    setMounted(true)
    document.documentElement.lang = initLang
  }, [])

  const setLanguage = React.useCallback((nextLang: Language) => {
    setLanguageState(nextLang)
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLang)
      document.cookie = `${COOKIE_KEY}=${nextLang}; path=/; max-age=31536000; SameSite=Lax`
      document.documentElement.lang = nextLang
      window.dispatchEvent(new CustomEvent('hero:language-changed', { detail: nextLang }))
    } catch (e) {
      console.warn('[LanguageProvider] Failed to persist language', e)
    }
  }, [])

  const t = React.useCallback(
    (key: string, fallback?: string) => {
      return translate(key, language, fallback)
    },
    [language]
  )

  const value = React.useMemo(
    () => ({
      language,
      setLanguage,
      t,
      isIndonesian: language === 'id',
      isEnglish: language === 'en',
    }),
    [language, setLanguage, t]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = React.useContext(LanguageContext)
  if (!context) {
    // Fallback if rendered outside provider
    return {
      language: 'id' as Language,
      setLanguage: () => {},
      t: (key: string, fallback?: string) => translate(key, 'id', fallback),
      isIndonesian: true,
      isEnglish: false,
    }
  }
  return context
}
