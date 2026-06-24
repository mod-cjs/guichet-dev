/**
 * GUIC-465 (F3) — AdminEvenementDetail : détail événement admin (SUPERVISION lecture seule).
 * L'admin supervise (inscrits + stats + export) ; le marquage de présence est fait
 * par les conseillers (comme le check-in centres). Aucun bouton d'action ici.
 */
import { render, screen } from '@testing-library/react'

jest.mock('next/navigation', () => ({ usePathname: () => '/admin/evenements/ev-1' }))

import { AdminEvenementDetail, type EvenementDetailData } from '@/app/admin/evenements/[id]/AdminEvenementDetail'

const DATA: EvenementDetailData = {
  id: 'ev-1',
  titre: 'Atelier CV',
  type: 'Atelier',
  statut: 'a_venir',
  dateDebut: new Date('2026-07-10T09:00:00Z'),
  lieu: 'Dakar Plateau',
  centreNom: 'CJS Dakar',
  capaciteMax: 50,
  stats: {
    inscrits: 30,
    presents: 12,
    listeAttente: 5,
    annules: 3,
    tauxRemplissage: 60,
    tauxPresence: 40,
  },
  inscrits: [
    { id: 'i1', prenom: 'Awa', nom: 'Diop', statut: 'present', inscritA: new Date('2026-06-20T10:00:00Z') },
    { id: 'i2', prenom: 'Mamadou', nom: 'Sow', statut: 'inscrit', inscritA: new Date('2026-06-21T10:00:00Z') },
    { id: 'i3', prenom: 'Fatou', nom: 'Ba', statut: 'liste_attente', inscritA: new Date('2026-06-22T10:00:00Z') },
  ],
}

describe('GUIC-465 — AdminEvenementDetail (supervision)', () => {
  it('affiche le titre de l\'événement', () => {
    render(<AdminEvenementDetail data={DATA} />)
    expect(screen.getByRole('heading', { name: /Atelier CV/i })).toBeInTheDocument()
  })

  it('affiche lieu, centre et date', () => {
    render(<AdminEvenementDetail data={DATA} />)
    expect(screen.getByText(/Dakar Plateau/i)).toBeInTheDocument()
    expect(screen.getByText(/CJS Dakar/i)).toBeInTheDocument()
  })

  it('affiche les stats (inscrits, présents, liste d\'attente, taux)', () => {
    render(<AdminEvenementDetail data={DATA} />)
    expect(screen.getAllByText(/inscrits/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/pr[ée]sents/i)).toBeInTheDocument()
    expect(screen.getByText(/liste d.attente/i)).toBeInTheDocument()
    expect(screen.getByText(/60\s*%/)).toBeInTheDocument() // remplissage
  })

  it('liste les inscrits avec leur statut', () => {
    render(<AdminEvenementDetail data={DATA} />)
    expect(screen.getByText(/Awa Diop/i)).toBeInTheDocument()
    expect(screen.getByText(/Mamadou Sow/i)).toBeInTheDocument()
    expect(screen.getAllByText(/pr[ée]sent/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/liste d.attente/i)).toBeInTheDocument()
  })

  it('NE propose AUCUN bouton de marquage (présence = conseiller)', () => {
    render(<AdminEvenementDetail data={DATA} />)
    expect(screen.queryByRole('button', { name: /marquer pr[ée]sent|promouvoir|pointer/i })).toBeNull()
  })

  it('propose un export des participants', () => {
    render(<AdminEvenementDetail data={DATA} />)
    const exp = screen.getByRole('link', { name: /exporter|participants/i })
    expect(exp).toHaveAttribute('href', expect.stringContaining('/api/admin/evenements/ev-1/participants'))
  })

  it('propose un lien retour vers les événements', () => {
    render(<AdminEvenementDetail data={DATA} />)
    const back = screen.getByRole('link', { name: /événements|retour/i })
    expect(back).toHaveAttribute('href', '/admin/evenements')
  })

  it('gère un événement sans inscrit', () => {
    render(<AdminEvenementDetail data={{ ...DATA, inscrits: [], stats: { ...DATA.stats, inscrits: 0 } }} />)
    expect(screen.getByText(/aucun inscrit/i)).toBeInTheDocument()
  })
})
