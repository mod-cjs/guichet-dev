'use client'

import { Icon, type IconName } from '@/components/ui/Icon'
import { Card } from '@/components/ui/Card'

export interface MaCarteBenefice {
  /** Titre court de la carte bénéfice. */
  titre: string
  /** Phrase explicative. */
  description: string
  /** Icône — nom du sprite (sans préfixe `i-`). */
  icon: IconName
}

export interface MaCarteBeneficesSectionProps {
  /**
   * Bénéfices à afficher. Par défaut : les 4 bénéfices canoniques du design source
   * (`public/design-v2/centres-web.jsx:422-437`).
   */
  benefices?: MaCarteBenefice[]
  className?: string
}

/**
 * 4 bénéfices canoniques — alignés sur `public/design-v2/centres-web.jsx:422-437`.
 *
 * Choix d'icônes (sprite `/icons.svg`) :
 *  - `pin` (i-pin) — Accès aux centres
 *  - `check-circle` (i-check-circle) — Check-in ateliers
 *  - `car` (i-car) — Retrait de ressources (le design utilise i-car ; cohérence visuelle)
 *  - `download` (i-download) — Hors-ligne / Wallet
 */
const DEFAULT_BENEFICES: MaCarteBenefice[] = [
  {
    titre: 'Accès',
    description: "Présente ton QR à l'accueil pour t'identifier.",
    icon: 'pin',
  },
  {
    titre: 'Check-in',
    description: 'Confirme ta présence aux ateliers.',
    icon: 'check-circle',
  },
  {
    titre: 'Retrait',
    description: 'Récupère tes ressources réservées.',
    icon: 'car',
  },
  {
    titre: 'Hors-ligne',
    description: 'Le QR fonctionne même sans connexion.',
    icon: 'download',
  },
]

/**
 * <MaCarteBeneficesSection> — 4 cards bénéfices grid 2×2 (responsive).
 *
 * Présente les 4 usages principaux de la carte CJS avant la grille "Tes derniers
 * usages" (vécu utilisateur). Pédagogie d'abord, personnalisation ensuite.
 *
 * Source design : `public/design-v2/centres-web.jsx:422-437`.
 *
 * Layout :
 *  - Mobile (<sm) : 1 colonne empilée.
 *  - ≥sm : grid 2×2.
 *
 * GUIC-398 — Wave 7 fidélité design Lot 7.
 */
export function MaCarteBeneficesSection({
  benefices = DEFAULT_BENEFICES,
  className = '',
}: MaCarteBeneficesSectionProps) {
  return (
    <section
      aria-labelledby="ma-carte-benefices-title"
      data-testid="ma-carte-benefices"
      className={`flex flex-col gap-3 ${className}`.trim()}
    >
      <h2
        id="ma-carte-benefices-title"
        className="text-fs-400 font-black m-0 text-color-text-primary"
      >
        À quoi sert ta carte
      </h2>
      <ul
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0 m-0"
        aria-label="Bénéfices de la carte CJS"
      >
        {benefices.map((b) => (
          <li key={b.titre}>
            <Card
              padded={false}
              className="flex gap-3 items-start p-4 h-full"
            >
              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center flex-shrink-0 rounded-gj-md"
                style={{
                  width: 40,
                  height: 40,
                  background: 'var(--gj-teal-soft)',
                  color: 'var(--gj-teal-deep)',
                }}
              >
                <Icon name={b.icon} size={20} />
              </span>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-fs-200 font-black text-color-text-primary">
                  {b.titre}
                </span>
                <span className="text-fs-100 text-color-text-muted leading-snug">
                  {b.description}
                </span>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}
