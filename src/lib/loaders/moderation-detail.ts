/**
 * GUIC-702 · PR-B — détail d'une offre en modération (panneau slide-over).
 * Helpers purs (verbe d'historique, mapping) + chargement DB (offre + partenaire
 * + historique AuditLog). `select` ciblé — jamais d'`include` plein (TransformError adapter).
 */
import { prisma } from '@/lib/prisma'
import { detecterSignaux, niveauCarte, type NiveauSignal, type Signal } from '@/lib/moderation/signaux'
import { deriveSourceMod, ageHeures, type SourceMod } from '@/lib/loaders/admin-moderation'

// ─── helpers purs ─────────────────────────────────────────────────────────────

const VERBES: Record<string, string> = {
  'opportunite.approve': 'Approbation',
  'opportunite.reject': 'Rejet',
  'opportunite.publish': 'Publication',
  'opportunite.correction_demandee': 'Correction demandée',
  'opportunite.create': 'Création',
  'opportunite.update': 'Modification',
  'opportunite.delete': 'Suppression',
}

/** Traduit une action AuditLog en libellé lisible ; action inconnue renvoyée telle quelle. */
export function verbeModeration(action: string): string {
  return VERBES[action] ?? action
}

export interface HistoriqueEntry {
  action: string
  verbe: string
  actorLabel: string
  dateLabel: string
  detail: string | null
}

const histFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Motif lisible depuis `meta.reason` (rejet/correction), sinon null. */
function detailDepuisMeta(meta: unknown): string | null {
  if (meta && typeof meta === 'object') {
    const r = (meta as Record<string, unknown>).reason ?? (meta as Record<string, unknown>).message
    if (typeof r === 'string' && r.trim()) return r
  }
  return null
}

export function mapHistoriqueEntry(
  row: { action: string; actorCjsUid: string; meta: unknown; createdAt: Date },
  _now: Date,
): HistoriqueEntry {
  return {
    action: row.action,
    verbe: verbeModeration(row.action),
    actorLabel: row.actorCjsUid,
    dateLabel: histFmt.format(row.createdAt),
    detail: detailDepuisMeta(row.meta),
  }
}

function ageLabel(h: number): string {
  if (h < 1) return 'en attente < 1 h'
  if (h < 48) return `en attente ${h} h`
  return `en attente ${Math.floor(h / 24)} j`
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

// ─── détail ───────────────────────────────────────────────────────────────────

export interface ModerationDetail {
  id: string
  slug: string
  titre: string
  typeLabel: string
  source: SourceMod
  organisation: string
  ageLabel: string
  region: string | null
  remuneration: string | null
  deadlineLabel: string | null
  lienExterne: string | null
  signaux: Signal[]
  niveau: NiveauSignal | null
  description: string
  partenaire: { nom: string; estVerifie: boolean; offresPubliees: number } | null
  historique: HistoriqueEntry[]
}

/** Charge la fiche complète d'une offre en modération. `null` si introuvable. */
export async function getModerationDetail(id: string): Promise<ModerationDetail | null> {
  const o = await prisma.opportunite.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      titre: true,
      type: true,
      description: true,
      organisation: true,
      organisationLibelle: true,
      recruteurUid: true,
      region: true,
      remuneration: true,
      deadline: true,
      lienExterne: true,
      createdAt: true,
      typeRef: { select: { libelle: true } },
      org: { select: { id: true, nom: true, estVerifie: true } },
      itemsCuration: { select: { id: true }, take: 1 },
    },
  })
  if (!o) return null

  const now = new Date()
  const source = deriveSourceMod(o)
  const signaux = detecterSignaux({
    titre: o.titre,
    description: o.description,
    remuneration: o.remuneration,
    source,
    partenaireVerifie: o.org?.estVerifie ?? false,
  })

  let partenaire: ModerationDetail['partenaire'] = null
  if (o.org) {
    const offresPubliees = await prisma.opportunite.count({
      where: { organisationId: o.org.id, statut: 'publiee', deletedAt: null },
    })
    partenaire = { nom: o.org.nom, estVerifie: o.org.estVerifie, offresPubliees }
  }

  const logs = await prisma.auditLog.findMany({
    where: { targetType: 'opportunite', targetId: id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { action: true, actorCjsUid: true, meta: true, createdAt: true },
  })
  const historique = logs
    .filter((l) => l.action.startsWith('opportunite.'))
    .map((l) => mapHistoriqueEntry(l, now))

  return {
    id: o.id,
    slug: o.slug,
    titre: o.titre,
    typeLabel: o.typeRef?.libelle ?? o.type,
    source,
    organisation: o.organisationLibelle ?? o.organisation ?? o.org?.nom ?? '—',
    ageLabel: ageLabel(ageHeures(o.createdAt, now.getTime())),
    region: o.region,
    remuneration: o.remuneration,
    deadlineLabel: o.deadline ? dateFmt.format(o.deadline) : null,
    lienExterne: o.lienExterne,
    signaux,
    niveau: niveauCarte(signaux),
    description: o.description,
    partenaire,
    historique,
  }
}
