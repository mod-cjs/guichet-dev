/**
 * @jest-environment node
 *
 * GUIC-689 — Lot C2 (Bibliothèque Composants) : synchronisation
 * ICON_NAMES ↔ public/icons.svg.
 *
 * Sentinelle durable : chaque nom déclaré dans `ICON_NAMES` doit avoir un
 * `<symbol id="i-<name>">` correspondant dans le sprite servi au runtime.
 * Sans ce garde-fou, une icône ajoutée côté TypeScript sans son symbole SVG
 * (ou l'inverse) casse silencieusement en prod — `<Icon>` rend une balise
 * <use> vers un id inexistant, donc rien ne s'affiche, sans erreur console.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ICON_NAMES } from '@/components/ui/Icon'

describe('GUIC-689 — synchronisation ICON_NAMES ↔ public/icons.svg', () => {
  const sprite = readFileSync(resolve(__dirname, '../../public/icons.svg'), 'utf-8')

  it.each(ICON_NAMES)('%s a un <symbol id="i-%s"> dans le sprite', (name) => {
    expect(sprite).toMatch(new RegExp(`<symbol id="i-${name}"[^>]*>`))
  })

  it('les 4 icônes design v5 (arrow-left, inclusion, light, refresh) sont déclarées ET présentes', () => {
    const NEW_ICONS = ['arrow-left', 'inclusion', 'light', 'refresh'] as const
    for (const name of NEW_ICONS) {
      expect(ICON_NAMES).toContain(name)
      expect(sprite).toMatch(new RegExp(`id="i-${name}"`))
    }
  })
})
