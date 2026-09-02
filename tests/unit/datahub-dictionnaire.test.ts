/**
 * Data Hub — Dictionnaire du Data Hub, dérivé du manifeste du tap.
 *
 * Le manifeste est le contrat RÉELLEMENT servi aux consommateurs (noms exportés, tier de
 * gouvernance, méthode de réplication). Le dictionnaire affiché dans l'admin doit décrire
 * ce contrat-là, pas le schéma Prisma interne : un analyste lit ce qui arrive dans
 * l'entrepôt, pas ce que le Guichet stocke.
 */
import {
  buildDictionnaire,
  filtrerDictionnaire,
  construireCsvDictionnaire,
  libelleFiltre,
} from '@/lib/datahub/dictionnaire'
import type { TapManifest } from '@/lib/datahub/tap-manifest'

const MANIFEST: TapManifest = {
  contract_version: '2.0',
  streams: [
    {
      name: 'utilisateurs',
      path: '/api/v1/export/utilisateurs',
      primary_keys: ['cjs_uid'],
      replication_key: 'updated_at',
      replication_method: 'INCREMENTAL',
      schema: {
        type: 'object',
        properties: {
          cjs_uid: {
            type: ['string'],
            description: 'Identifiant SSO inter-plateformes',
            'x-cjs-tier': 'pseudonyme',
          },
          region: {
            type: ['string', 'null'],
            enum: ['DAKAR', 'THIES', null],
            description: 'Région de résidence déclarée',
            'x-cjs-tier': 'public',
          },
          updated_at: {
            type: ['string'],
            format: 'date-time',
            description: 'Dernière modification',
            'x-cjs-tier': 'public',
          },
        },
      },
    },
    {
      name: 'programmes_beneficiaires',
      path: '/api/v1/export/programmes_beneficiaires',
      primary_keys: ['programme_id', 'cjs_uid'],
      replication_method: 'FULL_TABLE',
      schema: {
        type: 'object',
        properties: {
          programme_id: { type: ['string'], description: 'Programme rattaché', 'x-cjs-tier': 'public' },
        },
      },
    },
  ],
}

describe('Data Hub — buildDictionnaire', () => {
  it('restitue un flux par flux du manifeste, avec son chemin et ses clés', () => {
    const flux = buildDictionnaire(MANIFEST)

    expect(flux).toHaveLength(2)
    expect(flux[0]).toMatchObject({
      id: 'utilisateurs',
      nom: 'utilisateurs',
      chemin: '/api/v1/export/utilisateurs',
      replication: 'INCREMENTAL',
      clesPrimaires: ['cjs_uid'],
      cleReplication: 'updated_at',
    })
  })

  it('sépare la nullabilité du type — `null` est un drapeau, pas un type affiché', () => {
    const region = buildDictionnaire(MANIFEST)[0].colonnes.find((c) => c.nom === 'region')

    expect(region).toMatchObject({ type: 'string', nullable: true })
  })

  it('expose les valeurs admises sans le `null` déjà porté par la nullabilité', () => {
    const region = buildDictionnaire(MANIFEST)[0].colonnes.find((c) => c.nom === 'region')

    expect(region?.valeurs).toEqual(['DAKAR', 'THIES'])
  })

  it('conserve le format et le tier de gouvernance de chaque colonne', () => {
    const colonnes = buildDictionnaire(MANIFEST)[0].colonnes

    expect(colonnes.find((c) => c.nom === 'updated_at')?.format).toBe('date-time')
    expect(colonnes.find((c) => c.nom === 'cjs_uid')?.tier).toBe('pseudonyme')
  })

  it('marque un flux FULL_TABLE sans clé de réplication et à clé composite', () => {
    const jonction = buildDictionnaire(MANIFEST)[1]

    expect(jonction.replication).toBe('FULL_TABLE')
    expect(jonction.cleReplication).toBeNull()
    expect(jonction.clesPrimaires).toEqual(['programme_id', 'cjs_uid'])
  })
})

describe('Data Hub — filtrerDictionnaire', () => {
  const FLUX = buildDictionnaire(MANIFEST)

  it('rend tout le dictionnaire quand la requête est vide', () => {
    expect(filtrerDictionnaire(FLUX, '   ')).toHaveLength(2)
  })

  it('garde le flux entier quand son nom correspond', () => {
    const trouve = filtrerDictionnaire(FLUX, 'programmes')

    expect(trouve).toHaveLength(1)
    expect(trouve[0].colonnes).toHaveLength(1)
  })

  it('réduit un flux aux seules colonnes qui correspondent', () => {
    const trouve = filtrerDictionnaire(FLUX, 'region')

    expect(trouve).toHaveLength(1)
    expect(trouve[0].colonnes.map((c) => c.nom)).toEqual(['region'])
  })

  it('ignore les accents et la casse — la doc est rédigée en français', () => {
    const trouve = filtrerDictionnaire(FLUX, 'RÉGION de résidence')

    expect(trouve[0]?.colonnes.map((c) => c.nom)).toEqual(['region'])
  })

  it('ne retient aucun flux quand rien ne correspond', () => {
    expect(filtrerDictionnaire(FLUX, 'zzz-inexistant')).toEqual([])
  })
})

describe('Data Hub — filtrerDictionnaire · tier de gouvernance', () => {
  const FLUX = buildDictionnaire(MANIFEST)

  it('ne garde que les colonnes pseudonymes — la question que pose un DPO', () => {
    const trouve = filtrerDictionnaire(FLUX, '', 'pseudonyme')

    expect(trouve).toHaveLength(1)
    expect(trouve[0].nom).toBe('utilisateurs')
    expect(trouve[0].colonnes.map((c) => c.nom)).toEqual(['cjs_uid'])
  })

  it('ne garde que les colonnes publiques', () => {
    const trouve = filtrerDictionnaire(FLUX, '', 'public')

    expect(trouve.map((f) => f.nom)).toEqual(['utilisateurs', 'programmes_beneficiaires'])
    expect(trouve[0].colonnes.map((c) => c.nom)).toEqual(['region', 'updated_at'])
  })

  it('écarte un flux dont aucune colonne n’a le tier demandé', () => {
    expect(filtrerDictionnaire(FLUX, '', 'pseudonyme').map((f) => f.nom)).not.toContain(
      'programmes_beneficiaires',
    )
  })

  it('combine le tier et la recherche texte', () => {
    // `region` est publique : la chercher parmi les seules colonnes pseudonymes ne rend rien.
    expect(filtrerDictionnaire(FLUX, 'region', 'pseudonyme')).toEqual([])
    expect(filtrerDictionnaire(FLUX, 'region', 'public')[0].colonnes.map((c) => c.nom)).toEqual([
      'region',
    ])
  })

  it('rend tout le dictionnaire quand le tier vaut « tous »', () => {
    expect(filtrerDictionnaire(FLUX, '', 'tous')).toHaveLength(2)
  })
})

describe('Data Hub — construireCsvDictionnaire', () => {
  const FLUX = buildDictionnaire(MANIFEST)

  it('rend une ligne par colonne, pas une par flux — c’est ce qui se colle dans un tableur', () => {
    const lignes = construireCsvDictionnaire(FLUX).split('\r\n')

    // 1 en-tête + 3 colonnes d'utilisateurs + 1 de programmes_beneficiaires.
    expect(lignes).toHaveLength(5)
  })

  it('nomme ses colonnes en en-tête', () => {
    const entete = construireCsvDictionnaire(FLUX).split('\r\n')[0]

    expect(entete).toContain('flux')
    expect(entete).toContain('colonne')
    expect(entete).toContain('tier')
    expect(entete).toContain('description')
  })

  it('reporte le contexte du flux sur chaque ligne, pour que le tri reste possible', () => {
    const ligne = construireCsvDictionnaire(FLUX)
      .split('\r\n')
      .find((l) => l.includes('region'))

    expect(ligne).toContain('utilisateurs')
    expect(ligne).toContain('/api/v1/export/utilisateurs')
    expect(ligne).toContain('INCREMENTAL')
  })

  it('échappe une description qui contient une virgule — sinon le tableur décale tout', () => {
    const avecVirgule = [
      {
        ...FLUX[0],
        colonnes: [
          {
            ...FLUX[0].colonnes[0],
            description: 'Région de résidence, telle que déclarée',
          },
        ],
      },
    ]

    expect(construireCsvDictionnaire(avecVirgule)).toContain(
      '"Région de résidence, telle que déclarée"',
    )
  })

  it('double les guillemets internes (RFC 4180)', () => {
    const avecGuillemets = [
      {
        ...FLUX[0],
        colonnes: [{ ...FLUX[0].colonnes[0], description: 'Statut dit « actif »' }],
      },
    ]

    expect(construireCsvDictionnaire(avecGuillemets)).toContain('Statut dit « actif »')
  })

  it('écrit la nullabilité en clair plutôt qu’en booléen', () => {
    const csv = construireCsvDictionnaire(FLUX)

    expect(csv).toMatch(/,oui,/)
    expect(csv).toMatch(/,non,/)
  })

  it('commence par un BOM — sans lui Excel affiche « RÃ©gion »', () => {
    expect(construireCsvDictionnaire(FLUX).charCodeAt(0)).toBe(0xfeff)
  })
})

describe('Data Hub — libelleFiltre', () => {
  it('rend null quand rien n’est filtré — le document est complet', () => {
    expect(libelleFiltre('', 'tous')).toBeNull()
  })

  it('énonce le tier seul', () => {
    expect(libelleFiltre('  ', 'pseudonyme')).toBe('colonnes pseudonymes')
    expect(libelleFiltre('', 'public')).toBe('colonnes publiques')
  })

  it('énonce la recherche seule', () => {
    expect(libelleFiltre('region', 'tous')).toBe('recherche « region »')
  })

  it('énonce les deux', () => {
    expect(libelleFiltre('region', 'pseudonyme')).toBe(
      'colonnes pseudonymes · recherche « region »',
    )
  })
})
