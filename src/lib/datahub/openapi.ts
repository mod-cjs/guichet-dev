/**
 * M13 / Data Hub — génération du contrat OpenAPI depuis le contrat d'export (GUIC-151).
 *
 * POURQUOI GÉNÉRÉ ET NON ÉCRIT
 * Le fichier livré jusqu'ici était écrit à la main et décrivait une API qui n'existe pas :
 * pagination par numéro de page, colonnes inventées (`nb_candidatures`, `completion_profil`),
 * endpoint `formations` sans implémentation. C'est le sort de toute documentation tenue
 * séparément du code. Ici elle est dérivée de `streams.ts` et des `///` du schéma : elle ne
 * peut plus décrire autre chose que ce qui est réellement exporté.
 *
 * Le YAML est émis sans dépendance. `js-yaml` n'est présent qu'en transitif et rien ne
 * garantit sa présence ; les scalaires sont cités via `JSON.stringify`, JSON étant un
 * sous-ensemble de YAML 1.2 — l'échappement est donc correct par construction, y compris
 * pour les apostrophes et les deux-points omniprésents dans la documentation française.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseSchemaDoc, parseEnums, type FieldDoc } from './schema-doc'
import { allDescriptors, type StreamDescriptor } from './descriptor'
import { streams } from './streams'
import { emitYaml, type YamlValue } from './yaml'

// ── Correspondance des types ─────────────────────────────────────────────────────

const SCALAIRES: Record<string, YamlValue> = {
  String: { type: 'string' },
  Boolean: { type: 'boolean' },
  Int: { type: 'integer' },
  Float: { type: 'number' },
  Decimal: { type: 'number' },
  DateTime: { type: 'string', format: 'date-time' },
  // Sérialisé en chaîne : JSON ne sait pas porter un entier 64 bits sans perte.
  BigInt: { type: 'string' },
  Json: { type: 'object' },
}

function typeOuvert(
  field: FieldDoc,
  outputType: string | undefined,
  enums: Record<string, string[]>
): Record<string, YamlValue> {
  if (outputType) return { type: outputType }
  const scalaire = SCALAIRES[field.type]
  if (scalaire) return scalaire as Record<string, YamlValue>
  const valeurs = enums[field.type]
  if (valeurs) return { type: 'string', enum: valeurs }
  // Type inconnu : mieux vaut annoncer une chaîne que mentir sur une structure.
  return { type: 'string' }
}

// ── Construction du document ─────────────────────────────────────────────────────

/**
 * Forme résolue d'une colonne exportée : type JSON, nullabilité, énumération,
 * description et tier. Partagée par l'OpenAPI et les schémas du tap Singer, pour que les
 * deux contrats publiés ne puissent pas diverger.
 */
export interface ColonneResolue {
  type: string | string[]
  format?: string
  enum?: string[]
  description: string
  tier: string
}

export function resoudreColonnes(
  descriptor: StreamDescriptor,
  fields: FieldDoc[],
  enums: Record<string, string[]>
): Record<string, ColonneResolue> {
  const specs = streams[descriptor.name as keyof typeof streams].fields as Record<
    string,
    { outputType?: string; outputNullable?: boolean; description?: string }
  >
  const out: Record<string, ColonneResolue> = {}

  for (const column of descriptor.columns) {
    const field = fields.find((f) => f.field === column.field)
    if (!field) throw new Error(`champ absent du schéma : ${descriptor.model}.${column.field}`)
    const spec = specs[column.field]

    // Une colonne transformée décrit sa SORTIE. Reprendre le `///` de la source ferait
    // annoncer `tranche_age` comme « la date de naissance déclarée ».
    const description = column.transform ? spec?.description : field.doc
    if (!description) {
      throw new Error(`colonne exportée non documentée : ${descriptor.name}.${column.field}`)
    }

    const base = typeOuvert(field, spec?.outputType, enums)
    out[column.as] = {
      ...(base as { type: string; format?: string; enum?: string[] }),
      // Une transformation change le type : la nullabilité ne se déduit plus de la source
      // mais du contrat (`outputNullable`) — une colonne NOT NULL peut sortir masquée à null.
      ...((column.transform ? spec?.outputNullable : field.optional)
        ? { type: [base.type as string, 'null'] }
        : {}),
      description,
      tier: column.tier,
    }
  }
  return out
}

function proprietes(
  descriptor: StreamDescriptor,
  fields: FieldDoc[],
  enums: Record<string, string[]>
): Record<string, YamlValue> {
  const out: Record<string, YamlValue> = {}
  for (const [nom, colonne] of Object.entries(resoudreColonnes(descriptor, fields, enums))) {
    const { tier, ...reste } = colonne
    out[nom] = { ...(reste as Record<string, YamlValue>), 'x-cjs-tier': tier }
  }
  return out
}

export function buildOpenApiDocument(schemaPath?: string): string {
  const source = readFileSync(schemaPath ?? join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8')
  const models = parseSchemaDoc(source)
  const enums = parseEnums(source)
  const descriptors = allDescriptors()

  const schemas: Record<string, YamlValue> = {
    Meta: {
      type: 'object',
      description:
        "Pagination par curseur. `next_cursor` est opaque et doit être renvoyé tel quel ; il n'y a pas de total, un COUNT par page coûtant plus cher que la page elle-même.",
      properties: {
        next_cursor: { type: ['string', 'null'], description: 'Curseur de la page suivante, null à la fin.' },
        has_more: { type: 'boolean', description: "Une page suivante existe." },
        replication_key: { type: 'string', description: 'Colonne portant le watermark de ce flux.' },
        generated_at: { type: 'string', format: 'date-time', description: 'Horodatage de la réponse.' },
      },
    },
    Erreur: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: { code: { type: 'string' }, message: { type: 'string' } },
        },
      },
    },
  }

  const paths: Record<string, YamlValue> = {}

  for (const descriptor of descriptors) {
    const model = models.find((m) => m.model === descriptor.model)
    if (!model) throw new Error(`modèle absent du schéma : ${descriptor.model}`)
    if (model.doc === null) throw new Error(`modèle exporté non documenté : ${descriptor.model}`)

    const nomSchema = `${descriptor.name}Row`
    schemas[nomSchema] = {
      type: 'object',
      description: model.doc,
      properties: proprietes(descriptor, model.fields, enums),
    }

    paths[`/export/${descriptor.name}`] = {
      get: {
        summary: `Exporter le flux ${descriptor.name}`,
        description: model.doc,
        operationId: `export_${descriptor.name}`,
        parameters: [
          { $ref: '#/components/parameters/since' },
          { $ref: '#/components/parameters/cursor' },
          { $ref: '#/components/parameters/limit' },
        ],
        responses: {
          '200': {
            description: `Page de ${descriptor.name}`,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: `#/components/schemas/${nomSchema}` } },
                    meta: { $ref: '#/components/schemas/Meta' },
                  },
                },
              },
            },
          },
          '400': { description: 'Curseur ou borne `since` malformés', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erreur' } } } },
          '401': { description: 'Clé API absente, invalide, ou non configurée côté serveur', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erreur' } } } },
          '429': { description: 'Quota dépassé (300 requêtes/minute par clé)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erreur' } } } },
        },
      },
    }
  }

  // GUIC-697 D2 — endpoint de réconciliation, absent jusqu'ici du contrat publié alors
  // que le mode opératoire (docs/datahub-briefing-etl.md §10) demande de l'appeler après
  // chaque run. `since` y est OBLIGATOIRE (D6) : un comptage non borné sur consultations
  // (le plus gros volume) fait timeout sous maxDuration=60.
  schemas.Counts = {
    type: 'object',
    description: 'Comptage par flux sur la fenêtre `since`, à comparer aux COUNT(*) de l\'entrepôt.',
    additionalProperties: { type: 'integer' },
  }
  paths['/export/counts'] = {
    get: {
      summary: 'Comptages de réconciliation, par flux, sur une fenêtre',
      description:
        "Distingue « le pipeline n'a pas planté » de « le pipeline a tout extrait » : à appeler après chaque run, avec le `since` de ce run, et comparer aux COUNT(*) de l'entrepôt sur la même fenêtre.",
      operationId: 'export_counts',
      parameters: [{ $ref: '#/components/parameters/sinceRequis' }],
      responses: {
        '200': {
          description: 'Comptages de la fenêtre',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Counts' },
                  meta: {
                    type: 'object',
                    properties: {
                      since: { type: 'string', format: 'date-time' },
                      generated_at: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
        '400': { description: '`since` absente ou illisible', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erreur' } } } },
        '401': { description: 'Clé API absente, invalide, ou non configurée côté serveur', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erreur' } } } },
        '429': { description: 'Quota dépassé (60 requêtes/minute par clé)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erreur' } } } },
      },
    },
  }

  const document: Record<string, YamlValue> = {
    openapi: '3.1.0',
    info: {
      title: 'Guichet Jeunesse — Data Hub API',
      version: '2.0',
      description:
        "API d'export incrémental du Guichet Jeunesse CJS, consommée par le tap Meltano du Data Hub. Les outils BI lisent l'entrepôt PostgreSQL, pas cette API.\n\nCe fichier est GÉNÉRÉ depuis le contrat d'export (src/lib/datahub/streams.ts) et la documentation du schéma. Ne pas l'éditer à la main : npm run datahub:openapi.",
    },
    servers: [{ url: 'https://guichet.cjs.sn/api/v1', description: 'Production' }],
    security: [{ BearerAuth: [] }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Clé API Data Hub. Refusée si la variable n\'est pas configurée côté serveur (GUIC-631).',
        },
      },
      parameters: {
        since: {
          name: 'since',
          in: 'query',
          description:
            "Borne basse sur la colonne de réplication, ISO 8601. Le consommateur doit appliquer un recouvrement de quelques minutes sur son dernier point d'arrêt : la colonne est posée à l'écriture applicative, pas au commit, et une transaction committée en retard serait sinon jamais extraite.",
          schema: { type: 'string', format: 'date-time' },
        },
        sinceRequis: {
          name: 'since',
          in: 'query',
          required: true,
          description:
            "Borne basse, ISO 8601 — OBLIGATOIRE sur cet endpoint (GUIC-697 D6) : un comptage non borné sur les 13 flux, dont `consultations`, dépasse `maxDuration = 60`.",
          schema: { type: 'string', format: 'date-time' },
        },
        cursor: {
          name: 'cursor',
          in: 'query',
          description: 'Curseur opaque renvoyé par la page précédente. Exclusif avec `since`.',
          schema: { type: 'string' },
        },
        limit: {
          name: 'limit',
          in: 'query',
          description: 'Taille de page.',
          schema: { type: 'integer', default: 1000, minimum: 1, maximum: 5000 },
        },
      },
      schemas,
    },
    paths,
  }

  return `# GÉNÉRÉ — ne pas éditer à la main. Source : src/lib/datahub/streams.ts + prisma/schema.prisma\n# Régénérer : npm run datahub:openapi\n${emitYaml(document).replace(/^\n/, '')}\n`
}
