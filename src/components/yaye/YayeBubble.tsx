'use client'

import { useState } from 'react'
import { YayeFab } from '@/components/ui/Yaye/YayeFab'
import { YayeSidePanel } from '@/components/ui/Yaye/YayeSidePanel'

export interface YayeBubbleProps {
  /**
   * Décalage `bottom` (px) du bouton flottant.
   *
   * - Desktop (≥lg) : 24 (pas de BottomNav).
   * - Mobile (<lg) : 80 par défaut (au-dessus de la BottomNav 72px + marge).
   *
   * GUIC-373 — propagé en CSS via prop (le composant ne switche pas tout seul).
   */
  bottom?: number
  right?: number
}

/**
 * YayeBubble — bouton flottant universel d'accès à Yaye.
 *
 * GUIC-373 — monté dans les layouts publics et `/jeune/(app)`. Click → ouvre
 * un drawer (`YayeSidePanel`). z-index `--gj-z-chat` > BottomNav.
 *
 * Sur mobile, la BottomNav prend 72px en bas → on remonte le FAB.
 * Sur desktop, on garde le décalage par défaut (24px).
 *
 * Réutilise `YayeFab` (presentation) + `YayeSidePanel` (conversation mock).
 * Pas d'appel LLM réel ici (cf. composant existant).
 */
export function YayeBubble({ bottom, right = 16 }: YayeBubbleProps) {
  const [open, setOpen] = useState(false)
  // Décalage responsive : on délègue à CSS via wrapper, mais YayeFab attend un
  // number. On utilise une heuristique : si `bottom` est fourni, on l'utilise ;
  // sinon, on monte deux FAB conditionnels (lg vs <lg) — solution plus simple :
  // un seul FAB et on s'appuie sur des classes utilitaires impossibles → on
  // duplique côté wrapper.
  if (typeof bottom === 'number') {
    return (
      <>
        <YayeFab bottom={bottom} right={right} onClick={() => setOpen(true)} />
        <YayeSidePanel open={open} onClose={() => setOpen(false)} />
      </>
    )
  }

  return (
    <>
      {/* Mobile (<lg) : au-dessus de la BottomNav (72px + 8px de respiration). */}
      <span className="lg:hidden">
        <YayeFab bottom={80} right={right} onClick={() => setOpen(true)} />
      </span>
      {/* Desktop (≥lg) : pas de BottomNav, décalage standard. */}
      <span className="hidden lg:inline">
        <YayeFab bottom={24} right={right} onClick={() => setOpen(true)} />
      </span>
      <YayeSidePanel open={open} onClose={() => setOpen(false)} />
    </>
  )
}
