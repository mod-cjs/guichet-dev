import { render, screen, fireEvent } from '@testing-library/react'
import { OppCard, buildDeadlineInfo } from '@/components/opportunites/OppCard'
import type { OpportuniteListItem } from '@/types/opportunite'

const baseItem: OpportuniteListItem = {
  id: 'o1',
  slug: 'stage-data-science',
  titre: 'Stage Data Science · 6 mois',
  type: 'Stage',
  domaine: 'Numerique',
  region: 'Dakar',
  organisation: 'Sonatel — Innovation',
  remuneration: '350 000 F/mois',
  deadline: null,
}

const FIXED_NOW = new Date('2026-06-01T00:00:00.000Z').getTime()

describe('buildDeadlineInfo()', () => {
  it('retourne null si pas de deadline', () => {
    expect(buildDeadlineInfo(null)).toBeNull()
  })

  // GUIC-689 — gradation à 3 niveaux (le seuil binaire à 7 jours banalisait le
  // rouge). Le libellé garde toujours la date exacte (jamais "J-N") : c'est la
  // pastille séparée (`urgence-badge` dans <OppCard />) qui porte le "J-N".
  it("niveau 'urgent' à J-3 (≤ 3 jours) — libellé = date exacte, pas 'J-3'", () => {
    const iso = new Date(FIXED_NOW + 3 * 86_400_000).toISOString()
    const info = buildDeadlineInfo(iso, FIXED_NOW)
    expect(info?.level).toBe('urgent')
    expect(info?.urgent).toBe(true)
    expect(info?.days).toBe(3)
    expect(info?.label).not.toMatch(/^J-/)
    expect(info?.label).toMatch(/\d/)
  })

  it("niveau 'proche' entre 4 et 7 jours (ambre, ni urgent ni normal)", () => {
    const iso = new Date(FIXED_NOW + 5 * 86_400_000).toISOString()
    const info = buildDeadlineInfo(iso, FIXED_NOW)
    expect(info?.level).toBe('proche')
    expect(info?.urgent).toBe(false)
    expect(info?.days).toBe(5)
  })

  it("niveau 'normal' au-delà de 7 jours et formate la date", () => {
    const iso = new Date(FIXED_NOW + 30 * 86_400_000).toISOString()
    const info = buildDeadlineInfo(iso, FIXED_NOW)
    expect(info?.level).toBe('normal')
    expect(info?.urgent).toBe(false)
    expect(info?.label).toMatch(/\d/)
  })

  it("'Aujourd'hui' (J-0) reste une exception au libellé complet — niveau urgent", () => {
    const iso = new Date(FIXED_NOW).toISOString()
    const info = buildDeadlineInfo(iso, FIXED_NOW)
    expect(info).toEqual({ label: "Aujourd'hui", days: 0, level: 'urgent', urgent: true })
  })

  it("retourne 'Clôturée' (niveau normal) pour deadline passée", () => {
    const iso = new Date(FIXED_NOW - 86_400_000).toISOString()
    const info = buildDeadlineInfo(iso, FIXED_NOW)
    expect(info).toEqual({ label: 'Clôturée', days: -1, level: 'normal', urgent: false })
  })
})

describe('<OppCard />', () => {
  it('affiche titre, organisation, région et rémunération', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    expect(screen.getByText(baseItem.titre)).toBeInTheDocument()
    expect(screen.getByText(baseItem.organisation)).toBeInTheDocument()
    expect(screen.getByText('Dakar')).toBeInTheDocument()
    expect(screen.getByText('350 000 F/mois')).toBeInTheDocument()
  })

  it("rend un lien étiré vers /opportunites/<slug>", () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    // GUIC-689 — le CTA secondaire porte désormais aussi un aria-label avec le
    // titre (« Voir l'offre : {titre} ») : on cible spécifiquement le lien
    // étiré (« Voir l'opportunité : {titre} ») pour éviter l'ambiguïté.
    const link = screen.getByRole('link', { name: /voir l'opportunité : stage data science/i })
    expect(link).toHaveAttribute('href', '/opportunites/stage-data-science')
  })

  it("appelle onToggleFavori avec l'id au clic sur le bouton favori", () => {
    const onToggle = jest.fn()
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={onToggle} />)
    fireEvent.click(screen.getByRole('button', { name: /ajouter aux favoris/i }))
    expect(onToggle).toHaveBeenCalledWith('o1')
  })

  it('expose aria-pressed=true et label "Retirer" quand favori', () => {
    render(<OppCard item={baseItem} isFavori={true} onToggleFavori={() => {}} />)
    const btn = screen.getByRole('button', { name: /retirer des favoris/i })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('affiche le score de matching quand fourni', () => {
    render(
      <OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} matchScore={94} />,
    )
    expect(screen.getByTestId('match-score')).toHaveTextContent('94%')
  })

  it("ne rend pas le badge match si matchScore est null", () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    expect(screen.queryByTestId('match-score')).not.toBeInTheDocument()
  })

  it("conserve la bordure gj-line même quand deadline urgente (GUIC-689 — l'urgence est portée par la pastille, pas la carte)", () => {
    const item = { ...baseItem, deadline: new Date(Date.now() + 2 * 86_400_000).toISOString() }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} />)
    const card = screen.getByTestId('opp-card')
    expect(card.className).toMatch(/border-gj-line\b/)
    expect(card.className).not.toMatch(/border-gj-red/)
  })

  it('le bouton favori respecte la cible tactile 44px (GUIC-689)', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const favori = screen.getByRole('button', { name: /ajouter aux favoris/i })
    expect(favori.className).toMatch(/w-\[44px\]/)
    expect(favori.className).toMatch(/h-\[44px\]/)
  })
})

// ─── GUIC-689 — graisses v5 (800 partout, jamais 900) ───────────────────────

describe('GUIC-689 — graisses v5', () => {
  it("le titre de carte est en font-extrabold (800), plus en font-black (900)", () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const titre = screen.getByText(baseItem.titre)
    expect(titre.className).toMatch(/font-extrabold\b/)
    expect(titre.className).not.toMatch(/font-black\b/)
  })

  it("le CTA « Voir l'offre » est en font-extrabold (800), plus en font-bold (700)", () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const cta = screen.getByTestId('cta-voir-postuler')
    expect(cta.className).toMatch(/font-extrabold\b/)
    expect(cta.className).not.toMatch(/font-bold\b/)
  })
})

// ─── GUIC-689 — échéance : gradation à 3 niveaux + gras systématique ────────

describe('GUIC-689 — deadline : gradation à 3 niveaux', () => {
  it('J-3 (≤ 3 jours) : rouge, gras, et le libellé complet « Postuler avant le X » (pas de collapse en J-N)', () => {
    const item = { ...baseItem, deadline: new Date(FIXED_NOW + 3 * 86_400_000).toISOString() }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} now={FIXED_NOW} />)
    const dl = screen.getByTestId('deadline-label')
    expect(dl.className).toMatch(/text-gj-red\b/)
    expect(dl.className).toMatch(/font-extrabold\b/)
    expect(dl.textContent).toMatch(/^Postuler avant le /)
  })

  it('J-5 (4 à 7 jours) : ambre "proche", gras, libellé complet — pas de pastille urgence-badge séparée', () => {
    const item = { ...baseItem, deadline: new Date(FIXED_NOW + 5 * 86_400_000).toISOString() }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} now={FIXED_NOW} />)
    const dl = screen.getByTestId('deadline-label')
    expect(dl.className).toMatch(/text-gj-yellow-ink\b/)
    expect(dl.className).toMatch(/font-extrabold\b/)
    expect(dl.textContent).toMatch(/^Postuler avant le /)
    expect(screen.queryByTestId('urgence-badge')).not.toBeInTheDocument()
  })

  it('J-30 (> 7 jours) : couleur de texte secondaire, gras systématique quand même', () => {
    const item = { ...baseItem, deadline: new Date(FIXED_NOW + 30 * 86_400_000).toISOString() }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} now={FIXED_NOW} />)
    const dl = screen.getByTestId('deadline-label')
    expect(dl.className).toMatch(/text-color-text-secondary\b/)
    expect(dl.className).toMatch(/font-extrabold\b/)
    expect(dl.className).not.toMatch(/text-gj-red\b/)
    expect(dl.textContent).toMatch(/^Postuler avant le /)
  })

  it("la pastille urgence-badge n'apparaît qu'en urgence réelle (≤ 3 jours), pas en 'proche'", () => {
    const item = { ...baseItem, deadline: new Date(FIXED_NOW + 3 * 86_400_000).toISOString() }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} now={FIXED_NOW} />)
    expect(screen.getByTestId('urgence-badge')).toHaveTextContent('J-3')
  })

  it("'Aujourd'hui' (J-0) : exception, pas de préfixe 'Postuler avant le'", () => {
    const item = { ...baseItem, deadline: new Date(FIXED_NOW).toISOString() }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} now={FIXED_NOW} />)
    expect(screen.getByTestId('deadline-label')).toHaveTextContent("Aujourd'hui")
    expect(screen.getByTestId('deadline-label').textContent).not.toMatch(/Postuler/)
  })

  it("'Clôturée' : exception, pas de préfixe, couleur secondaire (pas rouge)", () => {
    const item = { ...baseItem, deadline: new Date(FIXED_NOW - 86_400_000).toISOString() }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} now={FIXED_NOW} />)
    const dl = screen.getByTestId('deadline-label')
    expect(dl).toHaveTextContent('Clôturée')
    expect(dl.textContent).not.toMatch(/Postuler/)
    expect(dl.className).not.toMatch(/text-gj-red\b/)
  })
})

// ─── F1.1 — Tuile sectorielle (GUIC-689, lot3-opps-web/mobile) ───────────────
// « Reconnaître avant de lire » : un aplat de la famille catégorie + un
// pictogramme, en tête de carte (desktop ET mobile). Zéro dégradé (aplat
// uniquement — cf. lot3-opps-web.jsx qui utilise un dégradé, non repris ici).

describe('F1.1 — Tuile sectorielle', () => {
  it('affiche une tuile avec l’aplat de la famille catégorie (Stage → cat-stage)', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const tuile = screen.getByTestId('opp-tuile')
    expect(tuile).toHaveAttribute('data-cat', 'cat-stage')
    expect(tuile.className).toMatch(/bg-cat-stage-soft/)
    expect(tuile.className).toMatch(/text-cat-stage-ink/)
  })

  it('ne rend jamais de dégradé sur la tuile (aplat uniquement)', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const tuile = screen.getByTestId('opp-tuile')
    expect(tuile.className).not.toMatch(/gradient/)
    expect(tuile.getAttribute('style') ?? '').not.toMatch(/gradient/)
  })

  it('affiche le pictogramme sectoriel correspondant au type (Formation → learning)', () => {
    const item = { ...baseItem, type: 'Formation' as const }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} />)
    const tuile = screen.getByTestId('opp-tuile')
    expect(tuile).toHaveAttribute('data-cat', 'cat-formation')
    expect(tuile.querySelector('use')).toHaveAttribute('href', '/icons.svg#i-learning')
  })

  it('adapte la famille catégorie et l’icône pour un Emploi', () => {
    const item = { ...baseItem, type: 'Emploi' as const }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} />)
    const tuile = screen.getByTestId('opp-tuile')
    expect(tuile).toHaveAttribute('data-cat', 'cat-emploi')
    expect(tuile.querySelector('use')).toHaveAttribute('href', '/icons.svg#i-employment')
  })

  it('la tuile est purement décorative (aria-hidden) — l’information est déjà portée par le chip', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const tuile = screen.getByTestId('opp-tuile')
    expect(tuile).toHaveAttribute('aria-hidden')
  })

  // GUIC-689 — tuile complète : filigrane sectoriel + pastille d'initiale d'organisation
  // (réf. `OppListCard` L162-166 web / `MobileOppRowCard` L36-39 mobile).

  it('affiche un filigrane décoratif (grande icône en fond, opacité réduite, non interactif)', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const filigrane = screen.getByTestId('opp-tuile-filigrane')
    expect(filigrane).toHaveAttribute('aria-hidden')
    // Élément SVG : `.className` est un SVGAnimatedString, pas une string —
    // on lit l'attribut `class` directement.
    const classes = filigrane.getAttribute('class') ?? ''
    expect(classes).toMatch(/pointer-events-none/)
    expect(classes).toMatch(/opacity-20\b/)
  })

  it("affiche une pastille ronde avec l'initiale de l'organisation en haut-gauche", () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    // baseItem.organisation = 'Sonatel — Innovation'
    expect(screen.getByTestId('opp-tuile-initiale')).toHaveTextContent('S')
  })

  it("masque la pastille d'initiale si l'organisation est vide (pas de « ? » disgracieux)", () => {
    const item = { ...baseItem, organisation: '' }
    render(<OppCard item={item} isFavori={false} onToggleFavori={() => {}} />)
    expect(screen.queryByTestId('opp-tuile-initiale')).not.toBeInTheDocument()
  })

  it('le pictogramme principal reste au premier plan au-dessus du filigrane', () => {
    render(<OppCard item={baseItem} isFavori={false} onToggleFavori={() => {}} />)
    const tuile = screen.getByTestId('opp-tuile')
    const uses = tuile.querySelectorAll('use')
    // 2 <use> : le filigrane (fond) + le pictogramme principal (premier plan)
    expect(uses.length).toBe(2)
  })
})
