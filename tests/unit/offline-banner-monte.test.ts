/**
 * GUIC-689 (Lot D) — le bandeau hors-ligne doit être MONTÉ, pas seulement écrit.
 *
 * Le mode hors-ligne a été livré sous forme de primitive autonome
 * (`OfflineBanner` + `useOnlineStatus`), mais une primitive qu'aucun layout ne
 * rend n'existe pas pour l'utilisateur : le public cible est sur réseau
 * intermittent, c'est précisément la situation que la fonctionnalité doit
 * couvrir.
 *
 * Le montage se fait UNE SEULE FOIS dans le layout racine (comme les shells
 * mobiles) plutôt qu'espace par espace : moins de points d'oubli, couverture
 * totale, y compris sur les écrans publics.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '../..')
const layout = readFileSync(resolve(ROOT, 'src/app/layout.tsx'), 'utf-8')

describe('GUIC-689 — bandeau hors-ligne monté globalement', () => {
  it('le layout racine importe et rend OfflineBanner', () => {
    expect(layout).toMatch(/import\s*\{[^}]*OfflineBanner[^}]*\}/)
    expect(layout).toMatch(/<OfflineBanner\s*\/>/)
  })

  it('il est rendu avant le contenu (bandeau sticky en haut de page)', () => {
    const posBanner = layout.indexOf('<OfflineBanner')
    const posChildren = layout.indexOf('{children}')
    expect(posBanner).toBeGreaterThan(-1)
    expect(posBanner).toBeLessThan(posChildren)
  })
})
