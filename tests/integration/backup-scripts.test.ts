/**
 * @jest-environment node
 *
 * GUIC-571 (gap 5) — Harnais de test des scripts de sauvegarde, de bout en bout.
 *
 * Les scripts orchestrent `docker` (dump, mc mirror, client mariadb). On ne peut pas monter une
 * pile réelle en CI → on SHIME `docker` sur le PATH : un faux `docker` qui journalise ses appels
 * et renvoie une sortie contrôlée. On pilote ainsi chaque branche (dump vide, MinIO absent,
 * restauration vide) et on vérifie le comportement (code de sortie, fichiers produits, appels).
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, chmodSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()

/** Shim `docker` : journalise, et se comporte selon des variables d'environnement. */
const DOCKER_SHIM = `#!/usr/bin/env bash
echo "docker $*" >> "$CALL_LOG"
case "$1" in
  run)
    if printf '%s\\n' "$@" | grep -q mariadb-dump; then
      [ -n "$FAKE_EMPTY_DUMP" ] && exit 0
      printf -- '-- fake dump\\nCREATE TABLE t (id INT);\\nINSERT INTO t VALUES (1);\\n'; exit 0
    fi
    if printf '%s\\n' "$@" | grep -q 'mariadb'; then
      if printf '%s\\n' "$@" | grep -q -- '-N'; then echo "\${FAKE_TABLE_COUNT:-5}"; exit 0; fi
      cat >/dev/null 2>&1; exit 0
    fi
    # minio/mc ou autre
    [ -n "$FAKE_MINIO_FAIL" ] && exit 1
    exit 0 ;;
  compose)
    if printf '%s\\n' "$@" | grep -q ' ps '; then
      [ -n "$NO_CONTAINER" ] && exit 0
      echo "fakecid"; exit 0
    fi
    exit 0 ;;
  pull) exit 0 ;;
  inspect)
    if printf '%s\\n' "$@" | grep -q 'Health'; then echo "\${FAKE_HEALTH:-healthy}"; exit 0; fi
    echo "\${PREVIOUS_IMAGE:-}"; exit 0 ;;
  *) exit 0 ;;
esac
`

interface RunResult {
  code: number
  stdout: string
  calls: string
  dir: string
}

function runScript(script: string, env: Record<string, string> = {}): RunResult {
  const sandbox = mkdtempSync(join(tmpdir(), 'guic-backup-'))
  const bin = join(sandbox, 'bin')
  mkdirSync(bin)
  writeFileSync(join(bin, 'docker'), DOCKER_SHIM)
  chmodSync(join(bin, 'docker'), 0o755)

  const backupDir = join(sandbox, 'backups')
  mkdirSync(backupDir)
  const envFile = join(sandbox, 'prod.env')
  writeFileSync(
    envFile,
    'DATABASE_URL="mysql://guichet:secret@host.docker.internal:3306/guichet_jeunesse"\n' +
      (env.WITH_MINIO ? 'S3_ENDPOINT="http://host.docker.internal:9000"\nS3_BUCKET="guichet"\n' : ''),
  )

  const callLog = join(sandbox, 'calls.log')
  writeFileSync(callLog, '')

  let code = 0
  let stdout = ''
  try {
    stdout = execFileSync('bash', [join(ROOT, script)], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        CALL_LOG: callLog,
        GUICHET_ENV_FILE: envFile,
        BACKUP_DIR: backupDir,
        ...env,
      },
    })
  } catch (e) {
    const err = e as { status?: number; stdout?: string }
    code = err.status ?? 1
    stdout = err.stdout ?? ''
  }
  return { code, stdout, calls: readFileSync(callLog, 'utf8'), dir: backupDir }
}

describe('GUIC-571 — backup.sh (orchestration)', () => {
  it('échoue proprement si le fichier de secrets est absent', () => {
    const r = runScript('scripts/backup/backup.sh', { GUICHET_ENV_FILE: '/inexistant/x.env' })
    expect(r.code).toBe(2)
  })

  it('chemin nominal : dump MariaDB non vide → fichier produit, succès', () => {
    const r = runScript('scripts/backup/backup.sh')
    expect(r.code).toBe(0)
    expect(r.calls).toMatch(/mariadb-dump/)
    const dumps = readdirSync(r.dir).filter((f) => /^mariadb-.*\.sql\.gz$/.test(f))
    expect(dumps.length).toBe(1)
  })

  it('garde-fou : un dump VIDE interrompt la sauvegarde (exit 3)', () => {
    const r = runScript('scripts/backup/backup.sh', { FAKE_EMPTY_DUMP: '1' })
    expect(r.code).toBe(3)
    // le fichier vide ne doit pas rester
    expect(readdirSync(r.dir).filter((f) => /mariadb-.*\.sql\.gz/.test(f)).length).toBe(0)
  })

  it('MinIO non configuré : sauvegarde objet ignorée, succès quand même', () => {
    const r = runScript('scripts/backup/backup.sh') // sans WITH_MINIO
    expect(r.code).toBe(0)
    expect(r.stdout).toMatch(/MinIO non configuré/)
  })

  it('MinIO configuré : mc mirror invoqué', () => {
    const r = runScript('scripts/backup/backup.sh', { WITH_MINIO: '1' })
    expect(r.code).toBe(0)
    expect(r.calls).toMatch(/mc (alias|mirror)|minio\/mc/)
  })

  it('avertit en l’absence de copie hors-site', () => {
    const r = runScript('scripts/backup/backup.sh')
    expect(r.stdout).toMatch(/hors-site/)
  })
})

describe('GUIC-571 — restore-drill.sh (exercice de restauration)', () => {
  function withDump(env: Record<string, string> = {}): RunResult {
    // On pose un faux dump dans BACKUP_DIR avant de lancer le drill.
    const sandbox = mkdtempSync(join(tmpdir(), 'guic-drill-'))
    const bin = join(sandbox, 'bin')
    mkdirSync(bin)
    writeFileSync(join(bin, 'docker'), DOCKER_SHIM)
    chmodSync(join(bin, 'docker'), 0o755)
    const backupDir = join(sandbox, 'backups')
    mkdirSync(backupDir)
    execFileSync('bash', ['-c', `printf 'x' | gzip > "${join(backupDir, 'mariadb-20260101-000000.sql.gz')}"`])
    const envFile = join(sandbox, 'prod.env')
    writeFileSync(envFile, 'DATABASE_URL="mysql://guichet:secret@host.docker.internal:3306/db"\n')
    const callLog = join(sandbox, 'calls.log')
    writeFileSync(callLog, '')
    let code = 0
    let stdout = ''
    try {
      stdout = execFileSync('bash', [join(ROOT, 'scripts/backup/restore-drill.sh')], {
        encoding: 'utf8',
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, CALL_LOG: callLog, GUICHET_ENV_FILE: envFile, BACKUP_DIR: backupDir, ...env },
      })
    } catch (e) {
      const err = e as { status?: number; stdout?: string }
      code = err.status ?? 1
      stdout = err.stdout ?? ''
    }
    return { code, stdout, calls: readFileSync(callLog, 'utf8'), dir: backupDir }
  }

  it('aucun dump trouvé → exit 2', () => {
    const r = runScript('scripts/backup/restore-drill.sh')
    expect(r.code).toBe(2)
  })

  it('restauration OK + tables présentes → exercice réussi (exit 0)', () => {
    const r = withDump({ FAKE_TABLE_COUNT: '42' })
    expect(r.code).toBe(0)
    expect(r.stdout).toMatch(/EXERCICE RÉUSSI/)
    expect(r.stdout).toMatch(/42 tables/)
  })

  it('base restaurée VIDE (0 table) → échec (exit 3) : sauvegarde inexploitable', () => {
    const r = withDump({ FAKE_TABLE_COUNT: '0' })
    expect(r.code).toBe(3)
  })

  it('crée puis supprime une base d’exercice JETABLE (jamais la prod)', () => {
    const r = withDump({ FAKE_TABLE_COUNT: '5' })
    expect(r.calls).toMatch(/guichet_restore_drill_/) // base d'exercice nommée
    expect(r.stdout).toMatch(/Nettoyage de la base d'exercice/)
  })

  // GUIC-571 — backup.sh a été corrigé (GUIC-662) pour cibler cjs-net par défaut : le réseau
  // ${COMPOSE_PROJECT_NAME}_guichet n'existe pas quand le réseau applicatif est déclaré externe
  // (docker-compose.prod.yml), Docker ne le crée pas. restore-drill.sh, qui joint MariaDB par le
  // même mécanisme, n'avait jamais reçu le même correctif — la base restait injoignable pour
  // l'exercice de restauration, silencieusement d'accord avec ce shim (qui n'inspecte pas
  // --network), mais réellement en échec ("network not found") sur un vrai Docker.
  it('joint MariaDB via cjs-net par défaut, pas ${COMPOSE_PROJECT_NAME}_guichet (GUIC-662)', () => {
    const r = withDump({ FAKE_TABLE_COUNT: '5', COMPOSE_PROJECT_NAME: 'guichet-test' })
    expect(r.calls).toMatch(/--network cjs-net\b/)
    expect(r.calls).not.toMatch(/--network guichet-test_guichet\b/)
  })
})
