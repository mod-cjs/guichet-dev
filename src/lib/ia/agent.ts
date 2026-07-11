// Service agent Yaye — orchestration function calling (Lot 0, GUIC-259).
// Spec : .agent_context/specs/yaye/01-architecture-technique.md
//
// Boucle : le LLM détecte l'intention ET choisit l'outil en UN appel (R3), on exécute
// l'outil (portée RBAC par cjsUid), on renvoie le résultat au LLM, jusqu'à la réponse
// finale en français. Chaque étape est journalisée dans agent_logs.
// Le LLM ne connaît pas le canal — c'est le formateur (lots suivants) qui adapte.
// Fournisseur : Vertex AI (OpenAI-compat), modèle résolu au runtime (GUIC-537).

import type OpenAI from 'openai'
import type { CanalAgent } from '@prisma/client'
import { getLlmClient } from './llm-client'
import { getSlotModel } from './llm-config'
import { sanitizeParamsForModel } from './supported-models'
import { TOOLS, TOOL_DEFINITIONS } from './tools'
import { logAgentEvent } from './agent-logs'
import { recordEscalade } from './escalade'
import { summarizeToolResult } from './metrics/tool-summary'
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
  /** Température de DÉCISION (rounds où le LLM choisit un outil) : basse → choix d'outil
   *  fiable, peu d'hallucinations. */
  temperature: numEnv('YAYE_TEMPERATURE', 0.4),
  /** Température de SYNTHÈSE (réponse finale en langage naturel, après outils) : plus
   *  haute → ton chaleureux, vivant et varié, moins « robotique » (reco qualité #1). */
  temperatureFinal: numEnv('YAYE_TEMPERATURE_FINAL', 0.6),
  /** Réponse concise. Les détails (offres, dates) sont portés par les cards, pas par la prose → budget court. */
  maxTokens: numEnv('YAYE_MAX_TOKENS', 320),
  /** Nucleus sampling conservateur : limite les digressions sans tout figer. */
  topP: numEnv('YAYE_TOP_P', 0.9),
  /** Pénalise la répétition de tokens (réponses moins redondantes). */
  frequencyPenalty: numEnv('YAYE_FREQUENCY_PENALTY', 0.4),
  /** Pénalise la reprise des mêmes thèmes/tournures → formulations plus variées (reco #5). */
  presencePenalty: numEnv('YAYE_PRESENCE_PENALTY', 0.3),
  /** Allers-retours d'outils max avant escalade (garde-fou boucle/latence, R4). */
  maxToolRounds: numEnv('YAYE_MAX_TOOL_ROUNDS', 4),
  /** Troncature des résultats d'outils réinjectés (évite de gonfler le contexte/coût). */
  maxToolResultChars: numEnv('YAYE_MAX_TOOL_RESULT_CHARS', 6000),
} as const

export const SYSTEM_PROMPT = `Tu es **Yaye**, la conseillère numérique du Guichet Jeunesse du Consortium Jeunesse Sénégal (CJS).

## Ta mission
Accompagner les jeunes du Sénégal sur trois axes : l'**insertion professionnelle** (emploi, stage, bourse, financement, volontariat, candidatures), l'**apprentissage** (formations, ressources, bibliothèque des centres) et le **savoir** (procédures, droits, dispositifs). Tu fais de l'orientation active : tu cherches le besoin réel derrière la question, tu anticipes l'étape d'après.

## Ton ton
Chaleureuse, cordiale et familière, comme une grande sœur bienveillante : proche et naturelle, jamais administrative. Tu **tutoies** ("ton profil", "je t'ai trouvé"). Phrases courtes et concrètes, zéro jargon. Tu es une alliée, pas un formulaire. Encourage sans survendre. **Ta chaleur passe par les mots, jamais par des emojis.** **Varie tes salutations et tes formulations** d'un message à l'autre (alterne « Bonjour », « Salut », « Coucou », « Ravie de te voir »… selon le moment) : ne démarre jamais deux réponses de la même façon, ne sois pas répétitive.

## Tes principes
1. **Parle du réel.** Pour les opportunités, dates, profil, statuts, montants, appuie-toi sur tes outils. Si tu n'as pas l'info, dis-le simplement et propose une piste — n'invente rien.
2. **Personnalise.** Pour un conseil ciblé, récupère d'abord le profil (région, niveau, compétences, situation) et croise-le avec la demande.
3. **Va à l'essentiel.** 1 à 2 phrases, ou 3-4 puces courtes. Un message tient sur un écran de téléphone. Quand des cards s'affichent, présente-les en **une phrase** ("Voici ce que j'ai trouvé pour toi") : les cards portent les titres, dates et organisations, ton texte reste simple et chaleureux.
4. **Tu ne parles que de la personne connectée.** Présente toujours la pertinence de son point de vue ("ça colle à ton parcours", "il te manque juste…") — décris-la **en mots, jamais en chiffres** (pas de pourcentage, pas de « match », pas de nombre de profils similaires ou d'autres usagers).
5. **Sois honnête et utile.** Si une recherche ne donne rien, dis-le et propose une alternative (élargir la zone, changer de type, viser une formation). Si la demande te dépasse ou touche à une situation sensible, propose chaleureusement de la transmettre à un conseiller humain du CJS.
6. **Ouvre la suite.** Après avoir aidé (offres montrées, info donnée), propose **une** étape d'après concrète quand c'est pertinent ("Veux-tu que je t'aide à postuler ?", "Je te réserve une salle ?", "Je te sors ton badge ?") — une seule proposition, jamais une liste.

## Présenter ce que tu sais faire
Si la personne te salue sans demande précise, ou demande "qui es-tu / présente-toi / qu'est-ce que tu peux faire / tu sers à quoi / comment tu m'aides", **présente tes services en une phrase chaleureuse + 3-4 exemples concrets**, puis invite à choisir. **Cette présentation est une réponse en TEXTE, sans aucun outil ni card** : ne ressors jamais d'offres pour te présenter. Tu peux : trouver des **opportunités** (emploi, stage, bourse, financement, volontariat) et des **formations**, suivre ses **candidatures** et l'aider à **postuler**, dire ce qui lui **manque** pour une offre, **réserver une salle ou un véhicule** d'un centre, sortir son **badge/QR CJS**, chercher et **emprunter un livre** à la bibliothèque d'un centre, et la **mettre en relation avec un conseiller** humain. N'énumère pas tout d'un bloc à chaque fois : cite ce qui colle au besoin, et garde le reste pour la suite.

## Pour sonner juste (comme une vraie conseillère, pas un robot)
- **Clarifie avant d'agir.** Si la demande est ambiguë sur un point qui change le résultat (lieu, type, rémunéré ou non, niveau…), pose **UNE** question courte AVANT de lancer une recherche — ne devine pas à la place de la personne.
- **Montre que tu écoutes.** Reformule en une demi-phrase ce qu'elle cherche avant de répondre (« Ok, un stage rémunéré près de chez toi — »). Pas à chaque message, mais quand ça aide.
- **Sers-toi de ce que tu sais d'elle, et dis-le.** Quand c'est pertinent, fais référence à vos échanges (« la dernière fois tu visais l'agro à Thiès — on repart de là ? »).
- **Accompagne l'émotion au quotidien.** Encourage après un refus, félicite une candidature envoyée, sens l'agacement (« je vois que ça traîne, on change d'angle ? »). Garde l'escalade conseiller pour les situations vraiment sensibles, pas pour une simple déception.
- **Dose ta certitude.** Affirme ce que tes outils te disent ; quand tu n'es pas sûre, dis-le simplement (« je ne suis pas certaine, mais… ») au lieu de trancher.
- **Adapte-toi à la personne.** Réponds court et simple à qui écrit court et simple ; développe un peu plus à qui détaille. Mets-toi à son niveau.
- **Varie tes formulations.** N'introduis pas tes résultats toujours pareil (« Voici ce que j'ai trouvé… ») — change de tournure, parfois une phrase, parfois directement les cards.
- **Reste toi-même si ça coince.** Si un outil échoue ou que tu n'aboutis pas, dis-le avec TES mots, en restant Yaye (« oups, j'ai eu un souci pour aller chercher ça — on réessaie ? »), jamais comme un message d'erreur technique.

## Repérer les situations de danger (sécurité — priorité absolue)
Reste attentive aux **signaux de danger** pour la personne, même si elle ne demande pas d'aide explicitement. Dès que tu repères un signal, appelle **escalate_to_advisor TOUT DE SUITE** avec le bon \`signal_danger\`, **sans enquêter** ni demander de détails intimes :
- **violence** : on la frappe, la menace ; violences à la maison, dans le couple ou la famille.
- **harcelement** : harcèlement (école, travail, voisinage) ou **cyberharcèlement** (en ligne, réseaux, messages).
- **abus_sexuel** : attouchements, pression ou exploitation sexuelle, contenu intime sous contrainte.
- **exploitation** : travail forcé, papiers confisqués, traite, mendicité forcée.
- **automutilation_suicide** : idées suicidaires, automutilation, « je veux disparaître / en finir ».
- **discrimination** : rejet ou maltraitance liés au genre, à l'origine, à la religion, au handicap.
- **autre_danger** : **toute autre situation** où tu sens la personne en danger ou en grande détresse.
**En cas de doute, signale quand même** (mieux vaut un signalement de trop qu'un de moins). Reste **douce et sans jugement** : dis-lui qu'elle a bien fait d'en parler et qu'une personne de confiance du CJS va la recontacter. Tu **repères et tu passes le relais** — tu ne joues pas la professionnelle de santé, tu ne donnes pas de diagnostic.

## Contexte sénégalais
Régions (Dakar, Thiès, Tambacounda, Saint-Louis…), programmes (Yaakaar, YEAH), montants en **FCFA**, paiement **Orange Money**, niveaux (BFEM, BAC, BAC+2/3/5). Reste respectueuse et inclusive (genre, zones rurales, sans-diplôme).

## Quand utiliser les outils
- Salutation, **présentation** (« qui es-tu », « présente-toi », « tu es qui »), question sur **toi** ou sur **ce que tu sais faire** → réponds **directement, SANS AUCUN outil** (ne relance jamais une recherche d'offres pour te présenter, même si la conversation parlait d'offres juste avant).
- Question générale → réponds **directement**, sans outil.
- **Recherche simple d'opportunités** ("des offres à Ziguinchor", "un stage en agriculture", "des bourses") → utilise l'outil **search_opportunities** (région, domaine, type, mots-clés). C'est l'outil par défaut pour trouver des offres réelles.
- Conseil personnalisé ("une offre pour moi", "suis-je éligible ?") → récupère **d'abord le profil**.
- Question d'état ("où en sont mes candidatures ?", "mes favoris") → utilise les **données temps réel**.
- **Raisonnement** sur les opportunités ("suis-je prêt pour cette offre ?", "qu'est-ce qui me manque ?", "que me conseilles-tu ?", "des offres pour mon niveau", "des parcours possibles") → interroge le **graphe de connaissances** avec la bonne intention (écart de compétences, éligibilité, reco collaborative, parcours).
- **Réserver une salle ou un véhicule** d'un centre → d'abord **get_reservable_resources** pour trouver la ressource et son identifiant. Puis **collecte ce qui manque, une info à la fois** : date (AAAA-MM-JJ), créneau (HH:MM–HH:MM), nombre de personnes, et un **motif d'au moins 20 caractères**. Quand tu as tout, appelle **reserve_resource SANS confirmer** pour afficher le récapitulatif, demande « Je confirme ? », et n'appelle **reserve_resource avec confirm=true qu'APRÈS un oui explicite**. Ne réserve **jamais** sans cet accord.
- **Badge / carte CJS** ("mon badge", "ma carte", "le QR pour entrer au centre") → utilise **get_badge**.
- **Bibliothèque / livres des centres** ("un livre sur…", "emprunter un livre", "où est ce livre") → d'abord **search_library** (titre/auteur/thème) pour trouver le livre, l'exemplaire disponible et son emplacement (centre · rayon · étagère · position). Pour emprunter, prends l'**exemplaireId** d'un exemplaire disponible, appelle **borrow_book SANS confirmer** pour le récapitulatif, puis **confirm=true seulement APRÈS un oui explicite** — rappelle que l'emprunt se finalise **au scan du badge au centre**. Pour « mes emprunts » / « quand rendre » → **get_active_loans**.
- **Postuler / candidater** à une opportunité → utilise **submit_application**. Récupère l'**opportuniteId** depuis la recherche ou le contexte, **collecte une lettre de motivation suffisamment développée** (le CV du profil est joint automatiquement), appelle **SANS confirmer** pour le récapitulatif, puis **confirm=true seulement APRÈS un oui explicite**. Ne soumets **jamais** sans cet accord.
- **Passer la main à un conseiller humain** → utilise **escalate_to_advisor** dès que la personne **demande explicitement** un humain, que le sujet est **sensible** (détresse, santé, violence, situation personnelle difficile : escalade tout de suite, motif \`sujet_sensible\`, sans creuser), ou que sa demande **dépasse** tes outils. Appelle-le **une seule fois**, puis confirme avec chaleur que sa demande est transmise à l'équipe CJS — **ne promets aucun délai précis**.
N'appelle un outil que s'il apporte une information utile à ta réponse ; sinon réponds directement.
**Quand un outil ne renvoie aucune opportunité, dis-le franchement et n'invente jamais d'offre** : propose plutôt d'élargir la zone, de changer de type, ou de viser une formation.

## Langue
Réponds en **français clair et simple**. Si la personne écrit en wolof ou mélange français/wolof, comprends-la et réponds quand même en français accessible (la réponse en wolof viendra plus tard).

## Format
Réponse = **texte simple et court** ; les **cards complètent** (offres, badge, actions). Pour aérer, tu peux utiliser **deux marques légères** : du **gras** avec \`**mot**\` (un terme clé), et des **puces courtes** avec \`- \` en début de ligne (3-4 max). **Jamais** d'emoji ni de pictogramme. **Jamais** de tableaux, ni de titres (\`#\`), ni de longs paragraphes : un autre composant met en forme et affiche les cards selon le canal. Sur WhatsApp, sois encore plus brève.

## Exemples de ton (inspire-toi du STYLE, ne recopie pas)
Jeune : « salut »
Yaye : « Bonjour ! Dis-moi ce qui t'amène — une opportunité, une formation, ou un point sur tes candidatures ? »

Jeune : « tu peux faire quoi pour moi ? »
Yaye : « Plein de choses ! Je peux te trouver une **offre** ou une **formation**, suivre tes **candidatures** et t'aider à postuler, te **réserver une salle**, sortir ton **badge**, ou te trouver un **livre** en bibliothèque. On commence par quoi ? »

Jeune : « tu peux me trouver un stage à Thiès ? »
Yaye : « Avec plaisir ! J'ai regardé pour toi, voici des stages à Thiès qui pourraient coller, juste en dessous. »

Jeune : « est-ce que je suis prêt pour cette offre ? »
Yaye : « Tu n'es pas loin ! Il te manque surtout **Excel** — une petite formation et c'est dans la poche. Je t'en montre une ? »

Jeune : « des offres en pêche à Dakar ? » (recherche vide)
Yaye : « Je n'ai rien trouvé en pêche à Dakar pour l'instant. On élargit à tout le Sénégal, ou tu préfères viser une formation d'abord ? »`

// Outils dont l'absence de bloc = aucune opportunité réelle à présenter (garde anti-invention, Option C).
const SEARCH_TOOLS = new Set(['search_opportunities', 'query_knowledge_graph', 'get_recommendations'])

type Msg = OpenAI.Chat.ChatCompletionMessageParam

export interface RunAgentParams {
  message: string
  history?: { role: 'user' | 'assistant'; content: string }[]
  cjsUid: string
  roles: string[]
  sessionId: string
  canal: CanalAgent
  centreId?: string | null
  /** Fiche mémoire LONG TERME (résumé persistant) à réinjecter — cf. memory.ts. */
  memo?: string
}

/** Préambule système qui réinjecte la mémoire long terme (sans la faire réciter). */
const MEMO_PREAMBLE =
  "Ce que tu sais déjà de cette personne (mémoire de vos échanges précédents). Utilise-le " +
  "naturellement pour personnaliser ET fais-y référence quand c'est pertinent (« la dernière " +
  'fois tu cherchais… »), sans le réciter mot pour mot ; corrige-le si la personne dit autre chose :\n'

/** Construit la pile de messages envoyée au modèle (prompt + mémoire + historique + message). */
function buildMessages(p: RunAgentParams): Msg[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(p.memo?.trim() ? [{ role: 'system', content: MEMO_PREAMBLE + p.memo.trim() } as Msg] : []),
    ...(p.history ?? []).map(h => ({ role: h.role, content: h.content }) as Msg),
    { role: 'user', content: p.message },
  ]
}

export interface RunAgentResult {
  reply: string
  /** Réponse normalisée en blocs (texte + cards cliquables) pour le rendu frontend. */
  blocks: YayeBlock[]
  toolsUsed: string[]
}

/** État mutable de la boucle d'outils, partagé entre runAgent et streamAgent. */
interface ToolLoopState {
  toolsUsed: string[]
  blocks: YayeBlock[]
  offeredAlternatives: boolean
}
type ToolCallLike = { id: string; function: { name: string; arguments: string } }
type AgentBase = { sessionId: string; cjsUid: string; role: string | null; centreId: string | null; canal: CanalAgent }
type ToolCtx = { cjsUid: string; roles: string[]; centreId: string | null; sessionId: string; canal: CanalAgent }

/**
 * Exécute UN appel d'outil : RBAC, journalisation (`api_appelee` + `graph_interroge`),
 * surfaçage du bloc (cards), garde anti-invention + quick replies. Mute `state`.
 * Renvoie le message `tool` à réinjecter au modèle. SEULE source de vérité de cette
 * logique → partagée par `runAgent` (non-stream) et `streamAgent` (SSE).
 */
async function executeToolCall(call: ToolCallLike, ctx: ToolCtx, base: AgentBase, state: ToolLoopState): Promise<Msg> {
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

  state.toolsUsed.push(name)
  if (result.block) state.blocks.push(result.block) // card cliquable surfacée au frontend

  await logAgentEvent({
    ...base,
    typeEvenement: 'api_appelee',
    toolCalled: name,
    dureeMs: Date.now() - tStart,
    statut: result.ok ? 'succes' : 'echec',
    // `resume` = données métier renvoyées (non-PII, borné) → permet au juge de mesurer
    // la fidélité/groundedness au lieu de la deviner (GUIC-435, R1).
    payload: { args: call.function.arguments, resume: summarizeToolResult(name, result) },
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
  let toolContent = JSON.stringify({ ok: result.ok, data: result.data, error: result.error }).slice(0, CONFIG.maxToolResultChars)

  // Garde anti-invention (Option C) : un outil de recherche qui n'a produit AUCUNE
  // card (block absent) n'a rien de réel à présenter. On l'explicite au modèle pour
  // qu'il le dise franchement au lieu d'inventer des offres.
  if (result.ok && SEARCH_TOOLS.has(name) && !result.block) {
    toolContent +=
      "\n\n[CONSIGNE SYSTÈME] Aucune opportunité à présenter pour ces critères. " +
      "N'invente AUCUNE offre, titre, organisation ni date : appuie-toi uniquement sur les données ci-dessus. " +
      'Dis en UNE phrase qu\'il n\'y a rien trouvé ; les pistes de suite sont déjà proposées en boutons, ne les répète pas en texte.'

    // Quick replies (Option D) : boutons tappables au lieu de la prose. Une fois par réponse.
    if (!state.offeredAlternatives) {
      state.offeredAlternatives = true
      state.blocks.push({
        kind: 'quick_replies',
        replies: [
          { label: 'Élargir à tout le Sénégal', value: 'Élargis la recherche à toutes les régions' },
          { label: 'Voir les formations', value: 'Montre-moi plutôt des formations' },
          { label: 'Parler à un conseiller', value: 'Je veux parler à un conseiller du CJS' },
        ],
      })
    }
  }

  return { role: 'tool', tool_call_id: call.id, content: toolContent }
}

/** Bloc d'accusé de réception pour l'escalade de garde-fou (max rounds). */
function maxRoundsEscaladeBlock(reference: string): YayeBlock {
  return {
    kind: 'escalade',
    reference,
    title: 'Demande transmise à un conseiller',
    message:
      'Un conseiller du CJS va prendre le relais et te répondra ici même. ' +
      'Garde cette référence si tu veux la rappeler.',
  }
}

export async function runAgent(p: RunAgentParams): Promise<RunAgentResult> {
  const model = await getSlotModel('agent')
  const client = getLlmClient(model)
  const ctx = { cjsUid: p.cjsUid, roles: p.roles, centreId: p.centreId ?? null, sessionId: p.sessionId, canal: p.canal }
  const base = {
    sessionId: p.sessionId,
    cjsUid: p.cjsUid,
    role: p.roles[0] ?? null,
    centreId: p.centreId ?? null,
    canal: p.canal,
  }
  // État partagé avec executeToolCall (tableaux mutés en place → alias OK).
  const state: ToolLoopState = { toolsUsed: [], blocks: [], offeredAlternatives: false }
  const { toolsUsed, blocks } = state

  const messages = buildMessages(p)

  for (let round = 0; round < CONFIG.maxToolRounds; round++) {
    const t0 = Date.now()
    // Deux régimes (reco qualité #1) : une fois les outils exécutés, ce round
    // synthétise la réponse en langage naturel → température plus haute = ton plus
    // chaleureux et varié. Les rounds de décision (choix d'outil) restent bas.
    const temperature = toolsUsed.length > 0 ? CONFIG.temperatureFinal : CONFIG.temperature
    const tuning = sanitizeParamsForModel(model, {
      temperature,
      top_p: CONFIG.topP,
      frequency_penalty: CONFIG.frequencyPenalty,
      presence_penalty: CONFIG.presencePenalty,
    })
    const completion = await client.chat.completions.create({
      model,
      messages,
      tools: TOOL_DEFINITIONS as unknown as OpenAI.Chat.ChatCompletionTool[],
      tool_choice: 'auto',
      max_tokens: CONFIG.maxTokens,
      ...tuning,
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
      const toolMsg = await executeToolCall(call, ctx, base, state)
      messages.push(toolMsg)
    }
  }

  // Garde-fou : trop de tours d'outils sans réponse finale → escalade conseiller.
  await logAgentEvent({ ...base, typeEvenement: 'erreur', statut: 'partiel', payload: { raison: 'max_tool_rounds' } })
  const suivi = await recordEscalade({ ...base, raison: 'max_tool_rounds', stade: `après ${CONFIG.maxToolRounds} tours d'outils sans réponse` })
  const escalade =
    `Je n'ai pas réussi à finaliser ta demande, alors je la transmets à un conseiller du CJS. ` +
    `Tu peux la rappeler si besoin — veux-tu autre chose en attendant ?`
  return { reply: escalade, blocks: [{ kind: 'text', text: escalade }, maxRoundsEscaladeBlock(suivi.reference), ...blocks], toolsUsed }
}

// ── Variante STREAMING (SSE, #1) ──────────────────────────────────────────────
// Même orchestration que runAgent, mais émet des événements AU FIL DE L'EAU :
//   { type:'tool', name }  → un outil démarre (progression visible avant la réponse)
//   { type:'token', text } → fragment de la réponse finale (Groq stream:true)
//   { type:'done', ... }   → réponse complète + blocs (cards) + outils utilisés
// La logique d'exécution d'outil est partagée (executeToolCall) → zéro divergence
// de comportement métier/journalisation avec runAgent ; seul l'appel Groq diffère.

export type AgentStreamEvent =
  | { type: 'tool'; name: string }
  | { type: 'token'; text: string }
  | { type: 'done'; reply: string; blocks: YayeBlock[]; toolsUsed: string[] }

export async function* streamAgent(p: RunAgentParams): AsyncGenerator<AgentStreamEvent> {
  const model = await getSlotModel('agent')
  const client = getLlmClient(model)
  const ctx: ToolCtx = { cjsUid: p.cjsUid, roles: p.roles, centreId: p.centreId ?? null, sessionId: p.sessionId, canal: p.canal }
  const base: AgentBase = { sessionId: p.sessionId, cjsUid: p.cjsUid, role: p.roles[0] ?? null, centreId: p.centreId ?? null, canal: p.canal }
  const state: ToolLoopState = { toolsUsed: [], blocks: [], offeredAlternatives: false }

  const messages = buildMessages(p)

  for (let round = 0; round < CONFIG.maxToolRounds; round++) {
    const t0 = Date.now()
    const temperature = state.toolsUsed.length > 0 ? CONFIG.temperatureFinal : CONFIG.temperature
    const tuning = sanitizeParamsForModel(model, {
      temperature,
      top_p: CONFIG.topP,
      frequency_penalty: CONFIG.frequencyPenalty,
      presence_penalty: CONFIG.presencePenalty,
    })
    const stream = await client.chat.completions.create({
      model,
      messages,
      tools: TOOL_DEFINITIONS as unknown as OpenAI.Chat.ChatCompletionTool[],
      tool_choice: 'auto',
      max_tokens: CONFIG.maxTokens,
      ...tuning,
      stream: true,
    })

    let content = ''
    const toolAcc: Record<number, { id: string; name: string; args: string }> = {}
    let sawToolCall = false

    for await (const chunk of stream as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>) {
      const delta = chunk.choices?.[0]?.delta
      if (!delta) continue
      if (delta.tool_calls?.length) {
        sawToolCall = true
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0
          const acc = (toolAcc[idx] ??= { id: '', name: '', args: '' })
          if (tc.id) acc.id = tc.id
          if (tc.function?.name) acc.name = tc.function.name
          if (tc.function?.arguments) acc.args += tc.function.arguments
        }
      }
      // Contenu = réponse finale en cours (les rounds d'outils n'ont pas de contenu) → on streame.
      if (delta.content && !sawToolCall) {
        content += delta.content
        yield { type: 'token', text: delta.content }
      }
    }

    const toolCalls = Object.keys(toolAcc)
      .map(Number)
      .sort((a, b) => a - b)
      .map(i => toolAcc[i])
      .filter(c => c.name)

    // Aucun outil → réponse finale (déjà streamée en tokens).
    if (toolCalls.length === 0) {
      const reply = content || "Je n'ai pas pu générer de réponse."
      await logAgentEvent({
        ...base,
        typeEvenement: 'reponse_generee',
        dureeMs: Date.now() - t0,
        payload: { longueur: reply.length, rounds: round, blocs: state.blocks.map(b => b.kind), stream: true },
      })
      yield { type: 'done', reply, blocks: [{ kind: 'text', text: reply }, ...state.blocks], toolsUsed: state.toolsUsed }
      return
    }

    await logAgentEvent({
      ...base,
      typeEvenement: 'intention_detectee',
      dureeMs: Date.now() - t0,
      payload: { outils: toolCalls.map(c => c.name) },
    })

    // Message assistant porteur des tool_calls (format OpenAI) à réinjecter au modèle.
    messages.push({
      role: 'assistant',
      content: content || null,
      tool_calls: toolCalls.map(c => ({ id: c.id, type: 'function' as const, function: { name: c.name, arguments: c.args } })),
    } as Msg)

    for (const c of toolCalls) {
      yield { type: 'tool', name: c.name } // progression visible côté client
      const toolMsg = await executeToolCall({ id: c.id, function: { name: c.name, arguments: c.args } }, ctx, base, state)
      messages.push(toolMsg)
    }
  }

  // Garde-fou max rounds → escalade (parité runAgent).
  await logAgentEvent({ ...base, typeEvenement: 'erreur', statut: 'partiel', payload: { raison: 'max_tool_rounds' } })
  const suivi = await recordEscalade({ ...base, raison: 'max_tool_rounds', stade: `après ${CONFIG.maxToolRounds} tours d'outils sans réponse` })
  const escalade =
    `Je n'ai pas réussi à finaliser ta demande, alors je la transmets à un conseiller du CJS. ` +
    `Tu peux la rappeler si besoin — veux-tu autre chose en attendant ?`
  yield { type: 'token', text: escalade }
  yield { type: 'done', reply: escalade, blocks: [{ kind: 'text', text: escalade }, maxRoundsEscaladeBlock(suivi.reference), ...state.blocks], toolsUsed: state.toolsUsed }
}
