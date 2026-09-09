import { render } from '@testing-library/react'
import { SkeletonCard } from '@/components/ui/Skeleton'

/**
 * GUIC-689 — Lot C2.6 : gabarit carte aligné sur `system-states.jsx` `SkCard`
 * — icône 48×48 à gauche, 2 lignes au centre, badge 74×34 à droite.
 */
describe('<SkeletonCard />', () => {
  it('rend le gabarit carte : icône 48×48 + 2 lignes + badge 74×34', () => {
    const { container } = render(<SkeletonCard />)
    const blocks = Array.from(container.querySelectorAll('[aria-hidden]')) as HTMLElement[]
    expect(blocks).toHaveLength(4)

    const [icon, line1, line2, badge] = blocks
    expect(icon.style.width).toBe('48px')
    expect(icon.style.height).toBe('48px')

    expect(line1.style.width).toBe('62%')
    expect(line2.style.width).toBe('40%')

    expect(badge.style.width).toBe('74px')
    expect(badge.style.height).toBe('34px')
  })
})
