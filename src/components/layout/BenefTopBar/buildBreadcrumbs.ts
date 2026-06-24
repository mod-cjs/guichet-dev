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
  href: string
}

/** Cible réelle de la racine `/jeune` (qui n'a pas de page propre) — GUIC-446. */
const JEUNE_HOME_HREF = '/jeune/tableau-de-bord'

/**
 * Construit un fil d'Ariane à partir du pathname. Limité à 3 niveaux pour rester
 * lisible. Renvoie [] si pathname ne correspond pas à l'app jeune.
 *
 * Le crumb racine « Mon espace » pointe vers `/jeune/tableau-de-bord` et non
 * `/jeune` (qui n'a pas de page → 404) — GUIC-446.
 */
export function buildBreadcrumbs(pathname: string | null): Crumb[] {
  if (!pathname || !pathname.startsWith('/jeune')) return []
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: Crumb[] = []
  let acc = ''
  for (const seg of segments) {
    acc += '/' + seg
    const label = SEGMENT_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')
    const href = seg === 'jeune' ? JEUNE_HOME_HREF : acc
    crumbs.push({ label, href })
  }
  return crumbs.slice(0, 3)
}
