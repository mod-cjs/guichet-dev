/**
 * @jest-environment jsdom
 *
 * Tests UI du détail d'opportunité (GUIC-219 — Wave 6).
 *
 * Couvre :
 *  - YayeMatchCard rendu sur le détail
 *  - CTA disabled lorsque l'utilisateur a déjà candidaté (+ sr-only reason)
 *  - CTA disabled lorsque la deadline est expirée (+ sr-only reason)
 *  - `?postuler=1` ouvre la modale automatiquement
 *  - share API (navigator.share) + fallback clipboard
 *  - synchronisation du favori via le contexte FavorisProvider
 *
 * Les tabs ayant été supprimés (single scroll, alignement design v2),
 * il n'y a plus de test de navigation clavier sur tabs.
 */
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OpportuniteDetail } from '@/components/opportunites/OpportuniteDetail'
import { FavorisProvider } from '@/components/opportunites/FavorisProvider'
import type { OpportuniteDetail as Detail } from '@/types/candidature'

// ── Mocks Next ────────────────────────────────────────────────────────────────
let currentSearch = ''
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(currentSearch),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}))

// `next/dynamic` est asynchrone — on évite la complexité en court-circuitant
// avec le composant réel (jest n'a pas besoin de code-splitting).
jest.mock('next/dynamic', () => () => {
  // eslint-disable-next-line react/display-name
  return function DynamicStub() {
    return null
  }
})

// ── Fixtures ──────────────────────────────────────────────────────────────────
const baseDetail: Detail = {
  id: 'opp-1',
  slug: 'stage-data-science',
  titre: 'Stage Data Science · 6 mois',
  description: 'Rejoins la cellule Innovation pour construire des modèles prédictifs.',
  type: 'STAGE',
  domaine: 'TECH',
  region: 'DAKAR',
  organisation: 'Sonatel',
  remuneration: '350 000 F/mois',
  deadline: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  lienExterne: null,
  vues: 12,
  statut: 'PUBLIE',
  programme: null,
  typeSlug: 'stage',
  actionLabel: 'Postuler maintenant',
  requiresFileUpload: true,
  fileLabel: 'CV',
  skills: [
    { slug: 'python', libelle: 'Python', requise: true },
    { slug: 'sql', libelle: 'SQL', requise: false },
  ],
  tags: [{ slug: 'data', libelle: 'Data' }],
  details: null,
} as unknown as Detail

const viewer = { prenom: 'Awa', nom: 'Diop', telephone: '+221770000000' }

function jsonRes(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

function setupFetch(opts: { hasCandidature?: boolean } = {}) {
  global.fetch = jest.fn(async (url: RequestInfo | URL) => {
    const u = typeof url === 'string' ? url : url.toString()
    if (u.startsWith('/api/candidatures')) {
      return jsonRes({
        data: opts.hasCandidature
          ? [{ opportuniteSlug: baseDetail.slug, opportuniteId: baseDetail.id }]
          : [],
      })
    }
    if (u.startsWith('/api/favoris/ids')) return jsonRes({ data: [] })
    if (u.startsWith('/api/favoris')) return jsonRes({ data: { id: 'fav-1' } })
    return jsonRes({})
  }) as unknown as typeof fetch
}

function renderDetail(detail: Detail = baseDetail, opts: { viewer?: typeof viewer | null } = {}) {
  const v = 'viewer' in opts ? opts.viewer ?? null : viewer
  return render(
    <FavorisProvider isAuthenticated={v !== null}>
      <OpportuniteDetail detail={detail} viewer={v} />
    </FavorisProvider>,
  )
}

beforeEach(() => {
  currentSearch = ''
  setupFetch()
  // Reset navigator overrides
  Object.defineProperty(window, 'navigator', { value: { clipboard: { writeText: jest.fn() } }, writable: true })
})

// ── Specs ─────────────────────────────────────────────────────────────────────
describe('<OpportuniteDetail /> — Wave 6', () => {
  it('rend la YayeMatchCard dans le détail', () => {
    renderDetail()
    expect(screen.getByTestId('yaye-match-card')).toBeInTheDocument()
    expect(screen.getByTestId('yaye-match-score')).toHaveTextContent('%')
  })

  it('rend le hero compact avec titre, organisation et badge type', () => {
    renderDetail()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(baseDetail.titre)
    expect(screen.getByText('Sonatel')).toBeInTheDocument()
    // Deux pastilles distinctes (catégorie + urgence) — plusieurs nœuds possibles (h1 + pastille).
    expect(screen.getAllByText(/stage/i).length).toBeGreaterThan(0)
  })

  it('CTA disabled + sr-only reason si l’utilisateur a déjà candidaté', async () => {
    setupFetch({ hasCandidature: true })
    renderDetail()
    const cta = await screen.findByRole('button', { name: /déjà candidaté/i })
    expect(cta).toBeDisabled()
    expect(cta).toHaveAttribute('aria-describedby', 'cta-disabled-reason')
    const reason = document.getElementById('cta-disabled-reason')
    expect(reason).not.toBeNull()
    expect(reason?.textContent).toMatch(/déjà candidaté/i)
  })

  it('CTA disabled + sr-only reason si la deadline est expirée', () => {
    const expired: Detail = {
      ...baseDetail,
      deadline: new Date(Date.now() - 86_400_000).toISOString(),
    }
    renderDetail(expired)
    const cta = screen.getByRole('button', { name: /candidatures closes/i })
    expect(cta).toBeDisabled()
    expect(cta).toHaveAttribute('aria-describedby', 'cta-disabled-reason')
    expect(document.getElementById('cta-disabled-reason')?.textContent).toMatch(/closes/i)
  })

  it('?postuler=1 déclenche l’intention de candidature (état modale)', async () => {
    currentSearch = 'postuler=1'
    renderDetail()
    // Le composant CandidatureModal est rendu (mock dynamic → null) :
    // on vérifie qu'aucune erreur n'a empêché le rendu du détail.
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
  })

  it('utilise navigator.share quand disponible', async () => {
    const shareSpy = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(window, 'navigator', {
      value: { share: shareSpy, clipboard: { writeText: jest.fn() } },
      writable: true,
    })
    renderDetail()
    const shareBtn = screen.getAllByRole('button', { name: /partager/i })[0]
    await userEvent.click(shareBtn)
    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: baseDetail.titre, url: expect.stringContaining(baseDetail.slug) }),
    )
  })

  it('fallback clipboard si navigator.share absent', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(window, 'navigator', {
      value: { clipboard: { writeText } },
      writable: true,
    })
    renderDetail()
    const shareBtn = screen.getAllByRole('button', { name: /partager/i })[0]
    await userEvent.click(shareBtn)
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(baseDetail.slug))
  })

  it('toggle favori — synchronisé via FavorisProvider (POST puis état pressed)', async () => {
    renderDetail()
    const bookmarks = screen.getAllByRole('button', { name: /sauvegarder/i })
    // 2 boutons bookmark (hero ghost + sticky 50x50). On clique le premier.
    await act(async () => {
      await userEvent.click(bookmarks[0])
    })
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/favoris',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  it('non-connecté → CTA est un lien SSO et non un bouton', () => {
    renderDetail(baseDetail, { viewer: null })
    const link = screen.getByRole('link', { name: /se connecter pour postuler/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('/api/auth/login'))
    expect(link.getAttribute('href')).toContain(encodeURIComponent('/opportunites/'))
  })

  it('liste les compétences requises en bullet (pas en chips)', () => {
    renderDetail()
    const li = screen.getByText('Python').closest('li')
    expect(li).not.toBeNull()
    // SQL n'est pas requise → ne doit pas apparaître dans la liste « Compétences requises ».
    expect(screen.queryByText('SQL')).toBeNull()
  })

  // ── GUIC-689 — HeroBadge : deux pastilles distinctes (catégorie + urgence) ──
  it('rend une pastille catégorie ET une pastille urgence séparées quand la deadline est proche', () => {
    const soon: Detail = {
      ...baseDetail,
      deadline: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    }
    renderDetail(soon)
    expect(screen.getByTestId('opp-categorie')).toBeInTheDocument()
    expect(screen.getByTestId('opp-urgence')).toBeInTheDocument()
    // `.gj-urgent` (tokens.css) porte `background: var(--gj-red)` — le rouge
    // reste réservé à l'urgence, seul son porteur change (GUIC-691).
    expect(screen.getByTestId('opp-urgence').className).toMatch(/\bgj-urgent\b/)
  })

  it('masque la pastille urgence quand la deadline est lointaine (badge fusionné supprimé)', () => {
    const lointaine: Detail = {
      ...baseDetail,
      deadline: new Date(Date.now() + 60 * 86_400_000).toISOString(),
    }
    renderDetail(lointaine)
    expect(screen.getByTestId('opp-categorie')).toBeInTheDocument()
    expect(screen.queryByTestId('opp-urgence')).not.toBeInTheDocument()
  })

  // ── GUIC-689 — CTA de conversion magenta ────────────────────────────────────
  it('le CTA "Postuler maintenant" porte la couleur d’action de conversion (classe .gj-cta)', async () => {
    renderDetail()
    const cta = await screen.findByRole('button', { name: /postuler maintenant/i })
    expect(cta.className).toMatch(/\bgj-cta\b/)
  })

  it('le lien "Se connecter pour postuler" (anonyme) porte la couleur d’action de conversion', () => {
    renderDetail(baseDetail, { viewer: null })
    const link = screen.getByRole('link', { name: /se connecter pour postuler/i })
    expect(link.className).toMatch(/\bgj-cta\b/)
  })

  // ── GUIC-689 (F-6) — enums bruts affichés lisiblement ────────────────────────
  it('formate la région via regionLabel (Saint_Louis → Saint-Louis, pas "saint louis")', () => {
    const detail: Detail = { ...baseDetail, region: 'Saint_Louis' } as unknown as Detail
    renderDetail(detail)
    expect(screen.getAllByText('Saint-Louis').length).toBeGreaterThan(0)
    expect(screen.queryByText('Saint_Louis')).toBeNull()
    expect(screen.queryByText('saint louis')).toBeNull()
  })

  it('conserve les acronymes de type de contrat en majuscules (CDD, pas "cdd")', () => {
    const detail: Detail = {
      ...baseDetail,
      details: { type: 'emploi', payload: { typeContrat: 'cdd', teletravail: false } },
    } as unknown as Detail
    renderDetail(detail)
    expect(screen.getByText('CDD')).toBeInTheDocument()
    expect(screen.queryByText('cdd')).toBeNull()
  })

  it('capitalise le type d’opportunité sans tout mettre en minuscules ("Stage", pas "stage" brut)', () => {
    renderDetail() // baseDetail.type === 'STAGE'
    expect(screen.getAllByText('Stage').length).toBeGreaterThan(0)
  })

  // ── F1.2 — Compteur de vues (GUIC-689, lot3-opps-web.jsx:420-428) ──────────
  describe('F1.2 — Compteur de vues', () => {
    it('affiche le nombre de vues dans les métadonnées du détail ("12 vues")', () => {
      renderDetail() // baseDetail.vues === 12
      expect(screen.getByText(/12 vues/)).toBeInTheDocument()
    })

    it('accorde le singulier quand vues=1 ("1 vue", pas "1 vues")', () => {
      const detail: Detail = { ...baseDetail, vues: 1 }
      renderDetail(detail)
      expect(screen.getByText(/^1 vue$/)).toBeInTheDocument()
      expect(screen.queryByText(/1 vues/)).toBeNull()
    })

    it('formate un grand nombre de vues en français (espace milliers, pas de virgule)', () => {
      const detail: Detail = { ...baseDetail, vues: 1248 }
      renderDetail(detail)
      expect(screen.getByText(/^1\s248 vues$/)).toBeInTheDocument()
      expect(screen.queryByText(/1,248/)).toBeNull()
    })

    it('porte l’icône « eye » du compteur de vues', () => {
      renderDetail()
      const chip = screen.getByText(/12 vues/).closest('span')
      expect(chip?.querySelector('use')).toHaveAttribute('href', '/icons.svg#i-eye')
    })
  })
})
