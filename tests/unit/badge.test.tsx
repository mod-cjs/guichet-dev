import { render } from '@testing-library/react'
import { Badge } from '@/components/ui/Badge'

/**
 * GUIC-689 — Lot C2.3 : bordure de statut optionnelle (`bordered`), assortie
 * à la teinte du point (réf. `component-kit.jsx` `pill()`), sans changer le
 * rendu par défaut des call sites existants.
 */
describe('<Badge />', () => {
  it('ne porte aucune bordure par défaut (rendu inchangé)', () => {
    const { container } = render(<Badge variant="teal">Actif</Badge>)
    const el = container.firstChild as HTMLElement
    expect(el.className).not.toMatch(/\bborder\b/)
  })

  it.each([
    ['teal', 'border-gj-teal-deep'],
    ['yellow', 'border-gj-yellow-deep'],
    ['red', 'border-gj-red'],
    ['blue', 'border-gj-blue'],
    ['green', 'border-gj-green'],
    ['grey', 'border-gj-line-strong'],
    ['new', 'border-gj-teal-deep'],
  ] as const)('variant=%s + bordered applique %s', (variant, expectedBorderClass) => {
    const { container } = render(
      // @ts-expect-error GUIC-689 — prop `bordered` pas encore implémentée (RED)
      <Badge variant={variant} bordered>
        x
      </Badge>,
    )
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/\bborder\b/)
    expect(el.className).toMatch(new RegExp(expectedBorderClass))
  })
})
