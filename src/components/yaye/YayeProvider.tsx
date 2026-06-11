'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * GUIC-376 — état global du panneau Yaye.
 *
 * Permet à la fois à la bubble flottante (`YayeBubble`) et au CTA Yaye
 * de la sidebar (`BenefSidebar`) d'ouvrir le **même** drawer
 * (`YayeSidePanel`) au lieu d'utiliser une page dédiée.
 *
 * Usage :
 * ```tsx
 * <YayeProvider>
 *   <App />
 *   <YayeBubble />   // consomme open/close
 * </YayeProvider>
 * ```
 */
export interface YayePanelContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const YayePanelContext = createContext<YayePanelContextValue | null>(null)

export function YayeProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(v => !v), [])
  const value = useMemo<YayePanelContextValue>(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle],
  )
  return <YayePanelContext.Provider value={value}>{children}</YayePanelContext.Provider>
}

/**
 * Renvoie l'API d'ouverture du drawer Yaye.
 *
 * Si aucun `YayeProvider` n'enveloppe le composant (cas d'un test isolé ou
 * d'une page sans le shell), renvoie un **no-op safe** plutôt que de throw —
 * la sidebar et la bubble restent fonctionnelles (le clic ne fait juste rien).
 */
export function useYayePanel(): YayePanelContextValue {
  const ctx = useContext(YayePanelContext)
  if (ctx) return ctx
  return {
    isOpen: false,
    open: () => {},
    close: () => {},
    toggle: () => {},
  }
}
