/**
 * GUIC-689 — Mémoire courte de l'intention « mettre en favori ».
 *
 * Un jeune non connecté qui clique sur le favori d'une ressource est envoyé au
 * SSO. Sans mémoire, il revient les mains vides : la ressource n'est pas en
 * favori, et le bouton passe pour cassé. On garde donc son intention le temps
 * de l'aller-retour.
 *
 * Pourquoi `sessionStorage` et pas l'URL ?
 *   Une intention portée par l'URL (`/ressources/<id>?favori=1`) est forgeable :
 *   n'importe quel lien écrirait alors dans le compte de quiconque le suit en
 *   étant connecté. `sessionStorage` est propre à l'onglet, inaccessible depuis
 *   un lien entrant, et survit à l'aller-retour SSO puisque l'origine ne change
 *   pas au retour.
 *
 * L'intention est à usage unique : elle est effacée à la lecture, qu'elle soit
 * rejouée ou écartée. Une intention qui survit à son rejeu se rejouerait à
 * chaque montage — et comme l'API est un toggle, elle retirerait le favori
 * qu'elle venait de poser.
 */

const CLE = 'gj:favori-ressource'

/** Retient la ressource visée, juste avant de partir vers la connexion. */
export function memoriserIntentionFavori(ressourceId: string): void {
  try {
    sessionStorage.setItem(CLE, ressourceId)
  } catch {
    // Navigation privée, quota, stockage désactivé : on perd l'intention, pas
    // le parcours. L'utilisateur recliquera au retour.
  }
}

/** Lit ET consomme l'intention. Retourne `null` s'il n'y en a pas. */
export function consommerIntentionFavori(): string | null {
  try {
    const valeur = sessionStorage.getItem(CLE)
    if (valeur) sessionStorage.removeItem(CLE)
    return valeur
  } catch {
    return null
  }
}

/**
 * Construit la cible de connexion en portant le chemin courant comme retour.
 * La validation reste côté serveur (`safeReturnTo`) : ici on ne fait que
 * transmettre.
 */
export function lienConnexionAvecRetour(chemin: string): string {
  return `/auth/connexion?next=${encodeURIComponent(chemin)}`
}
