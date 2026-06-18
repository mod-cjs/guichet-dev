/**
 * @jest-environment jsdom
 *
 * F-01 — Date de naissance : format FR garanti (3 selects).
 * [GUIC-429] RED : vérifie que l'input date natif est remplacé
 * par 3 selects jour/mois/année affichant les libellés FR.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingProfil } from '@/app/jeune/onboarding/_screens/OnboardingProfil'
import { OnboardingProfilWeb } from '@/app/jeune/onboarding/_screens-web/OnboardingProfilWeb'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

const EMPTY = {
  prenom: '', nom: '', dateNaissance: '', genre: null,
  region: '', commune: '',
}

describe('F-01 — OnboardingProfil — date naissance : 3 selects FR', () => {
  it('ne rend PAS un <input type="date"> pour la date de naissance', () => {
    const { container } = render(<OnboardingProfil initial={EMPTY} />)
    const dateInput = container.querySelector('input[type="date"]')
    expect(dateInput).not.toBeInTheDocument()
  })

  it('rend un select "Jour" avec options 1..31', () => {
    render(<OnboardingProfil initial={EMPTY} />)
    const jourSelect = screen.getByRole('combobox', { name: /jour/i })
    expect(jourSelect).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '31' })).toBeInTheDocument()
  })

  it('rend un select "Mois" avec libellés FR (janvier…décembre)', () => {
    render(<OnboardingProfil initial={EMPTY} />)
    const moisSelect = screen.getByRole('combobox', { name: /mois/i })
    expect(moisSelect).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'janvier' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'décembre' })).toBeInTheDocument()
  })

  it('rend un select "Année" avec une plage raisonnable', () => {
    render(<OnboardingProfil initial={EMPTY} />)
    const anneeSelect = screen.getByRole('combobox', { name: /ann[ée]e/i })
    expect(anneeSelect).toBeInTheDocument()
    const currentYear = new Date().getFullYear()
    // borne max = année courante - 15
    const maxYear = currentYear - 15
    // borne min = année courante - 80
    const minYear = currentYear - 80
    expect(screen.getByRole('option', { name: String(maxYear) })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: String(minYear) })).toBeInTheDocument()
  })

  it('reconstruit dateNaissance au format YYYY-MM-DD depuis les 3 selects', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    render(<OnboardingProfil initial={{
      prenom: 'Awa', nom: 'Diop', dateNaissance: '',
      genre: 'F', region: 'Dakar', commune: '',
    }} />)

    fireEvent.change(screen.getByRole('combobox', { name: /ann[ée]e/i }), { target: { value: '2003' } })
    fireEvent.change(screen.getByRole('combobox', { name: /mois/i }), { target: { value: '04' } })
    fireEvent.change(screen.getByRole('combobox', { name: /jour/i }), { target: { value: '12' } })

    fireEvent.click(screen.getByRole('button', { name: /^continuer/i }))

    await new Promise(r => setTimeout(r, 50))
    const identiteCall = fetchMock.mock.calls.find(
      (c: unknown[]) => c[1] && JSON.parse((c[1] as { body: string }).body).step === 1
    )
    expect(identiteCall).toBeDefined()
    expect(JSON.parse((identiteCall![1] as { body: string }).body).data.dateNaissance).toBe('2003-04-12')
  })

  it('pré-remplit les 3 selects depuis initial.dateNaissance YYYY-MM-DD', () => {
    render(<OnboardingProfil initial={{
      ...EMPTY, dateNaissance: '2000-07-15',
    }} />)
    expect(screen.getByRole('combobox', { name: /ann[ée]e/i })).toHaveValue('2000')
    expect(screen.getByRole('combobox', { name: /mois/i })).toHaveValue('07')
    expect(screen.getByRole('combobox', { name: /jour/i })).toHaveValue('15')
  })
})

describe('F-01 — OnboardingProfilWeb — date naissance : 3 selects FR', () => {
  it('ne rend PAS un <input type="date"> pour la date de naissance', () => {
    const { container } = render(<OnboardingProfilWeb initial={EMPTY} />)
    const dateInput = container.querySelector('input[type="date"]')
    expect(dateInput).not.toBeInTheDocument()
  })

  it('rend les 3 selects jour/mois/année', () => {
    render(<OnboardingProfilWeb initial={EMPTY} />)
    expect(screen.getByRole('combobox', { name: /jour/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /mois/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /ann[ée]e/i })).toBeInTheDocument()
  })

  it('affiche "janvier" dans le select mois', () => {
    render(<OnboardingProfilWeb initial={EMPTY} />)
    expect(screen.getByRole('option', { name: 'janvier' })).toBeInTheDocument()
  })
})
