// Juge LLM (P2-9) — OPTIONNEL et PLUGGABLE. Les checks déterministes attrapent le mesurable ;
// le juge note les qualités nuancées (utilité, cohérence, chaleur, « parle-t-il à l'usager ? »).
//
// Activation : env `EVAL_JUDGE_MODEL` (ex. un modèle LMStudio plus fort, ou le 70B). JAMAIS le
// modèle jugé lui-même. Désactivé par défaut → le runner reste 100 % déterministe sans config.

import { getLlmClient } from '@/lib/ia/llm-client'
import { sanitizeParamsForModel } from '@/lib/ia/supported-models'

export interface JudgeVerdict {
  helpful: number // 0-5 : répond utilement à la demande
  addressesUser: number // 0-5 : parle À l'utilisateur (pas méta / 3ᵉ pers.)
  coherent: number // 0-5 : cohérent, sans contradiction ni charabia
  warm: number // 0-5 : ton juste (chaleureux sans être creux)
  verdict: 'pass' | 'weak' | 'fail'
  reason: string
}

export function judgeModel(): string | null {
  return process.env.EVAL_JUDGE_MODEL?.trim() || null
}

const RUBRIC = `Tu es un évaluateur QUALITÉ d'un agent conversationnel (Yaye, CJS Sénégal, tutoie le jeune).
On te donne le MESSAGE UTILISATEUR et la RÉPONSE de l'agent. Note SANS complaisance de 0 à 5 :
- helpful : la réponse répond-elle utilement à la demande ?
- addressesUser : la réponse PARLE-T-ELLE au jeune (2e pers.) ? 0 si elle décrit la mécanique
  (« la fonction… », « cette réponse… », « voici un exemple »), parle du jeune à la 3e personne
  (« le bénéficiaire »), ou expose du JSON/args d'outil.
- coherent : cohérente, sans contradiction, sans charabia.
- warm : ton juste, chaleureux mais concis (≤ 3 phrases attendu).
verdict = "pass" si tout ≥ 3 ; "weak" si un critère à 2 ; "fail" si un critère ≤ 1.
Réponds UNIQUEMENT en JSON: {"helpful":n,"addressesUser":n,"coherent":n,"warm":n,"verdict":"...","reason":"court"}.`

/** Juge une réponse. Renvoie null si le juge est désactivé ou en erreur (le runner dégrade). */
export async function judgeReply(userMessage: string, reply: string): Promise<JudgeVerdict | null> {
  const model = judgeModel()
  if (!model || !reply.trim()) return null
  try {
    const client = getLlmClient(model)
    const res = await client.chat.completions.create(
      sanitizeParamsForModel(model, {
        model,
        temperature: 0,
        max_tokens: 400,
        messages: [
          { role: 'system', content: RUBRIC },
          { role: 'user', content: `MESSAGE UTILISATEUR:\n${userMessage}\n\nRÉPONSE DE L'AGENT:\n${reply}` },
        ],
      }) as never,
    )
    const raw = (res.choices?.[0]?.message?.content ?? '').replace(/```json|```/g, '')
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return null
    const j = JSON.parse(m[0]) as Partial<JudgeVerdict>
    const num = (v: unknown) => Math.max(0, Math.min(5, Number(v) || 0))
    return {
      helpful: num(j.helpful),
      addressesUser: num(j.addressesUser),
      coherent: num(j.coherent),
      warm: num(j.warm),
      verdict: j.verdict === 'pass' || j.verdict === 'weak' || j.verdict === 'fail' ? j.verdict : 'weak',
      reason: typeof j.reason === 'string' ? j.reason.slice(0, 200) : '',
    }
  } catch {
    return null
  }
}
