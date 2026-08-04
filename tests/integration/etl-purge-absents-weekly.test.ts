/**
 * @jest-environment node
 *
 * GUIC-700 — Purge hebdomadaire des clés absentes (lot 7, full-refresh séparé du nightly —
 * décision documentée dans CURRENT_TASK.md : coûteux comparé à l'extraction incrémentale,
 * pas la fréquence quotidienne). Avant ce script, la tâche n'était planifiée nulle part :
 * `npm run datahub:purge-absents` existait mais aucune crontab, aucun log, aucune
 * observabilité GUIC-576. Ces tests shimment `npm` pour vérifier le même contrat que
 * run-nightly.sh : marqueur ✓/✗ horodaté, code de sortie non nul propagé, rotation du log.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, chmodSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()

const NPM_SHIM = `#!/usr/bin/env bash
echo "npm $*" >> "$CALL_LOG"
[ -n "$FAIL_PURGE" ] && { echo "purge en échec" >&2; exit 1; }
echo "purge ok"; exit 0
`

interface RunResult { code: number; calls: string; log: string; logDir: string }

function run(env: Record<string, string> = {}): RunResult {
  const sandbox = mkdtempSync(join(tmpdir(), 'guic-purge-weekly-'))
  const bin = join(sandbox, 'bin')
  mkdirSync(bin)
  writeFileSync(join(bin, 'npm'), NPM_SHIM)
  chmodSync(join(bin, 'npm'), 0o755)

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
  it('appelle datahub:purge-absents et rend 0 quand tout passe', () => {
    const r = run()
    expect(r.code).toBe(0)
    expect(r.calls).toMatch(/datahub:purge-absents/)
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
    writeFileSync(join(bin, 'npm'), NPM_SHIM)
    chmodSync(join(bin, 'npm'), 0o755)
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
      },
    })

    const fichiers = readdirSync(logDir)
    expect(fichiers.some((f) => f.startsWith('datahub-purge-absents.log.') && f.endsWith('.gz'))).toBe(true)
    expect(readFileSync(logPath, 'utf8')).not.toMatch(/^x+$/)
  })
})
