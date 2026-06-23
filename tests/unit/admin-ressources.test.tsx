/**
 * GUIC-455 — AdminRessourcesTable Lot 11 (sombre + doré · Contenu / médiathèque)
 * Tests RED : assertions render table colonnes, statut pills, badge format, bouton ajout.
 *
 * Note JSDOM : les classes Tailwind `hidden md:block` ne sont pas évaluées par jsdom —
 * les deux branches (desktop table + mobile cards) sont présentes dans le DOM.
 * Les assertions utilisent donc `getAllBy*` quand les doublons sont attendus.
 */
import { render, screen } from '@testing-library/react'
import { AdminRessourcesTable } from '@/app/admin/ressources/AdminRessourcesTable'

// TypeRessource enum values as strings (mirrors prisma schema)
type TypeRessource = 'PDF' | 'Video' | 'Lien' | 'Guide' | 'Outil'

interface RessourceRow {
  id: string
  titre: string
  type: TypeRessource
  categorie: string | null
  theme: string
  vues: number
  estPublic: boolean
}

const MOCK_RESSOURCES: RessourceRow[] = [
  {
    id: 'r1',
    titre: 'Guide de recherche d\'emploi',
    type: 'PDF',
    categorie: 'Emploi',
    theme: 'Insertion',
    vues: 1240,
    estPublic: true,
  },
  {
    id: 'r2',
    titre: 'Tutoriel CV en ligne',
    type: 'Video',
    categorie: null,
    theme: 'Formation',
    vues: 0,
    estPublic: false,
  },
  {
    id: 'r3',
    titre: 'Outil de bilan de compétences',
    type: 'Outil',
    categorie: 'Compétences',
    theme: 'Orientation',
    vues: 88,
    estPublic: true,
  },
]

describe('GUIC-455 — AdminRessourcesTable Lot 11 contenu médiathèque', () => {
  /* ── En-têtes de colonnes ─────────────────────────────────────────────── */
  it('affiche les en-têtes de colonnes attendus', () => {
    render(<AdminRessourcesTable ressources={MOCK_RESSOURCES} total={3} />)
    // Column headers in <th> — use role "columnheader"
    expect(screen.getByRole('columnheader', { name: /ressource/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /catégorie/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /vues/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /statut/i })).toBeInTheDocument()
  })

  /* ── Titre de la page ─────────────────────────────────────────────────── */
  it('affiche le titre "Contenu · médiathèque"', () => {
    render(<AdminRessourcesTable ressources={MOCK_RESSOURCES} total={3} />)
    expect(
      screen.getByRole('heading', { name: /Contenu\s*[·•]\s*médiathèque/i }),
    ).toBeInTheDocument()
  })

  /* ── Sous-titre avec total ────────────────────────────────────────────── */
  it('affiche le sous-titre avec le total "3 ressources"', () => {
    render(<AdminRessourcesTable ressources={MOCK_RESSOURCES} total={3} />)
    expect(screen.getByText(/3 ressources/i)).toBeInTheDocument()
  })

  /* ── Bouton "Ajouter une ressource" ──────────────────────────────────── */
  it('affiche le bouton "Ajouter une ressource"', () => {
    render(<AdminRessourcesTable ressources={MOCK_RESSOURCES} total={3} />)
    expect(
      screen.getByRole('button', { name: /ajouter une ressource/i }),
    ).toBeInTheDocument()
  })

  /* ── Badge format type (PDF) ──────────────────────────────────────────── */
  it('affiche le badge de type "PDF" pour une ressource PDF', () => {
    render(<AdminRessourcesTable ressources={MOCK_RESSOURCES} total={3} />)
    // Both desktop table and mobile card render the badge → at least 1
    const badges = screen.getAllByText('PDF')
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  /* ── Titre de la ressource ────────────────────────────────────────────── */
  it('affiche le titre de chaque ressource', () => {
    render(<AdminRessourcesTable ressources={MOCK_RESSOURCES} total={3} />)
    // Both branches render → getAllByText; assert at least 1 per titre
    expect(screen.getAllByText('Guide de recherche d\'emploi').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Tutoriel CV en ligne').length).toBeGreaterThanOrEqual(1)
  })

  /* ── Catégorie ou thème fallback ──────────────────────────────────────── */
  it('affiche la catégorie quand disponible, sinon le thème', () => {
    render(<AdminRessourcesTable ressources={MOCK_RESSOURCES} total={3} />)
    // r1 has categorie "Emploi" — appears in both branches
    expect(screen.getAllByText('Emploi').length).toBeGreaterThanOrEqual(1)
    // r2 has no categorie → fallback theme "Formation"
    expect(screen.getAllByText('Formation').length).toBeGreaterThanOrEqual(1)
  })

  /* ── Vues : formatées si > 0, "—" si 0 ───────────────────────────────── */
  it('affiche les vues formatées pour r1 et "—" pour r2 qui a vues=0', () => {
    render(<AdminRessourcesTable ressources={MOCK_RESSOURCES} total={3} />)
    // r1: 1240 vues → "1 240" (fr-FR locale)
    expect(screen.getAllByText(/1[\s ]?240/).length).toBeGreaterThanOrEqual(1)
    // r2: 0 vues → "—" appears at least once
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
  })

  /* ── Pill Publié (estPublic=true) ─────────────────────────────────────── */
  it('affiche une pill "Publié" pour une ressource avec estPublic=true', () => {
    render(<AdminRessourcesTable ressources={MOCK_RESSOURCES} total={3} />)
    const publie = screen.getAllByText(/^publié$/i)
    expect(publie.length).toBeGreaterThanOrEqual(1)
  })

  /* ── Pill Brouillon (estPublic=false) ─────────────────────────────────── */
  it('affiche une pill "Brouillon" pour une ressource avec estPublic=false', () => {
    render(<AdminRessourcesTable ressources={MOCK_RESSOURCES} total={3} />)
    const brouillon = screen.getAllByText(/^brouillon$/i)
    expect(brouillon.length).toBeGreaterThanOrEqual(1)
  })

  /* ── Bouton action settings par ligne ────────────────────────────────── */
  it('affiche un bouton action (settings) pour chaque ressource', () => {
    render(<AdminRessourcesTable ressources={MOCK_RESSOURCES} total={3} />)
    // Both desktop table and mobile card render a "Modifier" button per row
    // → expect at least MOCK_RESSOURCES.length buttons total
    const settingsBtns = screen.getAllByRole('button', { name: /modifier/i })
    expect(settingsBtns.length).toBeGreaterThanOrEqual(MOCK_RESSOURCES.length)
  })

  /* ── État vide ────────────────────────────────────────────────────────── */
  it('affiche un message vide quand la liste est vide', () => {
    render(<AdminRessourcesTable ressources={[]} total={0} />)
    expect(screen.getByText(/aucune ressource/i)).toBeInTheDocument()
  })
})
