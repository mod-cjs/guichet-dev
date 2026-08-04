/**
 * M13 / Data Hub — manifeste du tap Singer (lot 7).
 *
 * Le tap construit ses flux à partir de ce fichier : une erreur ici ne casse pas la
 * compilation, elle casse l'extraction en production. D'où des assertions sur les points
 * qui la font échouer silencieusement — clés exprimées dans la mauvaise forme, watermark
 * absent du schéma servi, colonne interdite ayant fui jusqu'au catalogue.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildTapManifest, renderTapManifest } from '@/lib/datahub/tap-manifest'
import { streams } from '@/lib/datahub/streams'
import { fullTableStreams } from '@/lib/datahub/full-table-streams'
import { CHAMPS_INTERDITS } from '@/lib/datahub/stream-types'

const manifest = buildTapManifest()

describe('manifeste du tap — couverture', () => {
  it('déclare exactement les flux du contrat, incrémentaux ET FULL_TABLE', () => {
    expect(manifest.streams.map((s) => s.name).sort()).toEqual(
      [...Object.keys(streams), ...Object.keys(fullTableStreams)].sort()
    )
  })

  it('pointe chaque flux INCRÉMENTAL vers sa route d\'export', () => {
    for (const stream of manifest.streams) {
      if (!Object.keys(streams).includes(stream.name)) continue
      expect(stream.path).toBe(`/api/v1/export/${stream.name}`)
      expect(stream.replication_method).toBe('INCREMENTAL')
    }
  })
})

describe('manifeste du tap — flux FULL_TABLE (GUIC-700 lot 7)', () => {
  it('déclare replication_method FULL_TABLE, sans replication_key', () => {
    for (const nom of Object.keys(fullTableStreams)) {
      const stream = manifest.streams.find((s) => s.name === nom)!
      expect(stream.replication_method).toBe('FULL_TABLE')
      expect(stream.replication_key).toBeUndefined()
    }
  })

  it('exprime la clé primaire COMPOSITE sous ses deux noms exportés', () => {
    const jonction = manifest.streams.find((s) => s.name === 'opportunites_programmes')!
    expect(jonction.primary_keys).toEqual(['opportunite_id', 'programme_id'])
  })

  it('pointe chaque flux FULL_TABLE vers sa route d\'export', () => {
    for (const nom of Object.keys(fullTableStreams)) {
      const stream = manifest.streams.find((s) => s.name === nom)!
      expect(stream.path).toBe(`/api/v1/export/${nom}`)
    }
  })
})

describe('manifeste du tap — clés', () => {
  it('exprime les clés sous leur nom EXPORTÉ, seul connu du tap', () => {
    const utilisateurs = manifest.streams.find((s) => s.name === 'utilisateurs')!
    // `cjsUid` côté Prisma, `cjs_uid` côté entrepôt : le tap ne voit que la forme servie.
    expect(utilisateurs.primary_keys).toEqual(['cjs_uid'])
    expect(utilisateurs.replication_key).toBe('updated_at')
  })

  it('inclut toujours la clé primaire et le watermark dans le schéma servi', () => {
    for (const stream of manifest.streams) {
      // Un watermark absent du schéma ferait échouer le bookmark du SDK à l'exécution.
      // Un flux FULL_TABLE n'en a pas, par construction (GUIC-700 lot 7) — rien à vérifier.
      if (stream.replication_key) {
        expect(Object.keys(stream.schema.properties)).toContain(stream.replication_key)
      }
      for (const cle of stream.primary_keys) {
        expect(Object.keys(stream.schema.properties)).toContain(cle)
      }
    }
  })

  it('exprime le watermark des flux append-only sous sa forme propre', () => {
    expect(manifest.streams.find((s) => s.name === 'checkins')!.replication_key).toBe('effectue_a')
    expect(manifest.streams.find((s) => s.name === 'consultations')!.replication_key).toBe('created_at')
  })
})

describe('manifeste du tap — schémas', () => {
  it('exprime les types en tableau, comme l\'attend Singer', () => {
    const props = manifest.streams.find((s) => s.name === 'utilisateurs')!.schema.properties
    expect((props.cjs_uid as { type: unknown }).type).toEqual(['string'])
    // Nullable : la nullabilité est portée par le type, pas par un drapeau séparé.
    expect((props.deleted_at as { type: unknown }).type).toEqual(['string', 'null'])
  })

  it('déclare sujet_hash nullable — il est masqué quand cjs_uid est présent (GUIC-695)', () => {
    // La colonne SOURCE est non nulle, mais la valeur EXPORTÉE ne l'est pas : le contrat
    // publié doit décrire la sortie, sinon le chargeur Singer rejettera chaque ligne
    // d'un utilisateur connecté (même mécanique que le défaut B2 du rapport GUIC-693).
    const props = manifest.streams.find((s) => s.name === 'consultations')!.schema.properties
    expect((props.sujet_hash as { type: unknown }).type).toEqual(['string', 'null'])
  })

  it('propage la documentation jusqu\'au catalogue', () => {
    for (const stream of manifest.streams) {
      for (const [nom, prop] of Object.entries(stream.schema.properties)) {
        const description = (prop as { description?: string }).description
        expect(`${stream.name}.${nom}: ${description ?? ''}`).toMatch(/: .{10,}/)
      }
    }
  })

  it('porte le tier de gouvernance, exploitable par dbt', () => {
    const props = manifest.streams.find((s) => s.name === 'utilisateurs')!.schema.properties
    expect((props.cjs_uid as Record<string, unknown>)['x-cjs-tier']).toBe('pseudonyme')
    expect((props.region as Record<string, unknown>)['x-cjs-tier']).toBe('public')
  })

  it('ne laisse fuir aucune colonne interdite jusqu\'au catalogue', () => {
    const nus = CHAMPS_INTERDITS.filter((c) => !c.includes('.'))
    for (const stream of manifest.streams) {
      for (const nom of Object.keys(stream.schema.properties)) {
        expect(nus).not.toContain(nom)
      }
    }
  })
})

describe('manifeste du tap — nullabilité des énumérations', () => {
  /**
   * En JSON Schema, `type` et `enum` sont deux contraintes INDÉPENDANTES : une valeur doit
   * satisfaire les deux. Déclarer `type: ["string","null"]` avec un `enum` qui ne contient
   * pas `null` rend donc toute valeur absente invalide — le type l'autorise, l'énumération
   * la refuse.
   *
   * Ce n'est pas une subtilité théorique : le chargeur Singer valide chaque enregistrement
   * contre ce schéma et interrompt le run au premier refus. Une offre sans niveau d'études
   * minimum — cas métier parfaitement normal — a suffi à arrêter le pipeline complet lors
   * de la campagne d'épreuve (GUIC-693).
   *
   * Le compilateur ne peut rien voir ici : le défaut n'existe qu'au moment où un vrai
   * chargeur valide un vrai enregistrement.
   */
  const colonnesEnumerees = manifest.streams.flatMap((stream) =>
    Object.entries(stream.schema.properties as Record<string, Record<string, unknown>>).map(
      ([colonne, schema]) => ({ stream: stream.name, colonne, schema })
    )
  ).filter(({ schema }) => Array.isArray(schema.enum))

  it('trouve des colonnes énumérées à contrôler', () => {
    expect(colonnesEnumerees.length).toBeGreaterThan(0)
  })

  it.each(colonnesEnumerees.map(({ stream, colonne, schema }) => [stream, colonne, schema]))(
    '%s.%s : une colonne nullable accepte null dans son énumération',
    (_stream, _colonne, schema) => {
      const types = (schema as Record<string, unknown>).type as string[]
      const valeurs = (schema as Record<string, unknown>).enum as unknown[]
      if (!types.includes('null')) return // colonne obligatoire : rien à vérifier
      expect(valeurs).toContain(null)
    }
  )
})

describe('manifeste du tap — fichier livré', () => {
  const CHEMIN = join(
    process.cwd(),
    'etl',
    'plugins',
    'extractors',
    'tap-guichet',
    'tap_guichet',
    'streams.json'
  )

  it('correspond exactement à sa régénération', () => {
    // Même sentinelle que pour l'OpenAPI : sans elle, la commande de génération est une
    // commande que personne ne pense à lancer.
    expect(readFileSync(CHEMIN, 'utf8')).toBe(renderTapManifest())
  })
})
