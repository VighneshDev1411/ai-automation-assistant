'use client'

import { useEffect, useState } from 'react'
import { useLocalStorage } from './use-local-storage'
import { useMediaQuery } from './use-media-query'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  systemTheme: ResolvedTheme
}

export function useTheme(): ThemeContextType {
  const [mounted, setMounted] = useState(false)
  const [theme, setThemeState] = useLocalStorage<Theme>('theme', 'system')
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  
  const systemTheme: ResolvedTheme = prefersDark ? 'dark' : 'light'
  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    const isDark = resolvedTheme === 'dark'

    // Remove previous theme classes
    root.classList.remove('light', 'dark')
    
    // Add current theme class
    root.classList.add(resolvedTheme)
    
    // Update theme-color meta tag
    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (themeColorMeta) {
      themeColorMeta.setAttribute(
        'content', 
        isDark ? '#0f172a' : '#ffffff'
      )
    }

    // Update CSS custom properties for smooth transitions
    root.style.setProperty('--theme-transition', 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)')
    
    // Trigger custom event for theme change
    window.dispatchEvent(new CustomEvent('themeChange', {
      detail: { theme, resolvedTheme, systemTheme }
    }))
  }, [theme, resolvedTheme, systemTheme, mounted])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    
    // Analytics tracking (optional)
    if (typeof window !== 'undefined' && 'gtag' in window) {
      // @ts-ignore
      window.gtag('event', 'theme_change', {
        theme: newTheme,
        resolved_theme: newTheme === 'system' ? systemTheme : newTheme
      })
    }
  }

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(systemTheme === 'dark' ? 'light' : 'dark')
    } else {
      setTheme(theme === 'light' ? 'dark' : 'light')
    }
  }

  // Return default values during SSR
  if (!mounted) {
    return {
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: () => {},
      toggleTheme: () => {},
      systemTheme: 'light'
    }
  }

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    systemTheme
  }
}