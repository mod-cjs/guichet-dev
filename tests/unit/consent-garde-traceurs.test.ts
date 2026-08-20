/**
 * @jest-environment node
 *
 * GUIC-712 — Aucun traceur ne se charge sans consentement.
 *
 * Corriger un texte ne tient pas dans le temps : le jour où quelqu'un colle un script de
 * mesure dans un layout, la politique redevient fausse en silence et personne ne s'en
 * aperçoit avant un contrôle. La garde est donc technique — un balayage du code qui
 * casse si un traceur apparaît ailleurs que derrière la porte du consentement.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  COOKIE_CONSENTEMENT,
  choixToutAccepte,
  choixToutRefuse,
  construireConsentement,
  encoderConsentement,
} from '@/lib/consent/cookies'
import { traceurAutorise } from '@/lib/consent/traceurs'

const RACINE = join(process.cwd(), 'src')

/** Seuls endroits autorisés à nommer un traceur : la garde elle-même. */
const DEROGATIONS = [join('src', 'lib', 'consent'), join('src', 'components', 'consent')]

/**
 * Signatures d'outils de mesure ou de publicité. Volontairement précises : `plausible`
 * seul matcherait le mot français, présent en commentaire dans `datahub/transforms.ts`.
 */
const SIGNATURES: { nom: string; motif: RegExp }[] = [
  { nom: 'Google Tag Manager', motif: /googletagmanager\.com/ },
  { nom: 'Google Analytics (gtag)', motif: /\bgtag\s*\(/ },
  { nom: 'Google Analytics (dataLayer)', motif: /window\.dataLayer/ },
  { nom: 'Vercel Analytics', motif: /@vercel\/analytics/ },
  { nom: 'Matomo', motif: /matomo\.(js|php)|\b_paq\b/ },
  { nom: 'Plausible', motif: /plausible\.io/ },
  { nom: 'PostHog', motif: /posthog/i },
  { nom: 'Hotjar', motif: /static\.hotjar\.com|\bhjid\b/ },
  { nom: 'Pixel Meta', motif: /connect\.facebook\.net|\bfbq\s*\(/ },
]

function fichiersSource(dossier: string): string[] {
  return readdirSync(dossier).flatMap((entree) => {
    const chemin = join(dossier, entree)
    if (statSync(chemin).isDirectory()) return fichiersSource(chemin)
    return /\.(ts|tsx)$/.test(entree) && !/\.test\.tsx?$/.test(entree) ? [chemin] : []
  })
}

describe('porte du consentement', () => {
  it('refuse un traceur tant qu’aucune décision n’a été prise', () => {
    expect(traceurAutorise(null, 'G-XXXX')).toBe(false)
  })

  it('refuse un traceur après un refus explicite', () => {
    expect(traceurAutorise(construireConsentement(choixToutRefuse()), 'G-XXXX')).toBe(false)
  })

  it('refuse un traceur consenti mais non configuré', () => {
    // Consentir n'invente pas d'outil : sans identifiant, il n'y a rien à charger, et
    // annoncer une mesure qui n'existe pas serait une déclaration fausse de plus.
    const accepte = construireConsentement(choixToutAccepte())
    expect(traceurAutorise(accepte, undefined)).toBe(false)
    expect(traceurAutorise(accepte, '')).toBe(false)
    expect(traceurAutorise(accepte, '   ')).toBe(false)
  })

  it('refuse un traceur consenti sur une version périmée du texte', () => {
    const perime = { ...construireConsentement(choixToutAccepte()), version: '2020-01' }
    expect(traceurAutorise(perime, 'G-XXXX')).toBe(false)
  })

  it('autorise un traceur consenti et configuré', () => {
    expect(traceurAutorise(construireConsentement(choixToutAccepte()), 'G-XXXX')).toBe(true)
  })
})

describe('balayage du code', () => {
  it('n’embarque aucun traceur hors de la porte du consentement', () => {
    const infractions: string[] = []

    for (const chemin of fichiersSource(RACINE)) {
      const relatif = chemin.slice(process.cwd().length + 1)
      if (DEROGATIONS.some((derogation) => relatif.startsWith(derogation))) continue

      const contenu = readFileSync(chemin, 'utf8')
      for (const { nom, motif } of SIGNATURES) {
        if (motif.test(contenu)) infractions.push(`${relatif} → ${nom}`)
      }
    }

    // Si ce test casse : le traceur doit passer par `traceurAutorise`, et l'Article 7 de
    // la politique doit décrire ce qu'il collecte. Ajouter une dérogation ici sans faire
    // les deux revient à rétablir l'écart que GUIC-712 répare.
    expect(infractions).toEqual([])
  })
})

describe('lecture serveur', () => {
  // `next/headers` est remocké d'un cas à l'autre : sans purge du cache, le second
  // `import` rendrait le module déjà résolu avec le mock du premier.
  beforeEach(() => jest.resetModules())

  it('lit la décision depuis le pot à cookies de la requête', async () => {
    const consentement = construireConsentement(choixToutAccepte())
    jest.doMock('next/headers', () => ({
      cookies: async () => ({
        get: (nom: string) =>
          nom === COOKIE_CONSENTEMENT
            ? { name: nom, value: encoderConsentement(consentement) }
            : undefined,
      }),
    }))

    const { lireConsentement } = await import('@/lib/consent/server')
    await expect(lireConsentement()).resolves.toEqual(consentement)
  })

  it('ne lit aucune décision quand la requête ne porte pas le cookie', async () => {
    jest.doMock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))

    const { lireConsentement } = await import('@/lib/consent/server')
    await expect(lireConsentement()).resolves.toBeNull()
  })
})
