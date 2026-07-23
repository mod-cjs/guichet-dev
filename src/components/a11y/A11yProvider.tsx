'use client'

import { createContext, useContext, type ReactNode } from 'react'

/** Taille de texte — mappe :root[data-text] (tokens.css). */
export type A11yTextSize = 's' | 'm' | 'l' | 'xl'

/** Préférences d'accessibilité (GUIC-581) — shape persisté (localStorage + ProfilJeune). */
export interface A11yPrefs {
  text: A11yTextSize
  contrast: boolean
  gray: boolean
  motion: boolean
  spacing: boolean
  falc: boolean
  kbd: boolean
}

export const A11Y_STORAGE_KEY = 'gj-a11y'

export const A11Y_DEFAULTS: A11yPrefs = {
  text: 'm',
  contrast: false,
  gray: false,
  motion: false,
  spacing: false,
  falc: false,
  kbd: false,
}

/** Normalise une valeur inconnue (localStorage / colonne Json) vers un shape sûr. */
export function sanitizeA11yPrefs(_value: unknown): A11yPrefs {
  return A11Y_DEFAULTS
}

interface A11yContextValue {
  prefs: A11yPrefs
  setPref: <K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) => void
  reset: () => void
}

const A11yContext = createContext<A11yContextValue | null>(null)

export function useA11y(): A11yContextValue {
  const ctx = useContext(A11yContext)
  if (!ctx) throw new Error('useA11y doit être utilisé sous <A11yProvider>')
  return ctx
}

export interface A11yProviderProps {
  /** Valeur serveur (ProfilJeune.prefsAccessibilite) — prioritaire sur localStorage. */
  initial?: A11yPrefs | null
  children: ReactNode
}

/**
 * Provider des préférences d'accessibilité (GUIC-581).
 * Stub RED — implémentation dans le commit GREEN.
 */
export function A11yProvider({ children }: A11yProviderProps) {
  return <>{children}</>
}
