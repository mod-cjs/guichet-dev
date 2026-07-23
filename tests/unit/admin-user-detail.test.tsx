/**
 * GUIC-463 (F2) — AdminUserDetail : fiche bénéficiaire admin (supervision lecture seule).
 * Pas d'action d'écriture (rôle = SSO, anonymisation = webhook SSO, pas de suppression dure).
 */
import { render, screen } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/utilisateurs/uid-1',
}))

import { AdminUserDetail, type UserDetailData } from '@/app/admin/utilisateurs/[cjsUid]/AdminUserDetail'

const DATA: UserDetailData = {
  cjsUid: 'uid-1',
  prenom: 'Awa',
  nom: 'Diop',
  email: 'awa.diop@example.org',
  telephone: '+221770000000',
  region: 'Dakar',
  commune: 'Dakar Plateau',
  statut: 'actif',
  role: 'beneficiaire',
  createdAt: new Date('2025-01-15T10:00:00Z'),
  profil: {
    completionScore: 80,
    niveauEtude: 'Licence',
    situationEmploi: 'En recherche',
    situationHandicap: null,
    zoneHabitation: null,
    biographie: 'Développeuse junior motivée.',
    photoUrl: null,
    centrePrincipalNom: 'CJS Dakar',
    domainesInteret: ['Numérique', 'Entrepreneuriat'],
    diplomesCount: 2,
    experiencesCount: 1,
    certificatsCount: 3,
  },
  activite: {
    candidatures: 5,
    candidaturesRetenues: 1,
    inscriptions: 3,
    reservations: 4,
    checkIns: 7,
    favoris: 2,
    insertions: 1,
  },
}

describe('GUIC-463 — AdminUserDetail (fiche bénéficiaire)', () => {
  it('affiche le nom et le prénom', () => {
    render(<AdminUserDetail data={DATA} />)
    expect(screen.getByRole('heading', { name: /Awa Diop/i })).toBeInTheDocument()
  })

  it('affiche le rôle (libellé) et le statut', () => {
    render(<AdminUserDetail data={DATA} />)
    expect(screen.getByText(/bénéficiaire/i)).toBeInTheDocument()
    expect(screen.getByText(/actif/i)).toBeInTheDocument()
  })

  it('affiche les coordonnées (email, téléphone, région, centre)', () => {
    render(<AdminUserDetail data={DATA} />)
    expect(screen.getByText(/awa.diop@example.org/i)).toBeInTheDocument()
    expect(screen.getByText(/\+221770000000/)).toBeInTheDocument()
    expect(screen.getAllByText(/Dakar/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/CJS Dakar/i)).toBeInTheDocument()
  })

  it('affiche le score de complétude du profil', () => {
    render(<AdminUserDetail data={DATA} />)
    expect(screen.getByText(/80\s*%/)).toBeInTheDocument()
    expect(screen.getByText(/compl[ée]tude/i)).toBeInTheDocument()
  })

  it('affiche niveau d\'études et situation', () => {
    render(<AdminUserDetail data={DATA} />)
    expect(screen.getByText(/Licence/i)).toBeInTheDocument()
    expect(screen.getByText(/En recherche/i)).toBeInTheDocument()
  })

  it('affiche les compteurs d\'activité (candidatures, inscriptions, réservations, check-ins)', () => {
    render(<AdminUserDetail data={DATA} />)
    expect(screen.getByText(/candidatures/i)).toBeInTheDocument()
    expect(screen.getByText(/inscriptions/i)).toBeInTheDocument()
    expect(screen.getByText(/r[ée]servations/i)).toBeInTheDocument()
    expect(screen.getByText(/check-?ins?/i)).toBeInTheDocument()
  })

  it('propose un lien retour vers la liste des utilisateurs', () => {
    render(<AdminUserDetail data={DATA} />)
    const back = screen.getByRole('link', { name: /utilisateurs|retour/i })
    expect(back).toHaveAttribute('href', '/admin/utilisateurs')
  })

  it('NE propose AUCune action d\'écriture (supervision lecture seule)', () => {
    render(<AdminUserDetail data={DATA} />)
    expect(screen.queryByRole('button', { name: /supprimer|anonymiser|changer le rôle|suspendre/i })).toBeNull()
  })

  it('gère un profil absent sans planter', () => {
    render(<AdminUserDetail data={{ ...DATA, profil: null }} />)
    expect(screen.getByRole('heading', { name: /Awa Diop/i })).toBeInTheDocument()
    expect(screen.getByText(/profil non renseign/i)).toBeInTheDocument()
  })
})
