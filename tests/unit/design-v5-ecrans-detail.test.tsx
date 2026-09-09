/**
 * @jest-environment jsdom
 *
 * GUIC-691 — Règles v5 sur les écrans de détail restants (événement, ressource).
 *
 * Deux règles opposables du handoff sont vérifiées ici :
 *  - « S'inscrire » est un geste de conversion → magenta, comme « Postuler » ;
 *  - le rouge ne signale QUE l'urgence d'échéance. Un type de contenu (un PDF)
 *    n'est pas une urgence : le peindre en rouge vide le signal de son sens.
 */
import { render, screen } from '@testing-library/react'
import { EvenementInscriptionCta } from '@/components/evenements/EvenementInscriptionCta'
import { TYPE_META_RESSOURCE } from '@/components/ressources/RessourceDetailHero'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/agenda/ev-1',
}))

describe('GUIC-691 — écrans de détail conformes v5', () => {
  describe('événement — CTA d’inscription', () => {
    it('porte le magenta de conversion : s’inscrire est un engagement', () => {
      render(<EvenementInscriptionCta evenementId="ev-1" isAuthenticated initialInscrit={false} ouvertInscription complet={false} />)
      const cta = screen.getByRole('button', { name: /S'inscrire/i })
      expect(cta).toHaveClass('gj-cta')
    })

    it('laisse la désinscription en action secondaire, jamais en magenta', () => {
      render(<EvenementInscriptionCta evenementId="ev-1" isAuthenticated initialInscrit ouvertInscription complet={false} />)
      const cta = screen.getByRole('button', { name: /Se désinscrire/i })
      expect(cta).not.toHaveClass('gj-cta')
    })

    it('traite l’invitation à se connecter comme le même geste', () => {
      render(<EvenementInscriptionCta evenementId="ev-1" isAuthenticated={false} initialInscrit={false} ouvertInscription complet={false} />)
      const cta = screen.getByRole('button', { name: /Se connecter pour s'inscrire/i })
      expect(cta).toHaveClass('gj-cta')
    })
  })

  describe('ressource — couleur par type', () => {
    it('n’attribue le rouge à aucun type de contenu', () => {
      for (const [type, meta] of Object.entries(TYPE_META_RESSOURCE)) {
        expect(`${type}:${meta.bg}`).not.toMatch(/red/)
        expect(`${type}:${meta.text}`).not.toMatch(/red/)
        expect(`${type}:${meta.badge}`).not.toMatch(/red/)
      }
    })

    it('couvre les cinq types sans trou', () => {
      expect(Object.keys(TYPE_META_RESSOURCE).sort()).toEqual(['Guide', 'Lien', 'Outil', 'PDF', 'Video'])
    })
  })
})
