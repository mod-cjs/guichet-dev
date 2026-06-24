/**
 * @jest-environment node
 */
import { resolveOnboardingRegion } from './profil-onboarding'

describe('resolveOnboardingRegion (GUIC-448)', () => {
  it('privilégie la région DB sur la session (JWT périmé)', () => {
    expect(resolveOnboardingRegion('Thies', null)).toBe('Thies')
    expect(resolveOnboardingRegion('Thies', 'Dakar')).toBe('Thies')
  })

  it('retombe sur la session si la DB est vide', () => {
    expect(resolveOnboardingRegion(null, 'Dakar')).toBe('Dakar')
    expect(resolveOnboardingRegion(undefined, 'Dakar')).toBe('Dakar')
  })

  it('retourne null si aucune région connue', () => {
    expect(resolveOnboardingRegion(null, null)).toBeNull()
    expect(resolveOnboardingRegion(undefined, undefined)).toBeNull()
  })
})
