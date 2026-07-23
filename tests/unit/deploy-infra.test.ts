/**
 * @jest-environment node
 *
 * GUIC-662 — Régularise 3 trous de deploy-infra trouvés en déployant la préprod :
 *   1. `.dockerignore` absent → contexte de build pollué (node_modules ARM, .git, worktrees ~1 Go).
 *   2. Dockerfile non buildable sans build-arg externe (le CD n'en passe aucun) : `prisma generate`
 *      exige `DATABASE_URL`, `next build` importe le client Redis (garde-fou `REDIS_URL`).
 *   3. `backup.sh` préprod : réseau calculé faux (`${projet}_guichet`) alors que le compose branche
 *      l'app sur le réseau EXTERNE `${SERVICES_NETWORK:-cjs-net}` → « base injoignable ».
 *
 * Sentinelles de contrat (lecture de source), style de pas-de-secret-en-dur.test.ts.
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const P = (p: string) => join(process.cwd(), p)
const R = (p: string) => readFileSync(P(p), 'utf8')

describe('1. .dockerignore', () => {
  it('existe', () => {
    expect(existsSync(P('.dockerignore'))).toBe(true)
  })
  it('exclut node_modules, .git et .claude (worktrees)', () => {
    const di = R('.dockerignore')
    expect(di).toMatch(/node_modules/)
    expect(di).toMatch(/\.git/)
    expect(di).toMatch(/\.claude/)
  })
})

describe('2. Dockerfile buildable sans build-arg externe', () => {
  const df = R('Dockerfile')
  it('déclare ARG DATABASE_URL AVEC une valeur par défaut (le CD ne passe aucun build-arg)', () => {
    // `ARG DATABASE_URL=<valeur>` → prisma generate a une chaîne même sans --build-arg.
    expect(df).toMatch(/ARG\s+DATABASE_URL=\S/)
  })
  it('fournit REDIS_URL au stage builder (next build importe le client Redis)', () => {
    expect(df).toMatch(/ENV[\s\S]*?REDIS_URL=/)
  })
})

describe('3. backup.sh — réseau préprod aligné sur deploy.sh', () => {
  const bk = R('scripts/backup/backup.sh')
  it('dérive le réseau du réseau externe partagé (SERVICES_NETWORK), comme deploy.sh', () => {
    expect(bk).toMatch(/SERVICES_NETWORK/)
  })
  it('n’utilise plus la dérivation fausse ${COMPOSE_PROJECT_NAME}_guichet', () => {
    expect(bk).not.toMatch(/\$\{COMPOSE_PROJECT_NAME\}_guichet/)
  })
})
