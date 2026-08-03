/**
 * GUIC-689 — Le logo v5 doit être celui qui est SERVI, et la variante blanche
 * doit être utilisée sur les surfaces sombres.
 *
 * Deux défauts constatés :
 *  1. `public/logo-guichet.png` était identique, octet pour octet, à
 *     `design-guichet-v5/assets/logo-guichet-original.png` — c'est-à-dire
 *     l'ANCIEN logo. La livraison v5 fournit un nouveau `logo-guichet.png`
 *     qui n'avait jamais été copié : tout le shell affichait l'ancien.
 *  2. La sidebar conseiller blanchissait le logo couleur avec un filtre CSS
 *     (`brightness(0) invert(1)`) alors que la livraison fournit un
 *     `logo-guichet-blanc.png` dédié. Le filtre écrase les couleurs de marque
 *     en aplat blanc — le symbole perd sa forme distinctive.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '../..')
const sha = (p: string) => createHash('sha1').update(readFileSync(p)).digest('hex')

describe('GUIC-689 — logo v5 servi par l’application', () => {
  it('public/logo-guichet.png est le logo v5, pas l’ancien', () => {
    const servi = sha(resolve(ROOT, 'public/logo-guichet.png'))
    const v5 = sha(resolve(ROOT, 'design-guichet-v5/assets/logo-guichet.png'))
    const ancien = sha(resolve(ROOT, 'design-guichet-v5/assets/logo-guichet-original.png'))
    expect(servi).toBe(v5)
    expect(servi).not.toBe(ancien)
  })

  it('la variante blanche et le symbole sont servis (surfaces sombres, formats compacts)', () => {
    for (const f of ['public/logo-guichet-blanc.png', 'public/logo-symbole.png']) {
      expect(existsSync(resolve(ROOT, f))).toBe(true)
    }
    expect(sha(resolve(ROOT, 'public/logo-guichet-blanc.png'))).toBe(
      sha(resolve(ROOT, 'design-guichet-v5/assets/logo-guichet-blanc.png')),
    )
  })

  it('aucun shell ne blanchit le logo par filtre CSS', () => {
    const shells = [
      'src/components/layout/ConseillerSidebar/index.tsx',
      'src/components/layout/BenefSidebar/index.tsx',
      'src/components/layout/RecruteurSidebar/index.tsx',
      'src/components/layout/AppTopbar/index.tsx',
      'src/components/layout/Header/index.tsx',
    ]
    for (const rel of shells) {
      const src = readFileSync(resolve(ROOT, rel), 'utf-8')
      const filtres = [...src.matchAll(/filter:\s*['"]?brightness\(0\)\s+invert\(1\)/g)]
      if (filtres.length > 0) {
        throw new Error(`${rel} blanchit le logo par filtre CSS — utiliser /logo-guichet-blanc.png`)
      }
    }
  })
})
