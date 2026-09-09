// Outils de l'agent Yaye (function calling Groq) — Lot 0.
// Spec : .agent_context/specs/yaye/03-outils-function-calling.md
//
// Chaque outil = définition (schéma exposé à Groq) + exécuteur (accès données,
// portée RBAC par cjsUid). Lot 0 expose les 2 outils sans dépendance Neo4j ;
// les 9 autres (query_knowledge_graph, reserve_resource…) viendront aux lots suivants.

import { prisma } from '@/lib/prisma'
import { Domaine, Region, TypeOpportunite, TypeEvenement, TypeRessource, TypeRessourceCentre } from '@prisma/client'
import type { CanalAgent, Prisma } from '@prisma/client'
import { loadProfilComplet } from '@/lib/profil-loader'
import { appUrl } from '@/lib/app-url'
import { LETTRE_MIN_CHARS } from '@/lib/constants/candidature'
import { GET as cjsCardQrTokenGET } from '@/app/api/cjs-card/qr-token/route'
import { POST as candidaturesPOST } from '@/app/api/candidatures/route'
import { GET as biblioLivresGET } from '@/app/api/bibliotheque/livres/route'
import { GET as biblioEmpruntsGET, POST as biblioEmpruntsPOST } from '@/app/api/bibliotheque/emprunts/route'
import type { EmpruntVue, SearchLivresResult } from '@/lib/bibliotheque/service'
import { getRecommandations } from './recommandation'
import { getGraphPort } from './graph'
import { rankByRelevance } from './semantic-rank'
import { texteOpportunite } from './search-warmup'
import { loadOrBuildApercuMarche } from './graph/market-overview'
import { submitReservationViaApi } from './reservations-gateway'
import { callInternalRoute } from './internal-api'
import { recordEscalade, escaladeReference } from './escalade'
import { escaladeMessage, escaladeTitre } from './escalade-message'
import { MAX_OPP_ITEMS, type YayeBlock, type YayeOppItem, type YayeEvenementItem, type YayeRessourceItem, type YayeCentreItem, type YayeNotificationItem } from './blocks'
import { buildCjsCardUser } from '@/lib/cjs-card-user'

/** Charge les cards opportunités (ordre des `ids` préservé) — mutualisé entre outils. */
async function loadOppItems(ids: string[]): Promise<YayeOppItem[]> {
  if (ids.length === 0) return []
  const rows = await prisma.opportunite.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: {
      id: true, slug: true, titre: true, type: true, region: true,
      organisation: true, organisationLibelle: true, deadline: true,
      typeRef: { select: { slug: true, libelle: true, actionLabel: true } },
    },
  })
  const byId = new Map(rows.map(r => [r.id, r]))
  return ids.flatMap(id => {
    const r = byId.get(id)
    return r
      ? [{
          id: r.id, slug: r.slug, titre: r.titre, type: String(r.type),
          typeSlug: r.typeRef?.slug ?? null,
          typeLabel: r.typeRef?.libelle ?? null,
          actionLabel: r.typeRef?.actionLabel ?? null,
          organisation: r.organisationLibelle ?? r.organisation ?? null,
          region: r.region ? String(r.region) : null,
          deadline: r.deadline ? r.deadline.toISOString() : null,
        }]
      : []
  })
}

/**
 * Entrelace des lignes par `type` (round-robin) pour un mix de sous-catégories, en préservant
 * l'ordre interne (échéance) de chaque type. Évite qu'une recherche sans type précis ne renvoie
 * que des emplois (type majoritaire du dataset). No-op si un seul type présent.
 */
export function diversifyByType<T extends { type: unknown }>(rows: T[], limit: number): T[] {
  const queues = new Map<string, T[]>()
  for (const r of rows) {
    const k = String(r.type)
    const q = queues.get(k) ?? []
    q.push(r)
    queues.set(k, q)
  }
  const lists = [...queues.values()]
  if (lists.length <= 1) return rows.slice(0, limit)
  const out: T[] = []
  for (let i = 0; out.length < limit && lists.some(q => q.length); i++) {
    const q = lists[i % lists.length]
    const item = q.shift()
    if (item) out.push(item)
  }
  return out
}

/** Champs nécessaires à l'affichage d'une card d'opportunité. */
const OPP_CARD_SELECT = {
  id: true, slug: true, titre: true, type: true, region: true, domaine: true,
  organisation: true, organisationLibelle: true, deadline: true,
  typeRef: { select: { slug: true, libelle: true, actionLabel: true } },
} as const

type OppRow = {
  id: string; slug: string; titre: string; type: unknown; region: unknown; domaine: unknown
  organisation: string | null; organisationLibelle: string | null; deadline: Date | null
  typeRef: { slug: string; libelle: string; actionLabel: string | null } | null
}

/** Schéma d'un outil au format function-calling (compatible Groq/OpenAI). */
export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

/** Contexte d'exécution — portée RBAC : un outil n'accède qu'aux données du `cjsUid`. */
export interface ToolContext {
  cjsUid: string
  roles: string[]
  /** Centre de rattachement de l'appelant (staff/gestionnaire) — borne les traversées centre. */
  centreId?: string | null
  /** Session conversationnelle courante — requis par les outils qui journalisent (escalade). */
  sessionId?: string
  /** Canal d'échange (web/whatsapp) — pour la traçabilité d'escalade. */
  canal?: CanalAgent
}

export interface ToolResult {
  ok: boolean
  data?: unknown
  error?: string
  /** Bloc de rendu normalisé (cards cliquables…) surfacé par l'agent au frontend. */
  block?: YayeBlock
  /** Méta d'interrogation du graphe → journalisée en `graph_interroge` (GUIC-433). */
  graph?: { template: string; nodesReturned: number }
}

export interface AgentTool {
  definition: ToolDefinition
  execute(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>
}

// ── get_user_profile ────────────────────────────────────────────────────────
const getUserProfile: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_user_profile',
      description:
        "Récupère le profil complet du bénéficiaire connecté (région, niveau d'étude, " +
        'compétences, situation, complétude). À appeler avant de conseiller pour personnaliser.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  async execute(_args, ctx) {
    const profil = await loadProfilComplet(ctx.cjsUid)
    if (!profil) return { ok: false, error: 'Profil introuvable' }
    return { ok: true, data: profil }
  },
}

// ── get_realtime_data ───────────────────────────────────────────────────────
const getRealtimeData: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_realtime_data',
      description:
        'Données temps réel de l\'utilisateur : ses candidatures et son nombre de favoris. ' +
        'Renvoie les candidatures en CARDS cliquables (le statut est porté par la card) — ' +
        'présente-les en UNE phrase, ne les énumère jamais en prose. Utile pour « où en sont mes candidatures ? ».',
      parameters: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            enum: ['candidatures', 'favoris', 'tout'],
            description: 'Périmètre des données à remonter (défaut: tout).',
          },
        },
        required: [],
      },
    },
  },
  async execute(args, ctx) {
    const scope = (args.scope as string) ?? 'tout'
    const out: Record<string, unknown> = {}
    // Statut lisible affiché SUR la card (jamais d'emoji, cf. règles UI).
    const STATUT_LABEL: Record<string, string> = {
      En_attente: 'Candidature envoyée',
      Vue: 'Vue par le recruteur',
      Retenue: 'Retenue',
      Refusee: 'Non retenue',
    }
    let block: YayeBlock | undefined

    if (scope === 'candidatures' || scope === 'tout') {
      // Total réel + 5 dernières candidatures affichées en CARDS cliquables (statut en note),
      // au lieu d'une énumération en prose. On ne renvoie au LLM que le décompte (anti-redondance).
      const [total, cands] = await Promise.all([
        prisma.candidature.count({ where: { cjsUid: ctx.cjsUid } }),
        prisma.candidature.findMany({
          where: { cjsUid: ctx.cjsUid },
          orderBy: { soumiseA: 'desc' },
          take: 5,
          select: {
            statut: true,
            opportunite: {
              select: { id: true, slug: true, titre: true, type: true, region: true, organisation: true, organisationLibelle: true, deadline: true, typeRef: { select: { slug: true, libelle: true, actionLabel: true } } },
            },
          },
        }),
      ])
      out.candidatures = { total }
      const items: YayeOppItem[] = cands
        .filter(c => c.opportunite)
        .map(c => ({
          id: c.opportunite!.id,
          slug: c.opportunite!.slug,
          titre: c.opportunite!.titre,
          type: String(c.opportunite!.type),
          typeSlug: c.opportunite!.typeRef?.slug ?? null,
          typeLabel: c.opportunite!.typeRef?.libelle ?? null,
          actionLabel: c.opportunite!.typeRef?.actionLabel ?? null,
          organisation: c.opportunite!.organisationLibelle ?? c.opportunite!.organisation ?? null,
          region: c.opportunite!.region ? String(c.opportunite!.region) : null,
          deadline: c.opportunite!.deadline ? c.opportunite!.deadline.toISOString() : null,
          note: STATUT_LABEL[c.statut] ?? String(c.statut),
        }))
      if (items.length > 0) block = { kind: 'opportunites', items }
    }
    if (scope === 'favoris' || scope === 'tout') {
      out.favoris = await prisma.opportuniteFavorite.count({ where: { cjsUid: ctx.cjsUid } })
    }
    return { ok: true, data: out, block }
  },
}

// ── search_opportunities ────────────────────────────────────────────────────
// Renvoie des opportunités prêtes à afficher en CARDS CLIQUABLES (→ /opportunites/[slug]).
const inEnum = <T extends Record<string, string>>(e: T, v: unknown): v is T[keyof T] =>
  typeof v === 'string' && Object.values(e).includes(v)

const searchOpportunities: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'search_opportunities',
      description:
        "Recherche des opportunités publiées (emploi, stage, bourse, formation, volontariat…) " +
        'selon le domaine, la région, le type et/ou des mots-clés. Renvoie des offres cliquables. ' +
        "À utiliser dès que l'utilisateur cherche une opportunité ; croise avec son profil si pertinent.\n" +
        "IMPORTANT pour `q` : passe la formulation de la personne TELLE QU'ELLE, en langage naturel " +
        "(« élever des poulets », « je fabrique des sites internet »). La recherche comprend le SENS : " +
        "elle retrouve « Technicien en aviculture » à partir de « élever des poulets ». Ne réduis " +
        "donc PAS la demande à un mot-clé isolé — un mot seul porte moins de sens qu'une phrase et " +
        "dégrade les résultats.",
      parameters: {
        type: 'object',
        properties: {
          domaine: { type: 'string', enum: Object.values(Domaine), description: "Secteur de l'opportunité" },
          region: { type: 'string', enum: Object.values(Region), description: 'Région ciblée' },
          type: { type: 'string', enum: Object.values(TypeOpportunite), description: "Type d'opportunité" },
          q: { type: 'string', description: "Ce que cherche la personne, dans SES mots (phrase naturelle, pas un mot-clé isolé)" },
        },
        required: [],
      },
    },
  },
  async execute(args) {
    const where: Prisma.OpportuniteWhereInput = {
      statut: 'publiee',
      deletedAt: null,
      NOT: { org: { statut: 'suspendue' } }, // GUIC-705 — Yaye ne recommande pas les offres d'un partenaire suspendu
      OR: [{ deadline: null }, { deadline: { gte: new Date() } }],
    }
    if (inEnum(Domaine, args.domaine)) where.domaine = args.domaine
    if (inEnum(Region, args.region)) where.region = args.region
    const typeSpecified = inEnum(TypeOpportunite, args.type)
    if (typeSpecified) where.type = args.type as TypeOpportunite

    // Mots-clés : on NE filtre PLUS en SQL sur le titre (GUIC-683). Un `LIKE '%poisson%'`
    // rend ZÉRO résultat quand le catalogue dit « aquaculture ». On élargit donc le vivier
    // (filtres structurés seulement) et on le CLASSE par pertinence — lexical d'abord,
    // sémantique en rattrapage.
    const q = typeof args.q === 'string' ? args.q.trim() : ''

    // ── Recherche par mots-clés : DEUX ÉTAGES (GUIC-683, correctif du 27/07) ──
    // Le classement portait sur un vivier de 200 offres tirées par échéance — 5 % du
    // catalogue, choisi par un critère sans rapport avec la pertinence. Aucune des sept
    // offres d'aviculture actives n'y entrait : « élever des poulets » ne pouvait aboutir
    // que si le modèle ajoutait un filtre de domaine. Ça marchait quand on n'en avait pas
    // besoin. Le 1er étage couvre donc TOUT le catalogue actif, en ne chargeant que
    // l'identifiant et le texte ; seules les retenues sont ensuite hydratées.
    let candidats: OppRow[]
    if (q) {
      const legeres = await prisma.opportunite.findMany({
        where,
        select: { id: true, titre: true, organisation: true, organisationLibelle: true, domaine: true, type: true },
      })
      const classes = await rankByRelevance(
        q,
        // `texteOpportunite` est PARTAGÉ avec le préchauffage : deux formulations
        // différentes donneraient deux clés de cache, et le préchauffage ne servirait à rien.
        legeres.map(r => ({ id: r.id, text: texteOpportunite(r) })),
        { max: MAX_OPP_ITEMS },
      )
      if (classes.length === 0) {
        candidats = []
      } else {
        const retenues = await prisma.opportunite.findMany({
          where: { id: { in: classes.map(c => c.id) } },
          select: OPP_CARD_SELECT,
        })
        // L'ordre du CLASSEMENT prime sur celui de la base.
        const parId = new Map(retenues.map(r => [r.id, r]))
        candidats = classes.flatMap(c => {
          const row = parId.get(c.id)
          return row ? [row] : []
        })
      }
    } else {
      candidats = await prisma.opportunite.findMany({
        where,
        select: OPP_CARD_SELECT,
        orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
        // Type PRÉCISÉ → top-N direct. Type NON précisé → on élargit le vivier puis on
        // ENTRELACE les types (round-robin) pour un mix (anti « tout emploi », dataset ~38%).
        take: typeSpecified ? MAX_OPP_ITEMS : 60,
      })
    }

    const selected = typeSpecified ? candidats.slice(0, MAX_OPP_ITEMS) : diversifyByType(candidats, MAX_OPP_ITEMS)

    const items: YayeOppItem[] = selected.map(r => ({
      id: r.id,
      slug: r.slug,
      titre: r.titre,
      type: String(r.type),
      typeSlug: r.typeRef?.slug ?? null,
      typeLabel: r.typeRef?.libelle ?? null,
      actionLabel: r.typeRef?.actionLabel ?? null,
      organisation: r.organisationLibelle ?? r.organisation ?? null,
      region: r.region ? String(r.region) : null,
      deadline: r.deadline ? r.deadline.toISOString() : null,
    }))

    return {
      ok: true,
      // Pas de titres ici : les offres sont déjà sur les cards (block). On ne renvoie
      // au LLM que le décompte pour éviter qu'il ré-énumère en prose (anti-redondance).
      // Fix 4 — signal de succès LISIBLE pour le modèle (sans titres) : les résultats sont
      // DÉJÀ affichés en cards à l'écran → le modèle les introduit en une phrase, il n'a pas
      // à les réciter ni à en inventer. Contre-mesure au « je regarde ça ! » halluciné.
      // `refs` (id + titre) exposé au modèle POUR remplir les arguments d'action (« postule à la
      // première » → opportuniteId). Les titres restent portés par les cards ; la règle 3 du prompt
      // interdit de les réciter en prose. Sans ça, aucune candidature multi-tour n'est possible.
      data: { count: items.length, resultsShownAsCards: items.length > 0, refs: items.map(i => ({ id: i.id, titre: i.titre })) },
      block: items.length > 0 ? { kind: 'opportunites', items } : undefined,
    }
  },
}

// ── get_recommendations ──────────────────────────────────────────────────────
// Reco proactive issue du GRAPHE (profils similaires + éligibilité), lecture seule.
// Lit le cache `RecommandationIA` (cf. recommandation.ts) — aucun appel LLM ici.
const getRecommendations: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_recommendations',
      description:
        'Recommandations personnalisées d\'opportunités pour le bénéficiaire connecté, ' +
        'adaptées à son parcours et à son niveau d\'étude. Renvoie des offres cliquables (la ' +
        'raison est portée par la card). À utiliser pour « que me conseilles-tu ? » ou une ' +
        'suggestion proactive. Présente-les comme adaptées à SON profil — ne mentionne jamais ' +
        'd\'autres usagers ni de nombre.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  async execute(_args, ctx) {
    const recos = await getRecommandations(ctx.cjsUid)
    if (recos.length === 0) return { ok: true, data: { count: 0 } }

    // La raison (réelle, issue du graphe) est portée PAR la card (note), pas renvoyée
    // au LLM : sinon il l'énumère en prose sans connaître les titres → « Opportunité 1, 2… ».
    const noteById = new Map(recos.map(r => [r.opportuniteId, r.raison || null]))
    // `origine: 'reco'` (GUIC-688) : le lien de la card portera `from=reco`, sinon
    // le clic issu d'une recommandation serait compté comme une visite directe.
    const items = (await loadOppItems(recos.map(r => r.opportuniteId)))
      .map(it => ({ ...it, note: noteById.get(it.id) ?? null, origine: 'reco' as const }))
    return {
      ok: true,
      // Fix 4 — signal de succès LISIBLE pour le modèle (sans titres) : les résultats sont
      // DÉJÀ affichés en cards à l'écran → le modèle les introduit en une phrase, il n'a pas
      // à les réciter ni à en inventer. Contre-mesure au « je regarde ça ! » halluciné.
      // `refs` (id + titre) exposé au modèle POUR remplir les arguments d'action (« postule à la
      // première » → opportuniteId). Les titres restent portés par les cards ; la règle 3 du prompt
      // interdit de les réciter en prose. Sans ça, aucune candidature multi-tour n'est possible.
      data: { count: items.length, resultsShownAsCards: items.length > 0, refs: items.map(i => ({ id: i.id, titre: i.titre })) },
      block: items.length > 0 ? { kind: 'opportunites', items } : undefined,
    }
  },
}

// ── query_knowledge_graph ────────────────────────────────────────────────────
// Outil RÉACTIF du Knowledge Graph (GUIC-433). Groq choisit l'INTENTION et remplit
// les paramètres ; on route vers le template de traversée correspondant via le
// GraphPort (Neo4j ou fallback Prisma). Portée RBAC : bornée au cjsUid connecté.
const GRAPH_INTENTS = [
  'recherche', 'ecart_competences', 'eligibilite', 'reco_collaborative', 'parcours',
  'livre_disponible', 'ressources_competences', 'apercu_marche', 'acteurs_programme',
] as const
type GraphIntent = (typeof GRAPH_INTENTS)[number]

const queryKnowledgeGraph: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'query_knowledge_graph',
      description:
        "Interroge le graphe de connaissances pour un raisonnement riche sur les opportunités " +
        "et le parcours du bénéficiaire. Choisis l'intention :\n" +
        "- `recherche` : opportunités par domaine/région/type/mots-clés.\n" +
        "- `ecart_competences` : pour une offre donnée (opportuniteId), les compétences qui manquent " +
        "au jeune + les formations qui les développent (« suis-je prêt ? »).\n" +
        "- `eligibilite` : offres adaptées à son niveau d'étude et son expérience.\n" +
        "- `reco_collaborative` : offres pertinentes au vu de son parcours (présente-les comme adaptées à SON profil, jamais via d'autres usagers ni un nombre).\n" +
        "- `parcours` : chaîne opportunité → compétence → formation → programme (découverte).\n" +
        "- `livre_disponible` : livres RÉELLEMENT disponibles près de chez lui (mots-clés/thème + région), " +
        "avec le centre et l'emplacement précis (rayon · étagère · position).\n" +
        "- `ressources_competences` : guides, vidéos et fiches qui préparent les compétences qui lui " +
        "MANQUENT pour une offre donnée (opportuniteId) — « avec quoi je me prépare ? ».\n" +
        "- `apercu_marche` : question GÉNÉRALE sur le marché — « quels secteurs recrutent à Thiès ? », " +
        "« qu'est-ce qui embauche en ce moment ? », « quelles compétences sont demandées en agro ? ». " +
        "Renvoie des VOLUMES d'offres (jamais de chiffres sur les usagers).\n" +
        "- `acteurs_programme` : qui porte un programme CJS sur le terrain — « quels centres " +
        "déploient YEAH ? », « qui sont les partenaires de Yaakaar ? ». Requiert `programme` " +
        "(slug : yaakaar, yeah, yjc, edupop).",
      parameters: {
        type: 'object',
        properties: {
          intent: { type: 'string', enum: [...GRAPH_INTENTS], description: 'Type de raisonnement attendu' },
          opportuniteId: { type: 'string', description: "Requis pour `ecart_competences` : l'offre visée" },
          domaine: { type: 'string', enum: Object.values(Domaine), description: 'Filtre secteur (recherche/parcours)' },
          region: { type: 'string', enum: Object.values(Region), description: 'Filtre région (recherche/parcours)' },
          type: { type: 'string', enum: Object.values(TypeOpportunite), description: "Filtre type (recherche)" },
          q: { type: 'string', description: 'Mots-clés : titre (recherche) ou titre/auteur (livre_disponible)' },
          theme: { type: 'string', description: 'Thème du livre (livre_disponible)' },
          programme: { type: 'string', description: "Slug du programme (acteurs_programme) : yaakaar, yeah, yjc, edupop" },
        },
        required: ['intent'],
      },
    },
  },
  async execute(args, ctx) {
    const intent = args.intent as GraphIntent
    if (!GRAPH_INTENTS.includes(intent)) {
      return { ok: false, error: `Intention inconnue: ${String(args.intent)}` }
    }
    const graph = getGraphPort()
    const scope = { cjsUid: ctx.cjsUid, roles: ctx.roles, centreId: ctx.centreId ?? null }
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

    switch (intent) {
      case 'recherche': {
        const opps = await graph.searchOpportunites({ domaine: str(args.domaine), region: str(args.region), type: str(args.type), q: str(args.q) })
        return {
          ok: true,
          data: { intent, count: opps.length },
          block: opps.length ? { kind: 'opportunites', items: opps } : undefined,
          graph: { template: 'search', nodesReturned: opps.length },
        }
      }
      case 'ecart_competences': {
        const oppId = str(args.opportuniteId)
        if (!oppId) return { ok: false, error: 'opportuniteId requis pour ecart_competences' }
        const gap = await graph.skillGap(scope, oppId)
        return {
          ok: true,
          data: {
            intent,
            // Les compétences manquantes ne sont pas des cards → utiles au LLM. Les
            // formations, elles, sont affichées en cards : on ne renvoie que leur nombre.
            manquantes: gap.manquantes.map(c => c.libelle),
            count_manquantes: gap.manquantes.length,
            count_formations: gap.formations.length,
          },
          block: gap.formations.length ? { kind: 'opportunites', items: gap.formations } : undefined,
          graph: { template: 'skill_gap', nodesReturned: gap.manquantes.length + gap.formations.length },
        }
      }
      case 'eligibilite': {
        const opps = await graph.eligibleOpportunites(scope)
        return {
          ok: true,
          data: { intent, count: opps.length },
          block: opps.length ? { kind: 'opportunites', items: opps } : undefined,
          graph: { template: 'eligible', nodesReturned: opps.length },
        }
      }
      case 'reco_collaborative': {
        const recos = await graph.collaborativeReco(scope)
        const items = await loadOppItems(recos.map(r => r.id))
        return {
          ok: true,
          data: { intent, count: recos.length },
          block: items.length ? { kind: 'opportunites', items } : undefined,
          graph: { template: 'collaborative', nodesReturned: recos.length },
        }
      }
      case 'parcours': {
        const paths = await graph.multiEntityPath({ domaine: str(args.domaine), region: str(args.region) })
        const items = await loadOppItems(paths.map(p => p.id))
        return {
          ok: true,
          data: {
            intent,
            count: paths.length,
            parcours: paths.map(p => ({ offre: p.titre, competence: p.competence, formation: p.formationTitre, programme: p.programmeNom })),
          },
          block: items.length ? { kind: 'opportunites', items } : undefined,
          graph: { template: 'multi_entity_path', nodesReturned: paths.length },
        }
      }
      case 'livre_disponible': {
        // Traversée Livre → Exemplaire → Centre → Region (note §5.3). On rend l'emplacement
        // physique EXACT et l'`exemplaireId`, pour que `borrow_book` puisse enchaîner.
        const livres = await graph.livresDisponibles({ q: str(args.q), theme: str(args.theme), region: str(args.region) })
        const base = appUrl()
        const parLivre = new Map<string, { titre: string; auteur: string; emplacements: Array<Record<string, string>> }>()
        for (const l of livres) {
          const entry = parLivre.get(l.livreId) ?? { titre: l.titre, auteur: l.auteur, emplacements: [] }
          entry.emplacements.push({
            exemplaireId: l.exemplaireId, centre: l.centreNom, rayon: l.rayon, etagere: l.etagere, position: l.position,
          })
          parLivre.set(l.livreId, entry)
        }
        const ids = [...parLivre.keys()]
        return {
          ok: true,
          data: {
            intent,
            count: ids.length,
            livres: ids.map(id => ({ id, ...parLivre.get(id)! })),
          },
          block: ids.length
            ? {
                kind: 'action',
                title: `${ids.length} livre${ids.length > 1 ? 's' : ''} disponible${ids.length > 1 ? 's' : ''}`,
                actions: ids.slice(0, 4).map(id => ({
                  icon: 'book',
                  label: `${parLivre.get(id)!.titre} — ${parLivre.get(id)!.emplacements[0].centre} · ${parLivre.get(id)!.emplacements[0].rayon}`,
                })),
                buttons: ids.slice(0, 3).map(id => ({
                  label: parLivre.get(id)!.titre.length > 28 ? `${parLivre.get(id)!.titre.slice(0, 25)}…` : parLivre.get(id)!.titre,
                  // `src=ia` (GUIC-688) : le clic vers la fiche livre reste attribué au chat.
                  href: `${base}/jeune/bibliotheque/${id}?src=ia`,
                })),
              }
            : undefined,
          graph: { template: 'livres_disponibles', nodesReturned: livres.length },
        }
      }
      case 'apercu_marche': {
        // Recherche GLOBALE (GUIC-676) : thématique, impersonnelle, donc mémoïsée et
        // partagée. Les chiffres portent sur les OFFRES — le pré-screen continue de
        // refuser tout décompte de personnes.
        const apercu = await loadOrBuildApercuMarche({ region: str(args.region), domaine: str(args.domaine) })
        return {
          ok: true,
          data: {
            intent,
            perimetre: { region: str(args.region) ?? 'tout le Sénégal', domaine: str(args.domaine) ?? 'tous secteurs' },
            offresOuvertes: apercu.total,
            parType: apercu.parType,
            parSecteur: apercu.parDomaine,
            parRegion: apercu.parRegion,
            competencesDemandees: apercu.competences,
            organisationsActives: apercu.organisations,
          },
          graph: { template: 'apercu_marche', nodesReturned: apercu.total },
        }
      }
      case 'acteurs_programme': {
        // GUIC-684 — sans slug on interrogerait tout le graphe pour rien : on refuse,
        // l'agent redemande. Les acteurs ne sont pas des cards → data brute pour le LLM.
        const slug = str(args.programme)
        if (!slug) return { ok: false, error: 'programme requis pour acteurs_programme (slug : yaakaar, yeah, yjc, edupop)' }
        const acteurs = await graph.acteursDuProgramme(slug)
        return {
          ok: true,
          data: {
            intent,
            programme: acteurs.programme,
            centres: acteurs.centres,
            organisations: acteurs.organisations,
            count_centres: acteurs.centres.length,
            count_organisations: acteurs.organisations.length,
          },
          graph: {
            template: 'acteurs_programme',
            nodesReturned: acteurs.centres.length + acteurs.organisations.length,
          },
        }
      }
      case 'ressources_competences': {
        // Chaîne native au graphe : offre → compétences MANQUANTES → ressources qui les préparent.
        const oppId = str(args.opportuniteId)
        if (!oppId) return { ok: false, error: 'opportuniteId requis pour ressources_competences' }
        const gap = await graph.skillGap(scope, oppId)
        const slugs = gap.manquantes.map(c => c.slug).filter((s): s is string => Boolean(s))
        if (slugs.length === 0) {
          return {
            ok: true,
            data: { intent, manquantes: [], count: 0 },
            graph: { template: 'ressources_prepa', nodesReturned: 0 },
          }
        }
        const ressources = await graph.ressourcesPourCompetences(slugs)
        const items: YayeRessourceItem[] = ressources.map(r => ({
          id: r.id, titre: r.titre, type: r.type, theme: r.theme, niveau: r.niveau,
        }))
        return {
          ok: true,
          data: {
            intent,
            manquantes: gap.manquantes.map(c => c.libelle),
            count: items.length,
            resultsShownAsCards: items.length > 0,
          },
          block: items.length ? { kind: 'ressources', items } : undefined,
          graph: { template: 'ressources_prepa', nodesReturned: ressources.length },
        }
      }
    }
  },
}

// ── get_reservable_resources ──────────────────────────────────────────────────
// Lecture seule : liste les salles/véhicules réservables (centres de la région du
// bénéficiaire par défaut) avec un lien profond vers la page de réservation
// EXISTANTE. Sert à identifier la `ressourceId` avant reserve_resource.
const getReservableResources: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_reservable_resources',
      description:
        "Liste les ressources réservables d'un centre (salles, véhicules) près du bénéficiaire. " +
        "À appeler quand il veut « réserver une salle / un véhicule » pour trouver la ressource et " +
        'son identifiant. Renvoie des cartes cliquables vers la page de réservation.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['salle', 'vehicule'], description: 'Filtrer par type de ressource' },
          q: { type: 'string', description: 'Mots-clés dans le nom de la ressource' },
        },
        required: [],
      },
    },
  },
  async execute(args, ctx) {
    const typeArg = typeof args.type === 'string' ? args.type.toLowerCase() : undefined
    const types: TypeRessourceCentre[] =
      typeArg === 'salle'
        ? [TypeRessourceCentre.Salle]
        : typeArg === 'vehicule' || typeArg === 'véhicule'
          ? [TypeRessourceCentre.Vehicule]
          : [TypeRessourceCentre.Salle, TypeRessourceCentre.Vehicule]

    const user = await prisma.utilisateur.findUnique({ where: { cjsUid: ctx.cjsUid }, select: { region: true } })
    const where: Prisma.RessourceCentreWhereInput = { estActive: true, type: { in: types } }
    if (user?.region) where.centre = { region: user.region }
    if (typeof args.q === 'string' && args.q.trim()) where.nom = { contains: args.q.trim() }

    const rows = await prisma.ressourceCentre.findMany({
      where,
      select: {
        id: true, nom: true, type: true, capacite: true, capaciteUnit: true,
        dureeMinCreneauMin: true, requiresJustif: true,
        centre: { select: { nom: true, slug: true, region: true } },
      },
      orderBy: [{ type: 'asc' }, { nom: 'asc' }],
      take: 8,
    })

    const base = appUrl()
    const resources = rows.map(r => ({
      id: r.id,
      nom: r.nom,
      type: String(r.type),
      centre: r.centre.nom,
      region: r.centre.region ? String(r.centre.region) : null,
      capacite: r.capacite,
      capaciteUnit: r.capaciteUnit,
      dureeMinCreneauMin: r.dureeMinCreneauMin,
      requiresJustif: r.requiresJustif,
      url: `${base}/centres/${r.centre.slug}/ressources/${r.id}/reserver`,
    }))

    const block: YayeBlock | undefined = resources.length
      ? {
          kind: 'action',
          title: 'Ressources réservables',
          subtitle: user?.region ? `Région ${String(user.region)}` : undefined,
          actions: [],
          buttons: resources.slice(0, 5).map(r => ({ label: `${r.nom} · ${r.centre}`, href: r.url })),
        }
      : undefined

    return { ok: true, data: { count: resources.length, resources }, block }
  },
}

// ── reserve_resource ──────────────────────────────────────────────────────────
// Écriture en DEUX TEMPS (sécurité) : confirm=false renvoie un RÉCAPITULATIF sans
// rien écrire ; confirm=true soumet via l'endpoint de réservation EXISTANT
// (reservations-gateway) — aucune logique métier dupliquée ici. Hors contexte
// authentifié par cookie (ex. WhatsApp), bascule vers le lien web.
const reserveResource: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'reserve_resource',
      description:
        "Réserve une salle ou un véhicule de centre pour le bénéficiaire. Flux OBLIGATOIRE : " +
        "appelle d'abord SANS `confirm` (ou confirm=false) pour obtenir le récapitulatif, présente-le, " +
        "puis n'appelle avec `confirm=true` qu'APRÈS un accord explicite de la personne. " +
        'Le `motif` doit faire au moins 20 caractères. Récupère `ressourceId` via get_reservable_resources.',
      parameters: {
        type: 'object',
        properties: {
          ressourceId: { type: 'string', description: 'Identifiant de la ressource (via get_reservable_resources)' },
          date: { type: 'string', description: 'Date au format AAAA-MM-JJ' },
          creneauDebut: { type: 'string', description: 'Heure de début "HH:MM"' },
          creneauFin: { type: 'string', description: 'Heure de fin "HH:MM"' },
          nombrePersonnes: { type: 'number', description: 'Nombre de personnes (défaut 1)' },
          motif: { type: 'string', description: 'Motif de la réservation (≥ 20 caractères)' },
          confirm: { type: 'boolean', description: 'true UNIQUEMENT après accord explicite — déclenche l’écriture' },
        },
        required: ['ressourceId', 'date', 'creneauDebut', 'creneauFin', 'motif'],
      },
    },
  },
  async execute(args, ctx) {
    const ressourceId = typeof args.ressourceId === 'string' ? args.ressourceId.trim() : ''
    const date = typeof args.date === 'string' ? args.date.trim() : ''
    const creneauDebut = typeof args.creneauDebut === 'string' ? args.creneauDebut.trim() : ''
    const creneauFin = typeof args.creneauFin === 'string' ? args.creneauFin.trim() : ''
    const nombrePersonnes = Number.isFinite(args.nombrePersonnes) ? Number(args.nombrePersonnes) : 1
    const motif = typeof args.motif === 'string' ? args.motif.trim() : ''
    const confirm = args.confirm === true

    if (!ressourceId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(creneauDebut) || !/^\d{2}:\d{2}$/.test(creneauFin)) {
      return { ok: false, error: 'Informations incomplètes : il faut la ressource, la date (AAAA-MM-JJ) et le créneau (HH:MM).' }
    }

    const ressource = await prisma.ressourceCentre.findUnique({
      where: { id: ressourceId },
      select: { nom: true, type: true, estActive: true, requiresJustif: true, centre: { select: { nom: true, slug: true } } },
    })
    if (!ressource || !ressource.estActive) {
      return { ok: false, error: 'Cette ressource est introuvable ou indisponible.' }
    }
    const base = appUrl()
    const deepLink = `${base}/centres/${ressource.centre.slug}/ressources/${ressourceId}/reserver`

    // Étape 1 — récapitulatif AVANT toute écriture (confirmation obligatoire).
    if (!confirm) {
      return {
        ok: true,
        data: {
          needsConfirmation: true,
          recap: {
            ressource: ressource.nom, centre: ressource.centre.nom, type: String(ressource.type),
            date, creneau: `${creneauDebut}-${creneauFin}`, nombrePersonnes, motif,
          },
          requiresJustif: ressource.requiresJustif,
          // Fix B (multi-tour) : params EXACTS à réutiliser après le « oui » de la personne — le
          // modèle n'a plus à les reconstruire des tours précédents, il rappelle l'outil tel quel.
          nextStep: 'Après accord explicite de la personne, rappelle reserve_resource avec EXACTEMENT ces paramètres.',
          confirmArgs: { ressourceId, date, creneauDebut, creneauFin, nombrePersonnes, motif, confirm: true },
        },
        block: {
          kind: 'action',
          title: 'Récapitulatif de ta réservation',
          subtitle: `${ressource.nom} · ${ressource.centre.nom}`,
          actions: [
            { icon: 'calendar', label: `${date} · ${creneauDebut}–${creneauFin}` },
            { icon: 'users', label: `${nombrePersonnes} personne${nombrePersonnes > 1 ? 's' : ''}` },
          ],
        },
      }
    }

    // Étape 2 — écriture via l'endpoint EXISTANT (aucune règle métier dupliquée ici).
    const result = await submitReservationViaApi(
      {
        ressourceId,
        dateReservee: `${date}T12:00:00.000Z`,
        creneauDebut,
        creneauFin,
        nombrePersonnes,
        motif,
      },
      ctx.cjsUid,
    )

    if (result.ok) {
      const accepted = result.reservation.statut === 'Acceptee'
      return {
        ok: true,
        data: { reservationId: result.reservation.id, statut: result.reservation.statut },
        block: {
          kind: 'action',
          title: accepted ? 'Réservation confirmée' : 'Demande envoyée',
          subtitle: `${ressource.nom} · ${date} · ${creneauDebut}–${creneauFin}`,
          actions: [],
          buttons: [{ label: 'Mes réservations', href: `${base}/jeune/mes-reservations-centres`, primary: true }],
        },
      }
    }

    // Hors contexte authentifié (ex. WhatsApp) → on oriente vers le web.
    if (result.unauthenticated) {
      return {
        ok: true,
        data: { needsWeb: true },
        block: {
          kind: 'action',
          title: 'Finalise ta réservation en ligne',
          subtitle: `${ressource.nom} · ${ressource.centre.nom}`,
          actions: [],
          buttons: [{ label: 'Réserver sur le site', href: deepLink, primary: true }],
        },
      }
    }

    return { ok: false, error: result.message }
  },
}

// ── get_badge (Lot 4) ─────────────────────────────────────────────────────────
// Donne au bénéficiaire son badge numérique CJS. Branché sur le système EXISTANT
// (QR/JWT rotatif `/api/cjs-card/qr-token`) — inchangé. Le rendu du QR se fait sur
// la page carte existante ; ici on confirme la disponibilité + lien profond.
const getBadge: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_badge',
      description:
        "Donne au bénéficiaire son badge numérique CJS (QR de la carte) pour entrer ou se faire " +
        "scanner au centre. À utiliser quand il demande « mon badge », « ma carte CJS », « le QR du centre ».",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  async execute(_args, ctx) {
    const base = appUrl()
    const r = await callInternalRoute(cjsCardQrTokenGET, { method: 'GET', path: '/api/cjs-card/qr-token', actorCjsUid: ctx.cjsUid })
    const data = r.json.data as { expiresAt?: string; token?: string } | undefined

    if (r.ok && data?.token) {
      // Carte CJS INLINE (recto/verso + QR) — design v4 `yaye-cjscard.jsx`. Fallback lien si
      // l'assemblage de la carte échoue (utilisateur introuvable).
      const user = await buildCjsCardUser(ctx.cjsUid).catch(() => null)
      if (user) {
        return {
          ok: true,
          data: { expiresAt: data.expiresAt ?? null },
          block: { kind: 'carte_cjs', cjsUid: ctx.cjsUid, user, qrToken: data.token },
        }
      }
      return {
        ok: true,
        data: { expiresAt: data.expiresAt ?? null },
        block: {
          kind: 'action',
          title: 'Ton badge CJS',
          subtitle: 'Présente le QR au centre pour entrer, pointer ou récupérer une réservation.',
          actions: [],
          buttons: [{ label: 'Afficher mon badge', href: `${base}/jeune/ma-carte`, primary: true }],
        },
      }
    }
    if (r.unauthenticated) {
      return {
        ok: true,
        data: { needsWeb: true },
        block: {
          kind: 'action',
          title: 'Ton badge CJS',
          subtitle: 'Connecte-toi pour afficher ton QR.',
          actions: [],
          buttons: [{ label: 'Ouvrir ma carte', href: `${base}/jeune/ma-carte`, primary: true }],
        },
      }
    }
    return { ok: false, error: r.json.error?.message ?? 'Impossible de générer ton badge pour le moment.' }
  },
}

// ── submit_application (F6) ────────────────────────────────────────────────────
// Soumet une candidature via la route EXISTANTE POST /api/candidatures (GUIC-21) —
// inchangée. Écriture en DEUX TEMPS (récap puis confirm=true), CV réutilisé depuis
// le profil. Fallback web hors contexte authentifié.
const submitApplication: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'submit_application',
      description:
        "Soumet une candidature à une opportunité pour le bénéficiaire. Flux OBLIGATOIRE : appelle " +
        "d'abord SANS `confirm` pour le récapitulatif, présente-le, puis `confirm=true` SEULEMENT après " +
        "un accord explicite. Le CV du profil est réutilisé automatiquement. Fournis `opportuniteId` " +
        `(depuis la recherche/le contexte) et une lettre de motivation d'au moins ${LETTRE_MIN_CHARS} caractères.`,
      parameters: {
        type: 'object',
        properties: {
          opportuniteId: { type: 'string', description: "Identifiant de l'opportunité visée" },
          lettreMotivation: { type: 'string', description: `Lettre de motivation (≥ ${LETTRE_MIN_CHARS} caractères)` },
          notificationsConsent: { type: 'boolean', description: 'true si la personne accepte les notifications de suivi' },
          confirm: { type: 'boolean', description: 'true UNIQUEMENT après accord explicite — déclenche la soumission' },
        },
        required: ['opportuniteId', 'lettreMotivation'],
      },
    },
  },
  async execute(args, ctx) {
    const opportuniteId = typeof args.opportuniteId === 'string' ? args.opportuniteId.trim() : ''
    const lettreMotivation = typeof args.lettreMotivation === 'string' ? args.lettreMotivation.trim() : ''
    const notificationsConsent = args.notificationsConsent === true
    const confirm = args.confirm === true

    if (!opportuniteId) return { ok: false, error: "Il me faut l'opportunité visée pour candidater." }
    if (lettreMotivation.length < LETTRE_MIN_CHARS) {
      return { ok: false, error: `La lettre de motivation doit faire au moins ${LETTRE_MIN_CHARS} caractères — aide la personne à l'étoffer.` }
    }

    const [opp, profil] = await Promise.all([
      prisma.opportunite.findFirst({
        where: { id: opportuniteId, deletedAt: null },
        select: { slug: true, titre: true, organisation: true, organisationLibelle: true },
      }),
      prisma.profilJeune.findUnique({ where: { cjsUid: ctx.cjsUid }, select: { cvUrl: true } }),
    ])
    if (!opp) return { ok: false, error: 'Cette opportunité est introuvable.' }
    const orga = opp.organisationLibelle ?? opp.organisation ?? null
    const base = appUrl()

    // Étape 1 — récapitulatif AVANT écriture.
    if (!confirm) {
      return {
        ok: true,
        data: {
          needsConfirmation: true,
          recap: { opportunite: opp.titre, organisation: orga, cvJoint: Boolean(profil?.cvUrl) },
          // Fix B (multi-tour) : l'id (issu des cards) + la lettre sont réémis prêts à confirmer.
          nextStep: 'Après accord explicite, rappelle submit_application avec EXACTEMENT ces paramètres.',
          confirmArgs: { opportuniteId, lettreMotivation, notificationsConsent, confirm: true },
        },
        block: {
          kind: 'action',
          title: 'Récapitulatif de ta candidature',
          subtitle: orga ? `${opp.titre} · ${orga}` : opp.titre,
          actions: [
            { icon: 'document', label: profil?.cvUrl ? 'CV du profil joint' : 'Sans CV (ajoute-le à ton profil)' },
          ],
        },
      }
    }

    // Étape 2 — soumission via la route EXISTANTE.
    const r = await callInternalRoute(candidaturesPOST, {
      method: 'POST',
      path: '/api/candidatures',
      body: { opportuniteId, lettreMotivation, cvUrl: profil?.cvUrl ?? undefined, notificationsConsent },
      actorCjsUid: ctx.cjsUid,
    })

    if (r.ok) {
      return {
        ok: true,
        data: { submitted: true },
        block: {
          kind: 'action',
          title: 'Candidature envoyée',
          subtitle: orga ? `${opp.titre} · ${orga}` : opp.titre,
          actions: [],
          buttons: [{ label: 'Mes candidatures', href: `${base}/jeune/mes-candidatures`, primary: true }],
        },
      }
    }
    const code = r.json.error?.code
    if (code === 'ALREADY_APPLIED') {
      return { ok: true, data: { alreadyApplied: true }, block: {
        kind: 'action', title: 'Tu as déjà postulé à cette offre', subtitle: opp.titre, actions: [],
        buttons: [{ label: 'Mes candidatures', href: `${base}/jeune/mes-candidatures`, primary: true }],
      } }
    }
    if (code === 'PROFILE_INCOMPLETE') {
      return { ok: true, data: { profileIncomplete: true }, block: {
        kind: 'action', title: 'Complète ton profil pour candidater', subtitle: r.json.error?.message ?? '', actions: [],
        buttons: [{ label: 'Compléter mon profil', href: `${base}/jeune/mon-profil`, primary: true }],
      } }
    }
    if (r.unauthenticated) {
      return { ok: true, data: { needsWeb: true }, block: {
        kind: 'action', title: 'Finalise ta candidature en ligne', subtitle: opp.titre, actions: [],
        buttons: [{ label: 'Postuler sur le site', href: `${base}/opportunites/${opp.slug}?postuler=1`, primary: true }],
      } }
    }
    return { ok: false, error: r.json.error?.message ?? 'La candidature a échoué.' }
  },
}

// ── escalate_to_advisor (Lot 6) ───────────────────────────────────────────────
// Passe la main à un opérateur humain du CJS. Yaye l'appelle quand la demande la
// dépasse, touche à une situation sensible, ou que la personne réclame un humain.
// Branché sur l'EXISTANT : recordEscalade journalise l'événement `escalade_conseiller`
// et alimente la file admin `escalades_yaye` (consultée par le staff). Aucune écriture
// dans un autre module. La remise temps réel au conseiller (notification) viendra ensuite.
const ESCALADE_MOTIFS = ['demande_complexe', 'sujet_sensible', 'demande_explicite', 'echec_repete', 'autre'] as const
// Catégories de DANGER repérées (sécurité). `autre_danger` = fourre-tout pour toute
// situation dangereuse hors liste → rien ne passe à travers les mailles.
const DANGER_SIGNALS = [
  'violence', 'harcelement', 'abus_sexuel', 'exploitation', 'automutilation_suicide', 'discrimination', 'autre_danger',
] as const

const escalateToAdvisor: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'escalate_to_advisor',
      description:
        "Transmet la conversation à un conseiller humain du CJS. À utiliser quand : la personne " +
        "DEMANDE explicitement de parler à un humain ; le sujet est SENSIBLE (détresse, santé, " +
        "violence, situation personnelle difficile) ; ou la demande dépasse ce que tu peux traiter " +
        "avec tes outils. Appelle cet outil UNE SEULE FOIS, puis confirme chaleureusement à la " +
        "personne que sa demande est transmise à l'équipe — ne promets pas de délai précis.",
      parameters: {
        type: 'object',
        properties: {
          motif: {
            type: 'string',
            enum: [...ESCALADE_MOTIFS],
            description: "Catégorie d'escalade (sujet_sensible pour toute détresse/situation personnelle).",
          },
          resume: {
            type: 'string',
            description: 'Résumé court et factuel de la demande à transmettre au conseiller (sans données de tiers).',
          },
          signal_danger: {
            type: 'string',
            enum: [...DANGER_SIGNALS],
            description:
              "À RENSEIGNER si tu repères une situation de DANGER pour la personne (violence, " +
              "harcèlement, abus_sexuel, exploitation, automutilation_suicide, discrimination, ou " +
              "autre_danger pour tout autre danger). En cas de doute, signale quand même.",
          },
        },
        required: ['motif'],
      },
    },
  },
  async execute(args, ctx) {
    // Sans session/canal, on ne peut pas tracer l'escalade de façon fiable.
    if (!ctx.sessionId || !ctx.canal) {
      return { ok: false, error: "Contexte de session indisponible pour l'escalade." }
    }
    const dangerSignal = typeof args.signal_danger === 'string' && (DANGER_SIGNALS as readonly string[]).includes(args.signal_danger)
      ? args.signal_danger
      : null
    // Un danger repéré force la catégorie sensible (priorité sécurité).
    const motif = dangerSignal
      ? 'sujet_sensible'
      : typeof args.motif === 'string' && (ESCALADE_MOTIFS as readonly string[]).includes(args.motif)
        ? args.motif
        : 'autre'
    const resume = typeof args.resume === 'string' ? args.resume.trim().slice(0, 280) : null

    const suivi = await recordEscalade({
      sessionId: ctx.sessionId,
      cjsUid: ctx.cjsUid,
      role: ctx.roles[0] ?? null,
      centreId: ctx.centreId ?? null,
      canal: ctx.canal,
      raison: motif,
      stade: resume,
      dangerSignal,
    })
    // Filet : si recordEscalade est stubbé (tests) → référence dérivée de la session.
    const reference = suivi?.reference ?? escaladeReference(ctx.sessionId)
    const alreadyPending = suivi?.alreadyPending ?? false

    const base = appUrl()
    return {
      ok: true,
      // Le LLM confirme avec ses mots ; on lui donne la référence à citer et on lui
      // rappelle de rester honnête sur le délai (suivi sans fausse promesse).
      data: {
        escalated: true,
        reference,
        alreadyPending,
        message:
          `Demande transmise à l'équipe CJS — référence ${reference}. ` +
          `Confirme-le chaleureusement, DONNE cette référence à la personne pour qu'elle puisse la rappeler, ` +
          `sans promettre de délai précis.`,
      },
      block: {
        kind: 'escalade',
        reference,
        danger: !!dangerSignal,
        title: escaladeTitre({ dejaEnCours: alreadyPending }),
        // Aucune promesse de réponse dans le fil tant que le canal conseiller n'existe pas.
        message: escaladeMessage({ danger: !!dangerSignal, dejaEnCours: alreadyPending }),
        button: { label: 'Trouver un centre CJS', href: `${base}/centres` },
      },
    }
  },
}

/** Registre des outils disponibles. */
// ── search_library (Lot 3, GUIC-342) ────────────────────────────────────────
// Recherche dans la bibliothèque physique des centres via l'endpoint EXISTANT
// `GET /api/bibliotheque/livres` (in-process, cookie propagé). Renvoie les livres,
// le nombre d'exemplaires disponibles et leur emplacement physique précis.
const searchLibrary: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'search_library',
      description:
        'Cherche des livres dans la bibliothèque physique des centres (par titre, auteur, ' +
        'thème ou niveau). À utiliser quand le bénéficiaire veut « un livre sur… », « emprunter ' +
        'un livre », « est-ce que la bibliothèque a… ». Renvoie les livres, les exemplaires ' +
        'disponibles et leur emplacement (centre · rayon · étagère · position).',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Mots-clés : titre, auteur ou ISBN' },
          theme: { type: 'string', description: 'Filtrer par thème' },
          niveau: { type: 'string', description: 'Filtrer par niveau' },
        },
        required: [],
      },
    },
  },
  async execute(args, ctx) {
    const qs = new URLSearchParams()
    if (typeof args.q === 'string' && args.q.trim()) qs.set('q', args.q.trim())
    if (typeof args.theme === 'string' && args.theme.trim()) qs.set('theme', args.theme.trim())
    if (typeof args.niveau === 'string' && args.niveau.trim()) qs.set('niveau', args.niveau.trim())

    const r = await callInternalRoute(biblioLivresGET, {
      method: 'GET',
      path: `/api/bibliotheque/livres?${qs.toString()}`,
      actorCjsUid: ctx.cjsUid,
    })
    if (!r.ok) {
      if (r.unauthenticated) return { ok: false, error: 'Connecte-toi pour consulter la bibliothèque.' }
      return { ok: false, error: r.json.error?.message ?? 'Recherche bibliothèque indisponible.' }
    }
    const result = r.json.data as SearchLivresResult
    const livres = result.livres ?? []
    if (livres.length === 0) {
      return { ok: true, data: { livres: [] }, block: { kind: 'text', text: 'Aucun livre trouvé pour cette recherche.' } }
    }

    const base = appUrl()
    return {
      ok: true,
      // Données structurées pour que Yaye décrive les emplacements en langage naturel.
      data: {
        livres: livres.map(l => ({
          id: l.id, titre: l.titre, auteur: l.auteur, theme: l.theme,
          exemplairesDisponibles: l.exemplairesDisponibles,
          emplacements: l.emplacements.map(e => ({
            // exemplaireId exposé au modèle → borrow_book peut emprunter « le premier exemplaire ».
            exemplaireId: e.exemplaireId, centre: e.centreNom, rayon: e.rayon, etagere: e.etagere, position: e.position,
          })),
        })),
      },
      block: {
        kind: 'action',
        title: `${livres.length} livre${livres.length > 1 ? 's' : ''} trouvé${livres.length > 1 ? 's' : ''}`,
        actions: livres.slice(0, 4).map(l => ({
          icon: 'book',
          label: `${l.titre} — ${l.auteur} (${l.exemplairesDisponibles} dispo)`,
        })),
        buttons: livres.slice(0, 3).map(l => ({
          label: l.titre.length > 28 ? `${l.titre.slice(0, 25)}…` : l.titre,
          href: `${base}/jeune/bibliotheque/${l.id}`,
        })),
      },
    }
  },
}

// ── borrow_book (Lot 3, GUIC-343) ───────────────────────────────────────────
// Écriture en DEUX TEMPS : confirm=false → récapitulatif (aucune écriture) ;
// confirm=true → initie l'emprunt via `POST /api/bibliotheque/emprunts` EXISTANT.
// L'emprunt reste « initié » jusqu'au scan du badge au centre.
const borrowBook: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'borrow_book',
      description:
        "Initie l'emprunt d'un exemplaire précis (identifié par son `exemplaireId`, obtenu via " +
        'search_library). Toujours appeler avec confirm=false d\'abord pour montrer le ' +
        'récapitulatif, puis confirm=true après accord explicite. L\'emprunt devient effectif ' +
        'au scan du badge au centre.',
      parameters: {
        type: 'object',
        properties: {
          exemplaireId: { type: 'string', description: "Identifiant de l'exemplaire à emprunter" },
          confirm: { type: 'boolean', description: 'false = récapitulatif ; true = initier réellement' },
        },
        required: ['exemplaireId'],
      },
    },
  },
  async execute(args, ctx) {
    const exemplaireId = typeof args.exemplaireId === 'string' ? args.exemplaireId : ''
    const confirm = args.confirm === true
    if (!exemplaireId) return { ok: false, error: "Précise quel exemplaire emprunter (exemplaireId)." }

    const base = appUrl()
    // Étape 1 — récapitulatif AVANT toute écriture.
    if (!confirm) {
      const ex = await prisma.exemplaire.findUnique({
        where: { id: exemplaireId },
        select: {
          statut: true, rayon: true, etagere: true, position: true,
          livre: { select: { titre: true, auteur: true } },
          centre: { select: { nom: true } },
        },
      })
      if (!ex) return { ok: false, error: 'Exemplaire introuvable.' }
      if (ex.statut !== 'disponible') return { ok: false, error: "Cet exemplaire n'est plus disponible." }
      return {
        ok: true,
        data: {
          needsConfirmation: true,
          recap: { livre: ex.livre.titre, auteur: ex.livre.auteur, centre: ex.centre.nom,
            emplacement: `rayon ${ex.rayon} · étagère ${ex.etagere} · position ${ex.position}` },
          // Fix B (multi-tour) : exemplaire exact réémis prêt à confirmer.
          nextStep: 'Après accord explicite, rappelle borrow_book avec EXACTEMENT ces paramètres.',
          confirmArgs: { exemplaireId, confirm: true },
        },
        block: {
          kind: 'action',
          title: "Récapitulatif de l'emprunt",
          subtitle: `${ex.livre.titre} — ${ex.livre.auteur}`,
          actions: [
            { icon: 'building', label: ex.centre.nom },
            { icon: 'map-pin', label: `Rayon ${ex.rayon} · étagère ${ex.etagere} · pos. ${ex.position}` },
          ],
        },
      }
    }

    // Étape 2 — initie l'emprunt via l'endpoint EXISTANT.
    const r = await callInternalRoute(biblioEmpruntsPOST, {
      method: 'POST',
      path: '/api/bibliotheque/emprunts',
      body: { exemplaireId },
      actorCjsUid: ctx.cjsUid,
    })
    if (r.ok) {
      const emprunt = (r.json.data as { emprunt: EmpruntVue }).emprunt
      return {
        ok: true,
        data: { empruntId: emprunt.id, statut: emprunt.statut },
        block: {
          kind: 'action',
          title: 'Emprunt initié',
          subtitle: `${emprunt.livre.titre} · ${emprunt.exemplaire.centreNom}`,
          actions: [{ icon: 'info', label: 'Présente ton badge au centre pour finaliser l\'emprunt.' }],
          buttons: [{ label: 'Mes emprunts', href: `${base}/jeune/bibliotheque/mes-emprunts`, primary: true }],
        },
      }
    }
    if (r.unauthenticated) {
      return {
        ok: true,
        data: { needsWeb: true },
        block: {
          kind: 'action',
          title: 'Finalise ton emprunt en ligne',
          actions: [],
          buttons: [{ label: 'Ouvrir la bibliothèque', href: `${base}/jeune/bibliotheque`, primary: true }],
        },
      }
    }
    return { ok: false, error: r.json.error?.message ?? "L'emprunt a échoué." }
  },
}

// ── get_active_loans (Lot 3, GUIC-343) ──────────────────────────────────────
// Emprunts en cours du bénéficiaire + dates de retour, via `GET /api/bibliotheque/emprunts`.
const getActiveLoans: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_active_loans',
      description:
        'Liste les emprunts en cours du bénéficiaire (livres non encore rendus) avec leur ' +
        'date de retour prévue. À utiliser pour « mes emprunts », « quels livres ai-je », ' +
        '« quand dois-je rendre ».',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  async execute(_args, ctx) {
    const r = await callInternalRoute(biblioEmpruntsGET, { method: 'GET', path: '/api/bibliotheque/emprunts', actorCjsUid: ctx.cjsUid })
    if (!r.ok) {
      if (r.unauthenticated) return { ok: false, error: 'Connecte-toi pour voir tes emprunts.' }
      return { ok: false, error: r.json.error?.message ?? 'Impossible de récupérer tes emprunts.' }
    }
    const emprunts = (r.json.data as { emprunts: EmpruntVue[] }).emprunts ?? []
    if (emprunts.length === 0) {
      return { ok: true, data: { emprunts: [] }, block: { kind: 'text', text: "Tu n'as aucun emprunt en cours." } }
    }
    return {
      ok: true,
      data: {
        emprunts: emprunts.map(e => ({
          livre: e.livre.titre, auteur: e.livre.auteur, statut: e.statut,
          centre: e.exemplaire.centreNom, dateRetourPrevue: e.dateRetourPrevue,
        })),
      },
      block: {
        kind: 'action',
        title: `${emprunts.length} emprunt${emprunts.length > 1 ? 's' : ''} en cours`,
        actions: emprunts.slice(0, 5).map(e => ({
          icon: 'book',
          label: e.dateRetourPrevue
            ? `${e.livre.titre} — retour avant le ${new Date(e.dateRetourPrevue).toLocaleDateString('fr-FR')}`
            : `${e.livre.titre} — à retirer au centre`,
        })),
      },
    }
  },
}

// ── search_events (agenda) ──────────────────────────────────────────────────
// Événements À VENIR (ateliers, forums, formations, webinaires, conférences, cours)
// prêts à afficher en CARDS cliquables (→ /agenda/[id]).
const searchEvents: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'search_events',
      description:
        "Recherche les ÉVÉNEMENTS à venir de l'agenda CJS (ateliers CV, forums emploi, formations, " +
        'webinaires, conférences, cours). Renvoie des cards cliquables. À utiliser quand la personne ' +
        "demande « quels événements / ateliers / forums », « qu'est-ce qui se passe au centre », l'agenda.",
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: Object.values(TypeEvenement), description: "Type d'événement" },
          q: { type: 'string', description: "Ce que cherche la personne, dans SES mots (phrase naturelle, pas un mot-clé isolé)" },
        },
        required: [],
      },
    },
  },
  async execute(args) {
    const where: Prisma.EvenementWhereInput = { statut: 'a_venir' }
    if (inEnum(TypeEvenement, args.type)) where.type = args.type as TypeEvenement
    if (typeof args.q === 'string' && args.q.trim()) where.titre = { contains: args.q.trim() }

    const rows = await prisma.evenement.findMany({
      where,
      select: {
        id: true, titre: true, type: true, dateDebut: true, dateFin: true, lieu: true, estGratuit: true,
        centre: { select: { nom: true } },
      },
      orderBy: { dateDebut: 'asc' },
      take: MAX_OPP_ITEMS,
    })

    const items: YayeEvenementItem[] = rows.map(r => ({
      id: r.id,
      titre: r.titre,
      type: String(r.type),
      dateDebut: r.dateDebut.toISOString(),
      dateFin: r.dateFin ? r.dateFin.toISOString() : null,
      lieu: r.lieu,
      centre: r.centre?.nom ?? null,
      estGratuit: r.estGratuit,
    }))

    return {
      ok: true,
      // Décompte seul au LLM (les détails vivent sur les cards) — anti ré-énumération en prose.
      // Fix 4 — signal de succès LISIBLE pour le modèle (sans titres) : les résultats sont
      // DÉJÀ affichés en cards à l'écran → le modèle les introduit en une phrase, il n'a pas
      // à les réciter ni à en inventer. Contre-mesure au « je regarde ça ! » halluciné.
      data: { count: items.length, resultsShownAsCards: items.length > 0 },
      block: items.length > 0 ? { kind: 'evenements', items } : undefined,
    }
  },
}

// ── search_resources (bibliothèque numérique) ───────────────────────────────
const searchResources: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'search_resources',
      description:
        "Recherche des RESSOURCES numériques (guides PDF, vidéos, liens, outils) de la bibliothèque " +
        "en ligne du CJS. À utiliser pour « un guide sur… », « une vidéo pour… », « des ressources sur " +
        "le CV / l'entrepreneuriat », « comment faire… ». Différent des LIVRES physiques (search_library).",
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: Object.values(TypeRessource), description: 'Type de ressource' },
          q: { type: 'string', description: 'Mots-clés (titre ou thème)' },
        },
        required: [],
      },
    },
  },
  async execute(args) {
    const where: Prisma.RessourceWhereInput = { estPublic: true }
    if (inEnum(TypeRessource, args.type)) where.type = args.type as TypeRessource
    if (typeof args.q === 'string' && args.q.trim()) {
      const q = args.q.trim()
      where.OR = [{ titre: { contains: q } }, { theme: { contains: q } }, { categorie: { contains: q } }]
    }
    const rows = await prisma.ressource.findMany({
      where,
      select: { id: true, titre: true, type: true, theme: true, niveau: true },
      orderBy: { vues: 'desc' },
      take: MAX_OPP_ITEMS,
    })
    const items: YayeRessourceItem[] = rows.map(r => ({
      id: r.id, titre: r.titre, type: String(r.type), theme: r.theme, niveau: r.niveau ? String(r.niveau) : null,
    }))
    return { ok: true, data: { count: items.length, resultsShownAsCards: items.length > 0 }, block: items.length > 0 ? { kind: 'ressources', items } : undefined }
  },
}

// ── find_centres (fiche centre) ─────────────────────────────────────────────
const findCentres: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'find_centres',
      description:
        "Trouve les CENTRES CJS (adresse, services, contact) — pour « où est le centre de… », " +
        "« quels services au centre », « le CJS le plus proche », « les centres à Dakar ». Renvoie des fiches cliquables.",
      parameters: {
        type: 'object',
        properties: {
          region: { type: 'string', enum: Object.values(Region), description: 'Région ciblée' },
          q: { type: 'string', description: 'Nom ou ville du centre' },
        },
        required: [],
      },
    },
  },
  async execute(args) {
    const where: Prisma.CentreWhereInput = { estActif: true }
    if (inEnum(Region, args.region)) where.region = args.region as Region
    if (typeof args.q === 'string' && args.q.trim()) {
      const q = args.q.trim()
      where.OR = [{ nom: { contains: q } }, { ville: { contains: q } }]
    }
    const rows = await prisma.centre.findMany({
      where,
      select: { id: true, slug: true, nom: true, ville: true, region: true, adresse: true, telephone: true, services: true },
      orderBy: { nom: 'asc' },
      take: MAX_OPP_ITEMS,
    })
    const items: YayeCentreItem[] = rows.map(r => ({
      id: r.id, slug: r.slug ?? null, nom: r.nom,
      ville: r.ville ?? null, region: r.region ? String(r.region) : null,
      adresse: r.adresse, telephone: r.telephone ?? null,
      services: Array.isArray(r.services) ? (r.services as unknown[]).map(String) : [],
    }))
    return { ok: true, data: { count: items.length, resultsShownAsCards: items.length > 0 }, block: items.length > 0 ? { kind: 'centres', items } : undefined }
  },
}

// ── get_notifications ────────────────────────────────────────────────────────
const getNotifications: AgentTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_notifications',
      description:
        "Liste les NOTIFICATIONS du bénéficiaire connecté (échéances, réponses à candidatures, messages, " +
        "rappels). À utiliser pour « mes notifications », « quoi de neuf », « j'ai des nouvelles ? ».",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  async execute(_args, ctx) {
    const rows = await prisma.notification.findMany({
      where: { cjsUid: ctx.cjsUid },
      select: { id: true, type: true, titre: true, contenu: true, lien: true, metaPill: true, luA: true },
      orderBy: [{ luA: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }],
      take: MAX_OPP_ITEMS,
    })
    const unread = rows.filter(r => r.luA == null).length
    const items: YayeNotificationItem[] = rows.map(r => ({
      id: r.id, type: String(r.type), titre: r.titre, contenu: r.contenu,
      lien: r.lien ?? null, metaPill: r.metaPill ?? null, lu: r.luA != null,
    }))
    return { ok: true, data: { count: items.length, nonLues: unread }, block: items.length > 0 ? { kind: 'notifications', items } : undefined }
  },
}

export const TOOLS: Record<string, AgentTool> = {
  get_user_profile: getUserProfile,
  get_realtime_data: getRealtimeData,
  search_opportunities: searchOpportunities,
  search_events: searchEvents,
  search_resources: searchResources,
  find_centres: findCentres,
  get_notifications: getNotifications,
  get_recommendations: getRecommendations,
  query_knowledge_graph: queryKnowledgeGraph,
  get_reservable_resources: getReservableResources,
  reserve_resource: reserveResource,
  get_badge: getBadge,
  submit_application: submitApplication,
  escalate_to_advisor: escalateToAdvisor,
  search_library: searchLibrary,
  borrow_book: borrowBook,
  get_active_loans: getActiveLoans,
}

/** Définitions à passer à Groq (`tools` param). */
export const TOOL_DEFINITIONS: ToolDefinition[] = Object.values(TOOLS).map(t => t.definition)
