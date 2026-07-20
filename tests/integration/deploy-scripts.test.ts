/**
 * @jest-environment node
 *
 * GUIC-568 (gap 5) — Harnais de test de deploy.sh et rollback.sh, de bout en bout.
 *
 * On SHIME `docker` sur le PATH pour piloter l'orchestration sans pile réelle et vérifier les
 * comportements CRITIQUES : sauvegarde AVANT migration, migration AVANT bascule, rollback
 * automatique sur conteneur `unhealthy`. La santé est pilotée par une SÉQUENCE (un état par
 * appel) → on peut simuler « le nouveau déploiement échoue, le rollback réussit ».
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()

/**
 * Shim `docker`. La santé (`inspect …Health.Status`) est lue ligne par ligne dans $HEALTH_SEQ ;
 * l'image courante (`inspect …Config.Image`) vient de $PREVIOUS_IMAGE (vide = 1er déploiement).
 */
const DOCKER_SHIM = `#!/usr/bin/env bash
echo "docker $*" >> "$CALL_LOG"
case "$1" in
  run)
    if printf '%s\\n' "$@" | grep -q mariadb-dump; then
      [ -n "$FAKE_EMPTY_DUMP" ] && exit 0
      printf -- '-- fake dump\\nCREATE TABLE t (id INT);\\n'; exit 0
    fi
    # GUIC-621 — deploy.sh appelle désormais preflight.sh en premier : ce shim doit répondre à
    # ses sondes, sinon TOUT déploiement échoue ici pour une raison étrangère au test.
    # $FAIL_DB force l'échec de la sonde MariaDB (utilisé pour tester l'ORDRE des étapes).
    if printf '%s\\n' "$@" | grep -q 'redis-cli'; then echo "OK"; exit 0; fi
    if printf '%s\\n' "$@" | grep -q 'curl'; then
      printf '%s' '<?xml version="1.0"?><Error><Code>AccessDenied</Code></Error>'; exit 0
    fi
    if printf '%s\\n' "$@" | grep -q 'SELECT 1'; then
      [ -n "$FAIL_DB" ] && exit 1
      echo "1"; exit 0
    fi
    exit 0 ;;
  compose)
    case " $* " in
      *" ps "*) [ -n "$NO_CONTAINER" ] && exit 0; echo "fakecid"; exit 0 ;;
    esac
    # up / run (migrate) / autres
    exit 0 ;;
  pull) exit 0 ;;
  inspect)
    if printf '%s\\n' "$@" | grep -q 'Health'; then
      # état suivant de la séquence (défaut healthy)
      local_line="$(sed -n "1p" "$HEALTH_SEQ" 2>/dev/null)"
      sed -i.bak '1d' "$HEALTH_SEQ" 2>/dev/null || true
      echo "\${local_line:-healthy}"; exit 0
    fi
    echo "\${PREVIOUS_IMAGE:-}"; exit 0 ;;
  *) exit 0 ;;
esac
`

interface RunResult {
  code: number
  stdout: string
  calls: string
}

function run(script: string, opts: { env?: Record<string, string>; health?: string[]; args?: string[] } = {}): RunResult {
  const sandbox = mkdtempSync(join(tmpdir(), 'guic-deploy-'))
  const bin = join(sandbox, 'bin')
  mkdirSync(bin)
  writeFileSync(join(bin, 'docker'), DOCKER_SHIM)
  chmodSync(join(bin, 'docker'), 0o755)

  mkdirSync(join(sandbox, 'backups'))
  mkdirSync(join(sandbox, 'state'))
  const envFile = join(sandbox, 'prod.env')
  // GUIC-621 — config COMPLÈTE : deploy.sh lance le preflight en premier, qui exige toutes les
  // variables. Un env minimal ferait échouer chaque test pour une raison étrangère à son objet.
  writeFileSync(envFile, [
    'DATABASE_URL="mysql://guichet:secret@host.docker.internal:3306/guichet_jeunesse"',
    'REDIS_URL="redis://guichet:secret@redis-cjs:6379"',
    'S3_ENDPOINT="http://minio:9000"',
    'S3_BUCKET="guichet"',
    'S3_ACCESS_KEY="AAA"',
    'S3_SECRET_KEY="BBB"',
    'NEXTAUTH_URL="https://guichet.consortiumjeunessesenegal.org"',
    // GUIC-634 — le preflight exige désormais le SSO (seule porte d'entrée) : sans ces
    // variables il refuse, et deploy.sh s'arrête AVANT la sauvegarde. C'est le comportement
    // voulu — ce harnais doit donc fournir une config complète pour tester l'orchestration.
    'SSO_BASE_URL="https://sso.consortiumjeunessesenegal.org"',
    'SSO_CLIENT_ID="guichet"',
    'SESSION_SECRET="secret-de-session"',
  ].join('\n') + '\n')
  chmodSync(envFile, 0o600)

  const callLog = join(sandbox, 'calls.log')
  writeFileSync(callLog, '')
  const healthSeq = join(sandbox, 'health.seq')
  // Par défaut : toujours healthy (beaucoup de lignes).
  writeFileSync(healthSeq, (opts.health ?? Array(20).fill('healthy')).join('\n') + '\n')

  let code = 0
  let stdout = ''
  try {
    // On fusionne stderr dans stdout : log() écrit sur stdout, err() (dont « Rollback… ») sur stderr.
    stdout = execFileSync('bash', ['-c', `"${join(ROOT, script)}" "$@" 2>&1`, 'bash', ...(opts.args ?? [])], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        CALL_LOG: callLog,
        HEALTH_SEQ: healthSeq,
        GUICHET_ENV_FILE: envFile,
        BACKUP_DIR: join(sandbox, 'backups'),
        STATE_DIR: join(sandbox, 'state'),
        SMOKE_RETRIES: '2',
        SMOKE_DELAY: '0',
        ...opts.env,
      },
    })
  } catch (e) {
    const err = e as { status?: number; stdout?: string }
    code = err.status ?? 1
    stdout = err.stdout ?? ''
  }
  return { code, stdout, calls: readFileSync(callLog, 'utf8') }
}

/** Indices d'apparition de sous-chaînes dans le journal d'appels (ordre d'exécution). */
function order(calls: string, ...needles: string[]): number[] {
  const lines = calls.split('\n')
  return needles.map((n) => lines.findIndex((l) => l.includes(n)))
}

describe('GUIC-568 — deploy.sh (orchestration)', () => {
  it('refuse sans GUICHET_IMAGE (exit 2)', () => {
    const r = run('scripts/deploy/deploy.sh', { env: { GUICHET_IMAGE: '' } })
    expect(r.code).toBe(2)
  })

  it('refuse sans fichier de secrets (exit 2)', () => {
    const r = run('scripts/deploy/deploy.sh', { env: { GUICHET_IMAGE: 'img@sha256:a', GUICHET_ENV_FILE: '/inexistant' } })
    expect(r.code).toBe(2)
  })

  it('chemin nominal : sauvegarde → migration → bascule → healthy → succès (exit 0)', () => {
    const r = run('scripts/deploy/deploy.sh', { env: { GUICHET_IMAGE: 'img@sha256:new' } })
    expect(r.code).toBe(0)
    // Ordre critique : dump AVANT migrate AVANT up (jamais de code neuf sur ancien schéma).
    const [dump, migrate, up] = order(r.calls, 'mariadb-dump', 'migrate deploy', 'up -d')
    expect(dump).toBeGreaterThanOrEqual(0)
    expect(dump).toBeLessThan(migrate)
    expect(migrate).toBeLessThan(up)
  })

  it('garde-fou : sauvegarde vide → interruption AVANT migration (exit 3)', () => {
    const r = run('scripts/deploy/deploy.sh', { env: { GUICHET_IMAGE: 'img@sha256:x', FAKE_EMPTY_DUMP: '1' } })
    expect(r.code).toBe(3)
    expect(r.calls).not.toMatch(/migrate deploy/) // on n'a pas migré
  })

  it('nouveau déploiement unhealthy + image précédente → ROLLBACK réussi', () => {
    // 1er smoke : unhealthy (échec) → rollback → 2e smoke : healthy (succès).
    const r = run('scripts/deploy/deploy.sh', {
      env: { GUICHET_IMAGE: 'img@sha256:bad', PREVIOUS_IMAGE: 'img@sha256:good' },
      health: ['unhealthy', 'healthy', 'healthy'],
    })
    // L'image précédente est nommée dans le message de rollback, puis le rollback réussit.
    expect(r.stdout).toMatch(/Rollback automatique vers img@sha256:good/)
    expect(r.stdout).toMatch(/Rollback réussi/)
  })

  it('unhealthy SANS image précédente → pas de rollback possible, échec (exit 1)', () => {
    const r = run('scripts/deploy/deploy.sh', {
      env: { GUICHET_IMAGE: 'img@sha256:bad', NO_CONTAINER: '1' },
      health: ['unhealthy', 'unhealthy', 'unhealthy'],
    })
    expect(r.code).not.toBe(0)
    expect(r.stdout).toMatch(/rollback impossible|Aucune image précédente/i)
  })
})

describe('GUIC-568 — rollback.sh', () => {
  it('sans cible ni image précédente enregistrée → exit 2', () => {
    const r = run('scripts/deploy/rollback.sh', { env: {} })
    expect(r.code).toBe(2)
  })

  it('cible explicite + conteneur healthy → succès (exit 0)', () => {
    const r = run('scripts/deploy/rollback.sh', { args: ['img@sha256:prev'], health: ['healthy'] })
    expect(r.code).toBe(0)
    expect(r.calls).toMatch(/img@sha256:prev/) // l'image cible est bien déployée
  })

  it('cible explicite + conteneur unhealthy → échec (exit 1)', () => {
    const r = run('scripts/deploy/rollback.sh', {
      args: ['img@sha256:prev'],
      health: ['unhealthy', 'unhealthy', 'unhealthy'],
    })
    expect(r.code).toBe(1)
  })
})

describe('GUIC-621 — deploy.sh appelle le preflight EN PREMIER', () => {
  it('le preflight passe AVANT la sauvegarde : un échec ne doit laisser AUCUN effet de bord', () => {
    // L'ordre est la seule chose qui compte ici. Un preflight lancé après la sauvegarde (ou pire,
    // après la migration) ne protège plus de rien : le mal est fait.
    //
    // On force un échec RÉEL (MariaDB injoignable), pas un drapeau de test : `FAIL_DB` pilote le
    // shim docker, donc la sonde échoue exactement comme sur un vrai serveur mal configuré.
    // (Une première version utilisait un `PREFLIGHT_FAIL` inexistant : le test passait parce que
    // le preflight échouait pour une AUTRE raison — un faux-vert.)
    const r = run('scripts/deploy/deploy.sh', {
      env: { GUICHET_IMAGE: 'img@sha256:new', FAIL_DB: '1' },
    })
    expect(r.code).not.toBe(0)
    expect(r.stdout).toMatch(/MariaDB/i)         // il a échoué pour LA bonne raison
    expect(r.calls).not.toMatch(/mariadb-dump/)  // aucune sauvegarde tentée
    expect(r.calls).not.toMatch(/migrate deploy/) // aucune migration tentée
  })

  it('déploiement nominal : le preflight est bien invoqué', () => {
    const r = run('scripts/deploy/deploy.sh', { env: { GUICHET_IMAGE: 'img@sha256:new' } })
    expect(r.code).toBe(0)
    expect(r.stdout).toMatch(/preflight/i)
  })
})
