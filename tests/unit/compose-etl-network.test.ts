/**
 * @jest-environment node
 *
 * GUIC-700 — En préprod, Guichet tourne dans un conteneur (`docker-compose.prod.yml` +
 * `docker-compose.test.yml`, projet `guichet-test`), PAS en process direct sur l'hôte
 * comme dans le laboratoire local (GUIC-693). `docker-compose.etl.yml` est un projet
 * Compose séparé, sans réseau partagé : ni `host.docker.internal` (l'app ne publie que
 * `127.0.0.1:8081`, volontairement verrouillé — docker-compose.test.yml, GUIC-641) ni une
 * adresse de conteneur de l'autre projet ne sont joignables depuis `meltano` sans rejoindre
 * le même réseau Docker que l'app — exactement le piège déjà documenté pour MariaDB/MinIO
 * dans docker-compose.prod.yml (F2, GUIC-564).
 *
 * Sentinelle : le service `meltano` doit rejoindre le réseau externe partagé
 * (`services_partages` / `cjs-net`, déjà utilisé par `docker-compose.prod.yml` pour les
 * mêmes raisons) plutôt que de s'appuyer sur le loopback de l'hôte.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const CHEMIN = join(process.cwd(), 'docker-compose.etl.yml')
const contenu = existsSync(CHEMIN) ? readFileSync(CHEMIN, 'utf8') : ''
const utile = contenu
  .split('\n')
  .map((l) => l.replace(/#.*$/, ''))
  .filter((l) => l.trim())
  .join('\n')

describe('GUIC-700 — docker-compose.etl.yml : joignabilité de Guichet conteneurisé', () => {
  it('existe', () => {
    expect(existsSync(CHEMIN)).toBe(true)
  })

  it('déclare un réseau externe partagé avec l\'app Guichet', () => {
    expect(utile).toMatch(/networks:\s*\n\s*services_partages:\s*\n\s*external:\s*true/)
  })

  it('attache le service meltano à ce réseau', () => {
    const serviceMeltano = utile.split(/^networks:/m)[0]
    expect(serviceMeltano).toMatch(/networks:\s*\n\s*-\s*services_partages/)
  })

  it("ne s'appuie pas sur host.docker.internal pour joindre Guichet — verrouillé en loopback côté app (GUIC-641)", () => {
    expect(utile).not.toMatch(/host\.docker\.internal/)
  })
})
