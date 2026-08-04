/**
 * GUIC-701 (PR-B) — UserDetailTabs : fiche utilisateur en 5 onglets (Profil, Activité,
 * Parcours, Rôles & accès, Conformité CDP). Rôle SSO lecture seule. Anonymisé masque les PII.
 * TDD — RED d'abord.
 */
import { render, screen, fireEvent } from '@testing-library/react'
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock('@/app/admin/utilisateurs/actions', () => ({ changerStatutUtilisateur: jest.fn(), anonymiserUtilisateur: jest.fn() }))
jest.mock('@/app/admin/utilisateurs/AnonymiserConfirmModal', () => ({ AnonymiserConfirmModal: () => null }))
import { UserDetailTabs, type UserDetailData } from '@/app/admin/utilisateurs/[cjsUid]/UserDetailTabs'

const DATA: UserDetailData = {
  cjsUid: 'usr_1', prenom: 'Awa', nom: 'Ndiaye', email: 'awa@ex.sn', telephone: '+221770000010',
  region: 'Dakar', commune: 'Plateau', genre: 'F', statut: 'actif', role: 'jeune',
  createdAt: '12 janv. 2026', lastSeenAt: 'il y a 2 j',
  profil: { completionScore: 82, niveauEtude: 'Licence', situationEmploi: 'En recherche', biographie: 'Motivée.', photoUrl: null, centrePrincipalNom: 'CJS Dakar', competences: ['React', 'Node'], domainesInteret: ['Numérique'], cvUrl: 'https://cdn/cv.pdf' },
  activite: { candidatures: 3, candidaturesRetenues: 1, inscriptions: 2, reservations: 1, checkIns: 5, favoris: 4, insertions: 1 },
  parcours: {
    experiences: [{ id: 'e1', poste: 'Stagiaire', organisation: 'Sonatel', periode: '2023 — 2024' }],
    diplomes: [{ id: 'd1', intitule: 'Licence Informatique', etablissement: 'UCAD', annee: 2024, niveau: 'Licence', mention: 'Bien' }],
    certificats: [{ id: 'c1', formation: 'Initiation numérique', obtenuLe: 'avr. 2026' }],
    cvUrl: 'https://cdn/cv.pdf',
  },
  conformite: { consentements: [{ version: 'v2.1', date: '30 juil. 2026', ip: '41.82.140.10' }], notifCandidatures: true, notifMessages: false, createdAt: '12 janv. 2026', updatedAt: '01 août 2026', lastSeenAt: 'il y a 2 j', deletedAt: null },
}

describe('GUIC-701 — UserDetailTabs', () => {
  it('rend les 5 onglets', () => {
    render(<UserDetailTabs data={DATA} rolesSection={<div>roles</div>} />)
    for (const t of ['Profil', 'Activité', 'Parcours', 'Rôles & accès', 'Conformité']) {
      expect(screen.getByRole('tab', { name: new RegExp(t, 'i') })).toBeInTheDocument()
    }
  })

  it('onglet Profil (défaut) : identité + profil', () => {
    render(<UserDetailTabs data={DATA} rolesSection={<div>roles</div>} />)
    expect(screen.getByText(/awa@ex\.sn/)).toBeInTheDocument()
    expect(screen.getByText('Licence')).toBeInTheDocument()
    expect(screen.getByText(/React/)).toBeInTheDocument()
  })

  it('onglet Activité : compteurs', () => {
    render(<UserDetailTabs data={DATA} rolesSection={<div>roles</div>} />)
    fireEvent.click(screen.getByRole('tab', { name: /Activité/i }))
    expect(screen.getByText(/Candidatures/i)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('onglet Parcours : expériences / diplômes / certificats / CV', () => {
    render(<UserDetailTabs data={DATA} rolesSection={<div>roles</div>} />)
    fireEvent.click(screen.getByRole('tab', { name: /Parcours/i }))
    expect(screen.getByText(/Stagiaire/)).toBeInTheDocument()
    expect(screen.getByText(/Licence Informatique/)).toBeInTheDocument()
    expect(screen.getByText(/Initiation numérique/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /CV/i })).toHaveAttribute('href', 'https://cdn/cv.pdf')
  })

  it('onglet Rôles & accès : rôle SSO en lecture seule + section rattachements', () => {
    render(<UserDetailTabs data={DATA} rolesSection={<div>SECTION_RATTACHEMENTS</div>} />)
    fireEvent.click(screen.getByRole('tab', { name: /Rôles & accès/i }))
    expect(screen.getByText(/géré par le SSO/i)).toBeInTheDocument()
    expect(screen.getByText('SECTION_RATTACHEMENTS')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Changer.*rôle/i })).toBeNull()
  })

  it('onglet Conformité CDP : consentement + IP', () => {
    render(<UserDetailTabs data={DATA} rolesSection={<div>roles</div>} />)
    fireEvent.click(screen.getByRole('tab', { name: /Conformité/i }))
    expect(screen.getByText('v2.1')).toBeInTheDocument()
    expect(screen.getByText(/41\.82\.140\.10/)).toBeInTheDocument()
  })

  it('anonymisé : PII masquées', () => {
    const anon: UserDetailData = { ...DATA, statut: 'anonymise', email: null, telephone: null, profil: null }
    render(<UserDetailTabs data={anon} rolesSection={<div>roles</div>} />)
    expect(screen.getAllByText(/Anonymisé/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText(/awa@ex\.sn/)).toBeNull()
  })
})
