/**
 * Dashboard data loader — GUIC-206.
 *
 * Charge en parallèle (Promise.all) les données dynamiques du tableau de bord
 * bénéficiaire (web v2) :
 * - recoOpps  : opportunités recommandées (filtrées sur les domaines d'intérêt
 *               du jeune, sinon publication récente — tri deadline ascendante)
 * - events    : 3 prochains événements (statut a_venir/en_cours)
 * - centres   : 3 centres CJS prioritaires (même région que le jeune si dispo)
 * - tracker   : candidatures en cours du jeune (≠ Refusée), 3 plus récentes
 *
 * Les KPIs et le completionScore sont déjà fournis par `dashboard-loader.ts`
 * (loadDashboardCounts) et la requête profil dans la page — ce loader ne s'en
 * occupe pas pour rester focalisé.
 */
import { prisma } from '@/lib/prisma'
import type { OppRecoCard } from '@/components/dashboard/OpportunitesRecoCarousel'
import type { DashEventItem } from '@/components/dashboard/WebDashEvents'
import type { DashCenterItem } from '@/components/dashboard/WebDashCenters'
import type { TrackerItem } from '@/components/dashboard/WebDashTracker'
import type { Prisma } from '@prisma/client'
import { Domaine } from '@prisma/client'

export const RECO_LIMIT = 5
export const EVENT_LIMIT = 3
export const CENTRE_LIMIT = 3
export const TRACKER_LIMIT = 3

export interface DashboardData {
  recoOpps: OppRecoCard[]
  events:   DashEventItem[]
  centres:  DashCenterItem[]
  tracker:  TrackerItem[]
}

const MOIS_FR_ABBR = [
  'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc',
] as const

/** Convertit un Date en libellé court FR pour la date-box (jour + mois abrégé). */
function formatDateBox(d: Date): { day: number; month: string } {
  return { day: d.getDate(), month: MOIS_FR_ABBR[d.getMonth()] }
}

/** Calcule J-N jusqu'à une deadline (jours entiers, arrondi vers le haut). */
function joursJusqua(deadline: Date | null, now: Date): number | null {
  if (!deadline) return null
  const diffMs = deadline.getTime() - now.getTime()
  if (diffMs < 0) return null
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

/** Mapping statut candidature → étape tracker (0..4) + libellé + tone. */
function statutToStep(statut: string): { step: number; label: string; tone: TrackerItem['tone'] } {
  switch (statut) {
    case 'En_attente': return { step: 0, label: 'Dépôt envoyé',     tone: 'teal'   }
    case 'Vue':        return { step: 1, label: 'Revue conseiller', tone: 'yellow' }
    case 'Retenue':    return { step: 4, label: 'Acceptée',         tone: 'green'  }
    case 'Refusee':    return { step: 4, label: 'Non retenue',      tone: 'red'    }
    default:           return { step: 0, label: 'En cours',         tone: 'teal'   }
  }
}

/**
 * Whitelist des valeurs valides de l'enum Prisma Domaine.
 * Fix audit PR #78 : `domainesInteret` (JSON utilisateur, parfois accentué via onboarding
 * legacy) doit être strictement filtré contre l'enum Prisma pour éviter P2009 runtime.
 */
const DOMAINE_VALUES = new Set<string>(Object.values(Domaine))

/**
 * Parse la propriété JSON `domainesInteret` en liste de valeurs enum valides.
 * Robuste : accepte string JSON encodé ou array natif, tolère accents/casse hérités
 * de l'onboarding en mappant vers l'enum Prisma sans accents.
 */
function parseDomainesInteret(value: unknown): Domaine[] {
  const raw: string[] = Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : typeof value === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed)
              ? parsed.filter((v): v is string => typeof v === 'string')
              : []
          } catch {
            return []
          }
        })()
      : []
  const normalize = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const byNormalized = new Map<string, Domaine>()
  for (const v of Object.values(Domaine)) byNormalized.set(normalize(v), v)
  const out: Domaine[] = []
  for (const r of raw) {
    if (DOMAINE_VALUES.has(r)) {
      out.push(r as Domaine)
      continue
    }
    const mapped = byNormalized.get(normalize(r))
    if (mapped) out.push(mapped)
  }
  return out
}

/** Tonalité d'une card opportunité selon urgence (J-N). */
function recoTone(jours: number | null): OppRecoCard['tone'] {
  if (jours !== null && jours <= 7)  return 'urgent'
  if (jours !== null && jours <= 14) return 'info'
  return 'partner'
}

/** Tag affiché en haut de card reco. */
function recoTag(jours: number | null, type: string): string {
  const typeLabel = type.replace(/_/g, ' ')
  if (jours === null)   return typeLabel
  if (jours === 0)      return `${typeLabel} · Aujourd'hui`
  return `${typeLabel} · J-${jours}`
}

export async function loadDashboardData(cjsUid: string): Promise<DashboardData> {
  const now = new Date()

  // Profil minimal : on lit domainesInteret + region (depuis Utilisateur).
  const profil = await prisma.profilJeune.findUnique({
    where:  { cjsUid },
    select: {
      domainesInteret: true,
      utilisateur: { select: { region: true } },
    },
  })

  const domainesInteret = parseDomainesInteret(profil?.domainesInteret)
  const region          = profil?.utilisateur?.region ?? null

  // Filtre opportunités : publiées, non supprimées, deadline ≥ now (ou nulle).
  const oppsWhere: Prisma.OpportuniteWhereInput = {
    statut:    'publiee',
    deletedAt: null,
    OR: [
      { deadline: null },
      { deadline: { gte: now } },
    ],
  }
  // Si on a des domaines d'intérêt, on les utilise comme filtre prioritaire ;
  // sinon on prend les opportunités les plus récentes toutes catégories.
  if (domainesInteret.length > 0) {
    oppsWhere.domaine = { in: domainesInteret }
  }

  const [recosRaw, eventsRaw, centresRaw, candidaturesRaw] = await Promise.all([
    prisma.opportunite.findMany({
      where: oppsWhere,
      select: {
        id: true,
        slug: true,
        titre: true,
        type: true,
        domaine: true,
        region: true,
        organisation: true,
        organisationLibelle: true,
        deadline: true,
      },
      orderBy: [
        { deadline: 'asc' },
        { createdAt: 'desc' },
      ],
      take: RECO_LIMIT,
    }),
    prisma.evenement.findMany({
      where:   {
        statut:    { in: ['a_venir', 'en_cours'] },
        dateDebut: { gte: now },
      },
      select:  {
        id: true,
        titre: true,
        dateDebut: true,
        lieu: true,
        estGratuit: true,
        capaciteMax: true,
      },
      orderBy: { dateDebut: 'asc' },
      take:    EVENT_LIMIT,
    }),
    prisma.centre.findMany({
      where:   {
        estActif: true,
        ...(region ? { region } : {}),
      },
      select:  { id: true, nom: true, adresse: true, region: true },
      orderBy: { nom: 'asc' },
      take:    CENTRE_LIMIT,
    }),
    prisma.candidature.findMany({
      where:   {
        cjsUid,
        // On garde toutes les candidatures, y compris Refusée — l'UI affichera
        // le statut tel quel (la décision PO peut filtrer plus tard).
      },
      select:  {
        id: true,
        statut: true,
        soumiseA: true,
        opportunite: {
          select: { titre: true, deadline: true, domaine: true },
        },
      },
      orderBy: { soumiseA: 'desc' },
      take:    TRACKER_LIMIT,
    }),
  ])

  // ── Mapping vers DTOs UI ───────────────────────────────────────────────

  const recoOpps: OppRecoCard[] = recosRaw.map((o) => {
    const jours = joursJusqua(o.deadline, now)
    const orgLibelle = o.organisationLibelle ?? o.organisation
    const orgLine = o.region ? `${orgLibelle} · ${o.region}` : orgLibelle
    return {
      id:    o.id,
      tag:   recoTag(jours, String(o.type)),
      tone:  recoTone(jours),
      title: o.titre,
      org:   orgLine,
      meta: [
        ...(o.region ? [{ icon: 'pin' as const,   label: String(o.region) }] : []),
        { icon: 'target' as const, label: String(o.domaine) },
      ],
      href:     `/opportunites/${o.slug}`,
      ctaLabel: 'Voir détails',
    }
  })

  const events: DashEventItem[] = eventsRaw.map((e) => {
    const { day, month } = formatDateBox(e.dateDebut)
    const subtitleParts: string[] = []
    if (e.lieu) subtitleParts.push(e.lieu)
    if (e.estGratuit) subtitleParts.push('Gratuit')
    if (e.capaciteMax) subtitleParts.push(`${e.capaciteMax} places`)
    return {
      id:       e.id,
      day,
      month,
      title:    e.titre,
      subtitle: subtitleParts.join(' · '),
      href:     `/agenda/${e.id}`,
    }
  })

  const centres: DashCenterItem[] = centresRaw.map((c) => ({
    id:       c.id,
    name:     c.nom,
    address:  c.adresse,
    // Pas de calcul de distance haversine ici (pas de géoloc jeune) — on
    // affiche la région à la place. La vraie distance sera ajoutée quand le
    // jeune partagera sa position (GUIC-200+).
    distance: String(c.region),
    href:     `/centres/${c.id}`,
  }))

  const tracker: TrackerItem[] = candidaturesRaw.map((c) => {
    const { step, label, tone } = statutToStep(String(c.statut))
    const jours = joursJusqua(c.opportunite?.deadline ?? null, now)
    const subtitleParts: string[] = [
      `Déposée le ${c.soumiseA.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`,
    ]
    if (jours !== null && jours <= 14) subtitleParts.push(`J-${jours} avant clôture`)
    return {
      id:          c.id,
      title:       c.opportunite?.titre ?? 'Candidature',
      subtitle:    subtitleParts.join(' · '),
      icon:        'document',
      tone,
      currentStep: step,
      stepLabel:   label,
      cta:         { label: 'Détails', href: `/jeune/mes-candidatures/${c.id}`, variant: 'ghost' },
    }
  })

  return { recoOpps, events, centres, tracker }
}
