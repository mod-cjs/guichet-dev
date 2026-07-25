/**
 * @jest-environment jsdom
 *
 * GUIC-673 — L'écran d'attente (conseiller/recruteur sans rattachement) doit offrir une
 * sortie : sans lien de déconnexion, l'utilisateur est en impasse.
 */
import { render, screen } from '@testing-library/react'
import { EspaceEnAttente } from '@/components/layout/EspaceEnAttente'

describe('GUIC-673 — déconnexion sur l’écran d’attente', () => {
  it.each(['conseiller', 'recruteur'] as const)(
    'propose un lien de déconnexion vers /api/auth/logout (%s)',
    (espace) => {
      render(<EspaceEnAttente espace={espace} />)
      const logout = screen.getByRole('link', { name: /déconn/i })
      expect(logout).toHaveAttribute('href', '/api/auth/logout')
    },
  )
})
