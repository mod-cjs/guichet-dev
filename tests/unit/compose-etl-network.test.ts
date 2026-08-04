/**
 * @jest-environment node
 *
 * GUIC-700 — Joignabilité de Guichet conteneurisé depuis meltano, tranchée : SÉPARATION,
 * pas cohabitation réseau.
 *
 * `etl/meltano.yml` fixe déjà `api_url: https://guichet.cjs.sn` par défaut — un domaine
 * PUBLIC. Le Data Hub (`/api/v1/export/`) est une route machine-à-machine de la même
 * famille que BRM/Centres/Moodle/EduPop (CLAUDE.md), pensée pour être appelée de
 * l'extérieur (clé API, rate limiting par consommateur) — jamais par réseau Docker interne.
 *
 * Un premier correctif (rejoindre `services_partages`/`cjs-net`, même remède que F2
 * MariaDB/MinIO) a été écrit puis annulé : il ne fonctionne que si l'app et l'ETL
 * cohabitent sur LE MÊME hôte (pas encore décidé), couple `docker-compose.etl.yml` aux
 * fichiers compose M14 protégés par sentinelle, et donne à `meltano` une portée réseau
 * vers redis_cjs/neo4j-cjs/MinIO dont il n'a aucun usage. La séparation (URL publique
 * HTTPS, comme n'importe quel autre consommateur machine) n'a besoin d'aucun de ces
 * compromis et fonctionne quel que soit l'hôte de l'ETL.
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

describe('GUIC-700 — joignabilité de Guichet : séparation par URL publique, pas cohabitation réseau', () => {
  it('docker-compose.etl.yml ne rejoint AUCUN réseau interne de l\'app (isolation, moindre privilège)', () => {
    expect(composeUtile).not.toMatch(/services_partages/)
    expect(composeUtile).not.toMatch(/cjs-net/)
    expect(composeUtile).not.toMatch(/^\s*networks:/m)
  })

  it("ne s'appuie pas sur host.docker.internal — l'app est verrouillée en loopback (GUIC-641), inatteignable ainsi de toute façon", () => {
    expect(composeUtile).not.toMatch(/host\.docker\.internal/)
  })

  it('etl/meltano.yml pointe par défaut une URL PUBLIQUE HTTPS, pas une adresse interne', () => {
    expect(meltanoContenu).toMatch(/api_url:\s*https:\/\//)
  })
})
