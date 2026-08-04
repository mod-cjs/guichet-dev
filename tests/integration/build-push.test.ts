/**
 * @jest-environment node
 *
 * GUIC-639 — Harnais de test de build-push.sh.
 *
 * On SHIME `docker` ET `git` sur le PATH : le script ne doit ni construire une vraie image ni
 * dépendre du vrai dépôt. On vérifie les comportements qui protègent une release :
 *   - refus sans version, refus de `latest` comme version ;
 *   - refus sur un arbre de travail non propre (l'image ne correspondrait à aucun commit) ;
 *   - nom d'image GHCR en MINUSCULES (le dépôt contient …-CJS/, GHCR refuse les majuscules) ;
 *   - déploiement par EMPREINTE, jamais par tag mutable.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, chmodSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const SCRIPT = 'scripts/deploy/build-push.sh'

/**
 * Shim `git` : pilotable par variables.
 *   GIT_REMOTE   → ce que renvoie `git config --get remote.origin.url`
 *   GIT_DIRTY=1  → l'arbre est sale (status --porcelain non vide)
 */
const GIT_SHIM = `#!/usr/bin/env bash
case "$*" in
  *"remote.origin.url"*) echo "\${GIT_REMOTE:-git@github.com:Some-ORG/guichet.git}" ;;
  *"status --porcelain"*) [ -n "\${GIT_DIRTY:-}" ] && echo " M fichier" || true ;;
  *"rev-parse --short HEAD"*) echo "abc1234" ;;
  *"status --short"*) echo " M fichier" ;;
  *) true ;;
esac
`

/**
 * Shim `docker` : trace ses appels et simule la sortie dont le script a besoin.
 *
 * GUIC-674 — le script est passé de `docker build` + `docker push` à un
 * `docker buildx build --push` unique. Deux conséquences pour ce shim :
 *   - il doit répondre aux sous-commandes `buildx` (inspect/create/build) ;
 *   - l'empreinte ne se lit plus via `docker inspect` (le driver
 *     docker-container ne charge rien en local) mais via `--metadata-file`,
 *     que le shim doit donc écrire.
 *   FAIL_PUSH=1 → le `buildx build --push` échoue (non authentifié)
 */
const DOCKER_SHIM = `#!/usr/bin/env bash
echo "docker $*" >> "$CALL_LOG"
case "$1" in
  buildx)
    case "\${2:-}" in
      build)
        [ -n "\${FAIL_PUSH:-}" ] && exit 1
        # Écrit l'empreinte là où le script la lira (--metadata-file <chemin>).
        meta=""
        while [ $# -gt 0 ]; do
          [ "$1" = "--metadata-file" ] && meta="$2"
          shift
        done
        [ -n "$meta" ] && printf '{"containerimage.digest":"sha256:deadbeef"}' > "$meta"
        exit 0 ;;
      *) exit 0 ;;
    esac ;;
  build) exit 0 ;;
  push)  [ -n "\${FAIL_PUSH:-}" ] && exit 1 || exit 0 ;;
  inspect) echo "ghcr.io/some-org/guichet@sha256:deadbeef" ; exit 0 ;;
  *) exit 0 ;;
esac
`

interface RunResult { code: number; out: string; calls: string }

function run(opts: { args?: string[]; env?: Record<string, string> } = {}): RunResult {
  const sandbox = mkdtempSync(join(tmpdir(), 'guic-bp-'))
  const bin = join(sandbox, 'bin')
  mkdirSync(bin)
  for (const [nom, corps] of [['git', GIT_SHIM], ['docker', DOCKER_SHIM]] as const) {
    writeFileSync(join(bin, nom), corps)
    chmodSync(join(bin, nom), 0o755)
  }
  const callLog = join(sandbox, 'calls.log')
  writeFileSync(callLog, '')

  let code = 0
  let out = ''
  try {
    out = execFileSync('bash', ['-c', `"${join(ROOT, SCRIPT)}" "$@" 2>&1`, 'bash', ...(opts.args ?? [])], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, CALL_LOG: callLog, ...opts.env },
    })
  } catch (e) {
    const err = e as { status?: number; stdout?: string }
    code = err.status ?? 1
    out = err.stdout ?? ''
  }
  return { code, out, calls: readFileSync(callLog, 'utf8') }
}

describe('GUIC-639 — build-push.sh : garde-fous de release', () => {
  it('refuse sans version', () => {
    const r = run({ args: [] })
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/version manquante/i)
  })

  it('refuse « latest » comme version de release', () => {
    const r = run({ args: ['latest'] })
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/latest/i)
  })

  it('refuse un arbre de travail non propre — l’image ne correspondrait à aucun commit', () => {
    const r = run({ args: ['v1.0.0'], env: { GIT_DIRTY: '1' } })
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/non propre/i)
    // Rien n'a été construit ni poussé.
    expect(r.calls).not.toMatch(/docker build/)
  })
})

describe('GUIC-639 — nom d’image GHCR', () => {
  it('force les MINUSCULES même si le dépôt contient des majuscules', () => {
    // Le vrai dépôt : …-CJS/guichet. GHCR refuse les majuscules.
    const r = run({
      args: ['v1.0.0'],
      env: { GIT_REMOTE: 'git@github.com:adiop-consortiumjeunessesenegal-org-CJS/guichet.git' },
    })
    expect(r.code).toBe(0)
    // L'image construite ET poussée est en minuscules.
    expect(r.calls).toMatch(/ghcr\.io\/adiop-consortiumjeunessesenegal-org-cjs\/guichet:v1\.0\.0/)
    expect(r.calls).not.toMatch(/CJS/)
  })
})

describe('GUIC-639 — sortie par empreinte', () => {
  it('affiche la RÉFÉRENCE PAR EMPREINTE, pas le tag mutable', () => {
    const r = run({ args: ['v1.0.0'] })
    expect(r.code).toBe(0)
    // Dernière ligne = l'empreinte seule (capturable par un script appelant).
    const derniere = r.out.trim().split('\n').pop() ?? ''
    expect(derniere).toMatch(/@sha256:[0-9a-f]+$/)
  })

  it('déploie par empreinte dans la commande suggérée', () => {
    const r = run({ args: ['v1.0.0'] })
    expect(r.out).toMatch(/GUICHET_IMAGE=ghcr\.io\/\S+@sha256:/)
    expect(r.out).toMatch(/deploy\.sh/)
  })

  it('échoue clairement si le push est refusé (non authentifié)', () => {
    const r = run({ args: ['v1.0.0'], env: { FAIL_PUSH: '1' } })
    expect(r.code).not.toBe(0)
    expect(r.out).toMatch(/docker login ghcr\.io|write:packages/i)
  })
})

/**
 * GUIC-674 — L'architecture est la raison d'être du passage à buildx, et c'est
 * la panne la plus coûteuse à découvrir tard : construite sur un Mac ARM, une
 * image sans `--platform` est en arm64 et le conteneur meurt au démarrage sur
 * le serveur OVH (« exec format error »), après le pull et la migration.
 */
describe('GUIC-674 — l’image doit être amd64', () => {
  it('force linux/amd64 par défaut', () => {
    const r = run({ args: ['v1.0.0'] })
    expect(r.code).toBe(0)
    expect(r.calls).toMatch(/--platform linux\/amd64/)
  })

  it('passe par buildx — le driver docker par défaut ne pousse pas de cross-plateforme', () => {
    const r = run({ args: ['v1.0.0'] })
    expect(r.calls).toMatch(/docker buildx build/)
    // Plus de `docker build` nu : il produirait l'architecture de l'hôte.
    expect(r.calls).not.toMatch(/^docker build /m)
  })

  it('reste surchargeable pour un manifeste multi-arch', () => {
    const r = run({ args: ['v1.0.0'], env: { PLATFORMS: 'linux/amd64,linux/arm64' } })
    expect(r.code).toBe(0)
    expect(r.calls).toMatch(/--platform linux\/amd64,linux\/arm64/)
  })
})
