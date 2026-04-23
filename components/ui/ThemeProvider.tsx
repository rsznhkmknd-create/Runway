'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

export type Theme = 'light' | 'dark'

type ThemeApi = {
  theme:  Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeApi | null>(null)

export const THEME_STORAGE_KEY = 'finsight.theme'

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    return { theme: 'dark', setTheme: () => {}, toggle: () => {} }
  }
  return ctx
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The init script in <head> has already set `.dark` on <html>, so we start
  // by reading the actual current state of the DOM — no flash.
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const root = document.documentElement
    const initial: Theme = root.classList.contains('dark') ? 'dark' : 'light'
    setThemeState(initial)
  }, [])

  const applyTheme = useCallback((t: Theme) => {
    const root = document.documentElement
    if (t === 'dark') root.classList.add('dark')
    else              root.classList.remove('dark')
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, t)
    } catch {
      // quota / private mode — ignore
    }
  }, [])

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t)
      applyTheme(t)
    },
    [applyTheme]
  )

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      return next
    })
  }, [applyTheme])

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY || !e.newValue) return
      if (e.newValue === 'light' || e.newValue === 'dark') {
        setThemeState(e.newValue)
        applyTheme(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [applyTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

/** Init script injected in <head> — runs BEFORE React hydration to prevent
 *  theme flash. Reads localStorage; defaults to dark (per Finsight design). */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var d=document.documentElement;if(t==='light'){d.classList.remove('dark');}else{d.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`
