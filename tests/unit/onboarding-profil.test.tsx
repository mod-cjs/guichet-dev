/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OnboardingProfil } from '@/app/jeune/onboarding/_screens/OnboardingProfil'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const EMPTY_INITIAL = {
  prenom: '', nom: '', dateNaissance: '', genre: null,
  region: '', commune: '',
}

describe('<OnboardingProfil /> — écran 4/5', () => {
  beforeEach(() => {
    pushMock.mockClear()
    window.sessionStorage.clear()
    global.fetch = jest.fn() as unknown as typeof fetch
  })

  it('rend les inputs prénom/nom/date/commune', () => {
    render(<OnboardingProfil initial={EMPTY_INITIAL} />)
    expect(screen.getByLabelText(/prénom/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^nom/i)).toBeInTheDocument()
    // F-01 : date de naissance est désormais 3 selects (jour/mois/année)
    expect(screen.getByRole('combobox', { name: /jour/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /mois/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /ann[ée]e/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/commune/i)).toBeInTheDocument()
  })

  it('rend les 14 régions du Sénégal', () => {
    render(<OnboardingProfil initial={EMPTY_INITIAL} />)
    expect(screen.getByRole('button', { name: 'Dakar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thiès' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sédhiou' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Saint-Louis' })).toBeInTheDocument()
  })

  it('rend 3 chips genre (F / H / Autre)', () => {
    render(<OnboardingProfil initial={EMPTY_INITIAL} />)
    const group = screen.getByRole('group', { name: /genre/i })
    expect(group).toBeInTheDocument()
    expect(group.querySelectorAll('button')).toHaveLength(3)
  })

  it('affiche les erreurs Zod si soumission incomplète', async () => {
    render(<OnboardingProfil initial={EMPTY_INITIAL} />)
    fireEvent.click(screen.getByRole('button', { name: /^continuer/i }))
    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls).toHaveLength(0)
    })
  })

  it('soumet step 1 puis step 2 si valide, puis redirige', async () => {
    const ok = { ok: true, json: async () => ({ data: { nextStep: 2 } }) }
    ;(global.fetch as jest.Mock).mockResolvedValue(ok)

    render(<OnboardingProfil initial={{
      prenom: 'Awa', nom: 'Diop', dateNaissance: '2003-04-12',
      genre: 'F', region: 'Tambacounda', commune: '',
    }} />)

    fireEvent.click(screen.getByRole('button', { name: /^continuer/i }))

    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2)
    })
    const calls = (global.fetch as jest.Mock).mock.calls
    expect(JSON.parse(calls[0][1].body).step).toBe(1)
    expect(JSON.parse(calls[1][1].body).step).toBe(2)
    expect(pushMock).toHaveBeenCalledWith('/jeune/onboarding/recommandations')
  })

  it('sélection d\'une région envoie un PATCH region au backend', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: null }) })
    global.fetch = fetchMock as unknown as typeof fetch
    render(<OnboardingProfil initial={EMPTY_INITIAL} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tambacounda' }))
    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(c => c[1]?.method === 'PATCH')
      expect(patchCall).toBeDefined()
      expect(JSON.parse(patchCall![1].body)).toMatchObject({ region: 'Tambacounda' })
    })
  })
})
