// GUIC-564 — Vérifications au démarrage de l'application.
//
// Next appelle `register()` une fois, au boot du serveur. C'est le seul endroit où l'on peut
// refuser de démarrer sur une configuration dangereuse — plutôt que de servir des requêtes avec
// une porte d'authentification ouverte et de s'en apercevoir trop tard.
//
// (GUIC-578 étendra ce fichier avec le hook `onRequestError` — capture centrale des erreurs.)

import { assertConfigurationProduction } from '@/lib/security/prod-guards'

export function register(): void {
  // Lève si la connexion sans SSO est activable alors que l'URL publique n'est pas locale.
  assertConfigurationProduction(process.env)
}
