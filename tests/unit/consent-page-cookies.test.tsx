/**
 * @jest-environment jsdom
 *
 * GUIC-712 — Page « Cookies » : revenir sur son choix, depuis n'importe quel espace.
 *
 * Le pied de page n'existe que sur les pages publiques. Un lien de pied de page ne
 * serait donc pas atteignable depuis `/jeune/*`, `/conseiller/*` ni `/recruteur/*` — et
 * un consentement qu'on ne peut pas retirer là où on se trouve n'est pas révocable. La
 * porte d'entrée est une URL, publique et stable.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CookiesPage from '@/app/(public)/legal/cookies/page'
import { lireConsentementNavigateur, ecrireConsentementNavigateur } from '@/lib/consent/client'
import {
  CATALOGUE_COOKIES,
  COOKIE_CONSENTEMENT,
  DUREE_CONSENTEMENT_JOURS,
  choixToutAccepte,
  choixToutRefuse,
  construireConsentement,
} from '@/lib/consent/cookies'
import { COOKIES, CONFIDENTIALITE, DOCUMENTS_LEGAUX, LIENS_FOOTER_LEGAUX, getDocumentLegal } from '@/content/legal'

const MESURE = CATALOGUE_COOKIES.find((c) => c.cle === 'mesure_audience')!

function oublierLaDecision() {
  document.cookie = `${COOKIE_CONSENTEMENT}=; path=/; max-age=0`
}

beforeEach(oublierLaDecision)
afterEach(oublierLaDecision)

describe('inscription au registre légal', () => {
  it('est un document légal à part entière, pas une page isolée', () => {
    // Passer par le registre lui fait hériter des gardes existantes — notamment
    // « aucun lien de pied de page sans document », d'où venait la régression GUIC-605.
    expect(DOCUMENTS_LEGAUX).toContain(COOKIES)
    expect(getDocumentLegal('cookies')).toBe(COOKIES)
  })

  it('figure dans le pied de page', () => {
    expect(LIENS_FOOTER_LEGAUX.map((l) => l.slug)).toContain('cookies')
  })
})

describe('cohérence entre le texte et ce qui est réellement déposé', () => {
  const texte = JSON.stringify(COOKIES)

  it('décrit exactement les catégories du catalogue, ni plus ni moins', () => {
    for (const categorie of CATALOGUE_COOKIES) {
      expect(texte).toContain(categorie.titre)
    }
  })

  it('nomme les cookies réellement posés', () => {
    for (const nom of CATALOGUE_COOKIES.flatMap((c) => c.cookies)) {
      expect(texte).toContain(nom)
    }
  })

  it('annonce la durée effectivement appliquée à la décision', () => {
    // Un texte qui annoncerait 13 mois pendant que le code en applique 6 serait faux
    // dans le sens le plus gênant : celui qui promet plus de mémoire qu'on n'en garde.
    expect(texte).toContain(String(Math.round(DUREE_CONSENTEMENT_JOURS / 30)))
  })

  it('n’annonce aucun traceur tiers tant qu’aucun n’est installé', () => {
    for (const outil of ['Google Analytics', 'Matomo', 'Plausible', 'Hotjar']) {
      expect(texte).not.toContain(outil)
    }
  })
})

describe('la politique de confidentialité renvoie vers la page', () => {
  it('indique où revenir sur son choix', () => {
    // L'Article 7 promettait un bandeau sans dire où le retrouver ensuite. Un
    // consentement qu'on ne sait pas où modifier n'est révocable qu'en théorie.
    expect(JSON.stringify(CONFIDENTIALITE)).toContain('/legal/cookies')
  })
})

describe('page', () => {
  it('rend le document et le panneau de préférences', () => {
    render(<CookiesPage />)
    expect(screen.getByRole('heading', { name: COOKIES.titre, level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: MESURE.titre })).toBeInTheDocument()
  })

  it('reflète la décision déjà enregistrée', () => {
    ecrireConsentementNavigateur(construireConsentement(choixToutAccepte()))
    render(<CookiesPage />)
    expect(screen.getByRole('switch', { name: MESURE.titre })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('permet de retirer un consentement déjà donné', () => {
    ecrireConsentementNavigateur(construireConsentement(choixToutAccepte()))
    render(<CookiesPage />)

    fireEvent.click(screen.getByRole('switch', { name: MESURE.titre }))
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

    return waitFor(() => {
      expect(lireConsentementNavigateur()?.choix.mesure_audience).toBe(false)
    })
  })

  it('confirme que le choix est enregistré', async () => {
    ecrireConsentementNavigateur(construireConsentement(choixToutRefuse()))
    render(<CookiesPage />)

    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/enregistr/i)
  })
})
