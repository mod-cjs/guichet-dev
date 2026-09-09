// Déclencheurs de synchronisation du Knowledge Graph, à appeler depuis les Route
// Handlers métier (candidature, profil, favoris, inscriptions…).
//
// Pourquoi ce module minuscule : il n'importe RIEN au chargement (ni Prisma, ni le
// driver Neo4j, ni le projecteur). Le pipeline n'est chargé qu'au moment du déclenchement,
// en arrière-plan — un Route Handler qui n'écrit pas dans le graphe n'en paie pas le coût.
//
// ⚠️ Invariant : FAIL-SOFT total. La source de vérité reste Prisma/MariaDB ; un échec de
// projection ne doit jamais faire échouer l'écriture métier ni ajouter de la latence.

/**
 * Rafraîchit le sous-graphe d'un bénéficiaire (candidatures, compétences, favoris,
 * parcours, inscriptions) après une écriture qui le concerne. Fire-and-forget.
 */
export function fireBeneficiaireGraphSync(cjsUid: string | null | undefined): void {
  if (!cjsUid) return
  void import('./projection/project')
    .then(m => m.syncBeneficiaireToGraph(cjsUid))
    .catch(() => { /* fail-soft : le read-model sera réparé par la reprojection nocturne */ })
}
