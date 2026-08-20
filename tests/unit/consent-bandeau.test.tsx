/**
 * @jest-environment jsdom
 *
 * GUIC-712 — Bandeau de consentement aux cookies.
 *
 * Ce que ces gardes protègent : un consentement n'est valable que s'il est libre et
 * éclairé. Traduit en tests — refuser coûte le même nombre de clics qu'accepter, aucune
 * case n'est pré-cochée, et on ne peut pas se débarrasser du bandeau sans trancher,
 * parce qu'un bandeau qu'on ferme d'une croix transforme le silence en acceptation.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CookieConsent } from '@/components/consent/CookieConsent'
import { lireConsentementNavigateur, ecrireConsentementNavigateur } from '@/lib/consent/client'
import {
  CATALOGUE_COOKIES,
  COOKIE_CONSENTEMENT,
  choixToutAccepte,
  choixToutRefuse,
  construireConsentement,
} from '@/lib/consent/cookies'

const MESURE = CATALOGUE_COOKIES.find((c) => c.cle === 'mesure_audience')!
const ESSENTIELS = CATALOGUE_COOKIES.find((c) => c.cle === 'essentiels')!

function oublierLaDecision() {
  document.cookie = `${COOKIE_CONSENTEMENT}=; path=/; max-age=0`
}

/** Ouvre le panneau de personnalisation depuis le bandeau. */
async function ouvrirLePanneau() {
  fireEvent.click(await screen.findByRole('button', { name: /personnaliser/i }))
  return screen.findByRole('dialog', { name: /préférences|cookies/i })
}

beforeEach(oublierLaDecision)
afterEach(oublierLaDecision)

describe('adaptateur navigateur', () => {
  it('ne lit aucune décision quand le cookie est absent', () => {
    expect(lireConsentementNavigateur()).toBeNull()
  })

  it('relit ce qu’il vient d’écrire', () => {
    const consentement = construireConsentement(choixToutAccepte())
    ecrireConsentementNavigateur(consentement)
    expect(lireConsentementNavigateur()).toEqual(consentement)
  })

  it('ne se laisse pas troubler par les cookies voisins', () => {
    document.cookie = 'autre_chose=cjs_consent; path=/'
    ecrireConsentementNavigateur(construireConsentement(choixToutRefuse()))
    expect(lireConsentementNavigateur()?.choix.mesure_audience).toBe(false)
    document.cookie = 'autre_chose=; path=/; max-age=0'
  })
})

describe('première visite', () => {
  it('affiche le bandeau', async () => {
    render(<CookieConsent />)
    expect(await screen.findByRole('dialog', { name: /cookies/i })).toBeInTheDocument()
  })

  it('explique de quoi il retourne et renvoie vers le détail', async () => {
    render(<CookieConsent />)
    await screen.findByRole('dialog', { name: /cookies/i })
    expect(screen.getByRole('link', { name: /cookies|en savoir plus/i })).toHaveAttribute(
      'href',
      '/legal/cookies',
    )
  })

  it('n’offre aucun moyen de se débarrasser du bandeau sans choisir', async () => {
    // Pas de croix, pas de « Plus tard » : fermer sans trancher vaudrait acceptation
    // tacite, et une acceptation tacite n'est pas un consentement.
    render(<CookieConsent />)
    await screen.findByRole('dialog', { name: /cookies/i })
    expect(screen.queryByRole('button', { name: /fermer|plus tard|ignorer/i })).toBeNull()
  })

  it('met refuser et accepter au même niveau, en un clic chacun', async () => {
    render(<CookieConsent />)
    await screen.findByRole('dialog', { name: /cookies/i })
    const refuser = screen.getByRole('button', { name: /tout refuser/i })
    const accepter = screen.getByRole('button', { name: /tout accepter/i })
    // Même poids visuel : refuser derrière une variante discrète serait un refus plus
    // coûteux qu'une acceptation, donc un consentement contraint.
    expect(refuser.className).toBe(accepter.className)
  })
})

describe('décision déjà prise', () => {
  it('n’affiche pas le bandeau', async () => {
    ecrireConsentementNavigateur(construireConsentement(choixToutRefuse()))
    render(<CookieConsent />)
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /cookies/i })).toBeNull()
    })
  })

  it('redemande quand la version du texte a changé', async () => {
    const périmé = { ...construireConsentement(choixToutAccepte()), version: '2020-01' }
    ecrireConsentementNavigateur(périmé)
    render(<CookieConsent />)
    expect(await screen.findByRole('dialog', { name: /cookies/i })).toBeInTheDocument()
  })
})

describe('choix global', () => {
  it('« Tout accepter » enregistre l’acceptation et retire le bandeau', async () => {
    render(<CookieConsent />)
    fireEvent.click(await screen.findByRole('button', { name: /tout accepter/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /cookies/i })).toBeNull()
    })
    expect(lireConsentementNavigateur()?.choix.mesure_audience).toBe(true)
  })

  it('« Tout refuser » enregistre le refus sans toucher aux essentiels', async () => {
    render(<CookieConsent />)
    fireEvent.click(await screen.findByRole('button', { name: /tout refuser/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /cookies/i })).toBeNull()
    })
    const décision = lireConsentementNavigateur()!
    expect(décision.choix.mesure_audience).toBe(false)
    expect(décision.choix.essentiels).toBe(true)
  })

  it('horodate la décision', async () => {
    render(<CookieConsent />)
    fireEvent.click(await screen.findByRole('button', { name: /tout refuser/i }))
    await waitFor(() => expect(lireConsentementNavigateur()).not.toBeNull())
    expect(Number.isNaN(Date.parse(lireConsentementNavigateur()!.date))).toBe(false)
  })
})

describe('panneau de personnalisation', () => {
  it('présente chaque catégorie avec son intitulé et son explication', async () => {
    render(<CookieConsent />)
    await ouvrirLePanneau()
    for (const categorie of CATALOGUE_COOKIES) {
      expect(screen.getByText(categorie.titre)).toBeInTheDocument()
      expect(screen.getByText(categorie.description)).toBeInTheDocument()
    }
  })

  it('rend les cookies essentiels en état verrouillé, jamais en interrupteur', async () => {
    // On ne peut pas refuser ce qui conditionne le fonctionnement du site. Offrir la
    // case, c'est mentir sur la portée du choix.
    render(<CookieConsent />)
    await ouvrirLePanneau()
    expect(screen.queryByRole('switch', { name: ESSENTIELS.titre })).toBeNull()
    expect(screen.getByText(/toujours actif/i)).toBeInTheDocument()
  })

  it('ne pré-coche aucune catégorie optionnelle', async () => {
    render(<CookieConsent />)
    await ouvrirLePanneau()
    expect(screen.getByRole('switch', { name: MESURE.titre })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('nomme les cookies réellement déposés', async () => {
    render(<CookieConsent />)
    await ouvrirLePanneau()
    expect(screen.getByText(/cjs_session/)).toBeInTheDocument()
  })

  it('enregistre les interrupteurs tels qu’ils ont été laissés', async () => {
    render(<CookieConsent />)
    await ouvrirLePanneau()

    fireEvent.click(screen.getByRole('switch', { name: MESURE.titre }))
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => {
      expect(lireConsentementNavigateur()?.choix.mesure_audience).toBe(true)
    })
  })

  it('repart des choix déjà enregistrés quand on rouvre le panneau', async () => {
    ecrireConsentementNavigateur(construireConsentement(choixToutAccepte()))
    render(<CookieConsent ouvrirPreferences />)
    expect(await screen.findByRole('switch', { name: MESURE.titre })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('retire le bandeau une fois les choix enregistrés', async () => {
    render(<CookieConsent />)
    await ouvrirLePanneau()
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /cookies/i })).toBeNull()
    })
  })
})
