/**
 * @jest-environment jsdom
 *
 * [GUIC-431] L'écran OnboardingTelephone (mobile) a été retiré du flow
 * d'onboarding. L'OTP téléphone est géré par le SSO CJS ; l'écran
 * in-app est inutile.
 *
 * Ce fichier est conservé vide (placeholder) pour traçabilité de la
 * suppression. Les tests unitaires du composant supprimé ont été retirés.
 */

describe('[GUIC-431] OnboardingTelephone — écran supprimé du flow', () => {
  it('écran téléphone retiré — voir GUIC-431', () => {
    // L'écran OnboardingTelephone a été supprimé de src/app/jeune/onboarding/_screens/
    // Le composant n'existe plus : src/app/jeune/onboarding/_screens/OnboardingTelephone.tsx
    // La route n'existe plus : src/app/jeune/onboarding/telephone/page.tsx
    // Le flow démarre désormais sur /jeune/onboarding/objectifs
    expect(true).toBe(true)
  })
})
