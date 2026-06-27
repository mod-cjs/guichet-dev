// Mémoire LONG TERME de Yaye — un résumé persistant par utilisateur (cjsUid).
// Spec : .agent_context/specs/yaye/07-securite-conformite.md (cjs_uid + résumé non
// sensible, aucune donnée de tiers).
//
// Distinct du contexte conversationnel (context.ts, 20 derniers tours / 7 jours) :
// ici on garde une FICHE de quelques puces qui SURVIT au-delà de la fenêtre — objectif
// du jeune, domaine visé, région, démarches en cours, préférences. Rafraîchie après
// chaque échange (fire-and-forget) et réinjectée au début de chaque conversation, pour
// que Yaye se souvienne d'une personne d'une session à l'autre, sur tous les canaux.
//
// Stockage : Redis, TTL long (90 j) rafraîchi à chaque écriture. Fail-soft partout.

import Groq from 'groq-sdk'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'

const PREFIX = 'yaye:memo:'
const TTL_MEMO = 90 * 24 * 3600 // 90 jours, rafraîchi à chaque mise à jour
const MAX_LEN = 700 // résumé borné (coût/contexte)

export function memoKey(cjsUid: string): string {
  return `${PREFIX}${cjsUid}`
}

/** Charge le résumé long terme d'un utilisateur ('' si absent ou erreur). Fail-soft. */
export async function loadSummary(cjsUid: string): Promise<string> {
  try {
    return (await redis.get(memoKey(cjsUid))) ?? ''
  } catch (err) {
    logger.warn('[yaye-memo] load échec', { err: String(err) })
    return ''
  }
}

/** Persiste le résumé (borné) avec TTL long. Fail-soft. */
export async function saveSummary(cjsUid: string, summary: string): Promise<void> {
  try {
    await redis.set(memoKey(cjsUid), summary.slice(0, MAX_LEN), 'EX', TTL_MEMO)
  } catch (err) {
    logger.warn('[yaye-memo] save échec', { err: String(err) })
  }
}

let _groq: Groq | null = null
function getGroq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

const SUMMARY_MODEL = process.env.YAYE_SUMMARY_MODEL ?? process.env.YAYE_MODEL ?? 'llama-3.3-70b-versatile'

const MEMO_PROMPT = `Tu maintiens une FICHE MÉMOIRE factuelle et concise sur un jeune du Guichet Jeunesse Sénégal, pour qu'une conseillère (Yaye) se souvienne de lui d'une conversation à l'autre.
Mets à jour la fiche en intégrant le dernier échange. Garde UNIQUEMENT ce qui est durablement utile : objectif(s) de la personne, domaine ou métier visé, région, contraintes (mobilité, niveau d'étude), démarches en cours (candidatures, réservations, emprunts), préférences exprimées.
Règles : 3 à 6 puces courtes maximum (« - … »), pas de bavardage, pas de données sensibles (santé, religion, opinions), pas d'invention. Si le dernier échange n'apporte rien de durable, renvoie la fiche inchangée.
Réponds UNIQUEMENT par la fiche (les puces), sans préambule ni commentaire.`

/**
 * Met à jour la fiche mémoire à partir de la précédente + du dernier échange.
 * À appeler en FIRE-AND-FORGET (n'ajoute pas de latence à la réponse). Fail-soft.
 * No-op sans clé Groq (tests / environnements sans IA).
 */
export async function updateSummary(
  cjsUid: string,
  prior: string,
  userText: string,
  assistantText: string,
): Promise<void> {
  if (!process.env.GROQ_API_KEY) return
  try {
    const completion = await getGroq().chat.completions.create({
      model: SUMMARY_MODEL,
      temperature: 0.2,
      max_tokens: 240,
      messages: [
        { role: 'system', content: MEMO_PROMPT },
        {
          role: 'user',
          content:
            `FICHE ACTUELLE :\n${prior || '(vide)'}\n\n` +
            `DERNIER ÉCHANGE :\nJeune : ${userText}\nYaye : ${assistantText}\n\n` +
            `Rends la fiche mise à jour.`,
        },
      ],
    })
    const next = completion.choices[0]?.message?.content?.trim()
    if (next) await saveSummary(cjsUid, next)
  } catch (err) {
    logger.warn('[yaye-memo] update échec', { err: String(err) })
  }
}
