/**
 * @jest-environment jsdom
 *
 * GUIC-689 — Aside du profil : carte « CV & documents » (réf `profil-web.jsx`,
 * `DocumentsCard` L.250-282).
 *
 * ÉCART ASSUMÉ AVEC LA MAQUETTE. Elle liste trois documents — pièce d'identité
 * (CNI), attestation de scolarité, lettre de motivation type — dont AUCUN
 * n'existe dans le modèle de données, et leur attribue un statut « Vérifié »
 * qu'aucun champ ne porte. Les afficher reviendrait à promettre des
 * fonctionnalités inexistantes (règle R4 : vérifier la donnée avant de
 * promettre un champ).
 *
 * On construit donc avec ce que le contrat porte réellement :
 *   - CV            : `profil.cvUrl` + `profil.cvUploadedAt`
 *   - diplômes      : `diplome.fichierUrl`
 *   - certificats   : `certificat.fichierUrl` (scan) ou `urlCertificat`
 *
 * Statut « Manquant » réservé au CV : c'est le seul document que le produit
 * sollicite activement. Un jeune sans diplôme n'a rien qui « manque ».
 */
import { render, screen, within } from '@testing-library/react'

import { DocumentsCard } from '@/components/profil/DocumentsCard'

const AUCUN = { cvUrl: null, cvUploadedAt: null, diplomes: [], certificats: [] }

const FOURNIS = {
  cvUrl: 'https://blob/cv.pdf',
  cvUploadedAt: '2026-03-14T10:00:00.000Z',
  diplomes: [
    { id: 'd1', intitule: 'Licence Gestion', fichierUrl: 'https://blob/d1.pdf' },
    { id: 'd2', intitule: 'Baccalauréat', fichierUrl: null },
  ],
  certificats: [
    { id: 'c1', formation: 'Cours JS', fichierUrl: 'https://blob/c1.pdf', urlCertificat: null },
    { id: 'c2', formation: 'Cours Python', fichierUrl: null, urlCertificat: null },
  ],
}

describe('GUIC-689 — carte CV & documents', () => {
  it('n’invente aucun document absent du modèle', () => {
    render(<DocumentsCard {...FOURNIS} />)
    const carte = screen.getByRole('region', { name: /cv & documents/i })
    expect(carte.textContent).not.toMatch(/pièce d.identité|CNI/i)
    expect(carte.textContent).not.toMatch(/attestation de scolarité/i)
    expect(carte.textContent).not.toMatch(/lettre de motivation/i)
  })

  it('n’affiche jamais un statut « Vérifié » — aucun champ ne le porte', () => {
    render(<DocumentsCard {...FOURNIS} />)
    expect(screen.getByRole('region', { name: /cv & documents/i }).textContent).not.toMatch(/vérifié/i)
  })

  it('signale le CV manquant, sans pourcentage inventé', () => {
    render(<DocumentsCard {...AUCUN} />)
    const nudge = screen.getByTestId('documents-cv-manquant')
    expect(nudge).toBeInTheDocument()
    // La maquette annonce « débloque +18% du profil » : le CV ne compte pas
    // dans notre barème de complétion.
    expect(nudge.textContent).not.toMatch(/\+\s*\d+\s*%/)
  })

  it('affiche le CV déposé avec sa date, et plus aucune invite', () => {
    render(<DocumentsCard {...FOURNIS} />)
    expect(screen.queryByTestId('documents-cv-manquant')).not.toBeInTheDocument()
    const cv = screen.getByTestId('document-cv')
    expect(cv.textContent).toMatch(/14 mars 2026/)
  })

  it('ne liste que les pièces réellement jointes', () => {
    render(<DocumentsCard {...FOURNIS} />)
    const liste = screen.getByTestId('documents-liste')
    const lignes = within(liste).getAllByRole('listitem')
    // CV + 1 diplôme avec fichier + 1 certificat avec fichier = 3.
    // Les pièces sans fichier ne sont pas des documents.
    expect(lignes).toHaveLength(3)
    expect(liste.textContent).toMatch(/Licence Gestion/)
    expect(liste.textContent).not.toMatch(/Baccalauréat/)
    expect(liste.textContent).toMatch(/Cours JS/)
    expect(liste.textContent).not.toMatch(/Cours Python/)
  })

  it('sans aucun document, la liste ne ment pas sur son contenu', () => {
    render(<DocumentsCard {...AUCUN} />)
    expect(screen.queryByTestId('documents-liste')).not.toBeInTheDocument()
  })

  it('aucun texte sous le plancher de 11 px, aucun hex en dur', () => {
    const { readFileSync } = jest.requireActual('node:fs') as typeof import('node:fs')
    const { resolve } = jest.requireActual('node:path') as typeof import('node:path')
    const src = readFileSync(
      resolve(__dirname, '../../src/components/profil/DocumentsCard.tsx'),
      'utf-8',
    )
    const tailles = [...src.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)].map((m) => parseFloat(m[1]))
    expect(tailles.filter((t) => t < 11)).toEqual([])
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
