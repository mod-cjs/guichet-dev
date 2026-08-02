'use client'
import Link from 'next/link'
import { Icon } from '@/components/ui'
import { OpportuniteTypeChip } from './OpportuniteTypeChip'
import { TYPE_ICON, catFamilyOf, type CatFamily } from './opportunite-type-meta'
import { regionLabel } from '@/lib/regions'
import { formatDeadline, formatDeadlineFull } from '@/lib/format-date'
import type { OpportuniteListItem } from '@/types/opportunite'

/**
 * <OppCard /> — carte mobile-first du catalogue d'opportunités (GUIC-188).
 *
 * Design v3 (lot3-opps-web · OppListCard / lot3-opps-mobile · MobileOppRowCard) :
 * - en-tête : chip catégorie + pastille urgence séparée + badge match + bouton favori
 * - titre · organisation
 * - métadonnées : pin région · funding rémunération · clock deadline
 * - deadline : « Postuler avant le X » (F08) ; rouge si urgent (J ≤ 7)
 * - CTA secondaire « Voir l'offre → » en bas-droite (F03)
 * - Bordure carte constante (border-gj-line) — l'urgence n'est portée QUE par la
 *   pastille dédiée, jamais par la carte ni par le chip type (GUIC-689)
 * - Variante compacte mobile via breakpoints (F20)
 *
 * Pas de bouton imbriqué : un lien étiré couvre la carte, le bouton favori
 * et le CTA vivent en `z-[1]` au-dessus (pattern Card · refonte v2/v3).
 *
 * GUIC-458 — conformité design v3. GUIC-689 — CTA de conversion magenta +
 * code couleur catégories (« Reponse au retour design V3 » §1-2) : le CTA de
 * rangée devient secondaire (une seule action pleine par écran, portée par le
 * détail), le chip type ne code plus l'urgence.
 */

const DAY = 86_400_000

/**
 * F1.1 (GUIC-689) — classes de la tuile sectorielle, écrites EN TOUTES
 * LETTRES : une classe Tailwind composée à l'exécution (`bg-${x}-soft`)
 * n'est jamais générée par le scan statique. Motif identique à
 * `CAT_TUILE_CLASSES` de `src/components/dashboard/OpportunitesRecoCarousel.tsx`
 * (hors périmètre de ce ticket — dupliqué ici, ne pas factoriser sans ticket
 * dédié). Aplat uniquement (consigne projet) : jamais de dégradé, même si
 * `lot3-opps-web.jsx` / `lot3-opps-mobile.jsx` en utilisent un.
 */
const CAT_TUILE_CLASSES: Record<CatFamily, string> = {
  'cat-emploi':      'bg-cat-emploi-soft text-cat-emploi-ink',
  'cat-stage':       'bg-cat-stage-soft text-cat-stage-ink',
  'cat-formation':   'bg-cat-formation-soft text-cat-formation-ink',
  'cat-financement': 'bg-cat-financement-soft text-cat-financement-ink',
  'cat-evenement':   'bg-cat-evenement-soft text-cat-evenement-ink',
  'cat-volontariat': 'bg-cat-volontariat-soft text-cat-volontariat-ink',
  'cat-neutre':      'bg-cat-neutre-soft text-cat-neutre-ink',
}

interface DeadlineInfo {
  label: string
  urgent: boolean
}

/** Étiquette compacte + urgence si deadline dans les 7 jours. */
export function buildDeadlineInfo(iso: string | null, now: number = Date.now()): DeadlineInfo | null {
  if (!iso) return null
  const d = new Date(iso)
  const days = Math.ceil((d.getTime() - now) / DAY)
  if (days < 0) return { label: 'Clôturée', urgent: false }
  if (days === 0) return { label: "Aujourd'hui", urgent: true }
  if (days <= 7) return { label: `J-${days}`, urgent: true }
  // Smart format : "12 juin" (année courante) ou "12 juin 2027".
  return { label: formatDeadline(iso, new Date(now)), urgent: false }
}

export interface OppCardProps {
  item: OpportuniteListItem
  isFavori: boolean
  onToggleFavori: (id: string) => void
  /** Score de matching (0–100) — affiché uniquement si fourni et non null. */
  matchScore?: number | null
  /** Timestamp `now` pour les tests déterministes (défaut : Date.now()). */
  now?: number
}

export function OppCard({ item, isFavori, onToggleFavori, matchScore = null, now }: OppCardProps) {
  const dl = buildDeadlineInfo(item.deadline, now)
  const region = regionLabel(item.region)
  // GUIC-689 — la carte garde une bordure constante : l'urgence n'est jamais
  // portée par la carte (ni par le chip type), uniquement par la pastille dédiée.
  const catFamily = catFamilyOf(item.type)

  return (
    <article
      data-testid="opp-card"
      className={`relative bg-gj-surface border-[1.5px] border-gj-line rounded-gj-lg
        p-space-2 sm:p-space-3
        flex flex-col gap-space-2`}
    >
      {/* Lien étiré — toute la carte est cliquable, pas de bouton imbriqué. */}
      <Link
        href={`/opportunites/${item.slug}`}
        aria-label={`Voir l'opportunité : ${item.titre}`}
        className="absolute inset-0 rounded-gj-lg focus:outline-none
          focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]"
      />

      {/* F1.1 — tuile sectorielle (aplat famille catégorie + picto) : « reconnaître
          avant de lire », desktop ET mobile (GUIC-689, lot3-opps-web/mobile). */}
      <div className="flex gap-space-2 sm:gap-space-3">
        <div
          data-testid="opp-tuile"
          data-cat={catFamily}
          aria-hidden
          className={`flex-shrink-0 self-stretch w-[52px] sm:w-[64px] min-h-[64px]
            rounded-gj-md flex items-center justify-center
            ${CAT_TUILE_CLASSES[catFamily]}`}
        >
          <Icon name={TYPE_ICON[item.type]} size={26} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-space-2">
          {/* F02 — ligne chip catégorie + pastille urgence + badge match + favori */}
          <div className="flex items-center gap-space-1 flex-wrap">
            {/* Wrapper pour data-testid et data-cat (OpportuniteTypeChip ne propage pas les attrs rest) */}
            <span data-testid="type-chip" data-cat={catFamily}>
              <OpportuniteTypeChip type={item.type} />
            </span>
            {/* Pastille urgence séparée — jamais fusionnée avec le chip type (GUIC-689). */}
            {dl?.urgent && (
              <span data-testid="urgence-badge" className="gj-urgent">
                {dl.label}
              </span>
            )}
            {/* F01 — badge match conditionnel */}
            {matchScore !== null && matchScore !== undefined && (
              <span
                data-testid="match-score"
                className="inline-flex items-center px-space-2 py-[2px] rounded-gj-pill
                  text-fs-100 font-black uppercase tracking-[0.3px] leading-none
                  bg-gj-green-soft text-gj-green-ink"
              >
                {matchScore}% match
              </span>
            )}
            <button
              type="button"
              onClick={() => onToggleFavori(item.id)}
              aria-pressed={isFavori}
              aria-label={isFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              className={`relative z-[1] ml-auto inline-flex items-center justify-center
                w-[44px] h-[44px] lg:w-[38px] lg:h-[38px] rounded-full border-[1.5px]
                transition-all duration-150 ease-out active:scale-90
                ${isFavori
                  ? 'bg-gj-yellow-soft border-gj-yellow text-gj-yellow-ink scale-105'
                  : 'bg-gj-surface border-gj-line text-gj-grey hover:border-gj-line-strong'}`}
            >
              <Icon name="bookmark" size={16} />
            </button>
          </div>

          {/* F20 — titre compact sur mobile (text-fs-300 → text-fs-400 sur sm+) */}
          <h3 className="text-fs-300 sm:text-fs-400 font-black text-color-text-primary leading-snug line-clamp-2">
            {item.titre}
          </h3>
          <p className="text-fs-100 sm:text-fs-200 text-color-text-secondary">{item.organisation}</p>

          {/* Métadonnées + deadline */}
          <div className="flex flex-wrap items-center gap-x-space-3 gap-y-space-1 text-fs-100 sm:text-fs-200 text-color-text-secondary">
            {region && (
              <span className="inline-flex items-center gap-1">
                <Icon name="pin" size={14} />
                {region}
              </span>
            )}
            {item.remuneration && (
              <span className="inline-flex items-center gap-1">
                <Icon name="funding" size={14} />
                {item.remuneration}
              </span>
            )}
            {/* F08 — « Postuler avant le X » / rouge si urgent */}
            {dl && (
              <span
                data-testid="deadline-label"
                title={item.deadline ? formatDeadlineFull(item.deadline) : undefined}
                className={`inline-flex items-center gap-1 ${
                  dl.urgent ? 'text-gj-red font-black' : ''
                }`}
              >
                <Icon name="clock" size={14} />
                {dl.urgent ? dl.label : `Postuler avant le ${dl.label}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* F03 — CTA secondaire « Voir l'offre → » en bas-droite (GUIC-689 : une
          seule action pleine par écran, portée par le détail — la rangée de
          liste redevient secondaire). */}
      <div className="flex justify-end mt-space-1">
        <Link
          data-testid="cta-voir-postuler"
          href={`/opportunites/${item.slug}`}
          aria-label={`Voir l'offre : ${item.titre}`}
          tabIndex={-1}
          className="relative z-[1] inline-flex items-center gap-1
            bg-gj-surface border-[1.5px] border-gj-line-strong text-gj-teal-deep
            px-space-3 py-[6px] rounded-gj-md
            text-fs-200 font-bold
            hover:bg-gj-bg transition-colors duration-150
            focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]"
        >
          Voir l&apos;offre
          <Icon name="arrow-right" size={14} />
        </Link>
      </div>
    </article>
  )
}
