/**
 * @jest-environment node
 *
 * GUIC-714 — Trouvé en réel (20/08) après GUIC-712 : les 4 règles machine (disque + mémoire,
 * alerte + avertissement) étaient TOUTES en `DatasourceError`, alors que Prometheus renvoyait
 * la bonne donnée quand on l'interrogeait depuis le serveur (127.0.0.1:9090). Cause : Prometheus
 * (`--web.listen-address=127.0.0.1:9090`) n'écoute QUE la boucle locale — un socket lié à
 * 127.0.0.1 n'accepte aucune connexion arrivant par une autre interface, même depuis la même
 * machine. Grafana, sur le réseau bridge `observabilite`, joint Prometheus via
 * `host.docker.internal` (l'IP de la passerelle du pont) — jamais 127.0.0.1 depuis son point de
 * vue. Cette connexion a donc probablement toujours été cassée depuis l'écriture initiale de la
 * règle (GUIC-545), malgré la vérification documentée du 17/08 (qui n'a probablement pas
 * exercé ce chemin réseau précis).
 *
 * Correctif : écouter sur toutes les interfaces (0.0.0.0). Le pare-feu serveur (INPUT, policy
 * DROP, aucune règle pour 9090) empêche déjà toute exposition publique par défaut — une règle
 * scopée au sous-réseau Docker `observabilite` est ajoutée séparément (hors dépôt, iptables
 * manuel, voir docs/netdata.md).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const compose = readFileSync(join(process.cwd(), 'docker-compose.netdata.yml'), 'utf8')

describe('GUIC-714 — Prometheus doit être joignable depuis le réseau bridge de Grafana', () => {
  it('écoute sur toutes les interfaces, pas seulement la boucle locale', () => {
    // 'prometheus:' ancré sur la clé de service (2 espaces sous services:), même convention
    // que les tests netdata — évite de matcher une sous-chaîne dans un commentaire/image.
    const bloc = compose.split('\n  prometheus:\n')[1]?.split(/^  \S/m)[0] ?? ''
    expect(bloc).toMatch(/--web\.listen-address=0\.0\.0\.0:9090/)
    expect(bloc).not.toMatch(/--web\.listen-address=127\.0\.0\.1:9090/)
  })
})
