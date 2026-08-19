// GUIC-558 (Phase 3 — health-check fournisseur LLM live) — sonde le fournisseur RÉEL
// configuré pour un slot : un appel minimal (quelques tokens), la latence mesurée, l'erreur
// remontée telle quelle. Ne lève JAMAIS — un fournisseur en panne doit produire un statut,
// pas une exception qui casse la page. Coûte un vrai appel → à réserver à un déclenchement
// admin explicite, rate-limité (cf. la route). thinking_budget=0 pour un contenu non tronqué
// (piège Gemini connu, cf. project_yaye_vertex).

import { getLlmClient } from '@/lib/ia/llm-client'
import { getSlotModel } from '@/lib/ia/llm-config'
import { sanitizeParamsForModel, type LlmSlot } from '@/lib/ia/supported-models'

export interface ProviderPing {
  slot: LlmSlot
  model: string
  ok: boolean
  /** Latence de l'appel en ms (mesurée même en cas d'échec ; null si le modèle n'a pu être résolu). */
  latenceMs: number | null
  /** Message d'erreur fournisseur (tronqué), ou null si l'appel a réussi. */
  erreur: string | null
}

/** Timeout dur de la sonde — plus court que le timeout runtime, pour ne pas faire attendre l'admin. */
const PING_TIMEOUT_MS = 12_000

/**
 * Sonde le fournisseur configuré pour `slot`. Résout d'abord le modèle effectif (choix admin
 * → env → défaut), puis fait un appel minimal. Toute erreur (auth, quota, réseau, timeout,
 * réponse malformée) devient `{ ok: false, erreur }` — jamais une exception propagée.
 */
export async function pingProvider(slot: LlmSlot): Promise<ProviderPing> {
  let model: string
  try {
    model = await getSlotModel(slot)
  } catch (e) {
    return { slot, model: '—', ok: false, latenceMs: null, erreur: messageErreur(e) }
  }

  const client = getLlmClient(model)
  const params = sanitizeParamsForModel(model, {
    model,
    messages: [{ role: 'user' as const, content: 'Réponds uniquement: OK' }],
    max_tokens: 16,
    temperature: 0,
    // Passthrough Vertex/Gemini : coupe le budget « thinking » pour un contenu non tronqué.
    extra_body: { google: { thinking_config: { thinking_budget: 0 } } },
  })

  const t0 = Date.now()
  try {
    const r = await client.chat.completions.create(params as Parameters<typeof client.chat.completions.create>[0], {
      timeout: PING_TIMEOUT_MS,
    })
    const latenceMs = Date.now() - t0
    const choix = 'choices' in r ? r.choices?.[0] : undefined
    if (!choix) {
      return { slot, model, ok: false, latenceMs, erreur: 'Réponse du fournisseur sans choix exploitable.' }
    }
    return { slot, model, ok: true, latenceMs, erreur: null }
  } catch (e) {
    return { slot, model, ok: false, latenceMs: Date.now() - t0, erreur: messageErreur(e) }
  }
}

/** Sonde les 3 slots en parallèle. */
export async function pingTousSlots(): Promise<ProviderPing[]> {
  return Promise.all((['agent', 'judge', 'adequation'] as LlmSlot[]).map(pingProvider))
}

function messageErreur(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.slice(0, 300)
}
