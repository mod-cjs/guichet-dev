// GUIC-706 — la part de la navigation publique qui a le droit d'atteindre le navigateur.
//
// Séparée de `nav-liens.ts` À DESSEIN. Le composant client a besoin de deux choses : la
// règle « ce lien est-il actif ? », qui dépend du chemin courant donc du client, et les
// liens partenaires, hors périmètre des flags par décision produit. Il n'a PAS besoin des
// listes pilotées par le catalogue — et importer le module qui les contient les embarquerait
// dans le bundle, où un lecteur les comparerait au rendu pour déduire ce qui est caché.
//
// On ne s'en remet pas au tree-shaking pour cette garantie : elle est structurelle.

export interface LienNav {
  href: string
  label: string
  /** Actif sur le chemin EXACT plutôt que sur le préfixe (le lien « Accueil »). */
  exact?: boolean
}

/**
 * Plateformes partenaires — hors périmètre des flags par décision produit : ce sont
 * d'autres plateformes, que le catalogue du Guichet ne pilote pas.
 */
export const LIENS_EXTERNES: readonly { href: string; label: string }[] = [
  { href: 'https://yeah.consortiumjeunessesenegal.org', label: 'YEAH' },
  { href: 'https://elearning.guichetjeunesse.sn', label: 'E-learning' },
]

/** Actif ? Règle unique, appliquée côté client où le chemin courant est connu. */
export function lienActif(lien: LienNav, pathname: string): boolean {
  return lien.exact ? pathname === lien.href : pathname.startsWith(lien.href)
}
