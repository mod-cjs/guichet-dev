/**
 * GUIC-689 (vague 3, Lot G2) — `NotificationsClient.tsx` :
 * - le dégradé de la pastille Yaye était en hex en dur
 *   (`linear-gradient(135deg, #19A757 0%, #0A807F 100%)`), désynchronisé du
 *   token `--gj-yaye-gradient` (`#0A807F` ne correspond à AUCUNE couleur de
 *   la palette actuelle — résidu d'une palette antérieure).
 * - deux textes sous le plancher typographique 11px (`--fs-100`) : le compteur
 *   de tab (`fontSize: 10`) et l'âge relatif de la notif (`fontSize: 10.5`).
 *
 * Sentinelle de contrat (lecture de source, pas de rendu) : jsdom/cssstyle ne
 * sérialise pas fidèlement les styles inline utilisant `var()`, donc on
 * vérifie le texte source plutôt que le DOM calculé (même pattern que
 * `design-v5-a11y-font-floor-jeune.test.ts`).
 */
import fs from 'fs'
import path from 'path'

const SRC = path.join(process.cwd(), 'src/components/jeune/NotificationsClient.tsx')

function read(): string {
  return fs.readFileSync(SRC, 'utf-8')
}

describe('NotificationsClient — dégradé Yaye câblé sur le token (GUIC-689)', () => {
  it('utilise var(--gj-yaye-gradient), plus aucun hex en dur pour la pastille Yaye', () => {
    const content = read()
    expect(content).toMatch(/var\(--gj-yaye-gradient\)/)
    expect(content).not.toMatch(/#19A757/i)
    expect(content).not.toMatch(/#0A807F/i)
  })

  it("aucun hex en dur dans tout le fichier (tokens gj-* uniquement)", () => {
    expect(read()).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it("le ternaire isYaye pointe précisément vers le token (pas juste présent ailleurs dans le fichier)", () => {
    expect(read()).toMatch(/isYaye\s*\n\s*\?\s*'var\(--gj-yaye-gradient\)'/)
  })
})

describe('NotificationsClient — plancher typographique 11px (--fs-100)', () => {
  it('aucun fontSize numérique inline < 11', () => {
    const content = read()
    const tooSmall = [...content.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)/g)]
      .map((m) => parseFloat(m[1]))
      .filter((v) => v < 11)
    expect(tooSmall).toEqual([])
  })
})
