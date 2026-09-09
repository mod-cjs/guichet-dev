/**
 * @jest-environment jsdom
 *
 * GUIC-709 — Le CTA d'un fichier doit passer par notre proxy.
 *
 * Le compteur posé dans le proxy ne vaut que si le CTA y mène. Tant qu'il
 * pointe droit sur l'URL externe, le fichier part sans traverser nos serveurs
 * et le compteur reste à zéro par construction — un compteur vide qu'on croit
 * juste est pire que pas de compteur.
 *
 * Uniquement pour les PDF : c'est le seul type que le proxy sait servir en
 * pièce jointe. Une vidéo ou un lien s'ouvre chez la source, et « emporter »
 * n'y veut rien dire — on ne va pas inventer un événement pour uniformiser.
 */
import { render, screen } from '@testing-library/react'
import { RessourceDetailClient } from '@/app/(public)/ressources/[id]/ressource-detail-client'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/ressources/r1',
}))

const base = {
  id: 'r1',
  titre: 'Guide pour rédiger un CV efficace',
  description: 'desc',
  theme: 'Emploi',
  vues: 0,
  niveau: null,
  langue: null,
  categorie: null,
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-01T10:00:00.000Z',
}

const rendre = (over: Record<string, unknown>) =>
  render(
    <RessourceDetailClient
      detail={{ ...base, ...over } as never}
      pageUrl="https://guichet.example/ressources/r1"
    />,
  )

beforeEach(() => {
  // `PdfFrame` sonde la source par un HEAD au montage ; sans ce stub, jsdom
  // n'a pas de `fetch` et la fiche PDF ne rend pas du tout.
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'content-type': 'application/pdf' }),
  }) as never
})

describe('GUIC-709 — le CTA passe par le proxy pour les fichiers', () => {
  it('given un PDF, then le CTA pointe le proxy en mode téléchargement', () => {
    rendre({ type: 'PDF', url: 'https://exemple.org/g.pdf' })
    expect(screen.getByTestId('ressource-consult-cta')).toHaveAttribute(
      'href',
      '/api/ressources/r1/proxy?download=1',
    )
  })

  it('given une vidéo, then le CTA reste sur la source', () => {
    rendre({ type: 'Video', url: 'https://exemple.org/v' })
    expect(screen.getByTestId('ressource-consult-cta')).toHaveAttribute(
      'href',
      'https://exemple.org/v',
    )
  })

  it('given un lien, then le CTA reste sur la source et s\'ouvre à part', () => {
    rendre({ type: 'Lien', url: 'https://exemple.org/page' })
    const cta = screen.getByTestId('ressource-consult-cta')
    expect(cta).toHaveAttribute('href', 'https://exemple.org/page')
    expect(cta).toHaveAttribute('target', '_blank')
    expect(cta).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('given un PDF, then le CTA ne s\'ouvre PAS dans un nouvel onglet', () => {
    // Le proxy renvoie `Content-Disposition: attachment` : le navigateur
    // télécharge sans naviguer. Un `target=_blank` laisserait un onglet vide.
    rendre({ type: 'PDF', url: 'https://exemple.org/g.pdf' })
    expect(screen.getByTestId('ressource-consult-cta')).not.toHaveAttribute('target')
  })
})
