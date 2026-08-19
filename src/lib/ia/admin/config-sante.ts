// GUIC-435 (Phase 3 — volet faisable hors-ligne) — health-check STATIQUE de la config LLM.
//
// Répond à « la config admin des 3 slots est-elle saine ? » SANS aucun appel live au
// fournisseur : purement l'allowlist Vertex + les capacités déclarées + la présence de
// l'endpoint dédié. Attrape AVANT l'exécution les cas qui feraient échouer un appel réel :
//   • un slot pointant vers un modèle hors allowlist (override env erroné) ;
//   • un modèle self-deployed (Gemma) sans VERTEX_DEDICATED_ENDPOINT_URL — cf. llm-client.ts
//     qui lève à l'appel dans ce cas ;
//   • un futur modèle restreint (sans `json`/`tools`) placé sur un slot qui l'exige.
// Rien de fabriqué : chaque alerte est adossée à un défaut de config réel.

import { prisma } from '@/lib/prisma'
import {
  getModelMeta,
  slotRequirements,
  type LlmSlot,
  type ModelCaps,
} from '../supported-models'
import { DEFAULT_MODEL } from '../supported-models'
import type { AlerteSante } from './sante'

/** D'où vient la valeur effective du slot (ordre de résolution de getLlmConfig). */
export type SourceConfig = 'admin' | 'env' | 'defaut'

export interface SlotConfigSante {
  slot: LlmSlot
  modele: string
  /** Libellé lisible ; null si le modèle est hors allowlist (donc inconnu). */
  label: string | null
  source: SourceConfig
  /** Le modèle appartient-il à l'allowlist Vertex ? */
  autorise: boolean
  /** Les capacités du modèle couvrent-elles les besoins du slot ? */
  capacitesOk: boolean
  /** Capacités requises par le slot mais absentes du modèle (vide si tout va bien). */
  capacitesManquantes: (keyof ModelCaps)[]
  /** Modèle self-deployed dont l'endpoint dédié n'est PAS configuré → appel voué à échouer. */
  endpointDedieRequis: boolean
}

/**
 * Évalue un slot de façon PURE. `dedieConfigure` = VERTEX_DEDICATED_ENDPOINT_URL présent.
 * Aucun accès I/O : l'appelant fournit modèle, source et l'état de l'endpoint dédié.
 */
export function evaluerSlotConfig(
  slot: LlmSlot,
  modele: string,
  source: SourceConfig,
  dedieConfigure: boolean,
): SlotConfigSante {
  const meta = getModelMeta(modele)
  if (!meta) {
    return {
      slot,
      modele,
      label: null,
      source,
      autorise: false,
      capacitesOk: false,
      capacitesManquantes: [],
      endpointDedieRequis: false,
    }
  }

  const required = slotRequirements(slot)
  const capacitesManquantes = (Object.entries(required) as [keyof ModelCaps, boolean][])
    .filter(([cap, needed]) => needed && !meta.caps[cap])
    .map(([cap]) => cap)

  return {
    slot,
    modele,
    label: meta.label,
    source,
    autorise: true,
    capacitesOk: capacitesManquantes.length === 0,
    capacitesManquantes,
    endpointDedieRequis: meta.deployed === true && !dedieConfigure,
  }
}

/** Libellé humain d'un slot pour les messages d'alerte. */
const LIBELLE_SLOT: Record<LlmSlot, string> = {
  agent: 'Agent (Yaye)',
  judge: 'Juge qualité',
  adequation: 'Adéquation',
}

/**
 * Dérive les alertes opérationnelles depuis l'état des slots — critique d'abord, rien
 * d'inventé. Réutilise la forme AlerteSante du hub Santé de Yaye pour un rendu homogène.
 */
export function deriverAlertesConfig(slots: SlotConfigSante[]): AlerteSante[] {
  const alertes: AlerteSante[] = []
  for (const s of slots) {
    const nom = LIBELLE_SLOT[s.slot]
    if (!s.autorise) {
      alertes.push({
        niveau: 'critique',
        message: `Slot ${nom} : modèle « ${s.modele} » hors allowlist Vertex — les appels échoueront.`,
      })
      continue
    }
    if (!s.capacitesOk) {
      alertes.push({
        niveau: 'critique',
        message: `Slot ${nom} : le modèle « ${s.modele} » ne supporte pas ${s.capacitesManquantes.join(', ')} — requis pour ce slot.`,
      })
    }
    if (s.endpointDedieRequis) {
      alertes.push({
        niveau: 'warn',
        message: `Slot ${nom} : modèle self-deployed « ${s.modele} » sans endpoint dédié (VERTEX_DEDICATED_ENDPOINT_URL) — l'appel lèvera.`,
      })
    }
  }
  return alertes.sort((a, b) => (a.niveau === b.niveau ? 0 : a.niveau === 'critique' ? -1 : 1))
}

// ─── Agrégat (async, lecture DB/env — aucun appel LLM) ────────────────────────

export interface ConfigSante {
  slots: SlotConfigSante[]
  alertes: AlerteSante[]
}

const ENV_FALLBACK: Record<LlmSlot, string[]> = {
  agent: ['YAYE_MODEL'],
  judge: ['YAYE_JUDGE_MODEL'],
  adequation: ['ADEQUATION_MODEL', 'GROQ_MODEL'],
}

/** Résout le modèle effectif d'un slot ET sa source, en miroir de getLlmConfig. */
function resoudre(
  slot: LlmSlot,
  row: { agentModel: string; judgeModel: string; adequationModel: string } | null,
): { modele: string; source: SourceConfig } {
  if (row) {
    const modele = slot === 'agent' ? row.agentModel : slot === 'judge' ? row.judgeModel : row.adequationModel
    return { modele, source: 'admin' }
  }
  for (const name of ENV_FALLBACK[slot]) {
    const v = process.env[name]
    if (v && v.trim()) return { modele: v.trim(), source: 'env' }
  }
  return { modele: DEFAULT_MODEL, source: 'defaut' }
}

/**
 * Photo de santé de la config LLM. Lit la ligne LlmConfig (choix admin) ou retombe sur
 * l'env/défaut — exactement l'ordre de résolution runtime. Fail-soft : sur erreur DB on
 * évalue l'env/défaut (jamais d'exception propagée au hub).
 */
export async function computeConfigSante(): Promise<ConfigSante> {
  let row: { agentModel: string; judgeModel: string; adequationModel: string } | null = null
  try {
    row = await prisma.llmConfig.findUnique({
      where: { id: 'default' },
      select: { agentModel: true, judgeModel: true, adequationModel: true },
    })
  } catch {
    row = null // fail-soft : on évaluera l'env/défaut
  }

  const dedieConfigure = !!process.env.VERTEX_DEDICATED_ENDPOINT_URL?.trim()
  const slots = (['agent', 'judge', 'adequation'] as LlmSlot[]).map((slot) => {
    const { modele, source } = resoudre(slot, row)
    return evaluerSlotConfig(slot, modele, source, dedieConfigure)
  })

  return { slots, alertes: deriverAlertesConfig(slots) }
}
