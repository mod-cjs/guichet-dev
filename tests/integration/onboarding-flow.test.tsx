/**
 * @jest-environment jsdom
 *
 * Test d'intégration léger : flow complet 5 écrans onboarding mobile.
 *
 * On ne monte pas le router Next réel — chaque page rend son screen client
 * via une chaîne de navigation : Welcome → Téléphone → Objectifs → Profil
 * → Recommandations. On vérifie que la transition côté UI alimente bien le
 * sessionStorage et que la finalisation appelle `/api/v1/onboarding` step 3.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OnboardingObjectifs } from '@/app/jeune/onboarding/_screens/OnboardingObjectifs'
import { OnboardingProfil } from '@/app/jeune/onboarding/_screens/OnboardingProfil'
import { OnboardingRecommandations } from '@/app/jeune/onboarding/_screens/OnboardingRecommandations'
import { readDraft } from '@/lib/onboarding-draft'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

describe('Onboarding flow — intégration 5 écrans', () => {
  beforeEach(() => {
    pushMock.mockClear()
    window.sessionStorage.clear()
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) }) as unknown as typeof fetch
  })

  it('Objectifs → Profil : objectifs persistés en sessionStorage et accessibles depuis Profil', async () => {
    // Écran 3 — sélection
    const { unmount } = render(<OnboardingObjectifs prenom="Awa" />)
    fireEvent.click(screen.getByRole('button', { name: /trouver un emploi/i }))
    fireEvent.click(screen.getByRole('button', { name: /agriculture/i }))
    fireEvent.click(screen.getByRole('button', { name: /^continuer/i }))
    expect(pushMock).toHaveBeenCalledWith('/jeune/onboarding/profil')
    expect(readDraft().objectifs).toEqual(['emploi', 'agriculture'])
    unmount()

    // Écran 4 — profil
    render(<OnboardingProfil initial={{
      prenom: 'Awa', nom: 'Diop', dateNaissance: '2003-04-12',
      genre: 'F', region: 'Tambacounda', commune: '',
    }} />)
    fireEvent.click(screen.getByRole('button', { name: /^continuer/i }))
    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls
      expect(calls.length).toBeGreaterThanOrEqual(2)
    })
    expect(pushMock).toHaveBeenCalledWith('/jeune/onboarding/recommandations')
  })

  it('Recommandations finalise avec PUT step 3 et purge le draft', async () => {
    // Simule un draft préexistant
    window.sessionStorage.setItem('gj_onboarding_draft_v2', JSON.stringify({
      objectifs: ['emploi'], prenom: 'Awa', region: 'Tambacounda',
    }))

    render(<OnboardingRecommandations prenom="Awa" />)
    expect(screen.getByText(/top awa/i)).toBeInTheDocument()
    // "Tambacounda" apparaît à plusieurs endroits (headline + meta opp 1) — on vérifie via headline
    expect(screen.getByText(/à tambacounda/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /aller au tableau de bord/i }))
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/jeune/tableau-de-bord'))

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.step).toBe(3)
    // Draft purgé après finalisation
    expect(window.sessionStorage.getItem('gj_onboarding_draft_v2')).toBeNull()
  })
})
