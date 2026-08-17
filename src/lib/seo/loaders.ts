/**
 * Loaders SEO (GUIC-25 / M7) — requêtes Prisma minimales pour les données
 * structurées JSON-LD des pages de détail. Isolés ici pour garder `json-ld.ts`
 * pur (Date-based) et testable sans DB.
 */
import { prisma } from '@/lib/prisma'
import { jobPostingJsonLd, eventJsonLd, type JsonLdObject } from './json-ld'

/** JobPosting d'une opportunité publiée, ou null si introuvable/non publiée. */
export async function getOpportuniteJsonLd(slug: string): Promise<JsonLdObject | null> {
  const o = await prisma.opportunite.findFirst({
    where: { slug, statut: 'publiee', deletedAt: null, NOT: { org: { statut: 'suspendue' } } }, // GUIC-705
    select: {
      slug: true,
      titre: true,
      description: true,
      type: true,
      organisation: true,
      organisationLibelle: true,
      region: true,
      remuneration: true,
      deadline: true,
      createdAt: true,
    },
  })
  if (!o) return null
  return jobPostingJsonLd({
    ...o,
    type: String(o.type),
    region: o.region ? String(o.region) : null,
  })
}

/** Event d'un événement de l'agenda, ou null si introuvable/non indexable. */
export async function getEvenementJsonLd(id: string): Promise<JsonLdObject | null> {
  const e = await prisma.evenement.findFirst({
    where: { id, statut: { in: ['a_venir', 'en_cours', 'termine'] } },
    select: {
      id: true,
      titre: true,
      description: true,
      dateDebut: true,
      dateFin: true,
      lieu: true,
      estGratuit: true,
      statut: true,
    },
  })
  if (!e) return null
  return eventJsonLd({ ...e, statut: String(e.statut) })
}
