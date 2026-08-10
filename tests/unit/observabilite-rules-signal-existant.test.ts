/**
 * @jest-environment node
 *
 * GUIC-576 — Le fichier `rules.yml` porte lui-même la règle : « ne sont écrites ici que les
 * règles dont le signal existe ». Trouvé en configurant réellement les alertes : la règle
 * `guichet-cron-echecs-repetes` filtre le contenu des logs sur
 * `(?i)(erreur|error|failed|échec)`, mais les scripts ETL (`run-nightly.sh`,
 * `purge-absents-weekly.sh`, via `lib-log.sh`) écrivent « ÉCHOUÉE », « ÉCHOUÉ » et « ÉCART »
 * — trois mots qu'aucun de ces motifs ne matche. Le pipeline ETL durci pendant cette session
 * pouvait donc échouer en silence, sans jamais déclencher d'alerte, malgré Promtail qui
 * étiquette déjà CHAQUE ligne d'échec avec `marqueur="✗"` (le label conçu précisément pour
 * ça, documenté dans promtail.yml : « pour que les règles d'alerte s'y accrochent sans
 * scanner tout le contenu »).
 *
 * Ces tests vérifient que les règles s'appuient sur le label `marqueur`, pas sur une
 * re-détection de contenu qui peut dériver du vocabulaire réel des scripts.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const CHEMIN = join(process.cwd(), 'infra/observabilite/grafana/provisioning/alerting/rules.yml')
const contenu = readFileSync(CHEMIN, 'utf8')

describe('GUIC-576 — rules.yml : alertes appuyées sur le label marqueur, pas un motif de contenu fragile', () => {
  it('la règle des échecs de tâches planifiées interroge le label marqueur="✗", pas une regex de mots', () => {
    const bloc = contenu.split('guichet-cron-echecs-repetes')[1]?.split(/- uid:|groups:/)[0] ?? ''
    expect(bloc).toMatch(/marqueur\s*=\s*"✗"/)
  })

  it('une règle dédiée existe pour un échec ETL (nightly/purge), au niveau alerte', () => {
    expect(contenu).toMatch(/uid:\s*guichet-etl-echec/)
    const bloc = contenu.split('guichet-etl-echec')[1]?.split(/- uid:/)[0] ?? ''
    expect(bloc).toMatch(/severite:\s*alerte/)
    // Filtre sur "[datahub]", le marqueur littéral écrit par scripts/etl/lib-log.sh — pas un
    // mot générique, pour ne pas se déclencher sur un échec de cron applicatif sans rapport.
    expect(bloc).toMatch(/\[datahub\]/)
    expect(bloc).toMatch(/marqueur\s*=\s*"✗"/)
  })
})
