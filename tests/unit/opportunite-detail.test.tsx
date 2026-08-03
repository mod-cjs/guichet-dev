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
import { OpportuniteDetail as OpportuniteDetailCurrent } from '@/components/opportunites/OpportuniteDetail'
import { FavorisProvider } from '@/components/opportunites/FavorisProvider'
import type { ComponentProps, ReactElement } from 'react'
import type { OpportuniteDetail as Detail } from '@/types/candidature'

// RED (GUIC-689 P2) — `matchScore` n'existe pas encore sur `OpportuniteDetailProps`
// (le score affiché est encore mock, cf. YayeMatchCard). Cast explicite pour que
// ce commit test-only compile contre la signature ACTUELLE en exerçant la
// signature CIBLE ; le cast redevient inutile (mais inoffensif) dès le commit
// GREEN qui introduit réellement la prop.
type OpportuniteDetailTarget = (
  props: ComponentProps<typeof OpportuniteDetailCurrent> & {
    matchScore?: { score: number; raison: string } | null
  },
) => ReactElement | null
const OpportuniteDetail = OpportuniteDetailCurrent as unknown as OpportuniteDetailTarget

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

function renderDetail(
  detail: Detail = baseDetail,
  opts: {
    viewer?: typeof viewer | null
    matchScore?: { score: number; raison: string } | null
  } = {},
) {
  const v = 'viewer' in opts ? opts.viewer ?? null : viewer
  return render(
    <FavorisProvider isAuthenticated={v !== null}>
      <OpportuniteDetail detail={detail} viewer={v} matchScore={opts.matchScore} />
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
  // ── GUIC-689 P2 — score de correspondance RÉEL (plus de 94% codé en dur) ────
  it('rend la YayeMatchCard avec le score réel transmis en prop (pas de mock)', () => {
    renderDetail(baseDetail, {
      matchScore: { score: 0.73, raison: 'adaptée à ton niveau d’étude et ton profil' },
    })
    expect(screen.getByTestId('yaye-match-card')).toBeInTheDocument()
    expect(screen.getByTestId('yaye-match-score')).toHaveTextContent('73%')
    expect(screen.getByText('adaptée à ton niveau d’étude et ton profil')).toBeInTheDocument()
  })

  it('masque la YayeMatchCard quand aucun score n’existe pour ce couple (jamais de score inventé)', () => {
    renderDetail(baseDetail, { matchScore: null })
    expect(screen.queryByTestId('yaye-match-card')).not.toBeInTheDocument()
    // Assertion explicite : aucun pourcentage nulle part sur la page.
    expect(document.body.textContent ?? '').not.toMatch(/\d+\s*%/)
  })

  it('rend le hero compact avec titre, organisation et badge type', () => {
    renderDetail()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(baseDetail.titre)
    // GUIC-689 — l'organisation apparaît désormais à deux endroits (sous-titre
    // du hero ET bandeau « Offre portée par », comme dans la maquette) : on
    // cible explicitement celle du hero.
    expect(screen.getAllByText('Sonatel').length).toBeGreaterThanOrEqual(1)
    expect(document.querySelector('header b')?.textContent).toBe('Sonatel')
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

  it('liste les compétences requises en item de liste (pas en chips)', () => {
    renderDetail()
    const li = screen.getByText('Python').closest('li')
    expect(li).not.toBeNull()
    // SQL n'est pas requise → ne doit pas apparaître dans la liste « Compétences requises ».
    expect(screen.queryByText('SQL')).toBeNull()
  })

  // ── P1 (GUIC-689) — check-list des prérequis « où en es-tu ? » ─────────────
  describe('check-list des compétences requises', () => {
    const detailAvecPlusieursSkills: Detail = {
      ...baseDetail,
      skills: [
        { slug: 'python', libelle: 'Python', requise: true },
        { slug: 'creativite', libelle: 'Créativité', requise: true },
        { slug: 'git', libelle: 'Git', requise: true },
        { slug: 'sql', libelle: 'SQL', requise: false },
      ],
    } as unknown as Detail

    const viewerAvecCompetences = {
      ...viewer,
      // Volontairement une autre casse/accentuation que les libellés de l'offre :
      // la comparaison doit être insensible casse/accents.
      competences: ['python', 'creativite'],
    }

    it('coche ✓ (vert) un critère acquis, insensible à la casse et aux accents', () => {
      renderDetail(detailAvecPlusieursSkills, { viewer: viewerAvecCompetences })
      const python = screen.getByTestId('skill-check-python')
      expect(python).toHaveAttribute('data-acquise', 'true')
      expect(python.className).toMatch(/bg-gj-green-soft/)
      const creativite = screen.getByTestId('skill-check-creativite')
      expect(creativite).toHaveAttribute('data-acquise', 'true')
    })

    it('marque « à compléter » (ambre) un critère non acquis, jamais en rouge', () => {
      renderDetail(detailAvecPlusieursSkills, { viewer: viewerAvecCompetences })
      const git = screen.getByTestId('skill-check-git')
      expect(git).toHaveAttribute('data-acquise', 'false')
      expect(git.textContent).toMatch(/à compléter/i)
      expect(git.className).toMatch(/bg-gj-yellow-soft/)
      expect(git.className).not.toMatch(/bg-gj-red|text-gj-red/)
    })

    it('visiteur anonyme → liste simple sans état par critère (pas de check-list)', () => {
      renderDetail(detailAvecPlusieursSkills, { viewer: null })
      expect(screen.queryByTestId('skills-checklist')).not.toBeInTheDocument()
      expect(screen.queryByText(/à compléter/i)).toBeNull()
      expect(screen.getByText('Python')).toBeInTheDocument()
      expect(screen.getByText('Git')).toBeInTheDocument()
    })
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

  // ── P3-B (GUIC-689) — bandeau URL + vues, slide-over uniquement ────────────
  // Réf design v5 : `WebOppSlideOver` (lot3-opps-web.jsx L.412-429). La page
  // plein écran a déjà l'URL dans la barre d'adresse du navigateur → le
  // bandeau ne doit apparaître QUE quand le composant est rendu en slide-over
  // (signal existant : présence de `onClose`, cf. DetailSheet).
  // GREEN : implémenté dans OpportuniteDetail.tsx (bloc `detail-url-banner`).
  describe('Bandeau URL + vues — slide-over uniquement', () => {
    it('absent en contexte plein écran (pas de onClose)', () => {
      renderDetail()
      expect(screen.queryByTestId('detail-url-banner')).not.toBeInTheDocument()
    })

    it('affiche l’URL publique de l’offre quand rendu en slide-over (onClose fourni)', () => {
      render(
        <FavorisProvider isAuthenticated>
          <OpportuniteDetail detail={baseDetail} viewer={viewer} onClose={jest.fn()} />
        </FavorisProvider>,
      )
      const banner = screen.getByTestId('detail-url-banner')
      expect(banner).toHaveTextContent('stage-data-science')
      expect(banner).toHaveTextContent('/opportunites/')
    })

    it('affiche aussi le compteur de vues dans le bandeau en slide-over', () => {
      render(
        <FavorisProvider isAuthenticated>
          <OpportuniteDetail detail={baseDetail} viewer={viewer} onClose={jest.fn()} />
        </FavorisProvider>,
      )
      expect(screen.getByTestId('detail-url-banner-vues')).toHaveTextContent(/12\s*vues/)
    })

    it('ne duplique jamais le compteur de vues (un seul "vues" affiché en slide-over)', () => {
      render(
        <FavorisProvider isAuthenticated>
          <OpportuniteDetail detail={baseDetail} viewer={viewer} onClose={jest.fn()} />
        </FavorisProvider>,
      )
      const occurrences = (document.body.textContent ?? '').match(/12\s*vues?/g) ?? []
      expect(occurrences.length).toBe(1)
    })

    it('en plein écran, le compteur de vues reste dans les chips du hero (pas de régression)', () => {
      renderDetail()
      expect(screen.getByText(/12 vues/)).toBeInTheDocument()
      expect(screen.queryByTestId('detail-url-banner-vues')).not.toBeInTheDocument()
    })

    it('le texte du bandeau ne descend jamais sous 11px (classe text-fs-100)', () => {
      render(
        <FavorisProvider isAuthenticated>
          <OpportuniteDetail detail={baseDetail} viewer={viewer} onClose={jest.fn()} />
        </FavorisProvider>,
      )
      expect(screen.getByTestId('detail-url-banner').className).toMatch(/text-fs-100/)
    })

    it('l’URL est tronquée proprement (classe truncate) pour ne jamais déborder', () => {
      render(
        <FavorisProvider isAuthenticated>
          <OpportuniteDetail detail={baseDetail} viewer={viewer} onClose={jest.fn()} />
        </FavorisProvider>,
      )
      const urlSpan = screen.getByTestId('detail-url-banner').querySelector('.truncate')
      expect(urlSpan).not.toBeNull()
    })
  })

  // ── GUIC-689 — champs par sous-type (10/10, cf. brief §A) ──────────────────
  // Avant ces tests, seuls emploi/stage/formation affichaient des champs
  // spécifiques (et de façon incomplète) : bourse, concours, appel_a_projets,
  // financement, mentorat, mobilite, volontariat n'affichaient RIEN.
  describe('Champs spécifiques par sous-type (10/10)', () => {
    const numFr = new Intl.NumberFormat('fr-FR')
    // Le normaliseur par défaut de Testing Library collapse tout `\s+` (donc aussi
    // l'espace fine insécable U+202F que `Intl.NumberFormat('fr-FR')` utilise comme
    // séparateur de milliers) en un espace ASCII simple avant comparaison — on
    // reproduit la même normalisation ici pour matcher le texte DOM normalisé.
    const fcfa = (n: number) => `${numFr.format(n).replace(/ /g, ' ')} FCFA`

    function withDetails(details: Detail['details'], overrides: Partial<Detail> = {}): Detail {
      return { ...baseDetail, details, niveauEtudeMin: null, ...overrides } as Detail
    }

    it('emploi — type de contrat, télétravail, expérience requise, niveau d’étude', () => {
      const detail = withDetails({
        type: 'emploi',
        payload: {
          typeContrat: 'CDI',
          teletravail: true,
          experienceRequise: '3 ans minimum',
          niveauEtudeMin: 'BAC_PLUS_3',
        },
      } as unknown as Detail['details'])
      renderDetail(detail)
      expect(screen.getByText('CDI')).toBeInTheDocument()
      expect(screen.getByText('Télétravail possible')).toBeInTheDocument()
      expect(screen.getByText('3 ans minimum')).toBeInTheDocument()
      expect(screen.getByText('Bac Plus 3')).toBeInTheDocument()
    })

    it('stage — durée, début prévu, indemnisation, convention école, niveau d’étude', () => {
      const detail = withDetails({
        type: 'stage',
        payload: {
          dureeMois: 6,
          conventionneEcole: true,
          indemnise: true,
          indemniteMensuelleFcfa: 150000,
          niveauEtudeMin: 'BAC_PLUS_2',
          dateDebutPrevue: '2026-09-01T00:00:00.000Z',
        },
      } as unknown as Detail['details'])
      renderDetail(detail)
      expect(screen.getByText('6 mois')).toBeInTheDocument()
      expect(screen.getByText('1 septembre 2026')).toBeInTheDocument()
      expect(screen.getByText(`${fcfa(150000)} / mois`)).toBeInTheDocument()
      expect(screen.getByText("Convention d'école requise")).toBeInTheDocument()
      expect(screen.getByText('Bac Plus 2')).toBeInTheDocument()
    })

    it('stage — indemnise:false affiche « Stage non indemnisé » (booléen porteur de sens)', () => {
      const detail = withDetails({
        type: 'stage',
        payload: {
          dureeMois: 3,
          conventionneEcole: false,
          indemnise: false,
          indemniteMensuelleFcfa: null,
          niveauEtudeMin: null,
          dateDebutPrevue: null,
        },
      } as unknown as Detail['details'])
      renderDetail(detail)
      expect(screen.getByText('Stage non indemnisé')).toBeInTheDocument()
      // conventionneEcole:false → pas de cellule (non porteur de décision côté jeune).
      expect(screen.queryByText("Convention d'école requise")).toBeNull()
    })

    it('formation — durée en heures, certification, prérequis, frais (gratuite)', () => {
      const detail = withDetails({
        type: 'formation',
        payload: {
          dureeHeures: 40,
          modalite: 'DISTANCE',
          certifiante: true,
          organismeCertificateur: 'Cisco',
          prerequis: 'Bases en réseaux',
          gratuite: true,
          fraisInscriptionFcfa: null,
        },
      } as unknown as Detail['details'])
      renderDetail(detail)
      expect(screen.getByText('40 heures')).toBeInTheDocument()
      expect(screen.getByText('Certifiante — Cisco')).toBeInTheDocument()
      expect(screen.getByText('Bases en réseaux')).toBeInTheDocument()
      expect(screen.getByText('Formation gratuite')).toBeInTheDocument()
    })

    it('formation — gratuite:false affiche « Formation payante » + montant (booléen porteur de sens)', () => {
      const detail = withDetails({
        type: 'formation',
        payload: {
          dureeHeures: 12,
          modalite: 'PRESENTIEL',
          certifiante: false,
          organismeCertificateur: null,
          prerequis: null,
          gratuite: false,
          fraisInscriptionFcfa: 15000,
        },
      } as unknown as Detail['details'])
      renderDetail(detail)
      expect(screen.getByText(`Formation payante — ${fcfa(15000)}`)).toBeInTheDocument()
      // certifiante:false → pas de cellule (défaut attendu, non décisif).
      expect(screen.queryByText(/Formation certifiante/)).toBeNull()
      expect(screen.queryByText('Formation gratuite')).toBeNull()
    })

    it('bourse — montant, pays, organisme, durée, couple obligatoire, niveau requis', () => {
      const detail = withDetails({
        type: 'bourse',
        payload: {
          montantTotalFcfa: 2500000,
          dureeMois: 24,
          niveauEtudeRequis: 'BAC_PLUS_5',
          paysDestination: 'France',
          organismeFinanceur: 'Campus France',
          coupleObligatoire: true,
        },
      } as unknown as Detail['details'])
      renderDetail(detail)
      expect(screen.getByText(fcfa(2500000))).toBeInTheDocument()
      expect(screen.getByText('24 mois')).toBeInTheDocument()
      expect(screen.getByText('France')).toBeInTheDocument()
      expect(screen.getByText('Campus France')).toBeInTheDocument()
      expect(screen.getByText('Candidature en couple obligatoire')).toBeInTheDocument()
      expect(screen.getByText('Bac Plus 5')).toBeInTheDocument()
    })

    it('concours — accorde le singulier « 1 place », pas « 1 places »', () => {
      const detail = withDetails({
        type: 'concours',
        payload: {
          organismeOrganisateur: 'Fonction publique',
          dateEpreuves: null,
          lieuEpreuves: null,
          preuvesDemandees: null,
          placesDisponibles: 1,
        },
      } as unknown as Detail['details'])
      renderDetail(detail)
      expect(screen.getByText('1 place')).toBeInTheDocument()
      expect(screen.queryByText('1 places')).toBeNull()
    })

    it('concours — un champ optionnel absent ne rend PAS de cellule vide', () => {
      const detail = withDetails({
        type: 'concours',
        payload: {
          organismeOrganisateur: 'Fonction publique',
          dateEpreuves: null,
          lieuEpreuves: null,
          preuvesDemandees: null,
          placesDisponibles: null,
        },
      } as unknown as Detail['details'])
      renderDetail(detail)
      expect(screen.getByText('Fonction publique')).toBeInTheDocument()
      expect(screen.queryByText('Date des épreuves')).toBeNull()
      expect(screen.queryByText('Lieu des épreuves')).toBeNull()
      expect(screen.queryByText('Pièces demandées')).toBeNull()
      expect(screen.queryByText('Places disponibles')).toBeNull()
    })

    it('concours — tous les champs optionnels renseignés s’affichent', () => {
      const detail = withDetails({
        type: 'concours',
        payload: {
          organismeOrganisateur: 'Fonction publique',
          dateEpreuves: '2026-11-15T00:00:00.000Z',
          lieuEpreuves: 'Dakar — CICES',
          preuvesDemandees: 'CV, diplôme, extrait de casier',
          placesDisponibles: 50,
        },
      } as unknown as Detail['details'])
      renderDetail(detail)
      expect(screen.getByText('15 novembre 2026')).toBeInTheDocument()
      expect(screen.getByText('Dakar — CICES')).toBeInTheDocument()
      expect(screen.getByText('CV, diplôme, extrait de casier')).toBeInTheDocument()
      expect(screen.getByText('50 places')).toBeInTheDocument()
    })

    it('appel à projets — budget max, durée du projet, thématique', () => {
      const detail = withDetails({
        type: 'appel_a_projets',
        payload: {
          budgetMaxFcfa: 5000000,
          dureeProjetMois: 12,
          thematique: 'Agriculture durable',
          dossierRequis: 'Plan d’affaires + budget prévisionnel',
          criteresEligibilite: 'Structure formalisée depuis 1 an',
        },
      } as unknown as Detail['details'])
      renderDetail(detail)
      expect(screen.getByText(fcfa(5000000))).toBeInTheDocument()
      expect(screen.getByText('12 mois')).toBeInTheDocument()
      expect(screen.getByText('Agriculture durable')).toBeInTheDocument()
    })

    it('financement — montant, type, organisme, taux annuel, durée de remboursement, date limite', () => {
      const detail = withDetails({
        type: 'financement',
        payload: {
          montantFcfa: 1000000,
          typeFinancement: 'MICROCREDIT',
          tauxAnnuel: '12.5',
          garanties: 'Caution solidaire',
          dureeRemboursementMois: 18,
          organismeFinanceur: 'ADEPME',
          isContinuous: false,
          dateLimiteDepot: '2026-12-31T00:00:00.000Z',
        },
      } as unknown as Detail['details'])
      renderDetail(detail)
      expect(screen.getByText(fcfa(1000000))).toBeInTheDocument()
      expect(screen.getByText('Microcredit')).toBeInTheDocument()
      expect(screen.getByText('ADEPME')).toBeInTheDocument()
      expect(screen.getByText('12,5 %')).toBeInTheDocument()
      expect(screen.getByText('18 mois')).toBeInTheDocument()
      expect(screen.getByText('31 décembre 2026')).toBeInTheDocument()
    })

    it('financement — isContinuous affiche « pas de date limite » plutôt qu’une date', () => {
      const detail = withDetails({
        type: 'financement',
        payload: {
          montantFcfa: 500000,
          typeFinancement: 'DOTATION',
          tauxAnnuel: null,
          garanties: null,
          dureeRemboursementMois: null,
          organismeFinanceur: 'Fonds régional',
          isContinuous: true,
          dateLimiteDepot: null,
        },
      } as unknown as Detail['details'])
      renderDetail(detail)
      expect(screen.getByText('Dépôt en continu (pas de date limite)')).toBeInTheDocument()
      expect(screen.queryByText('Date limite de dépôt')).toBeNull()
    })

    it('mentorat — durée, modalité, organisateur, thématique, places disponibles', () => {
      const detail = withDetails({
        type: 'mentorat',
        payload: {
          dureeMois: 6,
          modalite: 'COHORTE',
          thematique: 'Entrepreneuriat social',
          placesDisponibles: 20,
          organisateurLibelle: 'Incubateur CTIC',
        },
      } as unknown as Detail['details'])
      renderDetail(detail)
      expect(screen.getByText('6 mois')).toBeInTheDocument()
      expect(screen.getByText('Cohorte')).toBeInTheDocument()
      expect(screen.getByText('Entrepreneuriat social')).toBeInTheDocument()
      expect(screen.getByText('20 places')).toBeInTheDocument()
      expect(screen.getByText('Incubateur CTIC')).toBeInTheDocument()
    })

    it('mobilité — destination, type, durée, niveau de langue, prise en charge, date de départ', () => {
      const detail = withDetails({
        type: 'mobilite',
        payload: {
          destination: 'Canada',
          typeMobilite: 'ETUDE',
          dureeMois: 9,
          prisEnCharge: 'Billet + logement',
          niveauLangueRequis: 'B2',
          dateDepartPrevue: '2027-01-10T00:00:00.000Z',
        },
      } as unknown as Detail['details'])
      renderDetail(detail)
      expect(screen.getByText('Canada')).toBeInTheDocument()
      expect(screen.getByText('Etude')).toBeInTheDocument()
      expect(screen.getByText('9 mois')).toBeInTheDocument()
      expect(screen.getByText('B2')).toBeInTheDocument()
      expect(screen.getByText('Billet + logement')).toBeInTheDocument()
      expect(screen.getByText('10 janvier 2027')).toBeInTheDocument()
    })

    it('volontariat — durée, type, domaine de mission, indemnité, places (indemnité présente)', () => {
      const detail = withDetails({
        type: 'volontariat',
        payload: {
          dureeMois: 12,
          typeVolontariat: 'SERVICE_CIVIQUE',
          indemniteMensuelleFcfa: 75000,
          domaineMission: 'Éducation',
          placesDisponibles: 5,
        },
      } as unknown as Detail['details'])
      renderDetail(detail)
      expect(screen.getByText('12 mois')).toBeInTheDocument()
      expect(screen.getByText('Service Civique')).toBeInTheDocument()
      expect(screen.getByText('Éducation')).toBeInTheDocument()
      expect(screen.getByText(fcfa(75000))).toBeInTheDocument()
      expect(screen.getByText('5 places')).toBeInTheDocument()
    })

    it('volontariat — indemnité absente affiche « Volontariat non indemnisé »', () => {
      const detail = withDetails({
        type: 'volontariat',
        payload: {
          dureeMois: 12,
          typeVolontariat: 'ENGAGEMENT',
          indemniteMensuelleFcfa: null,
          domaineMission: 'Environnement',
          placesDisponibles: null,
        },
      } as unknown as Detail['details'])
      renderDetail(detail)
      expect(screen.getByText('Volontariat non indemnisé')).toBeInTheDocument()
    })

    it('niveau d’étude minimum (champ racine) — repli affiché quand le sous-type n’a pas son propre champ', () => {
      const detail = withDetails(null, { niveauEtudeMin: 'BAC' } as Partial<Detail>)
      renderDetail(detail)
      expect(screen.getByText('Bac')).toBeInTheDocument()
    })

    it('niveau d’étude minimum — le champ du sous-type prévaut sur le champ racine (pas de doublon)', () => {
      const detail = withDetails(
        {
          type: 'emploi',
          payload: { typeContrat: 'CDI', teletravail: false, experienceRequise: null, niveauEtudeMin: 'BAC_PLUS_5' },
        } as unknown as Detail['details'],
        { niveauEtudeMin: 'BAC' } as Partial<Detail>,
      )
      renderDetail(detail)
      expect(screen.getByText('Bac Plus 5')).toBeInTheDocument()
      expect(screen.queryByText('Bac')).toBeNull()
    })

    it('puce domaine dans le hero (icône target) — nouvelle puce du hero', () => {
      renderDetail()
      const chip = screen
        .getAllByText('Tech')
        .map((el) => el.closest('span'))
        .find((span) => span?.querySelector('use')?.getAttribute('href') === '/icons.svg#i-target')
      expect(chip).toBeTruthy()
    })
  })

  // ── GUIC-689 — cohérence typographique (design v5, kvCard/sectH) ───────────
  describe('Cohérence typographique (design v5)', () => {
    it('les titres de section (h2) utilisent text-color-text-secondary, plus jamais text-color-text-muted', () => {
      renderDetail()
      const heading = document.getElementById('opp-details-heading')
      expect(heading?.className).toMatch(/text-color-text-secondary/)
      expect(heading?.className).not.toMatch(/text-color-text-muted/)
    })

    it('DetailCell a une bordure 1.5px, un label extra-bold et un tracking .4px', () => {
      renderDetail()
      const wrapper = screen.getByText('Type').closest('div')
      expect(wrapper?.className).toMatch(/border-\[1\.5px\]/)
      expect(wrapper?.className).toMatch(/border-gj-line\b/)
      const label = screen.getByText('Type')
      expect(label.className).toMatch(/font-extrabold/)
      expect(label.className).toMatch(/tracking-\[0\.4px\]/)
      expect(label.className).not.toMatch(/tracking-wide/)
    })

    it('le titre hero utilise les tokens fs-600/fs-700 et n’a plus la classe morte text-color-text-onDark', () => {
      renderDetail()
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1.className).toMatch(/text-fs-600/)
      expect(h1.className).toMatch(/sm:text-fs-700/)
      expect(h1.className).toMatch(/tracking-\[-0\.2px\]/)
      expect(h1.className).not.toMatch(/text-color-text-onDark/)
    })

    it('la description et les sections riches utilisent leading-[1.6], plus jamais leading-loose', () => {
      renderDetail({ ...baseDetail, profilRecherche: 'Profil détaillé', mission: 'Mission détaillée' })
      const description = screen.getByText(baseDetail.description).closest('div')
      expect(description?.className).toMatch(/leading-\[1\.6\]/)
      expect(description?.className).not.toMatch(/leading-loose/)
      const profil = screen.getByText('Profil détaillé').closest('div')
      expect(profil?.className).toMatch(/leading-\[1\.6\]/)
      expect(profil?.className).not.toMatch(/leading-loose/)
    })

    it('la liste des compétences (visiteur anonyme) utilise leading-[1.7], plus jamais leading-loose', () => {
      renderDetail(baseDetail, { viewer: null })
      const list = document.querySelector('ul.list-disc')
      expect(list?.className).toMatch(/leading-\[1\.7\]/)
      expect(list?.className).not.toMatch(/leading-loose/)
    })

    it('le CTA connecté « Postuler maintenant » est en font-extrabold (même graisse que le lien anonyme)', async () => {
      renderDetail()
      const cta = await screen.findByRole('button', { name: /postuler maintenant/i })
      expect(cta.className).toMatch(/font-extrabold/)
    })
  })
})
