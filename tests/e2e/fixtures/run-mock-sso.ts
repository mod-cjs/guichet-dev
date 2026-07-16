/**
 * GUIC-604 — Point d'entrée LANÇABLE du serveur SSO mock.
 *
 * `mock-sso.ts` est une bibliothèque (`startMockSsoServer`) ; Playwright a besoin d'une COMMANDE
 * pour démarrer un `webServer`. Ce fichier est cette commande :
 *
 *   npx tsx tests/e2e/fixtures/run-mock-sso.ts
 *
 * Il maintient le process vivant (le serveur HTTP retient la boucle d'événements) et s'arrête
 * proprement sur SIGTERM/SIGINT — Playwright tue le webServer à la fin de la session.
 *
 * Le port est surchargeable (`MOCK_SSO_PORT`) ; défaut 19999, aligné avec `SSO_BASE_URL` de la
 * config Playwright et du job CI.
 */
import { startMockSsoServer } from './mock-sso'

const port = Number(process.env.MOCK_SSO_PORT ?? 19999)

async function main(): Promise<void> {
  const server = await startMockSsoServer(port)
  // eslint-disable-next-line no-console
  console.log(`[mock-sso] prêt sur ${server.url} (sub=${server.claims.sub})`)

  const arret = async (signal: string): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`[mock-sso] arrêt (${signal})`)
    await server.destroy().catch(() => {})
    process.exit(0)
  }
  process.on('SIGTERM', () => void arret('SIGTERM'))
  process.on('SIGINT', () => void arret('SIGINT'))
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[mock-sso] démarrage impossible :', err)
  process.exit(1)
})
