/**
 * GUIC-689 — Traduction des objectifs d'onboarding vers le profil.
 *
 * L'ancien mapping forçait les cinq objectifs dans `domainesInteret`, un champ
 * de SECTEURS. C'était une erreur de modélisation : « trouver un emploi »,
 * « me former », « m'engager » sont des INTENTIONS. Elle coûtait deux fois —
 *
 *  - « emploi » n'avait aucun secteur correspondant, donc retournait `null` et
 *    la sélection disparaissait en silence. Sur une plateforme jeunesse-emploi,
 *    c'est probablement le choix le plus fréquent.
 *  - trois valeurs produites étaient absentes de `DOMAINES_INTERET`
 *    (« Education » sans accent, « Citoyennete », « Entrepreneuriat ») : elles
 *    ne correspondaient à aucune puce du formulaire de profil, donc le jeune ne
 *    les voyait pas cochées et elles se perdaient à sa première sauvegarde.
 *
 * `typesRecherches` accueille désormais l'intention, `domainesInteret` le
 * secteur. Un seul objectif de la liste EST un secteur : l'agriculture.
 *
 * Les libellés montrés au jeune guident la traduction : « Trouver un emploi ou
 * un stage » produit les deux types, « Lancer mon projet — financements &
 * accompagnement » produit entrepreneuriat ET financement.
 */
export interface CibleObjectif {
  domaines: string[]
  types: string[]
}

const TABLE: Record<string, CibleObjectif> = {
  emploi:      { domaines: [],              types: ['emploi', 'stage'] },
  projet:      { domaines: [],              types: ['entrepreneuriat', 'financement'] },
  formation:   { domaines: [],              types: ['formation'] },
  engagement:  { domaines: [],              types: ['volontariat'] },
  agriculture: { domaines: ['Agriculture'], types: [] },
}

/** Rien pour un identifiant inconnu — on n'invente pas de rattachement. */
export function mapObjectif(o: string): CibleObjectif {
  const cible = TABLE[o]
  return cible ? { domaines: [...cible.domaines], types: [...cible.types] } : { domaines: [], types: [] }
}

/** Agrège plusieurs objectifs en dédoublonnant. */
export function mapObjectifs(objectifs: string[]): CibleObjectif {
  const domaines = new Set<string>()
  const types = new Set<string>()
  for (const o of objectifs) {
    const c = mapObjectif(o)
    c.domaines.forEach((d) => domaines.add(d))
    c.types.forEach((t) => types.add(t))
  }
  return { domaines: [...domaines], types: [...types] }
}
