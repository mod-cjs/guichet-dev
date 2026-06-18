/**
 * @jest-environment jsdom
 *
 * [GUIC-431] L'écran OnboardingTelephoneWeb (desktop) a été retiré du flow
 * d'onboarding. L'OTP téléphone est géré par le SSO CJS ; l'écran
 * in-app est inutile.
 *
 * Ce fichier est conservé vide (placeholder) pour traçabilité de la
 * suppression. Les tests unitaires du composant supprimé ont été retirés.
 */

describe('[GUIC-431] OnboardingTelephoneWeb — écran supprimé du flow', () => {
  it('écran téléphone web retiré — voir GUIC-431', () => {
    // L'écran OnboardingTelephoneWeb a été supprimé de src/app/jeune/onboarding/_screens-web/
    // Le composant n'existe plus : src/app/jeune/onboarding/_screens-web/OnboardingTelephoneWeb.tsx
    // Le flow démarre désormais sur /jeune/onboarding/objectifs
    expect(true).toBe(true)
  })
})
