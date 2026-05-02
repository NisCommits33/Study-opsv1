/**
 * @file lib/bilingualUtils.ts
 * @description Bilingual system utilities.
 */

export type BilingualText = {
  en: string
  np: string
}

/**
 * Resolves a bilingual text object to the correct language string.
 */
export function t(text: BilingualText | string | null | undefined, lang: 'en' | 'np' = 'en'): string {
  if (!text) return ''
  if (typeof text === 'string') return text
  return text[lang] || text.en || ''
}

import { useState, useEffect } from 'react'

/**
 * Hook to manage and listen to global language state.
 */
export function useLanguage() {
  const [lang, setLang] = useState<'en' | 'np'>('en')

  useEffect(() => {
    const saved = localStorage.getItem('studyops-lang') as 'en' | 'np'
    if (saved) setLang(saved)

    const handleStorage = () => {
      const current = localStorage.getItem('studyops-lang') as 'en' | 'np'
      if (current) setLang(current)
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'np' : 'en'
    setLang(newLang)
    localStorage.setItem('studyops-lang', newLang)
    window.dispatchEvent(new Event('storage'))
  }

  return { lang, setLang, toggleLanguage }
}

