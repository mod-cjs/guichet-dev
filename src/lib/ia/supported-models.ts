// GUIC-537 — Catalogue des modèles LLM autorisés (source de vérité UI admin + serveur).
//
// Migration Groq → Vertex AI : le fournisseur unique est Vertex (endpoint
// OpenAI-compatible). L'admin choisit un modèle PAR USAGE (slot) dans cette allowlist
// curée — jamais de saisie libre, pour éviter toute casse en prod.
//
// Ce module est PUR (aucune I/O) → testable en isolation et importable partout.

export type LlmProvider = 'vertex'

/** Usages distincts de l'IA, chacun pilotable indépendamment depuis l'admin. */
export type LlmSlot = 'agent' | 'judge' | 'adequation'

export interface ModelCaps {
  /** Supporte le function calling (outils Yaye). */
  tools: boolean
  /** Supporte le streaming (SSE web / WhatsApp). */
  stream: boolean
  /** Supporte `response_format: json_object` (juge / scoring). */
  json: boolean
}

export interface ModelMeta {
  /** Identifiant technique = valeur `model` envoyée à l'API Vertex (OpenAI-compat). */
  id: string
  /** Libellé affiché dans l'admin. */
  label: string
  provider: LlmProvider
  caps: ModelCaps
  /**
   * Modèle SELF-DEPLOYED (endpoint dédié à provisionner), par opposition aux modèles
   * MaaS/Gemini servis par l'endpoint `endpoints/openapi` partagé. Route vers
   * `VERTEX_DEDICATED_ENDPOINT_URL`. Cf. Gemma (déploiement vLLM Model Garden).
   */
  deployed?: boolean
  /** Aide à la décision affichée à l'admin. */
  note?: string
}

/**
 * Allowlist Vertex AI. Les `id` sont les noms de modèle attendus par l'endpoint
 * OpenAI-compatible de Vertex (`.../endpoints/openapi/chat/completions`) : Gemini →
 * préfixe `google/`, partenaires MaaS (Llama) → `meta/...-maas`. Les modèles
 * self-deployed (Gemma) portent `deployed: true` et sont appelés via un endpoint dédié.
 */
export const SUPPORTED_MODELS: readonly ModelMeta[] = [
  {
    id: 'google/gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash-Lite',
    provider: 'vertex',
    caps: { tools: true, stream: true, json: true },
    note: 'Le plus rapide et le moins cher des Gemini — volumes élevés / latence critique.',
  },
  {
    id: 'google/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'vertex',
    caps: { tools: true, stream: true, json: true },
    note: 'Rapide et économique — défaut recommandé (agent temps réel).',
  },
  {
    id: 'google/gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    provider: 'vertex',
    caps: { tools: true, stream: true, json: true },
    note: 'Qualité maximale, plus lent et plus coûteux — pour le scoring / juge.',
  },
  {
    id: 'google/gemini-3-flash-preview',
    label: 'Gemini 3 Flash (Preview)',
    provider: 'vertex',
    caps: { tools: true, stream: true, json: true },
    note: 'Génération 3, raisonnement renforcé — en preview. (« Gemini 3.5 » n’existe pas.)',
  },
  {
    id: 'meta/llama-3.1-8b-instruct-maas',
    label: 'Llama 3.1 8B (Vertex MaaS)',
    provider: 'vertex',
    caps: { tools: true, stream: true, json: true },
    note: 'Petit et économique — développement / volumes élevés.',
  },
  {
    id: 'meta/llama-3.1-70b-instruct-maas',
    label: 'Llama 3.1 70B (Vertex MaaS)',
    provider: 'vertex',
    caps: { tools: true, stream: true, json: true },
    note: 'Généraliste 70B, contexte 128k, multilingue.',
  },
  {
    id: 'meta/llama-3.1-405b-instruct-maas',
    label: 'Llama 3.1 405B (Vertex MaaS)',
    provider: 'vertex',
    caps: { tools: true, stream: true, json: true },
    note: 'Le plus grand Llama 3.1 — qualité max, LLM-as-a-Judge / distillation.',
  },
  {
    id: 'meta/llama-3.3-70b-instruct-maas',
    label: 'Llama 3.3 70B (Vertex MaaS)',
    provider: 'vertex',
    caps: { tools: true, stream: true, json: true },
    note: "Comportement proche de l'ancien modèle Groq (llama-3.3-70b).",
  },
  {
    id: 'meta/llama-4-scout-17b-16e-instruct-maas',
    label: 'Llama 4 Scout (Vertex MaaS)',
    provider: 'vertex',
    caps: { tools: true, stream: true, json: true },
    note: '17B actifs / 16 experts, contexte très long, multimodal — efficient.',
  },
  {
    id: 'meta/llama-4-maverick-17b-128e-instruct-maas',
    label: 'Llama 4 Maverick (Vertex MaaS)',
    provider: 'vertex',
    caps: { tools: true, stream: true, json: true },
    note: '17B actifs / 128 experts — le plus puissant des Llama 4, raisonnement + vision.',
  },
  {
    id: 'google/gemma-3-4b-it',
    label: 'Gemma 3 4B (self-deployed)',
    provider: 'vertex',
    caps: { tools: true, stream: true, json: true },
    deployed: true,
    note: 'Petit modèle ouvert — nécessite un endpoint dédié (VERTEX_DEDICATED_ENDPOINT_URL).',
  },
] as const

/** Modèle par défaut si aucune config ni variable d'environnement. */
export const DEFAULT_MODEL = 'google/gemini-2.5-flash'

/** Capacités minimales exigées par chaque slot. */
export function slotRequirements(slot: LlmSlot): Partial<ModelCaps> {
  switch (slot) {
    case 'agent':
      // Yaye a besoin d'outils ET de streaming (progression WhatsApp / SSE web).
      return { tools: true, stream: true }
    case 'judge':
    case 'adequation':
      // Sortie JSON structurée.
      return { json: true }
  }
}

export function getModelMeta(id: string): ModelMeta | undefined {
  return SUPPORTED_MODELS.find(m => m.id === id)
}

export function isSupportedModel(id: string): boolean {
  return getModelMeta(id) !== undefined
}

/**
 * Valide qu'un modèle est autorisé ET compatible avec le slot visé.
 * @throws Error si le modèle est hors allowlist ou ne remplit pas les capacités requises.
 */
export function assertSlotModel(slot: LlmSlot, id: string): void {
  const meta = getModelMeta(id)
  if (!meta) {
    throw new Error(`Modèle non autorisé : "${id}" (hors allowlist Vertex).`)
  }
  const required = slotRequirements(slot)
  for (const [cap, needed] of Object.entries(required) as [keyof ModelCaps, boolean][]) {
    if (needed && !meta.caps[cap]) {
      throw new Error(`Le modèle "${id}" ne supporte pas "${cap}", requis pour le slot "${slot}".`)
    }
  }
}

/** Familles Gemini : la couche OpenAI-compat de Vertex ignore/rejette certains params. */
function isGeminiFamily(id: string): boolean {
  return id.includes('gemini')
}

/**
 * Retire les paramètres non supportés par le modèle cible. Gemini (via compat) ne
 * gère pas `frequency_penalty` / `presence_penalty` → on les enlève pour éviter une 400.
 * Retourne une COPIE ; n'altère jamais l'objet d'entrée.
 */
export function sanitizeParamsForModel<T extends Record<string, unknown>>(id: string, params: T): T {
  if (!isGeminiFamily(id)) return { ...params }
  const clone = { ...params } as Record<string, unknown>
  delete clone.frequency_penalty
  delete clone.presence_penalty
  return clone as T
}
