/**
 * @jest-environment node
 *
 * GUIC-697 — Orchestration nightly du pipeline ETL (lot 5, exploitabilité).
 *
 * Le mode opératoire documenté (docs/datahub-briefing-etl.md §10) était une ligne
 * crontab isolée qui ne lançait QUE l'extraction. `run-nightly.sh` chaîne les trois
 * étapes. Ces tests shimment `docker` pour vérifier que l'ENCHAÎNEMENT est correct —
 * tout-ou-rien assumé (spec §4.1 B5) : une étape en échec arrête tout, bruyamment
 * (marqueur ✗, code de sortie non nul).
 *
 * GUIC-700 — la réconciliation (3e étape) est passée de `npm run` nu sur l'hôte à
 * `docker compose run --rm --no-deps app` (voir scripts/etl/lib-app-exec.sh) : trouvé au
 * premier run réel en préprod, `DATABASE_URL` pointe un nom de conteneur
 * (`mariadb-test`), jamais résoluble hors du réseau Docker de l'app.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, chmodSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()

/**
 * Shim `docker`. Distingue `run tap-guichet target-postgres` (extraction) de
 * `invoke dbt-postgres build` (transformation+tests) et de `compose ... run --rm --no-deps
 * ... app ...` (réconciliation, GUIC-700) par le contenu des arguments.
 */
const DOCKER_SHIM = `#!/usr/bin/env bash
echo "docker $*" >> "$CALL_LOG"
case "$*" in
  *"tap-guichet target-postgres"*)
    [ -n "$FAIL_MELTANO" ] && { echo "extraction error" >&2; exit 1; }
    echo "extraction ok"; exit 0 ;;
  *"dbt-postgres build"*)
    [ -n "$FAIL_DBT" ] && { echo "dbt build error" >&2; exit 1; }
    echo "dbt ok"; exit 0 ;;
  *"reconcile.ts"*)
    [ -n "$FAIL_RECONCILE" ] && { echo "réconciliation en écart" >&2; exit 1; }
    echo "reconcile ok"; exit 0 ;;
esac
exit 0
`

interface RunResult { code: number; calls: string; log: string; logDir: string }

function run(env: Record<string, string> = {}): RunResult {
  const sandbox = mkdtempSync(join(tmpdir(), 'guic-nightly-'))
  const bin = join(sandbox, 'bin')
  mkdirSync(bin)
  writeFileSync(join(bin, 'docker'), DOCKER_SHIM)
  chmodSync(join(bin, 'docker'), 0o755)

  const envFile = join(sandbox, '.env.etl')
  writeFileSync(envFile, 'TAP_GUICHET_API_URL=http://localhost\n')

  const logDir = join(sandbox, 'log')
  const callLog = join(sandbox, 'calls.log')
  writeFileSync(callLog, '')

  let code = 0
  try {
    execFileSync('bash', [join(ROOT, 'scripts/etl/run-nightly.sh')], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        CALL_LOG: callLog,
        GUICHET_ETL_ENV_FILE: envFile,
        DATAHUB_LOG_FILE: join(logDir, 'datahub-nightly.log'),
        GUICHET_IMAGE: 'ghcr.io/x/guichet@sha256:abc',
        COMPOSE_PROJECT_NAME: 'guichet-test',
        GUICHET_ENV_FILE: '/etc/guichet/test.env',
        ...env,
      },
    })
  } catch (e) {
    const err = e as { status?: number }
    code = err.status ?? 1
  }

  const logPath = join(logDir, 'datahub-nightly.log')
  const log = existsSync(logPath) ? readFileSync(logPath, 'utf8') : ''
  return { code, calls: readFileSync(callLog, 'utf8'), log, logDir }
}

describe('GUIC-697 — run-nightly.sh : enchaînement tout-ou-rien', () => {
  it('exécute les trois étapes dans l\'ordre et rend 0 quand tout passe', () => {
    const r = run()
    expect(r.code).toBe(0)
    expect(r.calls).toMatch(/tap-guichet target-postgres/)
    expect(r.calls).toMatch(/dbt-postgres build/)
    expect(r.calls).toMatch(/reconcile\.ts/)
    // L'ordre est celui qui compte : dbt et la réconciliation supposent une extraction
    // déjà faite.
    const posExtraction = r.calls.indexOf('tap-guichet')
    const posDbt = r.calls.indexOf('dbt-postgres')
    const posReconcile = r.calls.indexOf('reconcile.ts')
    expect(posExtraction).toBeLessThan(posDbt)
    expect(posDbt).toBeLessThan(posReconcile)
    expect(r.log).toMatch(/✅ run complet/)
  })

  it('arrête tout si l\'extraction échoue — dbt et la réconciliation ne sont JAMAIS appelés', () => {
    const r = run({ FAIL_MELTANO: '1' })
    expect(r.code).not.toBe(0)
    expect(r.calls).toMatch(/tap-guichet/)
    expect(r.calls).not.toMatch(/dbt-postgres/)
    expect(r.calls).not.toMatch(/reconcile\.ts/)
    expect(r.log).toMatch(/✗.*extraction/)
  })

  it('arrête tout si dbt build échoue — la réconciliation n\'est JAMAIS appelée', () => {
    const r = run({ FAIL_DBT: '1' })
    expect(r.code).not.toBe(0)
    expect(r.calls).toMatch(/dbt-postgres/)
    expect(r.calls).not.toMatch(/reconcile\.ts/)
    expect(r.log).toMatch(/✗.*dbt/)
  })

  it('rend un code non nul quand la réconciliation signale un écart', () => {
    const r = run({ FAIL_RECONCILE: '1' })
    expect(r.code).not.toBe(0)
    expect(r.log).toMatch(/✗.*réconciliation/)
  })

  it('la réconciliation passe par le conteneur app (GUIC-700), jamais nue sur l\'hôte', () => {
    const r = run()
    expect(r.calls).toMatch(/compose.*run.*--rm.*--no-deps/)
    expect(r.calls).toMatch(/docker\.sock/)
  })

  it('rotation : un log existant au-delà du seuil est archivé avant le run, pas après', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'guic-nightly-rot-'))
    const logDir = join(sandbox, 'log')
    mkdirSync(logDir, { recursive: true })
    const logPath = join(logDir, 'datahub-nightly.log')
    writeFileSync(logPath, 'x'.repeat(2000))

    const bin = join(sandbox, 'bin')
    mkdirSync(bin)
    writeFileSync(join(bin, 'docker'), DOCKER_SHIM)
    chmodSync(join(bin, 'docker'), 0o755)
    const envFile = join(sandbox, '.env.etl')
    writeFileSync(envFile, 'X=1\n')
    const callLog = join(sandbox, 'calls.log')
    writeFileSync(callLog, '')

    execFileSync('bash', [join(ROOT, 'scripts/etl/run-nightly.sh')], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        CALL_LOG: callLog,
        GUICHET_ETL_ENV_FILE: envFile,
        DATAHUB_LOG_FILE: logPath,
        DATAHUB_LOG_MAX_BYTES: '1000',
        GUICHET_IMAGE: 'ghcr.io/x/guichet@sha256:abc',
        COMPOSE_PROJECT_NAME: 'guichet-test',
        GUICHET_ENV_FILE: '/etc/guichet/test.env',
      },
    })

    const fichiers = readdirSync(logDir)
    expect(fichiers.some((f) => f.startsWith('datahub-nightly.log.') && f.endsWith('.gz'))).toBe(true)
    // Le nouveau log ne doit PAS contenir le contenu de l'ancien.
    expect(readFileSync(logPath, 'utf8')).not.toMatch(/^x+$/)
  })
})
