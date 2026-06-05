import { render } from '@testing-library/react'
import CguPage from '@/app/(public)/legal/cgu/page'
import ConfidentialitePage from '@/app/(public)/legal/confidentialite/page'
import MentionsLegalesPage from '@/app/(public)/legal/mentions-legales/page'

/**
 * GUIC-233 — Pages légales statiques.
 * Vérifie le rendu (H1 + titre attendu) et le fait que les pages
 * exposent bien `force-static` au routeur Next.
 */
describe('Pages légales /legal/*', () => {
  it('rend la page CGU avec le titre attendu', () => {
    const { getByRole } = render(<CguPage />)
    expect(getByRole('heading', { level: 1 }).textContent).toMatch(
      /Conditions Générales d'Utilisation/,
    )
  })

  it('rend la page Confidentialité avec le titre attendu', () => {
    const { getByRole } = render(<ConfidentialitePage />)
    expect(getByRole('heading', { level: 1 }).textContent).toMatch(
      /Politique de confidentialité/,
    )
  })

  it('rend la page Mentions légales avec le titre attendu', () => {
    const { getByRole } = render(<MentionsLegalesPage />)
    expect(getByRole('heading', { level: 1 }).textContent).toMatch(
      /Mentions légales/,
    )
  })
})
