/**
 * @jest-environment node
 *
 * GUIC-700 — `reconcile.ts` et `purge-absents.ts` comparent Prisma (MariaDB) à
 * l'entrepôt : la moitié MariaDB dépend de la même joignabilité réseau que l'app
 * elle-même. Trouvé au premier run réel en préprod : `DATABASE_URL` pointe
 * `mariadb-test` — un nom de CONTENEUR, jamais résoluble depuis `npm run` exécuté nu sur
 * l'hôte (piste initialement recommandée, `run-nightly.sh` originel). Seul le conteneur
 * `app` (même service, même réseau `docker-compose`) a cette joignabilité PROUVÉE — ces
 * scripts doivent donc s'exécuter via `docker compose run --rm --no-deps app`, jamais nus
 * sur l'hôte.
 *
 * `exec_via_app` (scripts/etl/lib-app-exec.sh) centralise cette invocation pour
 * `run-nightly.sh` et `purge-absents-weekly.sh`.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, chmodSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()

const DOCKER_SHIM = `#!/usr/bin/env bash
echo "docker $*" >> "$CALL_LOG"
exit 0
`

function run(script: string, env: Record<string, string> = {}): { code: number; calls: string } {
  const sandbox = mkdtempSync(join(tmpdir(), 'guic-app-exec-'))
  const bin = join(sandbox, 'bin')
  mkdirSync(bin)
  writeFileSync(join(bin, 'docker'), DOCKER_SHIM)
  chmodSync(join(bin, 'docker'), 0o755)
  const callLog = join(sandbox, 'calls.log')
  writeFileSync(callLog, '')

  const wrapper = join(sandbox, 'run.sh')
  writeFileSync(
    wrapper,
    `#!/usr/bin/env bash\nset -Eeuo pipefail\nRACINE="${ROOT}"\nsource "${ROOT}/scripts/etl/lib-app-exec.sh"\n${script}\n`
  )
  chmodSync(wrapper, 0o755)

  let code = 0
  try {
    execFileSync('bash', [wrapper], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, CALL_LOG: callLog, ...env },
    })
  } catch (e) {
    const err = e as { status?: number }
    code = err.status ?? 1
  }
  return { code, calls: readFileSync(callLog, 'utf8') }
}

describe('GUIC-700 — exec_via_app : reconcile/purge-absents via le conteneur app, jamais nus sur l\'hôte', () => {
  it('refuse sans GUICHET_IMAGE', () => {
    const r = run('exec_via_app scripts/datahub/reconcile.ts since', {
      COMPOSE_PROJECT_NAME: 'guichet-test',
      GUICHET_ENV_FILE: '/etc/guichet/test.env',
    })
    expect(r.code).not.toBe(0)
  })

  it('refuse sans COMPOSE_PROJECT_NAME', () => {
    const r = run('exec_via_app scripts/datahub/reconcile.ts since', {
      GUICHET_IMAGE: 'ghcr.io/x/guichet@sha256:abc',
      GUICHET_ENV_FILE: '/etc/guichet/test.env',
    })
    expect(r.code).not.toBe(0)
  })

  it('refuse sans GUICHET_ENV_FILE', () => {
    const r = run('exec_via_app scripts/datahub/reconcile.ts since', {
      GUICHET_IMAGE: 'ghcr.io/x/guichet@sha256:abc',
      COMPOSE_PROJECT_NAME: 'guichet-test',
    })
    expect(r.code).not.toBe(0)
  })

  it('lance docker compose run --rm --no-deps sur le service app, avec les montages requis', () => {
    const r = run('exec_via_app scripts/datahub/reconcile.ts since-ici', {
      GUICHET_IMAGE: 'ghcr.io/x/guichet@sha256:abc',
      COMPOSE_PROJECT_NAME: 'guichet-test',
      GUICHET_ENV_FILE: '/etc/guichet/test.env',
    })
    expect(r.code).toBe(0)
    expect(r.calls).toMatch(/compose.*run.*--rm.*--no-deps/)
    expect(r.calls).toMatch(/docker\.sock/)
    expect(r.calls).toMatch(/\/app\/scripts/)
    expect(r.calls).toMatch(/\/app\/src/)
    expect(r.calls).toMatch(/--user root/)
    expect(r.calls).toMatch(/scripts\/datahub\/reconcile\.ts since-ici/)
  })

  it('par défaut, compose prod SEUL (pas de docker-compose.test.yml) — sauf si GUICHET_COMPOSE_FILES est fourni', () => {
    const r = run('exec_via_app scripts/datahub/reconcile.ts since', {
      GUICHET_IMAGE: 'ghcr.io/x/guichet@sha256:abc',
      COMPOSE_PROJECT_NAME: 'guichet',
      GUICHET_ENV_FILE: '/etc/guichet/prod.env',
    })
    expect(r.calls).toMatch(/docker-compose\.prod\.yml/)
    expect(r.calls).not.toMatch(/docker-compose\.test\.yml/)
  })

  it('respecte GUICHET_COMPOSE_FILES si fourni (ex. préprod : prod + test)', () => {
    const r = run('exec_via_app scripts/datahub/reconcile.ts since', {
      GUICHET_IMAGE: 'ghcr.io/x/guichet@sha256:abc',
      COMPOSE_PROJECT_NAME: 'guichet-test',
      GUICHET_ENV_FILE: '/etc/guichet/test.env',
      GUICHET_COMPOSE_FILES: `-f ${ROOT}/docker-compose.prod.yml -f ${ROOT}/docker-compose.test.yml`,
    })
    expect(r.calls).toMatch(/docker-compose\.prod\.yml/)
    expect(r.calls).toMatch(/docker-compose\.test\.yml/)
  })
})
