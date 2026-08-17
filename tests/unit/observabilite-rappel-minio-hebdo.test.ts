/**
 * @jest-environment node
 *
 * GUIC-571 — Sauvegarde MinIO mise en pause (2026-08-17) : la clé applicative S3 est refusée
 * (Access Denied côté MinIO, à investiguer plus tard) et aucun stockage externe n'est encore
 * choisi. Décision : arrêter d'essayer chaque nuit (`backup.sh` skip déjà proprement quand
 * S3_ENDPOINT/S3_BUCKET sont absents — code existant, pas de changement requis là), mais ne pas
 * laisser cette pause disparaître des radars. Un rappel hebdomadaire, pas une alerte nocturne :
 * c'est une décision assumée, pas une panne — la réveiller chaque nuit créerait exactement la
 * fatigue d'alerte que rules.yml met en garde contre depuis le début.
 *
 * Nécessite une troisième cadence de notification (`severite = rappel`, repeat_interval 7j),
 * distincte d'alerte (1h) et avertissement (12h) déjà en place.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const rules = readFileSync(
  join(process.cwd(), 'infra/observabilite/grafana/provisioning/alerting/rules.yml'),
  'utf8',
)
const politiques = readFileSync(
  join(process.cwd(), 'infra/observabilite/grafana/provisioning/alerting/notification-policies.yml'),
  'utf8',
)

describe('GUIC-571 — rappel hebdomadaire : sauvegarde MinIO en pause', () => {
  it('une règle dédiée détecte le message de pause MinIO, au niveau rappel', () => {
    expect(rules).toMatch(/uid:\s*guichet-minio-pause-rappel/)
    const bloc = rules.split('guichet-minio-pause-rappel')[1]?.split(/- uid:|^  - orgId:/m)[0] ?? ''
    expect(bloc).toMatch(/severite:\s*rappel/)
    // Le message exact déjà loggé par backup.sh quand S3_ENDPOINT/S3_BUCKET sont absents —
    // code existant, pas un nouveau marqueur à inventer.
    expect(bloc).toMatch(/MinIO non configur/)
  })

  it('la politique de notification route "rappel" avec une cadence hebdomadaire, distincte d\'alerte/avertissement', () => {
    const bloc = politiques.split('severite = rappel')[1]?.split(/matchers:/)[0] ?? ''
    expect(bloc).toMatch(/repeat_interval:\s*168h/)
  })
})
