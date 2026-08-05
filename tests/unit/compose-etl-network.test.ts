/**
 * @jest-environment node
 *
 * GUIC-700 — Joignabilité de Guichet ET de l'entrepôt PostgreSQL depuis meltano : deux
 * décisions DIFFÉRENTES, pas la même réponse pour les deux.
 *
 * Guichet (l'app) : SÉPARATION, par URL publique HTTPS (`etl/meltano.yml` fixe déjà
 * `api_url: https://guichet.cjs.sn` par défaut) — le Data Hub est une route
 * machine-à-machine pensée pour être appelée de l'extérieur, comme BRM/Centres/Moodle/
 * EduPop. Jamais `host.docker.internal` (l'app est verrouillée en loopback, GUIC-641).
 *
 * L'entrepôt PostgreSQL : COHABITATION réseau, cette fois justifiée — contrairement à
 * l'app, il n'a PAS d'URL publique alternative. Trouvé en tentant le premier run réel en
 * préprod : `cjs_analytics_postgres` est un conteneur (stack `cjs_analytics_*` : Superset,
 * pgAdmin, Postgres, déjà provisionnée par l'infra), sur le réseau `cjs-net` — le MÊME
 * réseau externe déjà utilisé par `docker-compose.prod.yml` pour MariaDB/MinIO. `meltano`
 * doit le rejoindre pour résoudre `cjs_analytics_postgres` (`Name or service not known`
 * sinon — testé en réel, pas supposé).
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const CHEMIN_COMPOSE = join(process.cwd(), 'docker-compose.etl.yml')
const composeContenu = existsSync(CHEMIN_COMPOSE) ? readFileSync(CHEMIN_COMPOSE, 'utf8') : ''
const composeUtile = composeContenu
  .split('\n')
  .map((l) => l.replace(/#.*$/, ''))
  .filter((l) => l.trim())
  .join('\n')

const CHEMIN_MELTANO = join(process.cwd(), 'etl/meltano.yml')
const meltanoContenu = existsSync(CHEMIN_MELTANO) ? readFileSync(CHEMIN_MELTANO, 'utf8') : ''

describe('GUIC-700 — joignabilité Guichet (séparation) vs entrepôt (cohabitation réseau)', () => {
  it('rejoint le réseau externe cjs-net — pour joindre l\'entrepôt PostgreSQL, pas pour joindre Guichet', () => {
    expect(composeUtile).toMatch(/networks:\s*\n\s*-\s*cjs-net/)
    expect(composeUtile).toMatch(/networks:\s*\n\s*cjs-net:\s*\n\s*external:\s*true/)
  })

  it("ne s'appuie pas sur host.docker.internal — l'app Guichet est verrouillée en loopback (GUIC-641), inatteignable ainsi de toute façon", () => {
    expect(composeUtile).not.toMatch(/host\.docker\.internal/)
  })

  it('etl/meltano.yml pointe par défaut une URL PUBLIQUE HTTPS pour Guichet, pas une adresse interne', () => {
    expect(meltanoContenu).toMatch(/api_url:\s*https:\/\//)
  })
})
