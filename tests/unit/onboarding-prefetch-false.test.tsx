/**
 * @jest-environment jsdom
 *
 * F-04 — prefetch={false} sur les liens /api/auth/login et /api/auth/logout.
 * [GUIC-429] RED
 *
 * Note sur la limite de test : le mock next/link ne propage pas l'attribut
 * `prefetch` sur l'élément <a> rendu, car l'implémentation Next.js le gère
 * via des directives RSC internes. On teste donc uniquement que :
 * 1) Les liens existent avec le bon href
 * 2) (Visual) Aucun prefetch RSC cross-origin n'est déclenché — ce point ne
 *    peut être vérifié qu'en E2E (hors scope Jest).
 *
 * On vérifie la présence du prop prefetch={false} dans le source en lisant
 * le rendu du composant sans mock next/link, ce qui n'est pas faisable
 * directement. On documente donc la limite et on teste la présence des liens.
 */
import { render, screen } from '@testing-library/react'

// --- layout onboarding (lien logout) ---
// On ne peut pas importer le layout Server Component directement.
// On vérifie les fichiers sources manuellement dans F-04-source.test.ts.

// --- OnboardingTelephone (lien login) ---
import { OnboardingTelephone } from '@/app/jeune/onboarding/_screens/OnboardingTelephone'

// --- OnboardingTelephoneWeb (lien login) ---
import { OnboardingTelephoneWeb } from '@/app/jeune/onboarding/_screens-web/OnboardingTelephoneWeb'

// --- OnboardingNavWeb (lien Se connecter) ---
import { OnboardingNavWeb } from '@/app/jeune/onboarding/_screens-web/OnboardingNavWeb'

describe('F-04 — liens /api/auth/* présents avec href correct', () => {
  it('OnboardingTelephone — lien SSO CJS pointe sur /api/auth/login', () => {
    render(<OnboardingTelephone />)
    const link = screen.getByRole('link', { name: /SSO CJS/i })
    expect(link).toHaveAttribute('href', '/api/auth/login')
  })

  it('OnboardingTelephoneWeb — lien WhatsApp fallback pointe sur /api/auth/login', () => {
    render(<OnboardingTelephoneWeb />)
    const link = screen.getByRole('link', { name: /Via WhatsApp/i })
    expect(link).toHaveAttribute('href', '/api/auth/login')
  })

  it('OnboardingNavWeb — lien Se connecter (showLogin=true) présent', () => {
    render(<OnboardingNavWeb step={1} total={4} showLogin={true} />)
    const link = screen.getByRole('link', { name: /Se connecter/i })
    expect(link).toBeInTheDocument()
  })
})

describe('F-04 — vérification source : prefetch={false} sur liens api/auth', () => {
  /**
   * On lit les fichiers sources et on vérifie que prefetch={false} est bien
   * présent sur les Link pointant vers /api/auth/. C'est le seul moyen fiable
   * sans patcher le mock next/link pour propager l'attribut.
   */
  const fs = require('fs')
  const path = require('path')
  const root = path.resolve(__dirname, '../../src')

  const FILES_TO_CHECK: Array<{ file: string; desc: string }> = [
    {
      file: 'app/jeune/onboarding/layout.tsx',
      desc: 'layout — lien /api/auth/logout',
    },
    {
      file: 'app/jeune/onboarding/_screens/OnboardingTelephone.tsx',
      desc: 'OnboardingTelephone — lien /api/auth/login',
    },
    {
      file: 'app/jeune/onboarding/_screens-web/OnboardingTelephoneWeb.tsx',
      desc: 'OnboardingTelephoneWeb — lien /api/auth/login',
    },
    {
      file: 'app/jeune/onboarding/_screens-web/OnboardingNavWeb.tsx',
      desc: 'OnboardingNavWeb — lien /api/auth/* (si présent)',
    },
  ]

  FILES_TO_CHECK.forEach(({ file, desc }) => {
    it(`${desc} — prefetch={false} présent dans la source`, () => {
      const content = fs.readFileSync(path.join(root, file), 'utf-8')
      // Cherche un Link avec href api/auth ET prefetch={false} dans le même composant Link
      // On cherche prefetch={false} quelque part dans le fichier si api/auth est référencé
      if (!content.includes('/api/auth/')) {
        // Ce fichier ne référence pas api/auth, pas besoin de vérifier
        return
      }
      expect(content).toMatch(/prefetch=\{false\}/)
    })
  })
})
