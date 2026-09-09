/**
 * @jest-environment node
 *
 * GUIC-707 — Trouvé en poussant GUIC-625 : le hook pre-push a échoué deux fois de suite sur
 * deux tests d'intégration DIFFÉRENTS et sans rapport (curation-pipeline-e2e /
 * api-cron-veille-sources, puis admin-ressources-actions), à chaque fois avec des symptômes de
 * course sur base partagée (deadlock MariaDB, violation FK, count() pollué).
 *
 * Cause : tests/setup.ts pointe TOUS les workers Jest vers le même DATABASE_URL réel ;
 * maxWorkers: '50%' (jest.config.ts, GUIC-538) laisse plusieurs suites de tests/integration/
 * créer/supprimer des lignes dans les mêmes tables en même temps. Vérifié : les 132 suites
 * d'intégration passent à 100% en --runInBand (21s, coût négligeable) — la course, pas le
 * code testé, causait les échecs.
 *
 * Correctif : npm run test devient deux passes — tout sauf tests/integration/ reste parallèle
 * (rapide, pas de dépendance partagée), tests/integration/ tourne en série.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const R = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('npm run test — isolation des tests d’intégration sous parallélisme', () => {
  it('le script "test" de package.json délègue à scripts/test/run-all.sh, plus un jest direct', () => {
    const pkg = JSON.parse(R('package.json'))
    expect(pkg.scripts.test).toMatch(/scripts\/test\/run-all\.sh/)
  })

  it('la première passe EXCLUT tests/integration/ et reste parallèle (pas de --runInBand)', () => {
    const script = R('scripts/test/run-all.sh')
    const passes = script.split(/^npx jest/m).slice(1).map((s) => 'npx jest' + s)
    expect(passes.length).toBeGreaterThanOrEqual(2)
    const premiere = passes[0]
    expect(premiere).toMatch(/testPathIgnorePatterns.*tests\/integration/)
    expect(premiere).not.toMatch(/--runInBand/)
  })

  it('la seconde passe cible UNIQUEMENT tests/integration/ et tourne en série (--runInBand)', () => {
    const script = R('scripts/test/run-all.sh')
    const passes = script.split(/^npx jest/m).slice(1).map((s) => 'npx jest' + s)
    const seconde = passes[1]
    expect(seconde).toMatch(/testPathPattern.*tests\/integration/)
    expect(seconde).toMatch(/--runInBand/)
  })

  it('les deux passes transmettent les arguments reçus (ex. --no-coverage, un chemin de test)', () => {
    const script = R('scripts/test/run-all.sh')
    const occurrences = script.match(/"\$@"/g) ?? []
    expect(occurrences.length).toBeGreaterThanOrEqual(2)
  })

  it('un échec de la première passe interrompt le script (set -e) — jamais un GREEN qui cache un ROUGE', () => {
    const script = R('scripts/test/run-all.sh')
    expect(script).toMatch(/set -e/)
  })
})
