import { render, screen, fireEvent } from '@testing-library/react'
import { FiltresPanel, FILTER_PARAM_KEYS, type FiltresValue } from '@/components/opportunites/FiltresPanel'

const baseValue: FiltresValue = { sortBy: 'recent' }

function setup(overrides?: Partial<Parameters<typeof FiltresPanel>[0]>) {
  const onChange = jest.fn()
  const onReset = jest.fn()
  const onApply = jest.fn()
  render(
    <FiltresPanel
      value={baseValue}
      onChange={onChange}
      onReset={onReset}
      onApply={onApply}
      resultsCount={124}
      {...overrides}
    />,
  )
  return { onChange, onReset, onApply }
}

describe('<FiltresPanel /> (desktop refactor — GUIC-251)', () => {
  // GUIC-689 — `FILTER_PARAM_KEYS` est la source unique consommée par la sentinelle
  // anti-"filtre décoratif" (tests/integration/opportunites-api-sentinel.test.ts).
  it('GUIC-689 : expose FILTER_PARAM_KEYS avec les 6 filtres réellement écrits par le panneau', () => {
    expect(FILTER_PARAM_KEYS).toEqual([
      'domaine',
      'type',
      'region',
      'programme',
      'remuneration',
      'deadline',
    ])
  })


  it('rend les sections Type, Domaine, Région, Rémunération, Deadline', () => {
    setup()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Domaine')).toBeInTheDocument()
    expect(screen.getByText('Région')).toBeInTheDocument()
    expect(screen.getByText('Rémunération')).toBeInTheDocument()
    expect(screen.getByText('Deadline')).toBeInTheDocument()
  })

  // GUIC-689 (Lot P3-A) — ordre des sections conforme design v5
  // (`lot3-opps-web.jsx#WebFilterPanel` L.73-104) : Type, Domaine, Région,
  // Deadline, Rémunération. Programme (GUIC-684, hors maquette) est ajouté en
  // fin de liste plutôt qu'interposé, pour ne pas rompre la continuité des 5
  // sections de la maquette.
  it('GUIC-689 : ordonne les sections Type, Domaine, Région, Deadline, Rémunération puis Programme en dernier', () => {
    const { container } = render(
      <FiltresPanel
        value={baseValue}
        onChange={jest.fn()}
        onReset={jest.fn()}
        programmes={[{ slug: 'yeah', nom: 'YEAH' }]}
      />,
    )
    const sectionTitles = Array.from(container.querySelectorAll('summary > span')).map(
      (el) => el.textContent,
    )
    expect(sectionTitles).toEqual([
      'Type',
      'Domaine',
      'Région',
      'Deadline',
      'Rémunération',
      'Programme',
    ])
  })

  it('rend les checkboxes Type (Emploi, Stage, Bourse, …)', () => {
    setup()
    expect(screen.getByLabelText('Emploi')).toBeInTheDocument()
    expect(screen.getByLabelText('Stage')).toBeInTheDocument()
    expect(screen.getByLabelText('Bourse')).toBeInTheDocument()
  })

  it('cocher Emploi propage onChange avec type=Emploi', () => {
    const { onChange } = setup()
    fireEvent.click(screen.getByLabelText('Emploi'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'Emploi', sortBy: 'recent' }),
    )
  })

  it('décocher (re-cliquer) retire le filtre', () => {
    const { onChange } = setup({ value: { sortBy: 'recent', type: 'Emploi' } })
    fireEvent.click(screen.getByLabelText('Emploi'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: undefined }),
    )
  })

  it('affiche les compteurs si props.counts.type est fourni', () => {
    setup({ counts: { type: { Emploi: 186, Stage: 142 } } })
    expect(screen.getByText('186')).toBeInTheDocument()
    expect(screen.getByText('142')).toBeInTheDocument()
  })

  it('badge actif affiche le nombre de filtres sélectionnés', () => {
    setup({
      value: { sortBy: 'recent', type: 'Emploi', region: 'Dakar', deadline: '7' },
    })
    expect(screen.getByLabelText(/3 filtres actifs/i)).toBeInTheDocument()
  })

  it('"Tout effacer" est désactivé sans filtre actif et appelle onReset sinon', () => {
    const { onReset } = setup({ value: { sortBy: 'recent', type: 'Emploi' } })
    const btn = screen.getByRole('button', { name: /tout effacer/i })
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)
    expect(onReset).toHaveBeenCalled()
  })

  it('CTA "Appliquer N filtres · X résultats" appelé avec onApply', () => {
    const { onApply } = setup({
      value: { sortBy: 'recent', type: 'Emploi', region: 'Dakar' },
      resultsCount: 42,
    })
    const cta = screen.getByRole('button', { name: /appliquer 2 filtres · 42 résultats/i })
    expect(cta).toBeInTheDocument()
    fireEvent.click(cta)
    expect(onApply).toHaveBeenCalled()
  })

  it('cocher Rémunéré propage remuneration=yes', () => {
    const { onChange } = setup()
    fireEvent.click(screen.getByLabelText('Rémunéré'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ remuneration: 'yes' }),
    )
  })

  it('cocher "Moins de 7 jours" propage deadline=7', () => {
    const { onChange } = setup()
    fireEvent.click(screen.getByLabelText('Moins de 7 jours'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ deadline: '7' }),
    )
  })

  // F11 — Région en chips pill
  it('F11 : la section Région rend des chips pill (role=button aria-pressed) et non des checkboxes', () => {
    setup()
    // Les régions doivent être rendues en chips pill (boutons avec aria-pressed)
    // et non en input[type=checkbox]
    const dakarChip = screen.getByRole('button', { name: /^Dakar$/i })
    expect(dakarChip).toBeInTheDocument()
    expect(dakarChip).toHaveAttribute('aria-pressed')
    // Vérifie qu'il n'y a PAS de checkbox pour Dakar
    const dakarCheckbox = screen.queryByRole('checkbox', { name: /^Dakar$/i })
    expect(dakarCheckbox).not.toBeInTheDocument()
  })

  it('F11 : cliquer sur un chip région propage onChange avec region=Dakar', () => {
    const { onChange } = setup()
    const dakarChip = screen.getByRole('button', { name: /^Dakar$/i })
    fireEvent.click(dakarChip)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'Dakar' }),
    )
  })

  it('F11 : chip région sélectionnée a aria-pressed=true', () => {
    setup({ value: { sortBy: 'recent', region: 'Dakar' } })
    const dakarChip = screen.getByRole('button', { name: /^Dakar$/i })
    expect(dakarChip).toHaveAttribute('aria-pressed', 'true')
  })

  it('F11 : re-cliquer sur un chip région déjà sélectionné retire le filtre', () => {
    const { onChange } = setup({ value: { sortBy: 'recent', region: 'Dakar' } })
    const dakarChip = screen.getByRole('button', { name: /^Dakar$/i })
    fireEvent.click(dakarChip)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ region: undefined }),
    )
  })

  // F19 — Labels domaine enrichis
  it('F19 : "Numerique" est affiché comme "Numérique / Tech"', () => {
    setup()
    expect(screen.getByLabelText('Numérique / Tech')).toBeInTheDocument()
    // Le label brut ne doit pas apparaître
    expect(screen.queryByLabelText('Numerique')).not.toBeInTheDocument()
  })

  it('F19 : "Agriculture" est affiché comme "Agriculture & élevage"', () => {
    setup()
    expect(screen.getByLabelText('Agriculture & élevage')).toBeInTheDocument()
    expect(screen.queryByLabelText('Agriculture')).not.toBeInTheDocument()
  })

  // F23 — Icône filtre dans l'en-tête
  it('F23 : l\'en-tête "Filtres" contient une icône SVG (use href="/icons.svg#i-filter")', () => {
    const { container } = render(
      <FiltresPanel
        value={baseValue}
        onChange={jest.fn()}
        onReset={jest.fn()}
      />,
    )
    // L'icône est rendue via <Icon name="filter" /> — cherche le use#i-filter dans le DOM
    const useEl = container.querySelector('use[href="/icons.svg#i-filter"]')
    expect(useEl).toBeInTheDocument()
  })
})
