'use client'
import { Icon } from '@/components/ui'

export interface YayeMatchCardProps {
  /** Score de matching 0-100 (mock jusqu'à intégration LLM). */
  score?: number
  /** Texte de conseil contextuel ; valeur par défaut pour le mock. */
  conseil?: string
  /** Lien d'assistance vers le compagnon Yaye. */
  helpHref?: string
}

/**
 * Carte « Yaye t'aide à postuler » — affichée dans le détail d'une opportunité.
 *
 * Référence design : `design-guichet-v2/lot3-opps-mobile.jsx#MobileOppDetailSheet`
 * (gradient teal-soft → white, avatar Yaye, badge pourcent, lien d'assistance).
 *
 * Source de données : mock (GUIC-219). Le score réel viendra du moteur de
 * matching Yaye (GUIC-12x – module M12 IA). Les props existent dès maintenant
 * pour rendre la substitution future indolore côté UI.
 */
export function YayeMatchCard({
  score = 94,
  conseil = 'Tu remplis 4/5 critères. Ajoute ton projet portfolio pour maximiser tes chances.',
  helpHref = '#',
}: YayeMatchCardProps) {
  return (
    <aside
      data-testid="yaye-match-card"
      aria-label="Conseil Yaye"
      className="flex items-center gap-space-3 rounded-gj-md border-[1.5px] border-gj-line
        p-space-3 bg-[linear-gradient(135deg,var(--gj-teal-soft),#fff)]"
    >
      <div
        aria-hidden
        className="flex-shrink-0 w-[38px] h-[38px] rounded-full text-white font-black
          inline-flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, var(--gj-green), var(--gj-teal-deep))',
          fontFamily: 'var(--gj-font-yaye-wordmark)',
          fontSize: 17,
        }}
      >
        Y
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-space-1 text-fs-200 font-extrabold text-gj-teal-deep">
          <span style={{ fontFamily: 'var(--gj-font-yaye-wordmark)' }}>Yaye :</span>
          <span
            data-testid="yaye-match-score"
            className="bg-gj-green-soft text-gj-green-ink text-fs-100 font-black
              px-[6px] py-[1px] rounded-full"
          >
            {score}%
          </span>
        </div>
        <p className="text-fs-200 text-color-text-secondary leading-snug mt-[2px]">{conseil}</p>
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
