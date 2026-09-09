// GUIC-706 — Bascule en groupe de cohérence.
//
// Le service refuse déjà de masquer un parent dont un enfant est ouvert, et dit ce qui
// bloque. Il ne dit pas comment faire : sans cascade, l'administrateur devine l'ordre et
// enchaîne les bascules à la main — et c'est ce trajet manuel qui produit les états
// incohérents, parce qu'il peut être interrompu.
//
// Module pur : le graphe suffit, aucune lecture d'état n'est nécessaire pour établir
// l'ordre. C'est ce qui permet au panneau d'annoncer la séquence AVANT de l'appliquer.

import { FEATURE_FLAGS, getFlagDef } from './catalog'

/**
 * Ordre de masquage : les dépendants d'abord, la fonctionnalité demandée en dernier.
 *
 * Masquer un parent avant ses enfants serait refusé par le service — d'où le sens de
 * parcours. Les dépendances indirectes remontent aussi : un petit-enfant se ferme avant
 * l'enfant, qui se ferme avant le parent.
 */
export function cascadeMasquage(key: string): string[] {
  const ordre: string[] = []
  const vus = new Set<string>()

  const visiter = (k: string) => {
    // Un même flag peut être atteint par deux chemins du graphe : le laisser en double
    // basculerait deux fois et fausserait le décompte annoncé à l'administrateur.
    if (vus.has(k) || !getFlagDef(k)) return
    vus.add(k)
    for (const enfant of FEATURE_FLAGS.filter((f) => f.dependsOn.includes(k))) visiter(enfant.key)
    ordre.push(k)
  }

  visiter(key)
  return ordre
}

/**
 * Ordre d'ouverture : les dépendances d'abord, la fonctionnalité demandée en dernier.
 *
 * L'ordre s'inverse, mais surtout **l'ensemble change** — on remonte ici les dépendances,
 * pas les dépendants. Ouvrir un parent n'ouvre donc pas ses enfants : l'administrateur
 * choisit ce qu'il rend disponible, il ne se le voit pas imposer.
 */
export function cascadeOuverture(key: string): string[] {
  const ordre: string[] = []
  const vus = new Set<string>()

  const visiter = (k: string) => {
    if (vus.has(k)) return
    const def = getFlagDef(k)
    if (!def) return
    vus.add(k)
    for (const dep of def.dependsOn) visiter(dep)
    ordre.push(k)
  }

  visiter(key)
  return ordre
}

/** Séquence à appliquer pour amener une fonctionnalité à l'état voulu. */
export function cascade(key: string, enabled: boolean): string[] {
  return enabled ? cascadeOuverture(key) : cascadeMasquage(key)
}
