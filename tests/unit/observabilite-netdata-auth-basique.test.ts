/**
 * @jest-environment node
 *
 * GUIC-545 — challenge du 19/08 : Netdata n'avait AUCUNE authentification, uniquement protégé
 * par la topologie réseau (boucle locale + tunnel SSH obligatoire, docker-compose.netdata.yml).
 * C'est un point de défaillance unique — si cette contrainte réseau saute un jour
 * (mauvaise config future, quelqu'un qui ouvre le port par erreur), il n'existe aucune
 * deuxième ligne de défense, contrairement à Grafana qui a toujours eu un vrai login.
 *
 * Netdata supporte l'auth basique nativement (`[web] require authentication` +
 * `htpasswd file`) — pas besoin de proxy inverse. Le fichier .htpasswd lui-même est un secret
 * (hash de mot de passe) : jamais committé, monté depuis le serveur comme les autres secrets
 * de cette pile (GRAFANA_ADMIN_PASSWORD, etc.).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const netdataConf = readFileSync(join(process.cwd(), 'infra/netdata/netdata.conf'), 'utf8')
const compose = readFileSync(join(process.cwd(), 'docker-compose.netdata.yml'), 'utf8')

describe('GUIC-545 — Netdata : authentification basique, pas seulement la topologie réseau', () => {
  it('netdata.conf exige une authentification', () => {
    expect(netdataConf).toMatch(/require authentication\s*=\s*yes/)
  })

  it('netdata.conf pointe vers un fichier htpasswd', () => {
    expect(netdataConf).toMatch(/htpasswd file\s*=\s*\/etc\/netdata\/\.htpasswd/)
  })

  it('docker-compose.netdata.yml monte le fichier .htpasswd en lecture seule, jamais committé', () => {
    // 'netdata:' seul matcherait aussi la sous-chaîne dans l'image netdata/netdata:v2.10.3 —
    // ancrer sur la clé de service, indentée à 2 espaces sous `services:`.
    const bloc = compose.split('\n  netdata:\n')[1]?.split(/^  \S/m)[0] ?? ''
    expect(bloc).toMatch(/\.htpasswd:ro/)
    // Le chemin serveur suit la convention /etc/guichet/* déjà utilisée pour les autres
    // secrets de cette pile (observabilite.env, cloudflared.env) — pas un chemin ad hoc.
    expect(bloc).toMatch(/\/etc\/guichet\/netdata\.htpasswd/)
  })
})
