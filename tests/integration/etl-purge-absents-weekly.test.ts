/**
 * @jest-environment node
 *
 * GUIC-700 — Purge hebdomadaire des clés absentes (lot 7, full-refresh séparé du nightly —
 * décision documentée dans CURRENT_TASK.md : coûteux comparé à l'extraction incrémentale,
 * pas la fréquence quotidienne). Avant ce script, la tâche n'était planifiée nulle part :
 * `npm run datahub:purge-absents` existait mais aucune crontab, aucun log, aucune
 * observabilité GUIC-576.
 *
 * L'invocation est passée de `npm run` nu sur l'hôte à `docker compose run --rm --no-deps
 * app` (voir scripts/etl/lib-app-exec.sh) : trouvé au premier run réel en préprod,
 * `DATABASE_URL` pointe un nom de conteneur (`mariadb-test`), jamais résoluble hors du
 * réseau Docker de l'app. Ces tests shimment `docker` pour vérifier le même contrat
 * d'exploitation que run-nightly.sh : marqueur ✓/✗ horodaté, code de sortie non nul
 * propagé, rotation du log.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, chmodSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()

const DOCKER_SHIM = `#!/usr/bin/env bash
echo "docker $*" >> "$CALL_LOG"
case "$*" in
  *"purge-absents.ts"*)
    [ -n "$FAIL_PURGE" ] && { echo "purge en échec" >&2; exit 1; }
    echo "purge ok"; exit 0 ;;
esac
exit 0
`

interface RunResult { code: number; calls: string; log: string; logDir: string }

function run(env: Record<string, string> = {}): RunResult {
  const sandbox = mkdtempSync(join(tmpdir(), 'guic-purge-weekly-'))
  const bin = join(sandbox, 'bin')
  mkdirSync(bin)
  writeFileSync(join(bin, 'docker'), DOCKER_SHIM)
  chmodSync(join(bin, 'docker'), 0o755)

  const logDir = join(sandbox, 'log')
  const callLog = join(sandbox, 'calls.log')
  writeFileSync(callLog, '')

  let code = 0
  try {
    execFileSync('bash', [join(ROOT, 'scripts/etl/purge-absents-weekly.sh')], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        CALL_LOG: callLog,
        DATAHUB_LOG_FILE: join(logDir, 'datahub-purge-absents.log'),
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

  const logPath = join(logDir, 'datahub-purge-absents.log')
  const log = existsSync(logPath) ? readFileSync(logPath, 'utf8') : ''
  return { code, calls: readFileSync(callLog, 'utf8'), log, logDir }
}

describe('GUIC-700 — purge-absents-weekly.sh : même contrat d\'exploitation que le nightly', () => {
  it('appelle purge-absents.ts via le conteneur app et rend 0 quand tout passe', () => {
    const r = run()
    expect(r.code).toBe(0)
    expect(r.calls).toMatch(/purge-absents\.ts/)
    expect(r.calls).toMatch(/compose.*run.*--rm.*--no-deps/)
    expect(r.log).toMatch(/✅ purge hebdomadaire complète/)
  })

  it('rend un code non nul et journalise ✗ quand la purge échoue', () => {
    const r = run({ FAIL_PURGE: '1' })
    expect(r.code).not.toBe(0)
    expect(r.log).toMatch(/✗.*purge/)
  })

  it('rotation partagée : un log existant au-delà du seuil est archivé avant le run', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'guic-purge-weekly-rot-'))
    const logDir = join(sandbox, 'log')
    mkdirSync(logDir, { recursive: true })
    const logPath = join(logDir, 'datahub-purge-absents.log')
    writeFileSync(logPath, 'x'.repeat(2000))

    const bin = join(sandbox, 'bin')
    mkdirSync(bin)
    writeFileSync(join(bin, 'docker'), DOCKER_SHIM)
    chmodSync(join(bin, 'docker'), 0o755)
    const callLog = join(sandbox, 'calls.log')
    writeFileSync(callLog, '')

    execFileSync('bash', [join(ROOT, 'scripts/etl/purge-absents-weekly.sh')], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        CALL_LOG: callLog,
        DATAHUB_LOG_FILE: logPath,
        DATAHUB_LOG_MAX_BYTES: '1000',
        GUICHET_IMAGE: 'ghcr.io/x/guichet@sha256:abc',
        COMPOSE_PROJECT_NAME: 'guichet-test',
        GUICHET_ENV_FILE: '/etc/guichet/test.env',
      },
    })

    const fichiers = readdirSync(logDir)
    expect(fichiers.some((f) => f.startsWith('datahub-purge-absents.log.') && f.endsWith('.gz'))).toBe(true)
    expect(readFileSync(logPath, 'utf8')).not.toMatch(/^x+$/)
  })
})
