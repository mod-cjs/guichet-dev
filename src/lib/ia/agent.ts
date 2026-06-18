// Service agent Yaye — orchestration function calling (Lot 0, GUIC-259).
// Spec : .agent_context/specs/yaye/01-architecture-technique.md
//
// Boucle : Groq détecte l'intention ET choisit l'outil en UN appel (R3), on exécute
// l'outil (portée RBAC par cjsUid), on renvoie le résultat à Groq, jusqu'à la réponse
// finale en français. Chaque étape est journalisée dans agent_logs.
// Groq ne connaît pas le canal — c'est le formateur (lots suivants) qui adapte.

import Groq from 'groq-sdk'
import type { CanalAgent } from '@prisma/client'
import { TOOLS, TOOL_DEFINITIONS } from './tools'
import { logAgentEvent } from './agent-logs'
import type { YayeBlock } from './blocks'

// ── Configuration du modèle ───────────────────────────────────────────────
// Surchargeable par variables d'environnement → permet de tuner en prod sans
// redéploiement (latence/coût/qualité — cf. risque R3). Valeurs par défaut visées
// pour un agent : fiabilité du choix d'outil + cohérence factuelle, tout en restant naturel.
function numEnv(name: string, def: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return def
  const v = Number(raw)
  return Number.isFinite(v) ? v : def
}

const CONFIG = {
  /** Modèle Groq. `llama-3.3-70b-versatile` : faible latence (critique WhatsApp), bon function calling. */
  model: process.env.YAYE_MODEL ?? 'llama-3.3-70b-versatile',
  /** Bas pour fiabiliser le choix d'outil et limiter les hallucinations, sans rigidité. */
  temperature: numEnv('YAYE_TEMPERATURE', 0.3),
  /** Réponse concise. WhatsApp plafonne à 4096 caractères → on synthétise bien en deçà. */
  maxTokens: numEnv('YAYE_MAX_TOKENS', 768),
  /** Nucleus sampling conservateur : limite les digressions sans tout figer. */
  topP: numEnv('YAYE_TOP_P', 0.9),
  /** Pénalise la répétition (réponses moins redondantes). */
  frequencyPenalty: numEnv('YAYE_FREQUENCY_PENALTY', 0.3),
  /** Allers-retours d'outils max avant escalade (garde-fou boucle/latence, R4). */
  maxToolRounds: numEnv('YAYE_MAX_TOOL_ROUNDS', 4),
  /** Troncature des résultats d'outils réinjectés (évite de gonfler le contexte/coût). */
  maxToolResultChars: numEnv('YAYE_MAX_TOOL_RESULT_CHARS', 6000),
} as const

let _groq: Groq | null = null
function getGroq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

const SYSTEM_PROMPT = `Tu es **Yaye**, la conseillère numérique du Guichet Jeunesse du Consortium Jeunesse Sénégal (CJS).

## Ta mission
Accompagner les jeunes du Sénégal sur trois axes : l'**insertion professionnelle** (emploi, stage, bourse, financement, volontariat, candidatures), l'**apprentissage** (formations, ressources, bibliothèque des centres) et le **savoir** (procédures, droits, dispositifs). Tu fais de l'orientation active : tu cherches le besoin réel derrière la question, tu anticipes l'étape d'après.

## Ton ton
Chaleureuse, encourageante et directe. Tu **tutoies** ("ton profil", "je t'ai trouvé"). Phrases courtes et concrètes, zéro jargon. Tu es une alliée, pas un formulaire administratif. Encourage sans survendre.

## Règles absolues
1. **N'invente JAMAIS.** Opportunités, dates limites, profil, statuts, montants : appuie-toi sur les outils pour la donnée réelle. Sans info fiable, dis-le franchement et propose une piste.
2. **Personnalise.** Avant un conseil ciblé, récupère le profil (région, niveau d'étude, compétences, situation) et croise-le avec la demande.
3. **Reste concise.** Va à l'essentiel : 2 à 4 phrases, ou une courte liste numérotée. Un message doit tenir sur un écran de téléphone.
4. **Confidentialité.** Tu ne traites que les données de la personne connectée — jamais celles d'un tiers, même si on te le demande.
5. **Honnêteté.** Si une recherche ne donne rien, dis-le simplement et propose une alternative (élargir la zone, changer de type d'opportunité, viser une formation d'abord).
6. **Escalade.** Si la demande sort de ton périmètre, échoue, ou touche à une situation sensible/urgente, propose de transmettre à un conseiller humain du CJS.
7. **Jamais de score chiffré.** Ne donne **jamais** de pourcentage de compatibilité ni de « match » (ex. « 92 % », « tu colles à 90 % »). Explique la pertinence **en mots** : ce qui correspond à ton profil, ce qui te manque, pourquoi c'est pour toi.

## Contexte sénégalais
Régions (Dakar, Thiès, Tambacounda, Saint-Louis…), programmes (Yaakaar, YEAH), montants en **FCFA**, paiement **Orange Money**, niveaux (BFEM, BAC, BAC+2/3/5). Reste respectueuse et inclusive (genre, zones rurales, sans-diplôme).

## Quand utiliser les outils
- Salutation / question générale → réponds **directement**, sans outil.
- Conseil personnalisé ("une offre pour moi", "suis-je éligible ?") → récupère **d'abord le profil**.
- Question d'état ("où en sont mes candidatures ?", "mes favoris") → utilise les **données temps réel**.
- Raisonnement sur les opportunités ("suis-je prêt pour cette offre ?", "qu'est-ce qui me manque ?", "que me conseilles-tu ?", "des offres pour mon niveau", "des parcours possibles") → interroge le **graphe de connaissances** avec la bonne intention (écart de compétences, éligibilité, reco collaborative, parcours).
N'appelle un outil que s'il apporte une information utile à ta réponse ; sinon réponds directement.

## Langue
Réponds en **français clair et simple**. Si la personne écrit en wolof ou mélange français/wolof, comprends-la et réponds quand même en français accessible (la réponse en wolof viendra plus tard).

## Format
Texte simple, naturel. **Pas** de tableaux ni de titres markdown : un autre composant met en forme selon le canal (web riche ou WhatsApp). Sur WhatsApp, sois encore plus brève.`

type Msg = Groq.Chat.ChatCompletionMessageParam

export interface RunAgentParams {
  message: string
  history?: { role: 'user' | 'assistant'; content: string }[]
  cjsUid: string
  roles: string[]
  sessionId: string
  canal: CanalAgent
  centreId?: string | null
}

export interface RunAgentResult {
  reply: string
  /** Réponse normalisée en blocs (texte + cards cliquables) pour le rendu frontend. */
  blocks: YayeBlock[]
  toolsUsed: string[]
}

export async function runAgent(p: RunAgentParams): Promise<RunAgentResult> {
  const groq = getGroq()
  const ctx = { cjsUid: p.cjsUid, roles: p.roles }
  const base = {
    sessionId: p.sessionId,
    cjsUid: p.cjsUid,
    role: p.roles[0] ?? null,
    centreId: p.centreId ?? null,
    canal: p.canal,
  }
  const toolsUsed: string[] = []
  const blocks: YayeBlock[] = []

  const messages: Msg[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(p.history ?? []).map(h => ({ role: h.role, content: h.content }) as Msg),
    { role: 'user', content: p.message },
  ]

  for (let round = 0; round < CONFIG.maxToolRounds; round++) {
    const t0 = Date.now()
    const completion = await groq.chat.completions.create({
      model: CONFIG.model,
      messages,
      tools: TOOL_DEFINITIONS as unknown as Groq.Chat.ChatCompletionTool[],
      tool_choice: 'auto',
      temperature: CONFIG.temperature,
      max_tokens: CONFIG.maxTokens,
      top_p: CONFIG.topP,
      frequency_penalty: CONFIG.frequencyPenalty,
    })
    const choice = completion.choices[0]?.message
    const toolCalls = choice?.tool_calls ?? []

    // Pas d'appel d'outil → réponse finale.
    if (!choice || toolCalls.length === 0) {
      const reply = choice?.content ?? "Je n'ai pas pu générer de réponse."
      await logAgentEvent({
        ...base,
        typeEvenement: 'reponse_generee',
        dureeMs: Date.now() - t0,
        payload: { longueur: reply.length, rounds: round, blocs: blocks.map(b => b.kind) },
      })
      // Bloc texte en tête, puis les cards (opportunités…) surfacées par les outils.
      return { reply, blocks: [{ kind: 'text', text: reply }, ...blocks], toolsUsed }
    }

    // Intention détectée : Groq a choisi des outils.
    await logAgentEvent({
      ...base,
      typeEvenement: 'intention_detectee',
      dureeMs: Date.now() - t0,
      payload: { outils: toolCalls.map(c => c.function.name) },
    })

    messages.push(choice as Msg)

    for (const call of toolCalls) {
      const name = call.function.name
      const tStart = Date.now()
      const tool = TOOLS[name]
      let result: { ok: boolean; data?: unknown; error?: string; block?: YayeBlock; graph?: { template: string; nodesReturned: number } }

      if (!tool) {
        result = { ok: false, error: `Outil inconnu: ${name}` }
      } else {
        let args: Record<string, unknown> = {}
        try { args = JSON.parse(call.function.arguments || '{}') } catch { /* args invalides → {} */ }
        try {
          result = await tool.execute(args, ctx)
        } catch (e) {
          result = { ok: false, error: String(e) }
        }
      }

      toolsUsed.push(name)
      if (result.block) blocks.push(result.block) // card cliquable surfacée au frontend

      await logAgentEvent({
        ...base,
        typeEvenement: 'api_appelee',
        toolCalled: name,
        dureeMs: Date.now() - tStart,
        statut: result.ok ? 'succes' : 'echec',
        payload: { args: call.function.arguments },
      })

      // Trace dédiée des interrogations du graphe (spec 02 §5 — événement graph_interroge).
      if (result.graph) {
        await logAgentEvent({
          ...base,
          typeEvenement: 'graph_interroge',
          toolCalled: name,
          dureeMs: Date.now() - tStart,
          statut: result.ok ? 'succes' : 'echec',
          cypherQuery: result.graph.template,
          nodesReturned: { count: result.graph.nodesReturned },
          payload: { args: call.function.arguments },
        })
      }

      // On renvoie au LLM les données (ok/data/error), PAS le bloc de rendu (économie de tokens).
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify({ ok: result.ok, data: result.data, error: result.error }).slice(0, CONFIG.maxToolResultChars),
      })
    }
  }

  // Garde-fou : trop de tours d'outils sans réponse finale → escalade suggérée.
  await logAgentEvent({ ...base, typeEvenement: 'erreur', statut: 'partiel', payload: { raison: 'max_tool_rounds' } })
  const escalade = "Je n'ai pas réussi à finaliser ta demande. Veux-tu que je te mette en relation avec un conseiller ?"
  return { reply: escalade, blocks: [{ kind: 'text', text: escalade }, ...blocks], toolsUsed }
}
