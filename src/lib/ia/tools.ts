// Outils de l'agent Yaye (function calling Groq) — Lot 0.
// Spec : .agent_context/specs/yaye/03-outils-function-calling.md
//
// Chaque outil = définition (schéma exposé à Groq) + exécuteur (accès données,
// portée RBAC par cjsUid). Lot 0 expose les 2 outils sans dépendance Neo4j ;
// les 9 autres (query_knowledge_graph, reserve_resource…) viendront aux lots suivants.

import { prisma } from '@/lib/prisma'
import { Domaine, Region, TypeOpportunite } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { loadProfilComplet } from '@/lib/profil-loader'
import { getRecommandations } from './recommandation'
import { getGraphPort } from './graph'
import type { YayeBlock, YayeOppItem } from './blocks'

/** Charge les cards opportunités (ordre des `ids` préservé) — mutualisé entre outils. */
async function loadOppItems(ids: string[]): Promise<YayeOppItem[]> {
  if (ids.length === 0) return []
  const rows = await prisma.opportunite.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: {
      id: true, slug: true, titre: true, type: true, region: true,
      organisation: true, organisationLibelle: true, deadline: true,
    },
  })
  const byId = new Map(rows.map(r => [r.id, r]))
  return ids.flatMap(id => {
    const r = byId.get(id)
    return r
      ? [{
          id: r.id, slug: r.slug, titre: r.titre, type: String(r.type),
          organisation: r.organisationLibelle ?? r.organisation ?? null,
          region: r.region ? String(r.region) : null,
          deadline: r.deadline ? r.deadline.toISOString() : null,
        }]
      : []
  })
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
        'Données temps réel de l\'utilisateur : état de ses candidatures (nombre, statuts) ' +
        'et nombre de favoris. Utile pour répondre « où en sont mes candidatures ? ».',
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

    if (scope === 'candidatures' || scope === 'tout') {
      const grouped = await prisma.candidature.groupBy({
        by: ['statut'],
        where: { cjsUid: ctx.cjsUid },
        _count: { _all: true },
      })
      out.candidatures = {
        total: grouped.reduce((n, g) => n + g._count._all, 0),
        parStatut: Object.fromEntries(grouped.map(g => [g.statut, g._count._all])),
      }
    }
    if (scope === 'favoris' || scope === 'tout') {
      out.favoris = await prisma.opportuniteFavorite.count({ where: { cjsUid: ctx.cjsUid } })
    }
    return { ok: true, data: out }
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
        "À utiliser dès que l'utilisateur cherche une opportunité ; croise avec son profil si pertinent.",
      parameters: {
        type: 'object',
        properties: {
          domaine: { type: 'string', enum: Object.values(Domaine), description: "Secteur de l'opportunité" },
          region: { type: 'string', enum: Object.values(Region), description: 'Région ciblée' },
          type: { type: 'string', enum: Object.values(TypeOpportunite), description: "Type d'opportunité" },
          q: { type: 'string', description: 'Mots-clés à chercher dans le titre' },
        },
        required: [],
      },
    },
  },
  async execute(args) {
    const where: Prisma.OpportuniteWhereInput = {
      statut: 'publiee',
      deletedAt: null,
      OR: [{ deadline: null }, { deadline: { gte: new Date() } }],
    }
    if (inEnum(Domaine, args.domaine)) where.domaine = args.domaine
    if (inEnum(Region, args.region)) where.region = args.region
    if (inEnum(TypeOpportunite, args.type)) where.type = args.type
    if (typeof args.q === 'string' && args.q.trim()) where.titre = { contains: args.q.trim() }

    const rows = await prisma.opportunite.findMany({
      where,
      select: {
        id: true, slug: true, titre: true, type: true, region: true,
        organisation: true, organisationLibelle: true, deadline: true,
      },
      orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
      take: 5,
    })

    const items: YayeOppItem[] = rows.map(r => ({
      id: r.id,
      slug: r.slug,
      titre: r.titre,
      type: String(r.type),
      organisation: r.organisationLibelle ?? r.organisation ?? null,
      region: r.region ? String(r.region) : null,
      deadline: r.deadline ? r.deadline.toISOString() : null,
    }))

    return {
      ok: true,
      // Pas de titres ici : les offres sont déjà sur les cards (block). On ne renvoie
      // au LLM que le décompte pour éviter qu'il ré-énumère en prose (anti-redondance).
      data: { count: items.length },
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
    const items = (await loadOppItems(recos.map(r => r.opportuniteId)))
      .map(it => ({ ...it, note: noteById.get(it.id) ?? null }))
    return {
      ok: true,
      data: { count: items.length },
      block: items.length > 0 ? { kind: 'opportunites', items } : undefined,
    }
  },
}

// ── query_knowledge_graph ────────────────────────────────────────────────────
// Outil RÉACTIF du Knowledge Graph (GUIC-433). Groq choisit l'INTENTION et remplit
// les paramètres ; on route vers le template de traversée correspondant via le
// GraphPort (Neo4j ou fallback Prisma). Portée RBAC : bornée au cjsUid connecté.
const GRAPH_INTENTS = ['recherche', 'ecart_competences', 'eligibilite', 'reco_collaborative', 'parcours'] as const
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
        "- `parcours` : chaîne opportunité → compétence → formation → programme (découverte).",
      parameters: {
        type: 'object',
        properties: {
          intent: { type: 'string', enum: [...GRAPH_INTENTS], description: 'Type de raisonnement attendu' },
          opportuniteId: { type: 'string', description: "Requis pour `ecart_competences` : l'offre visée" },
          domaine: { type: 'string', enum: Object.values(Domaine), description: 'Filtre secteur (recherche/parcours)' },
          region: { type: 'string', enum: Object.values(Region), description: 'Filtre région (recherche/parcours)' },
          type: { type: 'string', enum: Object.values(TypeOpportunite), description: "Filtre type (recherche)" },
          q: { type: 'string', description: 'Mots-clés titre (recherche)' },
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
    }
  },
}

/** Registre des outils disponibles. */
export const TOOLS: Record<string, AgentTool> = {
  get_user_profile: getUserProfile,
  get_realtime_data: getRealtimeData,
  search_opportunities: searchOpportunities,
  get_recommendations: getRecommendations,
  query_knowledge_graph: queryKnowledgeGraph,
}

/** Définitions à passer à Groq (`tools` param). */
export const TOOL_DEFINITIONS: ToolDefinition[] = Object.values(TOOLS).map(t => t.definition)
