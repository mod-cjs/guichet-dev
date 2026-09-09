/**
 * GUIC-689 — Hygiène tokens pages publiques + auth (design v5).
 *
 * Sentinelle de contrat (lecture de source) : les écrans /auth/connexion,
 * /auth/deconnexion et le Footer marketing ne doivent plus utiliser de
 * classes Tailwind génériques (bg-red-50, bg-green-50, text-green-600) ni
 * de modificateur d'opacité `/30` sur une couleur pilotée par variable CSS
 * (--gj-red) — ce modificateur ne fonctionne pas sur var(). Ils doivent
 * porter les tokens sémantiques `gj-*-soft` / `gj-*-ink` / `gj-ink-teal`.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '..', '..')

function read(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf8')
}

describe('GUIC-689 — hygiène tokens /auth/connexion', () => {
  const src = () => read('src/app/auth/connexion/page.tsx')

  it('ne contient plus bg-red-50', () => {
    expect(src()).not.toMatch(/bg-red-50/)
  })

  it("ne contient plus le modificateur d'opacité /30 sur gj-red", () => {
    expect(src()).not.toMatch(/gj-red\/30/)
  })

  it('porte les tokens bg-gj-red-soft / text-gj-red-ink pour le bandeau d\'erreur', () => {
    expect(src()).toMatch(/bg-gj-red-soft/)
    expect(src()).toMatch(/text-gj-red-ink/)
  })

  it('le CTA SSO porte bg-gj-teal-deep (pas bg-gj-teal)', () => {
    const content = src()
    const ctaBlock = content.slice(content.indexOf('Continuer avec mon compte CJS') - 400)
    expect(ctaBlock).toMatch(/bg-gj-teal-deep\b/)
    expect(ctaBlock).toMatch(/hover:bg-gj-teal-deep-2\b/)
  })

  it("utilise le composant Icon (sprite) au lieu d'un <svg> inline pour le check", () => {
    const content = src()
    expect(content).toMatch(/<Icon\s+name="check"/)
    // Ancien path inline du check (charte SVG manuelle) ne doit plus apparaître.
    expect(content).not.toMatch(/M16\.707 5\.293/)
  })
})

describe('GUIC-689 — hygiène tokens /auth/deconnexion', () => {
  const src = () => read('src/app/(public)/auth/deconnexion/page.tsx')

  it('ne contient plus bg-green-50 ni text-green-600', () => {
    expect(src()).not.toMatch(/bg-green-50/)
    expect(src()).not.toMatch(/text-green-600/)
  })

  it('porte les tokens bg-gj-green-soft / text-gj-green-ink pour le succès', () => {
    expect(src()).toMatch(/bg-gj-green-soft/)
    expect(src()).toMatch(/text-gj-green-ink/)
  })

  it("utilise le composant Icon (sprite) pour l'icône de succès", () => {
    const content = src()
    expect(content).toMatch(/<Icon\s+name="check-circle"/)
    // Ancien path inline (polyline du succès) ne doit plus apparaître.
    expect(content).not.toMatch(/polyline points="20 6 9 17 4 12"/)
  })
})

describe('GUIC-689 — hygiène tokens /centres (bouton desktop "Mes réservations")', () => {
  // jsdom (cssstyle) ne sérialise pas les styles inline utilisant var() dans
  // getAttribute('style') — vérification par lecture de source plutôt que RTL.
  const src = () => read('src/app/(public)/centres/centres-all-client.tsx')

  function headerBlock(): string {
    const content = src()
    const start = content.indexOf('<header')
    const end = content.indexOf('</header>', start)
    return content.slice(start, end)
  }

  it('bouton "Mes réservations" (header desktop) devient neutre : border var(--gj-line) + texte var(--gj-ink)', () => {
    const block = headerBlock()
    const idx = block.indexOf('mes-reservations-centres')
    const ctaBlock = block.slice(idx, idx + 300)
    expect(ctaBlock).toMatch(/1\.5px solid var\(--gj-line\)/)
    expect(ctaBlock).toMatch(/color:\s*'var\(--gj-ink\)'/)
    expect(ctaBlock).not.toMatch(/var\(--gj-teal-deep\)/)
  })

  it('bouton "Ma carte CJS" (header desktop) reste plein teal-deep', () => {
    const block = headerBlock()
    const idx = block.indexOf('/jeune/ma-carte')
    const ctaBlock = block.slice(idx, idx + 300)
    expect(ctaBlock).toMatch(/var\(--gj-teal-deep\)/)
  })
})

describe('GUIC-689 — hygiène tokens Footer marketing', () => {
  const src = () => read('src/components/layout/Footer/index.tsx')

  it('utilise bg-gj-ink-teal (navy charte) au lieu de bg-gj-ink', () => {
    const content = src()
    expect(content).toMatch(/bg-gj-ink-teal\b/)
    // bg-gj-ink seul (pas suivi de -teal) ne doit plus apparaître.
    expect(content).not.toMatch(/bg-gj-ink(?!-teal)\b/)
  })
})
