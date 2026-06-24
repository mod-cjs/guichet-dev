/**
 * GUIC-461 (F0) — Hygiène de l'espace admin existant.
 * Tests RED : boutons morts branchés + pagination réelle.
 *  - Modération : bouton "Aperçu" = lien vers la page publique de l'offre.
 *  - Modération + Ressources : pagination rendue quand totalPages > 1.
 *  - Ressources : bouton "Modifier" mobile branché (ouvre la modale).
 *  - Dashboard : KPI "À modérer" cliquable → /admin/opportunites.
 */
import { render, screen, fireEvent } from '@testing-library/react'

// ── Mock Icon (sprite SVG indispo en jsdom) ───────────────────────────────
jest.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, title }: { name: string; title?: string }) => (
    <svg data-testid={`icon-${name}`} aria-label={title ?? name} />
  ),
}))

// ── Server actions mockées ────────────────────────────────────────────────
jest.mock('@/app/admin/opportunites/actions', () => ({
  approuverOpportunite: jest.fn(),
  rejeterOpportunite: jest.fn(),
}))
jest.mock('@/app/admin/ressources/actions', () => ({
  creerRessource: jest.fn(),
  modifierRessource: jest.fn(),
  supprimerRessource: jest.fn(),
}))
jest.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('@/components/centres/CentresMapGoogle', () => ({
  CentresMapGoogle: () => <div data-testid="centres-map" />,
}))

import {
  AdminModerationList,
  type ModerationItem,
} from '@/app/admin/opportunites/AdminModerationList'
import {
  AdminRessourcesTable,
  type RessourceRow,
} from '@/app/admin/ressources/AdminRessourcesTable'
import {
  AdminDashboardClient,
  type DashboardData,
} from '@/app/admin/tableau-de-bord/AdminDashboardClient'

// ── Fixtures ──────────────────────────────────────────────────────────────
const MOD_ITEMS: ModerationItem[] = [
  {
    id: 'o1',
    slug: 'developpeur-full-stack',
    titre: 'Développeur full-stack',
    typeLabel: 'Emploi',
    organisation: 'Sonatel',
    dateLabel: 'il y a 2 jours',
  },
]

const RES_ROWS: RessourceRow[] = [
  {
    id: 'r1',
    titre: 'Guide recherche emploi',
    description: 'Un guide.',
    type: 'PDF',
    url: 'https://example.org/g.pdf',
    categorie: 'Emploi',
    theme: 'Insertion',
    vues: 1240,
    estPublic: true,
  },
]

const DASH: DashboardData = {
  kpis: { jeunesInscrits: 22_400, centresActifs: 14, aModerer: 5, insertionsMois: 120 },
  growthSeries: [{ month: 'Mai', cumulative: 22400 }],
  accountSplit: [{ label: 'Bénéficiaires', value: 20000, color: 'var(--gj-teal)' }],
  monthlyCandidatures: [{ m: 'Mai', v: 120 }],
  centres: [],
}

// ── Modération : Aperçu = lien public ──────────────────────────────────────
describe('GUIC-461 (F0) — Modération : bouton Aperçu', () => {
  it('rend "Aperçu" comme lien vers la page publique de l\'offre, nouvel onglet', () => {
    render(<AdminModerationList items={MOD_ITEMS} total={1} currentPage={1} totalPages={1} />)
    const apercu = screen.getByRole('link', { name: /aperçu/i })
    expect(apercu).toHaveAttribute('href', '/opportunites/developpeur-full-stack')
    expect(apercu).toHaveAttribute('target', '_blank')
    expect(apercu).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })
})

// ── Pagination rendue ───────────────────────────────────────────────────────
describe('GUIC-461 (F0) — pagination réelle', () => {
  it('Modération : rend la pagination quand totalPages > 1', () => {
    render(<AdminModerationList items={MOD_ITEMS} total={60} currentPage={1} totalPages={3} />)
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument()
  })

  it('Modération : pas de pagination quand une seule page', () => {
    render(<AdminModerationList items={MOD_ITEMS} total={1} currentPage={1} totalPages={1} />)
    expect(screen.queryByRole('navigation', { name: /pagination/i })).toBeNull()
  })

  it('Ressources : rend la pagination quand totalPages > 1', () => {
    render(<AdminRessourcesTable ressources={RES_ROWS} total={60} currentPage={1} totalPages={3} />)
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument()
  })
})

// ── Ressources : bouton Modifier mobile branché ─────────────────────────────
describe('GUIC-461 (F0) — Ressources : Modifier mobile branché', () => {
  it('clic sur un bouton "Modifier" ouvre la modale d\'édition', () => {
    render(<AdminRessourcesTable ressources={RES_ROWS} total={1} currentPage={1} totalPages={1} />)
    // jsdom rend desktop + mobile : tous les "Modifier" doivent ouvrir la modale.
    const editButtons = screen.getAllByRole('button', { name: /modifier/i })
    // le dernier = carte mobile (rendue après la table desktop)
    fireEvent.click(editButtons[editButtons.length - 1])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

// ── Dashboard : KPI "À modérer" cliquable ───────────────────────────────────
describe('GUIC-461 (F0) — Dashboard : KPI À modérer cliquable', () => {
  it('le KPI "À modérer" est un lien vers /admin/opportunites', () => {
    render(<AdminDashboardClient data={DASH} />)
    const link = screen.getByRole('link', { name: /à modérer/i })
    expect(link).toHaveAttribute('href', '/admin/opportunites')
  })
})
