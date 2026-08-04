'use client'
import { Icon } from '@/components/ui'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'

/**
 * Score de correspondance réel — issu de `RecommandationIA` (module M12 IA,
 * `src/lib/ia/recommandation.ts`). `score` est normalisé ∈ [0,1] (blend de rang
 * signal collaboratif 0.6 + éligibilité 0.4) ; `raison` porte le chemin
 * explicatif calculé par `computeRecommandations` (jamais inventé côté UI).
 */
export interface YayeMatch {
  /** Score normalisé ∈ [0,1] tel que persisté en base — converti en % à l'affichage. */
  score: number
  /** Chemin explicatif stocké (ex. « adaptée à ton niveau d'étude et ton profil »). */
  raison: string
}

export interface YayeMatchCardProps {
  /**
   * Résultat réel pour le couple (bénéficiaire connecté, opportunité affichée),
   * lu côté serveur depuis le cache `RecommandationIA` et descendu en prop
   * (jamais d'appel client, jamais de recalcul en rendu — GUIC-689 P2).
   * `null` = aucun score n'existe pour ce couple (visiteur anonyme, ou offre
   * hors des recommandations calculées) : la carte est alors masquée. Il est
   * hors de question d'afficher une valeur par défaut.
   */
  match: YayeMatch | null
  /** Lien d'assistance vers le compagnon Yaye. Défaut : la page Yaye plein écran. */
  helpHref?: string
}

/**
 * Carte « Yaye t'aide à postuler » — affichée dans le détail d'une opportunité.
 *
 * Référence design : `design-guichet-v2/lot3-opps-mobile.jsx#MobileOppDetailSheet`
 * (gradient teal-soft → white, avatar Yaye, badge pourcent, lien d'assistance).
 *
 * Source de données : réelle, `RecommandationIA` (GUIC-689 P2). Ne rend RIEN si
 * `match` est `null` — un chiffre codé en dur ou par défaut serait un faux
 * signal présenté comme une analyse.
 */
export function YayeMatchCard({ match, helpHref = '/jeune/yaye' }: YayeMatchCardProps) {
  if (!match) return null

  const pourcentage = Math.round(match.score * 100)

  return (
    <aside
      data-testid="yaye-match-card"
      aria-label="Conseil Yaye"
      className="flex items-center gap-space-3 rounded-gj-md border-[1.5px] border-gj-line
        p-space-3 bg-[linear-gradient(135deg,var(--gj-teal-soft),var(--gj-surface))]"
    >
      <YayeAvatar size={32} className="flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-space-1 text-fs-200 font-extrabold text-gj-teal-deep">
          <span style={{ fontFamily: 'var(--gj-font-yaye-wordmark)' }}>Yaye :</span>
          <span
            data-testid="yaye-match-score"
            className="bg-gj-green-soft text-gj-green-ink text-fs-100 font-black
              px-[6px] py-[1px] rounded-full"
          >
            {pourcentage}%
          </span>
        </div>
        {match.raison && (
          <p className="text-fs-200 text-color-text-secondary leading-snug mt-[2px]">{match.raison}</p>
        )}
        <a
          href={helpHref}
          className="inline-flex items-center gap-1 text-fs-200 font-bold text-gj-teal-deep
            hover:underline mt-space-1"
        >
          Yaye m’aide à postuler
          <Icon name="arrow-right" size={14} aria-hidden />
        </a>
      </div>
    </aside>
  )
}
