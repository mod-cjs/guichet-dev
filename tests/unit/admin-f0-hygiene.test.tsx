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
  useSearchParams: () => new URLSearchParams(),
}))
jest.mock('@/components/centres/CentresMapGoogle', () => ({
  CentresMapGoogle: () => <div data-testid="centres-map" />,
}))

import { AdminModerationList } from '@/app/admin/opportunites/AdminModerationList'
import type { ModerationRow, ModerationKpis } from '@/lib/loaders/admin-moderation'
import {
  AdminRessourcesTable,
  type RessourceRow,
} from '@/app/admin/ressources/AdminRessourcesTable'
import { AdminDashboardClient } from '@/app/admin/tableau-de-bord/AdminDashboardClient'
import type { AdminDashboardData as DashboardData } from '@/lib/loaders/admin-dashboard'

// ── Fixtures ──────────────────────────────────────────────────────────────
const MOD_ROWS: ModerationRow[] = [
  {
    id: 'o1',
    slug: 'developpeur-full-stack',
    titre: 'Développeur full-stack',
    typeLabel: 'Emploi',
    organisation: 'Sonatel',
    source: 'recruteur',
    localisation: 'Dakar',
    ageHeures: 48,
    ageLabel: 'en attente 2 j',
    urgent: false,
    signaux: [],
    niveau: null,
    extrait: 'Un poste de développeur full-stack chez un partenaire vérifié.',
  },
]
const MOD_KPIS: ModerationKpis = { tout: 1, signalees: 0, nouvelles: 0, recruteur: 1, veille: 0 }

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
  briefing: [{ key: 'moderation', count: 5, context: 'à traiter', tone: 'warn', href: '/admin/opportunites', cta: 'Traiter la file' }],
  funnel: [], funnelConversion: 0, kpis: [], centres: [], centresGeo: [],
  yaye: { escaladesOuvertes: 0, escaladesDanger: 0, autoResolution: null, satisfaction: null, sessions: 0, conversations: 0 },
  pulse: [], upcoming: [], oppByType: [], regionScoped: false,
}

// GUIC-702 — l'Aperçu de modération a migré de la carte vers le panneau détail
// (slide-over) lors de la refonte ; sa vérification vit dans moderation-detail-panel.

// ── Pagination rendue ───────────────────────────────────────────────────────
describe('GUIC-461 (F0) — pagination réelle', () => {
  it('Modération : rend la pagination quand totalPages > 1', () => {
    render(<AdminModerationList rows={MOD_ROWS} kpis={MOD_KPIS} total={60} currentPage={1} totalPages={3} q="" filtre="tout" verifiesIds={[]} tronque={false} totalBrouillons={60} />)
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument()
  })

  it('Modération : pas de pagination quand une seule page', () => {
    render(<AdminModerationList rows={MOD_ROWS} kpis={MOD_KPIS} total={1} currentPage={1} totalPages={1} q="" filtre="tout" verifiesIds={[]} tronque={false} totalBrouillons={1} />)
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
describe('GUIC-461/679 — Dashboard : priorité Modération cliquable', () => {
  it('la carte briefing "Modération" est un lien vers /admin/opportunites', () => {
    render(<AdminDashboardClient data={DASH} filters={{ periode: "12mois", region: "all" }} />)
    const link = screen.getByRole('link', { name: /modération/i })
    expect(link).toHaveAttribute('href', '/admin/opportunites')
  })
})
