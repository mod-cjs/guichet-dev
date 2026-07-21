import { z } from 'zod'

/**
 * GUIC-596 — US-1 Gestion des sources de veille : contrats de validation.
 *
 * Sécurité (durcissement post-challenge) : les URLs déclarées ici seront fetchées
 * CÔTÉ SERVEUR par le robot de découverte (US-2 GUIC-597). Une URL interne acceptée =
 * SSRF différé (metadata cloud, Redis, MinIO, services locaux). On n'autorise donc que
 * des noms de domaine publics (jamais d'IP littérale ni d'hôte interne), sur les ports
 * http/https standard uniquement. La re-vérification après résolution DNS (anti
 * DNS-rebinding) reste à faire au moment du fetch en US-2.
 *
 * `configExtraction` (sélecteurs CSS, paramètres d'API…) est OBLIGATOIRE pour les
 * méthodes qui ne peuvent pas fonctionner sans configuration (`api`, `html_selecteurs`).
 * Cet invariant se vérifie sur l'ENTITÉ RÉSULTANTE : à la création (objet complet) via
 * `superRefine` ; en édition partielle, côté route sur l'état fusionné (DB + patch).
 *
 * Spec : `.agent_context/specs/M3-curation-opportunites.md` §4.
 */

export const METHODES_EXTRACTION = [
  'auto',
  'jsonld',
  'rss',
  'api',
  'html_selecteurs',
  'article_regex',
] as const

export const FREQUENCES_VEILLE = ['horaire', 'six_heures', 'quotidienne', 'hebdomadaire'] as const

export type MethodeExtraction = (typeof METHODES_EXTRACTION)[number]
export type FrequenceVeille = (typeof FREQUENCES_VEILLE)[number]

/** Méthodes inopérantes sans `configExtraction`. */
export const METHODES_CONFIG_REQUISE: readonly MethodeExtraction[] = ['api', 'html_selecteurs']

const CONFIG_MAX_OCTETS = 8192

/** Hôte public autorisé : nom de domaine, jamais une IP ni un hôte interne. */
function hostAutorise(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '') // retire un éventuel point final (FQDN absolu)
  if (!h) return false
  // Hôtes internes explicites.
  if (h === 'localhost' || h.endsWith('.localhost')) return false
  if (h.endsWith('.local') || h.endsWith('.internal')) return false
  // IPv6 littérale (entre crochets) — inclut [::1], [fc00::], etc.
  if (host.startsWith('[')) return false
  // IPv4 pointée / décimale / octale, ou hexadécimale : aucun source légitime n'est une IP brute.
  if (/^[0-9.]+$/.test(h)) return false
  if (/^0x[0-9a-f]+$/i.test(h)) return false
  // Doit ressembler à un domaine (au moins un point ; localhost déjà exclu).
  if (!h.includes('.')) return false
  return true
}

/** Normalise l'URL pour un `@unique` stable : host en minuscule, port par défaut retiré,
 *  slash final de chemin retiré. Query/fragment préservés (peuvent porter du sens métier). */
function normaliseUrl(raw: string): string {
  const u = new URL(raw)
  u.hostname = u.hostname.toLowerCase()
  if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) {
    u.port = ''
  }
  if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
    u.pathname = u.pathname.replace(/\/+$/, '')
  }
  return u.toString()
}

export const UrlSource = z
  .string()
  .trim()
  .max(500, 'URL trop longue (500 max)')
  .url('URL invalide')
  .refine((u) => /^https?:\/\//i.test(u), 'Seuls les schémas http(s) sont autorisés')
  .refine((u) => {
    let parsed: URL
    try {
      parsed = new URL(u)
    } catch {
      return false
    }
    if (parsed.port && parsed.port !== '80' && parsed.port !== '443') return false
    return hostAutorise(parsed.hostname)
  }, 'URL interne ou non publique interdite (source fetchée côté serveur)')
  .transform(normaliseUrl)
  // La normalisation (punycode d'un hôte unicode) peut RALLONGER l'URL après le
  // contrôle max(500) ci-dessus : on revalide la longueur du résultat persisté
  // pour ne jamais dépasser VARCHAR(500).
  .refine((u) => u.length <= 500, 'URL trop longue après normalisation (500 max)')

const ConfigExtraction = z
  .record(z.unknown())
  .refine((o) => Object.keys(o).length >= 1, 'La configuration ne peut pas être vide')
  .refine(
    (o) => JSON.stringify(o).length <= CONFIG_MAX_OCTETS,
    'Configuration trop volumineuse (8 Ko max)',
  )

const Base = z.object({
  nom: z.string().trim().min(3, 'Nom trop court (3 min)').max(120, 'Nom trop long (120 max)'),
  url: UrlSource,
  methode: z.enum(METHODES_EXTRACTION).default('auto'),
  frequence: z.enum(FREQUENCES_VEILLE).default('quotidienne'),
  actif: z.boolean().default(true),
  configExtraction: ConfigExtraction.optional(),
  typeDefautId: z.string().uuid('Type par défaut invalide').optional(),
})

/** Invariant méthode↔config, à évaluer sur l'entité complète (create). */
function exigeConfig(
  d: { methode?: MethodeExtraction; configExtraction?: Record<string, unknown> | null },
  ctx: z.RefinementCtx,
): void {
  if (d.methode && METHODES_CONFIG_REQUISE.includes(d.methode) && !d.configExtraction) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['configExtraction'],
      message: `configExtraction est requise pour la méthode « ${d.methode} »`,
    })
  }
}

export const SourceVeilleCreateSchema = Base.superRefine(exigeConfig)

/**
 * Édition partielle : la forme est validée ici, mais PAS l'invariant méthode↔config
 * (impossible sans l'état en base — un patch de `methode` seul peut être légal si la
 * config existe déjà). Cet invariant est vérifié côté route sur l'état fusionné.
 * `configExtraction: null` = effacement explicite.
 */
export const SourceVeilleUpdateSchema = Base.extend({
  configExtraction: ConfigExtraction.nullable().optional(),
})
  .partial()
  .refine((d) => Object.values(d).some((v) => v !== undefined), 'Patch vide')

/** Réutilisable côté route pour valider l'invariant sur l'entité fusionnée. */
export function methodeConfigCoherentes(
  methode: MethodeExtraction,
  configExtraction: unknown,
): boolean {
  if (!METHODES_CONFIG_REQUISE.includes(methode)) return true
  return Boolean(configExtraction)
}

export type SourceVeilleCreateInput = z.infer<typeof SourceVeilleCreateSchema>
export type SourceVeilleUpdateInput = z.infer<typeof SourceVeilleUpdateSchema>
