/**
 * GUIC-647 — UI du kanban recruteur : zone « Refusées » repliée (réintégration)
 * et panneau de filtres avancés (état poussé dans l'URL).
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const pushMock = jest.fn()
const refreshMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))
jest.mock('@/app/recruteur/candidatures/actions', () => ({
  reintegrerCandidature: jest.fn().mockResolvedValue({ ok: true }),
  deplacerPipeline: jest.fn(),
  basculerFavori: jest.fn(),
  deplacerPipelineGroupe: jest.fn(),
  changerStatutGroupe: jest.fn(),
  basculerFavoriGroupe: jest.fn(),
}))

import { reintegrerCandidature } from '@/app/recruteur/candidatures/actions'
import { RefuseesZone } from '@/app/recruteur/candidatures/RefuseesZone'
import { FiltresPanneau } from '@/app/recruteur/candidatures/FiltresPanneau'
import type { PipelineCard } from '@/lib/loaders/recruteur'

const carte = (id: string): PipelineCard => ({
  id, prenom: 'Awa', nom: 'Diop', age: 24, commune: 'Pikine', niveau: 'Licence',
  skills: ['Python'], match: 82, favori: false, soumiseA: '2026-07-01T10:00:00.000Z',
  offreTitre: 'Stage Data', stage: 'Decision',
})

beforeEach(() => jest.clearAllMocks())

describe('GUIC-647 — <RefuseesZone />', () => {
  it('rien à afficher sans refusée', () => {
    const { container } = render(<RefuseesZone refusees={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche le compteur replié et les candidats', () => {
    render(<RefuseesZone refusees={[carte('r1'), carte('r2')]} />)
    expect(screen.getByText('Refusées (2)')).toBeInTheDocument()
    expect(screen.getAllByText('Awa Diop')).toHaveLength(2)
  })

  it('Réintégrer appelle la server action puis rafraîchit', async () => {
    render(<RefuseesZone refusees={[carte('r1')]} />)
    fireEvent.click(screen.getByRole('button', { name: /Réintégrer/i }))
    await waitFor(() => expect(reintegrerCandidature).toHaveBeenCalledWith('r1'))
    await waitFor(() => expect(refreshMock).toHaveBeenCalled())
  })
})

describe('GUIC-647 — <FiltresPanneau />', () => {
  it('la recherche pousse ?q= en conservant le scope offre', () => {
    render(<FiltresPanneau sp={{ offre: 'o1' }} />)
    fireEvent.change(screen.getByLabelText(/Rechercher un candidat/i), { target: { value: 'awa' } })
    fireEvent.click(screen.getByRole('button', { name: /^Rechercher$/i }))
    expect(pushMock).toHaveBeenCalledWith('/recruteur/candidatures?offre=o1&q=awa')
  })

  it('le panneau expose les filtres avancés et les applique dans l’URL', () => {
    render(<FiltresPanneau sp={{}} />)
    fireEvent.click(screen.getByRole('button', { name: /Filtres/i }))
    fireEvent.change(screen.getByLabelText(/Région/i), { target: { value: 'Dakar' } })
    fireEvent.change(screen.getByLabelText(/Score IA min/i), { target: { value: '70' } })
    fireEvent.click(screen.getByLabelText(/Favoris uniquement/i))
    fireEvent.click(screen.getByRole('button', { name: /Appliquer/i }))
    const url = pushMock.mock.calls[0][0] as string
    expect(url).toContain('region=Dakar')
    expect(url).toContain('scoreMin=70')
    expect(url).toContain('favoris=1')
  })

  it('affiche le nombre de filtres actifs (hors q)', () => {
    render(<FiltresPanneau sp={{ region: 'Dakar', scoreMin: '70', q: 'awa' }} />)
    expect(screen.getByRole('button', { name: /Filtres \(2\)/i })).toBeInTheDocument()
  })

  // Régression build : les régions doivent venir de @/lib/regions (module sans Prisma),
  // jamais d'un loader — sinon le driver mariadb part dans le bundle client.
  it('rend les régions avec leurs libellés accentués (source @/lib/regions)', () => {
    render(<FiltresPanneau sp={{}} />)
    fireEvent.click(screen.getByRole('button', { name: /Filtres/i }))
    expect(screen.getByRole('option', { name: 'Thiès' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Saint-Louis' })).toBeInTheDocument()
  })

  it('Réinitialiser ne conserve que le scope offre', () => {
    render(<FiltresPanneau sp={{ offre: 'o1', region: 'Dakar' }} />)
    fireEvent.click(screen.getByRole('button', { name: /Filtres/i }))
    fireEvent.click(screen.getByRole('button', { name: /Réinitialiser/i }))
    expect(pushMock).toHaveBeenCalledWith('/recruteur/candidatures?offre=o1')
  })
})
