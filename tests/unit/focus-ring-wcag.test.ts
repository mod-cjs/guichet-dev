/**
 * @jest-environment node
 *
 * GUIC-689 (É-04) — L'anneau de focus doit rester perceptible PARTOUT.
 *
 * WCAG 2.2 §1.4.11 exige 3:1 entre l'indicateur de focus et les couleurs
 * adjacentes. Le registre d'écarts avait rejeté l'ambre v5 (`#f8a309`) sur ce
 * motif — à raison — mais avait conservé l'existant `#00B287` en le qualifiant
 * de « dette préexistante ». Recalcul :
 *
 *   #00B287 vs blanc          2.72   ✗
 *   #00B287 vs fond de page   2.53   ✗
 *   #00B287 vs teal           1.78   ✗
 *
 * L'anneau était donc hors norme sur les trois surfaces les plus courantes de
 * l'application. Rejeter l'ambre ne suffisait pas : il fallait aussi réparer ce
 * qu'on gardait.
 *
 * AUCUNE couleur unique ne passe sur les quatre surfaces à la fois — un teal
 * sombre échoue sur fond sombre, un ton clair échoue sur fond clair. D'où
 * l'indicateur BICOLORE de WCAG 2.2 : deux tons contrastés entre eux, dont l'un
 * au moins atteint 3:1 sur chaque surface.
 *
 * Ce test ne recopie aucune revendication : il recalcule les ratios depuis les
 * valeurs réellement écrites dans `tokens.css`.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const CSS = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf-8')

/** Valeur d'un token, lue dans le premier bloc qui la déclare. */
function token(nom: string): string {
  const m = CSS.match(new RegExp(`${nom}\\s*:\\s*([^;]+);`))
  if (!m) throw new Error(`Token ${nom} absent de tokens.css`)
  return m[1].trim()
}

function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Surfaces sur lesquelles un élément focusable existe réellement. */
const SURFACES: Record<string, string> = {
  'surface blanche (cartes, modales)': '#FFFFFF',
  'fond de page clair': '#F5F7F8',
  'surface sombre (thème sombre, admin)': '#152620',
  'aplat teal (CTA, bandeaux)': '#027f7e',
}

describe('GUIC-689 (É-04) — indicateur de focus bicolore', () => {
  it('les deux tons sont déclarés', () => {
    expect(token('--focus-ring-color')).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(token('--focus-ring-halo')).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('les deux tons se distinguent l’un de l’autre (≥ 3:1)', () => {
    // Sinon l'anneau « bicolore » n'en est pas un : il se lit comme un seul trait.
    expect(contrast(token('--focus-ring-color'), token('--focus-ring-halo')))
      .toBeGreaterThanOrEqual(3)
  })

  it.each(Object.entries(SURFACES))(
    'sur %s, au moins un des deux tons atteint 3:1',
    (_nom, fond) => {
      const meilleur = Math.max(
        contrast(token('--focus-ring-color'), fond),
        contrast(token('--focus-ring-halo'), fond),
      )
      expect(meilleur).toBeGreaterThanOrEqual(3)
    },
  )

  it('la règle CSS peint RÉELLEMENT les deux tons', () => {
    // Déclarer les tokens ne suffit pas : un token non consommé ne se voit pas.
    const regle = CSS.slice(CSS.indexOf(':focus-visible'))
    const bloc = regle.slice(0, regle.indexOf('}'))
    expect(bloc).toMatch(/--focus-ring-color|--focus-ring\b/)
    expect(bloc).toMatch(/--focus-ring-halo/)
  })

  it('l’ambre v5 reste rejeté — la preuve chiffrée est conservée', () => {
    expect(contrast('#f8a309', '#F5F7F8')).toBeLessThan(3)
  })
})
