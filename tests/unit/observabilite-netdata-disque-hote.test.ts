/**
 * @jest-environment node
 *
 * GUIC-710 — Signalé par l'utilisateur : l'alerte guichet-disque-alerte (>90% sur /) continue
 * d'être envoyée. Vérifié sur le serveur : `df -h /` → /dev/md3, 3.7T, 5% utilisé. Le vrai
 * disque hôte va bien.
 *
 * Cause racine (confirmée via la doc officielle Netdata) : docker-compose.netdata.yml monte
 * /proc, /sys, /etc/os-release, /etc/passwd, /etc/group depuis l'hôte, mais PAS
 * /:/host/root:ro,rslave — le seul mount nécessaire pour que diskspace.plugin voie les VRAIS
 * points de montage de l'hôte. Sans lui, Netdata rapporte l'utilisation de sa PROPRE couche
 * overlay de conteneur (minuscule) sous le label mount_point="/", pas /dev/md3. L'alerte lit
 * une vraie métrique, juste la mauvaise — pas un état Grafana bloqué comme l'incident mémoire
 * précédent.
 *
 * https://learn.netdata.cloud/docs/netdata-agent/installation/docker
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const compose = readFileSync(join(process.cwd(), 'docker-compose.netdata.yml'), 'utf8')

describe('GUIC-710 — Netdata : le collecteur disque doit voir le VRAI système de fichiers hôte', () => {
  it('monte la racine hôte en lecture seule avec propagation rslave, pas la vue isolée du conteneur', () => {
    // 'netdata:' seul matcherait aussi la sous-chaîne dans l'image netdata/netdata:v2.10.3 —
    // ancrer sur la clé de service, indentée à 2 espaces sous `services:` (même convention
    // que le test auth basique GUIC-545).
    const bloc = compose.split('\n  netdata:\n')[1]?.split(/^  \S/m)[0] ?? ''
    expect(bloc).toMatch(/-\s*\/:\/host\/root:ro,rslave/)
  })
})
