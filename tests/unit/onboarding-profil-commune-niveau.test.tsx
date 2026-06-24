/**
 * @jest-environment jsdom
 *
 * GUIC-432 — Profil onboarding : commune select filtré par région + niveau études select.
 *
 * RED : ces tests échouent tant que les composants gardent les <input> libres.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OnboardingProfil } from '@/app/jeune/onboarding/_screens/OnboardingProfil'
import { OnboardingProfilWeb } from '@/app/jeune/onboarding/_screens-web/OnboardingProfilWeb'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

const EMPTY = {
  prenom: '', nom: '', dateNaissance: '', genre: null,
  region: '', commune: '',
}

const WITH_DAKAR = { ...EMPTY, region: 'Dakar' }

// ─── A. Commune select — mobile ─────────────────────────────────────────────

describe('GUIC-432 — OnboardingProfil (mobile) — commune select', () => {
  it('ne rend PAS un input[id=commune] libre quand une région est sélectionnée', () => {
    const { container } = render(<OnboardingProfil initial={WITH_DAKAR} />)
    // L'ancien input libre ne doit plus exister
    const legacyInput = container.querySelector('input[id="commune"]')
    expect(legacyInput).not.toBeInTheDocument()
  })

  it('rend un select commune avec les communes de Dakar', () => {
    render(<OnboardingProfil initial={WITH_DAKAR} />)
    const sel = screen.getByRole('combobox', { name: /commune/i })
    expect(sel).toBeInTheDocument()
    // Dakar est une commune de la région Dakar
    expect(screen.getByRole('option', { name: 'Dakar' })).toBeInTheDocument()
  })

  it('affiche l\'option "Autre (préciser)" dans le select commune', () => {
    render(<OnboardingProfil initial={WITH_DAKAR} />)
    expect(screen.getByRole('option', { name: /autre.*préciser/i })).toBeInTheDocument()
  })

  it('désactive le select commune quand aucune région n\'est sélectionnée', () => {
    render(<OnboardingProfil initial={EMPTY} />)
    const sel = screen.getByRole('combobox', { name: /commune/i })
    expect(sel).toBeDisabled()
  })

  it('affiche un input libre quand "Autre (préciser)" est sélectionné', () => {
    render(<OnboardingProfil initial={WITH_DAKAR} />)
    const sel = screen.getByRole('combobox', { name: /commune/i })
    fireEvent.change(sel, { target: { value: '__autre__' } })
    const freeInput = screen.getByRole('textbox', { name: /commune/i })
    expect(freeInput).toBeInTheDocument()
  })

  it('met à jour commune quand une option est sélectionnée dans le select', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true, json: async () => ({ data: null }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    render(<OnboardingProfil initial={{
      prenom: 'Awa', nom: 'Diop', dateNaissance: '2000-01-01',
      genre: 'F', region: 'Dakar', commune: '',
    }} />)

    const sel = screen.getByRole('combobox', { name: /commune/i })
    fireEvent.change(sel, { target: { value: 'Dakar' } })
    expect(sel).toHaveValue('Dakar')
  })

  it('réinitialise la commune quand la région change vers une région différente', async () => {
    render(<OnboardingProfil initial={{ ...EMPTY, region: 'Dakar', commune: 'Dakar' }} />)
    // Sélectionner une commune
    const sel = screen.getByRole('combobox', { name: /commune/i })
    fireEvent.change(sel, { target: { value: 'Dakar' } })

    // Changer la région via les chips (Thies)
    const thiesChip = screen.getByRole('button', { name: /thi[eè]s/i })
    fireEvent.click(thiesChip)

    // Le select commune doit afficher les communes de Thiès
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Thies' })).toBeInTheDocument()
    })
    // Dakar ne doit plus être dans la liste
    expect(screen.queryByRole('option', { name: 'Dakar - Plateau' })).not.toBeInTheDocument()
  }, 30000)
})

// ─── B. Niveau d'études select — mobile ─────────────────────────────────────

describe('GUIC-432 — OnboardingProfil (mobile) — niveau études select', () => {
  it('rend un select niveau d\'études', () => {
    render(<OnboardingProfil initial={EMPTY} />)
    const sel = screen.getByRole('combobox', { name: /niveau.*tudes/i })
    expect(sel).toBeInTheDocument()
  })

  it('affiche les 6 options d\'études avec libellés FR', () => {
    render(<OnboardingProfil initial={EMPTY} />)
    expect(screen.getByRole('option', { name: 'BFEM' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Baccalauréat' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /bac\+2/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /licence/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /master/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /doctorat/i })).toBeInTheDocument()
  })

  it('affiche l\'option "Autre" dans le select niveau études', () => {
    render(<OnboardingProfil initial={EMPTY} />)
    expect(screen.getByRole('option', { name: /^autre$/i })).toBeInTheDocument()
  })

  it('affiche un input libre quand "Autre" est sélectionné pour niveau études', () => {
    render(<OnboardingProfil initial={EMPTY} />)
    const sel = screen.getByRole('combobox', { name: /niveau.*tudes/i })
    fireEvent.change(sel, { target: { value: '__autre__' } })
    const freeInput = screen.getByRole('textbox', { name: /niveau.*tudes/i })
    expect(freeInput).toBeInTheDocument()
  })
})

// ─── C. Commune select — web ─────────────────────────────────────────────────

describe('GUIC-432 — OnboardingProfilWeb — commune select', () => {
  it('ne rend PAS un input[id=web-commune] libre quand une région est sélectionnée', () => {
    const { container } = render(<OnboardingProfilWeb initial={WITH_DAKAR} />)
    const legacyInput = container.querySelector('input[id="web-commune"]')
    expect(legacyInput).not.toBeInTheDocument()
  })

  it('rend un select commune avec les communes de Dakar', () => {
    render(<OnboardingProfilWeb initial={WITH_DAKAR} />)
    const sel = screen.getByRole('combobox', { name: /commune/i })
    expect(sel).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Dakar' })).toBeInTheDocument()
  })

  it('affiche l\'option "Autre (préciser)" dans le select commune', () => {
    render(<OnboardingProfilWeb initial={WITH_DAKAR} />)
    expect(screen.getByRole('option', { name: /autre.*préciser/i })).toBeInTheDocument()
  })

  it('désactive le select commune quand aucune région n\'est sélectionnée', () => {
    render(<OnboardingProfilWeb initial={EMPTY} />)
    const sel = screen.getByRole('combobox', { name: /commune/i })
    expect(sel).toBeDisabled()
  })

  it('affiche un input libre quand "Autre (préciser)" est sélectionné (web)', () => {
    render(<OnboardingProfilWeb initial={WITH_DAKAR} />)
    const sel = screen.getByRole('combobox', { name: /commune/i })
    fireEvent.change(sel, { target: { value: '__autre__' } })
    const freeInput = screen.getByRole('textbox', { name: /commune/i })
    expect(freeInput).toBeInTheDocument()
  })
})

// ─── D. Niveau d'études select — web ────────────────────────────────────────

describe('GUIC-432 — OnboardingProfilWeb — niveau études select', () => {
  it('ne rend PAS un input[id=web-niveau] libre', () => {
    const { container } = render(<OnboardingProfilWeb initial={EMPTY} />)
    const legacyInput = container.querySelector('input[id="web-niveau"]')
    expect(legacyInput).not.toBeInTheDocument()
  })

  it('rend un select niveau d\'études', () => {
    render(<OnboardingProfilWeb initial={EMPTY} />)
    const sel = screen.getByRole('combobox', { name: /niveau.*tudes/i })
    expect(sel).toBeInTheDocument()
  })

  it('affiche les 6 options d\'études avec libellés FR (web)', () => {
    render(<OnboardingProfilWeb initial={EMPTY} />)
    expect(screen.getByRole('option', { name: 'BFEM' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Baccalauréat' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /bac\+2/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /licence/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /master/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /doctorat/i })).toBeInTheDocument()
  })

  it('affiche l\'option "Autre" dans le select niveau études (web)', () => {
    render(<OnboardingProfilWeb initial={EMPTY} />)
    expect(screen.getByRole('option', { name: /^autre$/i })).toBeInTheDocument()
  })

  it('affiche un input libre quand "Autre" est sélectionné pour niveau études (web)', () => {
    render(<OnboardingProfilWeb initial={EMPTY} />)
    const sel = screen.getByRole('combobox', { name: /niveau.*tudes/i })
    fireEvent.change(sel, { target: { value: '__autre__' } })
    const freeInput = screen.getByRole('textbox', { name: /niveau.*tudes/i })
    expect(freeInput).toBeInTheDocument()
  })
})
