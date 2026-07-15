// GUIC-564 — Garde-fous de production.
//
// `/api/dev/login` pose une session `cjs_session` SANS passer par le SSO. C'est un outil de
// développement légitime, et une porte dérobée d'authentification si elle atteint la production.
//
// La garde précédente (`NODE_ENV === 'production' && ALLOW_DEV_LOGIN !== 'true'`) reposait sur
// une espérance — « en prod réelle, ce flag n'est jamais positionné ». Or le docker-compose de
// développement le positionne, et c'est ce compose que le CD déploierait.
//
// Ici, on ne fait plus confiance à une variable isolée : la connexion sans SSO exige DEUX
// variables explicites, et le démarrage est refusé si elle est activable sur une URL publique.

/** Sous-ensemble d'environnement lu par les gardes (injectable → testable). */
export type EnvGarde = {
  NODE_ENV?: string
  APP_ENV?: string
  ALLOW_DEV_LOGIN?: string
  NEXTAUTH_URL?: string
}

/** Hôtes considérés comme locaux : hors de ceux-là, on est exposé. */
const HOTES_LOCAUX = ['localhost', '127.0.0.1', '0.0.0.0', 'host.docker.internal', '[::1]']

/** L'URL publique de l'application désigne-t-elle un poste local ? */
export function urlLocale(url: string | undefined): boolean {
  if (!url) return false
  try {
    return HOTES_LOCAUX.includes(new URL(url).hostname)
  } catch {
    return false
  }
}

/**
 * La connexion sans SSO est-elle autorisée ?
 *
 *  - hors production → oui (développement classique) ;
 *  - en production   → seulement si l'opérateur a DÉLIBÉRÉMENT posé `APP_ENV=local` ET
 *                      `ALLOW_DEV_LOGIN=true` (cas d'une image de prod lancée sur un poste
 *                      de dev). Un seul des deux ne suffit pas.
 *
 * Sûr par défaut : toute configuration de production incomplète ou ambiguë refuse.
 */
export function devLoginAutorise(env: EnvGarde): boolean {
  if (env.NODE_ENV !== 'production') return true
  return env.APP_ENV === 'local' && env.ALLOW_DEV_LOGIN === 'true'
}

/**
 * Vérification au DÉMARRAGE : refuse de lancer l'application si la connexion sans SSO est
 * activable alors que l'URL publique n'est pas locale.
 *
 * C'est le filet qui attrape le scénario redouté — « on a déployé le compose de développement
 * sur le serveur » : les deux variables y sont bien présentes, mais `NEXTAUTH_URL` pointe le
 * domaine public. Mieux vaut un service qui refuse de démarrer bruyamment qu'un service qui
 * démarre en laissant sa porte d'authentification ouverte.
 *
 * @throws Error si la configuration exposerait la connexion sans SSO sur une URL publique.
 */
export function assertConfigurationProduction(env: EnvGarde): void {
  if (!devLoginAutorise(env)) return
  if (env.NODE_ENV !== 'production') return
  if (urlLocale(env.NEXTAUTH_URL)) return

  throw new Error(
    'Configuration refusée : la connexion sans SSO (/api/dev/login) est activable ' +
      `(APP_ENV=${env.APP_ENV}, ALLOW_DEV_LOGIN=${env.ALLOW_DEV_LOGIN}) alors que l'URL publique ` +
      `« ${env.NEXTAUTH_URL} » n'est pas locale. Retirer APP_ENV=local et ALLOW_DEV_LOGIN, ` +
      'ou déployer le compose de production (docker-compose.prod.yml).',
  )
}
