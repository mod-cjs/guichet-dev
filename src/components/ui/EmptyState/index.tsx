import { Icon, type IconName } from '../Icon'

export type EmptyStateIllustration = 'search' | 'inbox' | 'error'

export interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'outline'
}

interface EmptyStateProps {
  /**
   * Illustration SVG inline (design v2 lot 3). Si fournie, prime sur `icon`/`emoji`.
   * Défaut conseillé pour les listes filtrées : `'search'`.
   */
  illustration?: EmptyStateIllustration
  /** Icône du sprite SVG — fallback si pas d'illustration. */
  icon?: IconName
  /** @deprecated Préférer `illustration` ou `icon`. Fallback emoji legacy. */
  emoji?: string
  title: string
  description?: string
  /**
   * Actions multiples (max 2). Si fourni, prime sur `actionLabel`/`onAction`.
   * - `primary` : fond teal-deep, texte blanc
   * - `outline` : fond blanc, border gj-line, texte teal-deep
   */
  actions?: EmptyStateAction[]
  /** @deprecated Préférer `actions`. Mappé en `[{label, onClick, variant: 'primary'}]`. */
  actionLabel?: string
  /** @deprecated Préférer `actions`. */
  onAction?: () => void
  /**
   * GUIC-689 (Lot D4) — `'inline'` (défaut, inchangé) : actions côte à côte.
   * `'fullpage'` : actions empilées pleine largeur (48-50px), comme
   * `FullPageState`/`StateBlock` — pour un état vide occupant tout l'écran.
   */
  layout?: 'inline' | 'fullpage'
}

/**
 * EmptyState — design v2 lot 3 (GUIC-418).
 *
 * Container 14px radius, border 1.5px gj-line, padding 48×32, illustration
 * SVG 120×120 inline (search / inbox / error) et jusqu'à 2 actions
 * (primary / outline).
 *
 * Rétro-compatibilité : `icon` + `actionLabel`/`onAction` restent valides ;
 * `illustration` les écrase si fournie. `actions` prime sur `actionLabel`.
 *
 * `layout` (GUIC-689, Lot D4) : `'inline'` par défaut (comportement
 * inchangé) ; `'fullpage'` empile les actions pleine largeur (48-50px de
 * haut) pour un état vide occupant tout l'écran.
 */
export function EmptyState({
  illustration,
  icon,
  emoji,
  title,
  description,
  actions,
  actionLabel,
  onAction,
  layout = 'inline',
}: EmptyStateProps) {
  // Choix du visuel : illustration > icon > emoji (legacy).
  const showIllustration = illustration !== undefined || (!icon && !emoji)
  const effectiveIllustration: EmptyStateIllustration = illustration ?? 'search'

  // Normalise `actions` : prime sur l'API legacy `actionLabel`/`onAction`.
  const effectiveActions: EmptyStateAction[] =
    actions && actions.length > 0
      ? actions.slice(0, 2)
      : actionLabel && onAction
        ? [{ label: actionLabel, onClick: onAction, variant: 'primary' as const }]
        : []

  return (
    <div
      className="bg-white border-[1.5px] border-gj-line rounded-[14px] flex flex-col items-center text-center"
      style={{ padding: '48px 32px', gap: 14 }}
    >
      {showIllustration ? (
        <Illustration variant={effectiveIllustration} />
      ) : icon ? (
        <div className="inline-flex items-center justify-center w-[64px] h-[64px] rounded-full bg-gj-teal-soft text-gj-teal-deep">
          <Icon name={icon} size={32} />
        </div>
      ) : (
        <div className="text-[48px] leading-none" aria-hidden="true">{emoji}</div>
      )}
      <div>
        <h3 className="text-[18px] font-black text-color-text-primary">{title}</h3>
        {description && (
          <p
            className="text-color-text-secondary mx-auto leading-snug"
            style={{ fontSize: 13.5, color: 'var(--gj-grey)', marginTop: 6, maxWidth: 380, lineHeight: 1.55 }}
          >
            {description}
          </p>
        )}
      </div>
      {effectiveActions.length > 0 && (
        <div
          className={layout === 'fullpage' ? 'flex flex-col gap-[10px] w-full' : 'flex gap-[10px]'}
          style={{ marginTop: 6 }}
        >
          {effectiveActions.map((a, i) => (
            <button
              key={`${a.label}-${i}`}
              onClick={a.onClick}
              className={
                layout === 'fullpage'
                  ? a.variant === 'outline'
                    ? 'bg-white text-gj-teal-deep border-[1.5px] border-gj-line rounded-gj-lg font-bold text-fs-300 min-h-[48px] w-full cursor-pointer'
                    : 'bg-gj-teal-deep text-white rounded-gj-lg font-black text-fs-300 min-h-[50px] w-full cursor-pointer border-0'
                  : a.variant === 'outline'
                    ? 'bg-white text-gj-teal-deep border-[1.5px] border-gj-line rounded-gj-md font-bold text-fs-300 min-h-[var(--tap-min)] px-space-4 cursor-pointer'
                    : 'bg-gj-teal-deep text-white rounded-gj-md font-black text-fs-300 min-h-[var(--tap-min)] px-space-4 cursor-pointer border-0'
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface IllustrationProps {
  variant: EmptyStateIllustration
}

/**
 * Illustrations SVG inline (120×120) — design v2 lot 3.
 * - search : loupe + document (résultats vides, filtres trop restrictifs)
 * - inbox : boîte vide (pas d'éléments à afficher)
 * - error : exclamation (erreur de chargement)
 */
function Illustration({ variant }: IllustrationProps) {
  if (variant === 'inbox') {
    return (
      <svg
        viewBox="0 0 120 120"
        width="120"
        height="120"
        aria-hidden="true"
        data-illustration="inbox"
      >
        <circle cx="60" cy="60" r="56" fill="var(--gj-teal-soft)" />
        <path
          d="M30 56 L42 38 H78 L90 56 V82 H30 Z"
          fill="#fff"
          stroke="var(--gj-teal-deep)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M30 56 H48 L52 62 H68 L72 56 H90"
          fill="none"
          stroke="var(--gj-teal-deep)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (variant === 'error') {
    return (
      <svg
        viewBox="0 0 120 120"
        width="120"
        height="120"
        aria-hidden="true"
        data-illustration="error"
      >
        <circle cx="60" cy="60" r="56" fill="var(--gj-teal-soft)" />
        <circle cx="60" cy="60" r="32" fill="#fff" stroke="var(--gj-teal-deep)" strokeWidth="3" />
        <line x1="60" y1="46" x2="60" y2="66" stroke="var(--gj-teal-deep)" strokeWidth="5" strokeLinecap="round" />
        <circle cx="60" cy="76" r="3" fill="var(--gj-teal-deep)" />
        <circle cx="92" cy="32" r="7" fill="var(--gj-yellow)" />
        <text x="92" y="36" textAnchor="middle" fontSize="10" fontWeight="900" fill="var(--gj-ink)">!</text>
      </svg>
    )
  }
  // search (défaut) — réplique de design-guichet-v2/lot3-opps-web.jsx WebEmptyState
  return (
    <svg
      viewBox="0 0 120 120"
      width="120"
      height="120"
      aria-hidden="true"
      data-illustration="search"
    >
      <circle cx="60" cy="60" r="56" fill="var(--gj-teal-soft)" />
      <circle cx="52" cy="50" r="22" fill="#fff" stroke="var(--gj-teal-deep)" strokeWidth="3" />
      <line x1="70" y1="68" x2="88" y2="86" stroke="var(--gj-teal-deep)" strokeWidth="5" strokeLinecap="round" />
      <line x1="42" y1="50" x2="62" y2="50" stroke="var(--gj-grey-2)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="42" y1="44" x2="58" y2="44" stroke="var(--gj-grey-2)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="42" y1="56" x2="55" y2="56" stroke="var(--gj-grey-2)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="92" cy="32" r="7" fill="var(--gj-yellow)" />
      <text x="92" y="36" textAnchor="middle" fontSize="10" fontWeight="900" fill="var(--gj-ink)">!</text>
    </svg>
  )
}
