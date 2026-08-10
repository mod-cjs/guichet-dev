import { z } from 'zod'
import type { ChampsExtraits } from './types'
import { nettoyerTexte } from './html-texte'
import { parseDateFr } from './dates'
import { mapperRegion, mapperDomaine } from './mapping'

/**
 * GUIC-704 — couche d'enrichissement IA (hybride) de l'extraction de curation.
 *
 * Le socle déterministe (extract.ts) reste la base ; cette couche ne comble que les TROUS,
 * via 1 appel LLM à sortie JSON contrainte. Sûreté : l'admin valide chaque item avant
 * publication → une hallucination est rattrapée par le garde humain. Voir
 * `.agent_context/specs/curation-enrichissement-ia.md`.
 *
 * Propriétés :
 *  - merge TROUS-SEULEMENT : ne surcharge jamais une valeur déjà trouvée par le déterministe ;
 *  - discipline enum : région/domaine repassent par le mapping Guichet, type contraint à la
 *    liste connue → jamais de valeur hors référentiel ;
 *  - « n'invente rien » : le prompt impose null hors présence littérale ;
 *  - fail-soft : LLM indispo / JSON invalide / exception → `{}` (on garde le déterministe).
 *
 * Le LLM est un SEAM injectable (`deps.appeler`) → tests déterministes sans réseau. Défaut =
 * Vertex (import dynamique, jamais chargé tant qu'on n'enrichit pas réellement).
 */

export interface EntreeEnrichissement {
  /** Texte nettoyé de la page (borné en amont). */
  texte: string
  url: string
  /** Champs déjà trouvés par le déterministe (pour cibler les trous et ne pas les écraser). */
  dejaConnu: Partial<ChampsExtraits>
}

export type AppelLlm = (systeme: string, utilisateur: string) => Promise<string | null>

export interface DepsEnrichissement {
  /** Seam LLM. Défaut : appel Vertex. Tests : faux renvoyant un JSON canné. */
  appeler?: AppelLlm
  /** Slugs de types d'opportunité valides (contraint la classification). */
  typesConnus?: string[]
}

const TEXTE_MAX = 6000

const SortieSchema = z.object({
  titre: z.string().nullish(),
  description: z.string().nullish(),
  organisation: z.string().nullish(),
  region: z.string().nullish(),
  domaine: z.string().nullish(),
  typeSlug: z.string().nullish(),
  deadline: z.string().nullish(),
})

function promptSysteme(typesConnus: string[]): string {
  const types = typesConnus.length ? typesConnus.join(', ') : '(aucun)'
  return [
    "Tu es un extracteur d'informations pour un guichet jeunesse au Sénégal.",
    "On te donne le TEXTE d'une annonce d'opportunité. Renvoie UNIQUEMENT un objet JSON",
    'avec les clés : titre, description, organisation, region, domaine, typeSlug, deadline.',
    'Règles STRICTES :',
    "- N'invente RIEN : si une information n'apparaît pas littéralement dans le texte, mets null.",
    '- deadline = la date LIMITE de candidature au format AAAA-MM-JJ, JAMAIS la date de publication ; sinon null.',
    '- region = une région administrative du Sénégal si explicitement mentionnée ; sinon null.',
    `- typeSlug ∈ {${types}} si le type est clair ; sinon null.`,
    '- Réponds en français, JSON seul, sans commentaire ni texte autour.',
  ].join('\n')
}

function promptUtilisateur(e: EntreeEnrichissement): string {
  return [
    `URL: ${e.url}`,
    `Champs déjà connus (ne pas répéter) : ${JSON.stringify(e.dejaConnu)}`,
    '',
    'TEXTE :',
    e.texte.slice(0, TEXTE_MAX),
  ].join('\n')
}

/** Appel Vertex réel (seam par défaut). Import dynamique → OpenAI jamais chargé en test. */
async function appelVertex(systeme: string, utilisateur: string): Promise<string | null> {
  try {
    const { getLlmClient, chatCompletionWithRetry } = await import('@/lib/ia/llm-client')
    const { DEFAULT_MODEL } = await import('@/lib/ia/supported-models')
    const model = DEFAULT_MODEL
    const completion = await chatCompletionWithRetry(() =>
      getLlmClient(model).chat.completions.create({
        model,
        temperature: 0,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        // Thinking désactivé : l'extraction est une tâche déterministe SANS chaîne de raisonnement.
        // Sur gemini-2.5, le thinking consomme sinon tout le budget de sortie sur un gros prompt
        // → JSON tronqué (finish_reason=length). `extra_body` = passthrough config Vertex/Gemini.
        extra_body: { google: { thinking_config: { thinking_budget: 0 } } },
        messages: [
          { role: 'system', content: systeme },
          { role: 'user', content: utilisateur },
        ],
      } as never),
    )
    return completion.choices[0]?.message?.content ?? null
  } catch {
    return null // fail-soft : Vertex down / quota / réseau → on garde le déterministe
  }
}

export async function enrichirParIa(
  e: EntreeEnrichissement,
  deps: DepsEnrichissement = {},
): Promise<Partial<ChampsExtraits>> {
  const appeler = deps.appeler ?? appelVertex
  const typesConnus = deps.typesConnus ?? []

  let brut: string | null
  try {
    brut = await appeler(promptSysteme(typesConnus), promptUtilisateur(e))
  } catch {
    return {} // l'appel lui-même a jeté → fail-soft
  }
  if (!brut) return {}

  let json: unknown
  try {
    json = JSON.parse(brut)
  } catch {
    return {} // JSON invalide → fail-soft
  }
  const parsed = SortieSchema.safeParse(json)
  if (!parsed.success) return {}
  const d = parsed.data

  const dc = e.dejaConnu
  const manque = (k: keyof ChampsExtraits) => !dc[k]
  const out: Partial<ChampsExtraits> = {}

  if (manque('titre') && d.titre) out.titre = nettoyerTexte(d.titre)
  if (manque('description') && d.description) out.description = nettoyerTexte(d.description)
  if (manque('organisation') && d.organisation) out.organisation = nettoyerTexte(d.organisation)

  if (manque('region') && d.region) {
    const r = mapperRegion(d.region) // enforce l'enum : hors référentiel Sénégal → rien
    if (r) {
      out.region = r
      out.regionTexte = nettoyerTexte(d.region)
    }
  }

  if (manque('domaine') && d.domaine) {
    const dom = mapperDomaine(d.domaine)
    if (dom) {
      out.domaine = dom
      out.domaineTexte = nettoyerTexte(d.domaine)
    }
  }

  // Type : seulement si le déterministe n'a rien, et si le slug est dans la liste connue.
  if (!dc.typeId && !dc.typeSlugSchemaOrg && d.typeSlug && typesConnus.includes(d.typeSlug)) {
    out.typeSlugSchemaOrg = d.typeSlug
  }

  if (manque('deadline') && d.deadline) {
    const iso = parseDateFr(d.deadline)
    if (iso) out.deadline = iso
  }

  return out
}
