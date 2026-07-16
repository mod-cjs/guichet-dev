/**
 * @jest-environment node
 *
 * GUIC-621 — Harnais de test du preflight de déploiement.
 *
 * Le preflight vérifie les faits d'infra contre le SERVEUR RÉEL et échoue bruyamment. On ne peut
 * pas inventer les valeurs dues par le lead, mais on peut écrire ce qui les découvre.
 *
 * Ici on SHIME `docker` : chaque sonde (MariaDB / Redis / S3) est un `docker run` dont on pilote
 * le comportement par variable d'environnement. On vérifie que CHAQUE mode d'échec est refusé
 * pour LA BONNE RAISON — un preflight qui passe quoi qu'il arrive ne protège de rien.
 *
 * Principe directeur : sûr par défaut. Toute sonde qu'on ne sait pas interpréter → refus.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, chmodSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()

/**
 * Shim `docker`. Chaque sonde est pilotée par une variable :
 *   FAIL_DB=1        → la connexion MariaDB échoue
 *   FAIL_REDIS_PERM=1→ Redis répond NOPERM (refus d'ACL)
 *   FAIL_REDIS=1     → Redis injoignable
 *   S3_BODY / S3_CODE→ ce que renvoie l'endpoint S3 (XML 403 = sain, HTML = console, 400 = underscore)
 */
const DOCKER_SHIM = `#!/usr/bin/env bash
echo "docker $*" >> "$CALL_LOG"
ARGS="$*"
case "$ARGS" in
  *mariadb*|*"SELECT 1"*)
    [ -n "$FAIL_DB" ] && { echo "ERROR 2002 (HY000): Can't connect to server" >&2; exit 1; }
    echo "ok"; echo "1"; exit 0 ;;
  *redis-cli*)
    [ -n "$FAIL_REDIS" ] && { echo "Could not connect to Redis" >&2; exit 1; }
    [ -n "$FAIL_REDIS_PERM" ] && { echo "NOPERM this user has no permissions to access one of the keys"; exit 0; }
    echo "OK"; exit 0 ;;
  *curl*)
    printf '%s' "\${S3_BODY:-<?xml version=\\"1.0\\"?><Error><Code>AccessDenied</Code></Error>}"
    exit 0 ;;
esac
exit 0
`

interface RunResult { code: number; out: string; calls: string }

interface RunOpts {
  env?:     Record<string, string>
  /** Contenu du fichier de secrets. `null` → fichier absent. */
  envFile?: string | null
  /** Permissions du fichier de secrets (défaut 0600). */
  mode?:    number
}

function run(script: string, opts: RunOpts = {}): RunResult {
  const sandbox = mkdtempSync(join(tmpdir(), 'guic-preflight-'))
  const bin = join(sandbox, 'bin')
  mkdirSync(bin)
  writeFileSync(join(bin, 'docker'), DOCKER_SHIM)
  chmodSync(join(bin, 'docker'), 0o755)

  const envFile = join(sandbox, 'prod.env')
  const contenu = opts.envFile === undefined
    ? [
        'DATABASE_URL="mysql://guichet:secret@host.docker.internal:3306/guichet_jeunesse"',
        'REDIS_URL="redis://guichet:secret@redis_cjs:6379"',
        'S3_ENDPOINT="http://minio:9000"',
        'S3_BUCKET="guichet"',
        'S3_ACCESS_KEY="AAA"',
        'S3_SECRET_KEY="BBB"',
        'NEXTAUTH_URL="https://guichet.consortiumjeunessesenegal.org"',
      ].join('\n') + '\n'
    : opts.envFile
  if (contenu !== null) {
    writeFileSync(envFile, contenu)
    chmodSync(envFile, opts.mode ?? 0o600)
  }

  const callLog = join(sandbox, 'calls.log')
  writeFileSync(callLog, '')

  let code = 0
  let out = ''
  try {
    out = execFileSync('bash', ['-c', `"${join(ROOT, script)}" 2>&1`], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH:             `${bin}:${process.env.PATH}`,
        CALL_LOG:         callLog,
        GUICHET_ENV_FILE: envFile,
        ...opts.env,
      },
    })
  } catch (e) {
    const err = e as { status?: number; stdout?: string }
    code = err.status ?? 1
    out = err.stdout ?? ''
  }
  return { code, out, calls: readFileSync(callLog, 'utf8') }
}

const PREFLIGHT = 'scripts/deploy/preflight.sh'

describe('GUIC-621 — preflight : configuration', () => {
  it('passe quand tout est vert', () => {
    const r = run(PREFLIGHT)
    expect(r.code).toBe(0)
    expect(r.out).toMatch(/preflight OK/i)
  })

  it('refuse si le fichier de secrets est absent', () => {
    const r = run(PREFLIGHT, { envFile: null })
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/introuvable/i)
  })

  it('refuse si le fichier de secrets est lisible par tous (fuite de secrets)', () => {
    const r = run(PREFLIGHT, { mode: 0o644 })
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/permission|600/i)
  })

  it('refuse si une variable requise manque, et NOMME la variable', () => {
    const r = run(PREFLIGHT, {
      envFile: 'DATABASE_URL="mysql://u:p@h:3306/d"\nNEXTAUTH_URL="https://x.sn"\n',
    })
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/REDIS_URL/)
  })
})

describe('GUIC-621 — preflight : garde dev-login (miroir de prod-guards)', () => {
  it('refuse APP_ENV=local + ALLOW_DEV_LOGIN=true sur une URL PUBLIQUE', () => {
    const r = run(PREFLIGHT, {
      envFile: [
        'DATABASE_URL="mysql://u:p@h:3306/d"',
        'REDIS_URL="redis://h:6379"',
        'S3_ENDPOINT="http://minio:9000"',
        'S3_BUCKET="guichet"',
        'S3_ACCESS_KEY="A"',
        'S3_SECRET_KEY="B"',
        'NEXTAUTH_URL="https://guichet.consortiumjeunessesenegal.org"',
        'APP_ENV="local"',
        'ALLOW_DEV_LOGIN="true"',
      ].join('\n') + '\n',
    })
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/dev.?login|sans SSO/i)
  })

  it('tolère les deux variables si l’URL publique est locale (image de prod sur un poste)', () => {
    const r = run(PREFLIGHT, {
      envFile: [
        'DATABASE_URL="mysql://u:p@h:3306/d"',
        'REDIS_URL="redis://h:6379"',
        'S3_ENDPOINT="http://minio:9000"',
        'S3_BUCKET="guichet"',
        'S3_ACCESS_KEY="A"',
        'S3_SECRET_KEY="B"',
        'NEXTAUTH_URL="http://localhost:3000"',
        'APP_ENV="local"',
        'ALLOW_DEV_LOGIN="true"',
      ].join('\n') + '\n',
    })
    expect(r.code).toBe(0)
  })
})

describe('GUIC-621 — preflight : sondes contre le serveur réel', () => {
  it('MariaDB est sondée DEPUIS UN CONTENEUR sur le réseau partagé, pas depuis l’hôte', () => {
    const r = run(PREFLIGHT)
    expect(r.calls).toMatch(/--network/)
    expect(r.calls).toMatch(/host\.docker\.internal:host-gateway/)
  })

  it('refuse si MariaDB est injoignable depuis le conteneur', () => {
    const r = run(PREFLIGHT, { env: { FAIL_DB: '1' } })
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/MariaDB/i)
  })

  it('refuse si Redis répond NOPERM — le refus d’ACL est SILENCIEUX en prod (constat B5)', () => {
    const r = run(PREFLIGHT, { env: { FAIL_REDIS_PERM: '1' } })
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/NOPERM|ACL|préfixe/i)
  })

  it('refuse si Redis est injoignable', () => {
    const r = run(PREFLIGHT, { env: { FAIL_REDIS: '1' } })
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/redis/i)
  })

  it('écrit la clé Redis SOUS le préfixe configuré (REDIS_KEY_PREFIX)', () => {
    const r = run(PREFLIGHT, { env: { REDIS_KEY_PREFIX: 'autre:' } })
    expect(r.calls).toMatch(/autre:/)
  })
})

describe('GUIC-621 — preflight : S3/MinIO, les deux pièges déjà rencontrés', () => {
  it('refuse si l’endpoint sert la CONSOLE (HTML) au lieu de l’API S3', () => {
    // Piège réel : https://store.consortiumjeunessesenegal.org sert la console web.
    const r = run(PREFLIGHT, { env: { S3_BODY: '<!DOCTYPE html><html><head><title>MinIO</title>' } })
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/console|HTML/i)
  })

  it('refuse ET explique quand le nom d’hôte contient un underscore (GUIC-620)', () => {
    // MinIO rejette Host avec underscore : http://minio_cjs:9000 → 400 « invalid hostname ».
    const r = run(PREFLIGHT, {
      env: { S3_BODY: '<?xml version="1.0"?><Error><Code>InvalidRequest</Code><Message>Invalid Request (invalid hostname)</Message></Error>' },
    })
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/underscore/i)
  })

  it('accepte une API S3 saine (403 AccessDenied = elle parle S3 et exige une auth)', () => {
    const r = run(PREFLIGHT, {
      env: { S3_BODY: '<?xml version="1.0"?><Error><Code>AccessDenied</Code></Error>' },
    })
    expect(r.code).toBe(0)
  })
})
