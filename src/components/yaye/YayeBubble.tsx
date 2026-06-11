'use client'

import { YayeFab } from '@/components/ui/Yaye/YayeFab'
import { YayeSidePanel } from '@/components/ui/Yaye/YayeSidePanel'
import { useYayePanel } from '@/components/yaye/YayeProvider'

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
 * GUIC-376 — l'état d'ouverture est désormais piloté par `YayeProvider` afin
 * que le CTA Yaye de la `BenefSidebar` puisse ouvrir **le même** drawer.
 *
 * Sur mobile, la BottomNav prend 72px en bas → on remonte le FAB.
 * Sur desktop, on garde le décalage par défaut (24px).
 */
export function YayeBubble({ bottom, right = 16 }: YayeBubbleProps) {
  const { isOpen, open, close } = useYayePanel()

  if (typeof bottom === 'number') {
    return (
      <>
        <YayeFab bottom={bottom} right={right} onClick={open} />
        <YayeSidePanel open={isOpen} onClose={close} />
      </>
    )
  }

  return (
    <>
      {/* Mobile (<lg) : au-dessus de la BottomNav (72px + 8px de respiration). */}
      <span className="lg:hidden">
        <YayeFab bottom={80} right={right} onClick={open} />
      </span>
      {/* Desktop (≥lg) : pas de BottomNav, décalage standard. */}
      <span className="hidden lg:inline">
        <YayeFab bottom={24} right={right} onClick={open} />
      </span>
      <YayeSidePanel open={isOpen} onClose={close} />
    </>
  )
}
