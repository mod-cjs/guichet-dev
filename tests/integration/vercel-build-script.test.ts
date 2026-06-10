/**
 * @jest-environment node
 *
 * GUIC-350 — Anti-régression : le script vercel-build de package.json
 * doit lancer `prisma migrate deploy` avant `next build`.
 *
 * Bug prod 2026-06-08 : crash P2022 `column profil_recherche does not exist`
 * sur /opportunites/[slug] car la migration GUIC-257 n'a pas été appliquée
 * sur Railway. Cause systémique : le build Vercel ne fait que
 * `prisma generate` (postinstall) + `next build`, jamais `migrate deploy`.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('GUIC-350 — vercel-build applique les migrations Prisma', () => {
  const pkg = JSON.parse(
    readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'),
  ) as { scripts?: Record<string, string> }

  it('package.json a un script vercel-build', () => {
    expect(pkg.scripts?.['vercel-build']).toBeDefined()
  })

  it('vercel-build commence par prisma migrate deploy', () => {
    const script = pkg.scripts!['vercel-build']
    expect(script).toMatch(/^prisma\s+migrate\s+deploy/)
  })

  it('vercel-build enchaîne avec next build', () => {
    const script = pkg.scripts!['vercel-build']
    expect(script).toMatch(/next\s+build/)
  })

  it('postinstall reste sur prisma generate (pas de migrate deploy en double)', () => {
    expect(pkg.scripts!.postinstall).toBe('prisma generate')
  })

  it('build local (npm run build) ne contient PAS prisma migrate deploy', () => {
    // Le build local ne doit jamais toucher la DB (risque : un dev en local
    // fait un build et pousse une migration de test sur la prod).
    const buildScript = pkg.scripts!.build
    expect(buildScript).not.toContain('migrate deploy')
  })
})
