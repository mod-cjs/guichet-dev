/**
 * @jest-environment node
 *
 * GUIC-689 — Toute variable dont l'ABSENCE empêche l'application de démarrer
 * doit être fournie au workflow E2E.
 *
 * POURQUOI CE TEST EXISTE : GUIC-695 a rendu `CONSULTATION_HASH_KEY`
 * obligatoire en production (refuser vaut mieux qu'une pseudonymisation
 * réversible — le garde est juste). Mais `.github/workflows/e2e.yml` sert un
 * **build de prod** (`PLAYWRIGHT_WEBSERVER_CMD: npm run start`), donc le garde
 * s'y déclenche. La variable n'a jamais été ajoutée au workflow : le job
 * Playwright échoue depuis, sur `dev` comme sur chaque PR, avant même de jouer
 * un seul test.
 *
 * `env-documente.test.ts` ne pouvait pas l'attraper : il vérifie que la
 * variable est DOCUMENTÉE, et elle l'est. Documenté ≠ fourni.
 *
 * La liste n'est pas maintenue à la main : elle est DÉRIVÉE des messages
 * d'erreur du code (`… manquante`, `… requis`). Ajouter demain un nouveau
 * garde de démarrage sans compléter le workflow fera échouer ce test, au lieu
 * de rendre la CI rouge en silence.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const RACINE = process.cwd()
const WORKFLOW_E2E = join(RACINE, '.github/workflows/e2e.yml')
const DOCKERFILE = join(RACINE, 'Dockerfile')

/**
 * Variables citées dans un message d'erreur de type « X manquante / requis ».
 * C'est la signature, dans ce dépôt, d'un garde qui refuse de démarrer.
 */
const MOTIF_GARDE = /'[^']*\b([A-Z][A-Z0-9_]{5,})\b[^']*(?:manquante|requise|requis)[^']*'/g

function fichiersSource(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) fichiersSource(p, acc)
    else if (/\.tsx?$/.test(e)) acc.push(p)
  }
  return acc
}

/**
 * Le motif seul attrape aussi des mots en majuscules qui n'ont rien d'une
 * variable d'environnement (`DISTINCT`, `ATTEST`…). On croise donc avec les
 * lectures réelles : une variable bloquante est citée dans un message de garde
 * ET lue quelque part via `process.env`.
 */
function variablesBloquantes(): string[] {
  const citees = new Set<string>()
  const lues = new Set<string>()
  for (const f of fichiersSource(join(RACINE, 'src'))) {
    const src = readFileSync(f, 'utf-8')
    for (const m of src.matchAll(MOTIF_GARDE)) citees.add(m[1])
    for (const m of src.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) lues.add(m[1])
    // Certains modules typent leur environnement (`interface EnvX { FOO?: string }`)
    // et reçoivent `process.env` : la lecture n'y est pas littérale.
    for (const m of src.matchAll(/^\s{2}([A-Z][A-Z0-9_]{5,})\??:\s+string/gm)) lues.add(m[1])
  }
  return [...citees].filter((v) => lues.has(v)).sort()
}

/**
 * Fournies autrement que par le bloc `env:` du workflow.
 * Toute addition ici est une dérogation à justifier, pas une commodité.
 */
const FOURNIES_AUTREMENT = new Set([
  // Le SSO est mocké en E2E (PLAYWRIGHT_SSO_MOCK) : aucun appel machine réel,
  // donc aucun garde SSO_API_* n'est franchi.
  'SSO_API_KEY',
  'SSO_API_SECRET',
])

describe('GUIC-689 — variables bloquantes fournies au workflow E2E', () => {
  it('détecte réellement des gardes (garde-fou anti-faux-vert)', () => {
    const bloquantes = variablesBloquantes()
    expect(bloquantes.length).toBeGreaterThanOrEqual(3)
    expect(bloquantes).toContain('CONSULTATION_HASH_KEY')
  })

  it('chaque variable bloquante est déclarée dans e2e.yml', () => {
    const yml = readFileSync(WORKFLOW_E2E, 'utf-8')
    const manquantes = variablesBloquantes()
      .filter((v) => !FOURNIES_AUTREMENT.has(v))
      .filter((v) => !new RegExp(`^\\s*${v}\\s*:`, 'm').test(yml))
    expect(manquantes).toEqual([])
  })

  it('le workflow sert bien un build de prod — c’est ce qui arme les gardes', () => {
    const yml = readFileSync(WORKFLOW_E2E, 'utf-8')
    // Si un jour le workflow repassait sur `next dev`, les gardes ne se
    // déclencheraient plus et ce test perdrait son sens : on l'ancre.
    expect(yml).toMatch(/PLAYWRIGHT_WEBSERVER_CMD:\s*npm run start/)
  })

  /**
   * Même défaut, deuxième endroit. Le stage `builder` du Dockerfile porte une
   * liste de valeurs FACTICES précisément parce que « les garde-fous d'env
   * throwent si absents » pendant la collecte des routes de `next build`.
   *
   * `CONSULTATION_HASH_KEY` y manquait aussi. Ça ne cassait pas le build
   * aujourd'hui — le hook d'instrumentation n'est pas chargé à la collecte —
   * mais le jour où une page importe ce module, le build tombe pour la même
   * raison que le job Playwright. On ferme la famille de défauts d'un coup.
   */
  it('chaque variable bloquante est aussi factice-isée dans le stage builder', () => {
    const dockerfile = readFileSync(DOCKERFILE, 'utf-8')
    const manquantes = variablesBloquantes()
      .filter((v) => !FOURNIES_AUTREMENT.has(v))
      .filter((v) => !new RegExp(`\\b${v}=`).test(dockerfile))
    expect(manquantes).toEqual([])
  })

  it('les valeurs du builder restent des factices, jamais de vrais secrets', () => {
    const dockerfile = readFileSync(DOCKERFILE, 'utf-8')
    const bloc = dockerfile.match(/ENV REDIS_URL=[\s\S]*?(?=\n(?:#|ARG|COPY|RUN))/)?.[0] ?? ''
    expect(bloc).toBeTruthy()
    for (const [, nom, valeur] of bloc.matchAll(/([A-Z][A-Z0-9_]+)=(\S*)/g)) {
      if (nom === 'REDIS_URL' || nom.endsWith('_URL') || nom === 'SSO_CLIENT_ID') continue
      // Un secret de build doit s'annoncer comme tel : impossible de le confondre
      // avec une vraie valeur oubliée là.
      expect(valeur).toMatch(/build/i)
    }
  })
})
