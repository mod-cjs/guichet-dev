'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

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
  // GUIC-658 — phase 2
  cursor: boolean
  guide: boolean
  voice: boolean
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
  cursor: false,
  guide: false,
  voice: false,
}

const TEXT_SIZES: readonly A11yTextSize[] = ['s', 'm', 'l', 'xl']

const BOOL_KEYS = ['contrast', 'gray', 'motion', 'spacing', 'falc', 'kbd'] as const

/** Normalise une valeur inconnue (localStorage / colonne Json) vers un shape sûr. */
export function sanitizeA11yPrefs(value: unknown): A11yPrefs {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ...A11Y_DEFAULTS }
  }
  const raw = value as Record<string, unknown>
  const out: A11yPrefs = { ...A11Y_DEFAULTS }
  if (TEXT_SIZES.includes(raw.text as A11yTextSize)) out.text = raw.text as A11yTextSize
  for (const k of BOOL_KEYS) {
    if (typeof raw[k] === 'boolean') out[k] = raw[k]
  }
  return out
}

/** Mapping préférence → data-attribute sur <html> (cf tokens.css l.392+). */
const ATTR_MAP: Record<(typeof BOOL_KEYS)[number], { attr: string; value: string }> = {
  contrast: { attr: 'data-contrast', value: 'high' },
  gray: { attr: 'data-gray', value: 'on' },
  motion: { attr: 'data-motion', value: 'reduce' },
  spacing: { attr: 'data-spacing', value: 'on' },
  falc: { attr: 'data-falc', value: 'on' },
  kbd: { attr: 'data-kbd', value: 'on' },
}

const ALL_ATTRS = ['data-text', ...BOOL_KEYS.map((k) => ATTR_MAP[k].attr)]

/** Applique les préférences sur <html>. Défaut (texte M, tout off) = aucun attribut. */
function applyToHtml(prefs: A11yPrefs) {
  const html = document.documentElement
  if (prefs.text !== 'm') html.setAttribute('data-text', prefs.text)
  else html.removeAttribute('data-text')
  for (const k of BOOL_KEYS) {
    const { attr, value } = ATTR_MAP[k]
    if (prefs[k]) html.setAttribute(attr, value)
    else html.removeAttribute(attr)
  }
}

function clearHtml() {
  const html = document.documentElement
  for (const attr of ALL_ATTRS) html.removeAttribute(attr)
}

function readStorage(): A11yPrefs {
  try {
    const raw = window.localStorage.getItem(A11Y_STORAGE_KEY)
    if (!raw) return { ...A11Y_DEFAULTS }
    return sanitizeA11yPrefs(JSON.parse(raw))
  } catch {
    return { ...A11Y_DEFAULTS }
  }
}

function writeStorage(prefs: A11yPrefs) {
  try {
    window.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // stockage plein / bloqué — les préférences restent appliquées en mémoire
  }
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
 * Provider des préférences d'accessibilité (GUIC-581) — scope espace jeune.
 *
 * - Résolution au mount : valeur serveur (`initial`) prioritaire, sinon
 *   localStorage `gj-a11y` (déjà appliqué par le script anti-FOUC du layout).
 * - Chaque changement : data-attributes sur <html> + réécriture localStorage.
 *   La persistance serveur (action `modifierPrefsAccessibilite`) est
 *   déclenchée par la page Inclusion, pas ici (le provider reste synchrone).
 * - Démontage : tous les attributs sont retirés — les réglages ne fuient
 *   pas vers les espaces publics / recruteur / admin.
 */
export function A11yProvider({ initial, children }: A11yProviderProps) {
  // Résolution unique (ref) — `initial` ne doit gagner qu'au premier rendu.
  const resolved = useRef<A11yPrefs | null>(null)
  if (resolved.current === null) {
    resolved.current = initial ? sanitizeA11yPrefs(initial) : null
  }

  const [prefs, setPrefs] = useState<A11yPrefs>(() => {
    // SSR : pas de window — défauts ; le client resynchronise au mount.
    if (typeof window === 'undefined') return { ...A11Y_DEFAULTS }
    return resolved.current ?? readStorage()
  })

  // Application + persistance à chaque changement (y compris le mount).
  useEffect(() => {
    applyToHtml(prefs)
    writeStorage(prefs)
  }, [prefs])

  // Cleanup au démontage uniquement.
  useEffect(() => clearHtml, [])

  const setPref = useCallback(
    <K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) => {
      setPrefs((p) => ({ ...p, [key]: value }))
    },
    [],
  )

  const reset = useCallback(() => setPrefs({ ...A11Y_DEFAULTS }), [])

  return (
    <A11yContext.Provider value={{ prefs, setPref, reset }}>
      {children}
    </A11yContext.Provider>
  )
}
