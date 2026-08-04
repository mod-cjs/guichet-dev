/**
 * GUIC-402 — Mapping des segments d'URL vers labels lisibles pour breadcrumbs.
 * Couvre l'app jeune `/jeune/*` ; la racine `/jeune` est libellée « Mon espace ».
 */
export const SEGMENT_LABELS: Record<string, string> = {
  jeune: 'Mon espace',
  'mes-favoris': 'Mes favoris',
  'mes-candidatures': 'Mes candidatures',
  'mon-profil': 'Mon profil',
  'mes-notifications': 'Mes notifications',
  parametres: 'Paramètres',
  opportunites: 'Opportunités',
  agenda: 'Agenda',
  ressources: 'Ressources',
  centres: 'Centres',
  yaye: 'Yaye',
}

export interface Crumb {
  label: string
  /** `null` = crumb affiché mais non cliquable (segment sans page) — GUIC-689. */
  href: string | null
}

/** Cible réelle de la racine `/jeune` (qui n'a pas de page propre) — GUIC-446. */
const JEUNE_HOME_HREF = '/jeune/tableau-de-bord'

/**
 * GUIC-689 (Lot E3) — libellé générique substitué à un segment technique
 * (UUID Prisma `@default(uuid())`, ou identifiant purement numérique) qui
 * n'a pas de correspondance dans `SEGMENT_LABELS`. Sans ce garde-fou, un
 * segment dynamique absent (ex. `/jeune/mes-candidatures/<uuid>`) retombait
 * sur le segment brut capitalisé et exposait l'identifiant technique à
 * l'utilisateur.
 */
const GENERIC_ID_LABEL = 'Détail'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NUMERIC_ID_RE = /^\d+$/

/** Segment de type identifiant technique (UUID ou slug purement numérique). */
function isTechnicalId(segment: string): boolean {
  return UUID_RE.test(segment) || NUMERIC_ID_RE.test(segment)
}

/**
 * GUIC-689 — Dossiers de regroupement de l'app jeune qui n'ont PAS de
 * `page.tsx` : seules leurs sous-routes existent. Un crumb cliquable vers
 * l'un d'eux mène à un 404 (constaté sur `/jeune/parametres`, dont le
 * prefetch Next renvoyait 404 à chaque affichage de la page notifications).
 *
 * À tenir à jour si un dossier intermédiaire est ajouté sans page ; le
 * balayage fonctionnel des routes le détecte (prefetch `?_rsc=` en 404).
 */
const SEGMENTS_SANS_PAGE = new Set(['parametres', 'candidature'])

/**
 * Construit un fil d'Ariane à partir du pathname. Limité à 3 niveaux pour rester
 * lisible. Renvoie [] si pathname ne correspond pas à l'app jeune.
 *
 * Le crumb racine « Mon espace » pointe vers `/jeune/tableau-de-bord` et non
 * `/jeune` (qui n'a pas de page → 404) — GUIC-446.
 *
 * GUIC-689 — un segment identifiant technique (UUID/numérique) n'est jamais
 * affiché tel quel : il retombe sur un libellé générique (`Détail`). Pour un
 * libellé explicite et contextuel (ex. le titre de l'opportunité), la page
 * de détail utilise `<Breadcrumbs items={...} />` directement plutôt que ce
 * fil d'Ariane automatique.
 */
export function buildBreadcrumbs(pathname: string | null): Crumb[] {
  if (!pathname || !pathname.startsWith('/jeune')) return []
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: Crumb[] = []
  let acc = ''
  for (const seg of segments) {
    acc += '/' + seg
    const label = isTechnicalId(seg)
      ? GENERIC_ID_LABEL
      : (SEGMENT_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '))
    const href = seg === 'jeune'
      ? JEUNE_HOME_HREF
      : SEGMENTS_SANS_PAGE.has(seg)
        ? null
        : acc
    crumbs.push({ label, href })
  }
  return crumbs.slice(0, 3)
}
