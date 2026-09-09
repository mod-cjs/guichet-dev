/**
 * GUIC-712 — Domaine du consentement aux cookies.
 *
 * Ces gardes portent sur ce qui ne doit jamais dépendre de l'interface : un cookie se
 * forge à la main, une version de texte change, un consentement vieillit. Le domaine
 * doit rester juste dans tous ces cas, avant même qu'un bandeau soit rendu.
 */

import {
  CATALOGUE_COOKIES,
  CATEGORIES_OPTIONNELLES,
  COOKIE_CONSENTEMENT,
  DUREE_CONSENTEMENT_JOURS,
  VERSION_CONSENTEMENT,
  categorieAcceptee,
  choixToutAccepte,
  choixToutRefuse,
  construireConsentement,
  consentementCaduc,
  decoderConsentement,
  encoderConsentement,
} from '@/lib/consent/cookies'

describe('catalogue des catégories', () => {
  it('déclare exactement une catégorie obligatoire — les cookies essentiels', () => {
    const obligatoires = CATALOGUE_COOKIES.filter((c) => c.obligatoire)
    expect(obligatoires).toHaveLength(1)
    expect(obligatoires[0].cle).toBe('essentiels')
  })

  it('n’expose en optionnel que les catégories non obligatoires', () => {
    const attendu = CATALOGUE_COOKIES.filter((c) => !c.obligatoire).map((c) => c.cle)
    expect([...CATEGORIES_OPTIONNELLES]).toEqual(attendu)
    expect(CATEGORIES_OPTIONNELLES).not.toContain('essentiels')
  })

  it('nomme les cookies réellement posés dans la catégorie essentielle', () => {
    // La page cookies fait foi : elle doit pouvoir citer les noms exacts plutôt qu'une
    // périphrase. Ces deux-là sont les seuls que le Guichet dépose (audit GUIC-712 §2).
    const essentiels = CATALOGUE_COOKIES.find((c) => c.cle === 'essentiels')!
    expect(essentiels.cookies).toContain('cjs_session')
    expect(essentiels.cookies).toContain('centre_staff_session')
  })

  it('décrit chaque catégorie — un intitulé sans explication n’éclaire aucun choix', () => {
    for (const categorie of CATALOGUE_COOKIES) {
      expect(categorie.titre.length).toBeGreaterThan(0)
      expect(categorie.description.length).toBeGreaterThan(0)
    }
  })

  it('n’a pas de clé dupliquée', () => {
    const cles = CATALOGUE_COOKIES.map((c) => c.cle)
    expect(new Set(cles).size).toBe(cles.length)
  })
})

describe('construction du choix', () => {
  it('laisse les essentiels actifs même dans un refus global', () => {
    // Refuser les essentiels reviendrait à refuser de se connecter : ce n'est pas un
    // choix qu'on peut offrir, donc ce n'est pas un choix qu'on enregistre.
    expect(choixToutRefuse().essentiels).toBe(true)
  })

  it('refuse toutes les catégories optionnelles dans un refus global', () => {
    const choix = choixToutRefuse()
    for (const cle of CATEGORIES_OPTIONNELLES) {
      expect(choix[cle]).toBe(false)
    }
  })

  it('accepte toutes les catégories dans une acceptation globale', () => {
    const choix = choixToutAccepte()
    for (const categorie of CATALOGUE_COOKIES) {
      expect(choix[categorie.cle]).toBe(true)
    }
  })

  it('horodate la décision et y grave la version du texte', () => {
    const date = new Date('2026-08-20T10:30:00.000Z')
    const consentement = construireConsentement(choixToutRefuse(), date)
    expect(consentement.version).toBe(VERSION_CONSENTEMENT)
    expect(consentement.date).toBe('2026-08-20T10:30:00.000Z')
  })
})

describe('encodage et décodage', () => {
  it('fait un aller-retour sans perte', () => {
    const consentement = construireConsentement(choixToutAccepte(), new Date('2026-08-20T10:00:00Z'))
    expect(decoderConsentement(encoderConsentement(consentement))).toEqual(consentement)
  })

  it('produit une valeur transportable telle quelle dans un en-tête Cookie', () => {
    const encode = encoderConsentement(construireConsentement(choixToutAccepte()))
    // Un point-virgule ou une virgule non échappés couperaient la valeur du cookie.
    expect(encode).not.toMatch(/[;,\s]/)
  })

  it('renvoie null sur une valeur absente, vide ou illisible', () => {
    expect(decoderConsentement(null)).toBeNull()
    expect(decoderConsentement(undefined)).toBeNull()
    expect(decoderConsentement('')).toBeNull()
    expect(decoderConsentement('pas-du-json')).toBeNull()
    expect(decoderConsentement('%7Bmalforme')).toBeNull()
  })

  it('renvoie null sur un JSON valide mais qui n’est pas un consentement', () => {
    expect(decoderConsentement(encodeURIComponent(JSON.stringify({ foo: 'bar' })))).toBeNull()
    expect(decoderConsentement(encodeURIComponent(JSON.stringify([1, 2, 3])))).toBeNull()
  })

  it('force les essentiels à actif même si le cookie prétend le contraire', () => {
    // Cookie forgé à la main : la session ne doit pas pouvoir être désactivée par là.
    const forge = encodeURIComponent(
      JSON.stringify({
        version: VERSION_CONSENTEMENT,
        date: '2026-08-20T10:00:00.000Z',
        choix: { essentiels: false, mesure_audience: false },
      }),
    )
    expect(decoderConsentement(forge)!.choix.essentiels).toBe(true)
  })

  it('traite une catégorie absente du cookie comme refusée', () => {
    // Catégorie ajoutée au catalogue après la décision : l'utilisateur ne s'est jamais
    // prononcé dessus, donc elle est refusée. L'inverse ferait dire à un ancien accord
    // qu'il couvre un traitement qui n'existait pas.
    const partiel = encodeURIComponent(
      JSON.stringify({
        version: VERSION_CONSENTEMENT,
        date: '2026-08-20T10:00:00.000Z',
        choix: { essentiels: true },
      }),
    )
    expect(decoderConsentement(partiel)!.choix.mesure_audience).toBe(false)
  })
})

describe('caducité', () => {
  it('tient une absence de consentement pour caduque', () => {
    expect(consentementCaduc(null)).toBe(true)
  })

  it('tient pour caduc un consentement donné sur une version antérieure du texte', () => {
    const ancien = { ...construireConsentement(choixToutAccepte()), version: '2020-01' }
    expect(consentementCaduc(ancien)).toBe(true)
  })

  it('tient pour caduc un consentement plus vieux que la durée déclarée', () => {
    const tropVieux = construireConsentement(
      choixToutAccepte(),
      new Date(Date.now() - (DUREE_CONSENTEMENT_JOURS + 1) * 86_400_000),
    )
    expect(consentementCaduc(tropVieux)).toBe(true)
  })

  it('tient pour caduc un consentement dont la date est illisible', () => {
    const cassé = { ...construireConsentement(choixToutAccepte()), date: 'hier' }
    expect(consentementCaduc(cassé)).toBe(true)
  })

  it('accepte un consentement récent sur la version courante', () => {
    expect(consentementCaduc(construireConsentement(choixToutRefuse()))).toBe(false)
  })

  it('ne dépasse pas le plafond de 13 mois déclaré à l’Article 7', () => {
    expect(DUREE_CONSENTEMENT_JOURS).toBeLessThanOrEqual(13 * 30)
  })
})

describe('lecture d’une catégorie', () => {
  it('laisse passer les essentiels même sans aucune décision', () => {
    // Sinon le site ne fonctionnerait pas avant le premier clic sur le bandeau.
    expect(categorieAcceptee(null, 'essentiels')).toBe(true)
  })

  it('refuse toute catégorie optionnelle tant que rien n’a été décidé', () => {
    for (const cle of CATEGORIES_OPTIONNELLES) {
      expect(categorieAcceptee(null, cle)).toBe(false)
    }
  })

  it('refuse une catégorie acceptée sur une version périmée', () => {
    const périmé = { ...construireConsentement(choixToutAccepte()), version: '2020-01' }
    expect(categorieAcceptee(périmé, 'mesure_audience')).toBe(false)
  })

  it('respecte une acceptation courante', () => {
    expect(categorieAcceptee(construireConsentement(choixToutAccepte()), 'mesure_audience')).toBe(true)
  })

  it('respecte un refus courant', () => {
    expect(categorieAcceptee(construireConsentement(choixToutRefuse()), 'mesure_audience')).toBe(false)
  })
})

describe('nom du cookie', () => {
  it('porte le préfixe des cookies du Guichet et ne collisionne pas avec les sessions', () => {
    expect(COOKIE_CONSENTEMENT).toMatch(/^cjs_/)
    expect(COOKIE_CONSENTEMENT).not.toBe('cjs_session')
    expect(COOKIE_CONSENTEMENT).not.toBe('centre_staff_session')
  })
})
