/**
 * @jest-environment node
 *
 * GUIC-564 — Sentinelle : le compose de PRODUCTION ne peut pas réintroduire les défauts
 * du compose de développement, qui est aujourd'hui celui que le CD déploierait :
 *   - ALLOW_DEV_LOGIN=true            → connexion sans SSO ouverte en production
 *   - DATABASE_URL vers `yaye_poc_*`  → jeu de données POC au lieu de la vraie base
 *   - ports publiés sur 0.0.0.0       → Redis / Neo4j / MariaDB exposés à Internet
 *   - mots de passe en dur            → secrets dans le dépôt
 *   - aucune limite de ressources     → un Guichet emballé emporte le SSO, donc le BRM
 *
 * Sur ce serveur, les bases sont fournies par l'hôte (MariaDB Plesk, redis_cjs, neo4j-cjs,
 * MinIO) : le compose de production ne déclare donc QUE l'application.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const CHEMIN = join(process.cwd(), 'docker-compose.prod.yml')

describe('GUIC-564 — compose de production', () => {
  it('existe', () => {
    expect(existsSync(CHEMIN)).toBe(true)
  })

  const contenu = existsSync(CHEMIN) ? readFileSync(CHEMIN, 'utf8') : ''
  /** Lignes utiles (les commentaires expliquent justement ce qui est interdit). */
  const lignes = contenu
    .split('\n')
    .map((l) => l.replace(/#.*$/, ''))
    .filter((l) => l.trim())
  const utile = lignes.join('\n')

  it("n'active JAMAIS la connexion sans SSO", () => {
    expect(utile).not.toMatch(/ALLOW_DEV_LOGIN/)
  })

  it('déclare explicitement APP_ENV=production', () => {
    expect(utile).toMatch(/APP_ENV:\s*["']?production["']?/)
  })

  it('ne pointe aucun jeu de données POC', () => {
    expect(utile).not.toMatch(/yaye_poc/)
  })

  it('ne publie AUCUN port (l’app vit derrière le proxy, sur la boucle locale)', () => {
    // Un port publié se déclare via `ports:` — interdit ici. `expose:` reste acceptable.
    expect(utile).not.toMatch(/^\s*ports:/m)
  })

  it("ne contient aucun mot de passe en dur", () => {
    expect(utile).not.toMatch(/guichet_dev_password|MARIADB_ROOT_PASSWORD|yaye_dev_password/)
  })

  it('plafonne les ressources (serveur mutualisé avec le SSO et le BRM)', () => {
    expect(utile).toMatch(/limits:/)
    expect(utile).toMatch(/memory:/)
    expect(utile).toMatch(/cpus:/)
  })

  it('borne les logs (sinon le disque finit saturé)', () => {
    expect(utile).toMatch(/logging:/)
    expect(utile).toMatch(/max-size/)
  })

  it('surveille la santé du conteneur', () => {
    expect(utile).toMatch(/healthcheck:/)
    expect(utile).toMatch(/api\/health/)
  })

  it('ne déclare aucune base : elles sont fournies par le serveur', () => {
    expect(utile).not.toMatch(/image:\s*mariadb/)
    expect(utile).not.toMatch(/image:\s*redis/)
    expect(utile).not.toMatch(/image:\s*neo4j/)
  })
})
