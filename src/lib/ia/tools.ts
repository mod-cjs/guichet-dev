// Outils de l'agent Yaye (function calling Groq) — Lot 0.
// Spec : .agent_context/specs/yaye/03-outils-function-calling.md
//
// Chaque outil = définition (schéma exposé à Groq) + exécuteur (accès données,
// portée RBAC par cjsUid). Lot 0 expose les 2 outils sans dépendance Neo4j ;
// les 9 autres (query_knowledge_graph, reserve_resource…) viendront aux lots suivants.

import { prisma } from '@/lib/prisma'
import { Domaine, Region, TypeOpportunite, TypeRessourceCentre } from '@prisma/client'
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
import { submitReservationViaApi } from './reservations-gateway'
import { callInternalRoute } from './internal-api'
import { recordEscalade, escaladeReference } from './escalade'
import { MAX_OPP_ITEMS, type YayeBlock, type YayeOppItem } from './blocks'

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
              select: { id: true, slug: true, titre: true, type: true, region: true, organisation: true, organisationLibelle: true, deadline: true },
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
      // Plafond produit : on ne montre que les meilleures offres (cf. MAX_OPP_ITEMS).
      take: MAX_OPP_ITEMS,
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
  async execute(args) {
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
    const result = await submitReservationViaApi({
      ressourceId,
      dateReservee: `${date}T12:00:00.000Z`,
      creneauDebut,
      creneauFin,
      nombrePersonnes,
      motif,
    })

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
  async execute() {
    const base = appUrl()
    const r = await callInternalRoute(cjsCardQrTokenGET, { method: 'GET', path: '/api/cjs-card/qr-token' })
    const data = r.json.data as { expiresAt?: string; token?: string } | undefined

    if (r.ok && data?.token) {
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
        data: { needsConfirmation: true, recap: { opportunite: opp.titre, organisation: orga, cvJoint: Boolean(profil?.cvUrl) } },
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
        title: alreadyPending ? 'Ta demande est déjà entre de bonnes mains' : 'Demande transmise à un conseiller',
        message: alreadyPending
          ? "Un membre de l'équipe CJS s'en occupe déjà et te répondra ici même. Garde cette référence si tu veux la rappeler."
          : "Un membre de l'équipe CJS va prendre le relais et te répondra ici même. Garde cette référence si tu veux la rappeler — en attendant, tu peux aussi joindre un centre.",
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
  async execute(args) {
    const qs = new URLSearchParams()
    if (typeof args.q === 'string' && args.q.trim()) qs.set('q', args.q.trim())
    if (typeof args.theme === 'string' && args.theme.trim()) qs.set('theme', args.theme.trim())
    if (typeof args.niveau === 'string' && args.niveau.trim()) qs.set('niveau', args.niveau.trim())

    const r = await callInternalRoute(biblioLivresGET, {
      method: 'GET',
      path: `/api/bibliotheque/livres?${qs.toString()}`,
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
            centre: e.centreNom, rayon: e.rayon, etagere: e.etagere, position: e.position,
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
  async execute(args) {
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
  async execute() {
    const r = await callInternalRoute(biblioEmpruntsGET, { method: 'GET', path: '/api/bibliotheque/emprunts' })
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

export const TOOLS: Record<string, AgentTool> = {
  get_user_profile: getUserProfile,
  get_realtime_data: getRealtimeData,
  search_opportunities: searchOpportunities,
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
