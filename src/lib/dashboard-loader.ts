import { prisma } from '@/lib/prisma'
import type { ActivityItem, DashboardCounts } from '@/types/profil'

export const ACTIVITY_LIMIT_MIN = 1
export const ACTIVITY_LIMIT_MAX = 20
export const ACTIVITY_LIMIT_DEFAULT = 10

export async function loadDashboardCounts(cjsUid: string): Promise<DashboardCounts> {
  const [candidatures, eventsInscrits, favoris, certificats, experiences, diplomes] = await Promise.all([
    prisma.candidature.count({          where: { cjsUid } }),
    prisma.inscriptionEvenement.count({ where: { cjsUid } }),
    prisma.ressourceFavorite.count({    where: { cjsUid } }),
    prisma.certificatMoodle.count({     where: { profil: { cjsUid } } }),
    prisma.experience.count({           where: { profil: { cjsUid } } }),
    prisma.diplome.count({              where: { profil: { cjsUid } } }),
  ])
  return { candidatures, eventsInscrits, favoris, certificats, experiences, diplomes }
}

export function clampLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit < ACTIVITY_LIMIT_MIN) return ACTIVITY_LIMIT_MIN
  if (limit > ACTIVITY_LIMIT_MAX) return ACTIVITY_LIMIT_MAX
  return Math.floor(limit)
}

export async function loadRecentActivity(cjsUid: string, limit: number = ACTIVITY_LIMIT_DEFAULT): Promise<ActivityItem[]> {
  const take = clampLimit(limit)

  // Marge : chaque source peut être dominante, on prend `take` partout puis on tronque après merge.
  const [candidatures, inscriptions, favoris, experiences, diplomes, certificats] = await Promise.all([
    prisma.candidature.findMany({
      where:   { cjsUid },
      take,
      orderBy: { soumiseA: 'desc' },
      select:  { id: true, soumiseA: true, statut: true, opportunite: { select: { titre: true } } },
    }),
    prisma.inscriptionEvenement.findMany({
      where:   { cjsUid },
      take,
      orderBy: { inscritA: 'desc' },
      select:  { id: true, inscritA: true, evenement: { select: { titre: true, dateDebut: true } } },
    }),
    prisma.ressourceFavorite.findMany({
      where:   { cjsUid },
      take,
      orderBy: { createdAt: 'desc' },
      select:  { cjsUid: true, ressourceId: true, createdAt: true, ressource: { select: { titre: true } } },
    }),
    prisma.experience.findMany({
      where:   { profil: { cjsUid } },
      take,
      orderBy: { createdAt: 'desc' },
      select:  { id: true, createdAt: true, poste: true, organisation: true },
    }),
    prisma.diplome.findMany({
      where:   { profil: { cjsUid } },
      take,
      orderBy: { createdAt: 'desc' },
      select:  { id: true, createdAt: true, intitule: true, anneeObtention: true },
    }),
    prisma.certificatMoodle.findMany({
      where:   { profil: { cjsUid } },
      take,
      orderBy: { obtenuLe: 'desc' },
      select:  { id: true, obtenuLe: true, formation: true, urlCertificat: true },
    }),
  ])

  const items: ActivityItem[] = [
    ...candidatures.map(c => ({
      type: 'candidature' as const,
      id: c.id,
      date: c.soumiseA.toISOString(),
      opportuniteTitre: c.opportunite?.titre ?? '',
      statut: String(c.statut),
    })),
    ...inscriptions.map(i => ({
      type: 'inscription_evenement' as const,
      id: i.id,
      date: i.inscritA.toISOString(),
      evenementTitre: i.evenement?.titre ?? '',
      dateEvent: i.evenement?.dateDebut.toISOString() ?? '',
    })),
    ...favoris.map(f => ({
      type: 'favori_ressource' as const,
      id: `${f.cjsUid}:${f.ressourceId}`,
      date: f.createdAt.toISOString(),
      ressourceTitre: f.ressource?.titre ?? '',
    })),
    ...experiences.map(e => ({
      type: 'experience_ajoutee' as const,
      id: e.id,
      date: e.createdAt.toISOString(),
      poste: e.poste,
      organisation: e.organisation,
    })),
    ...diplomes.map(d => ({
      type: 'diplome_ajoute' as const,
      id: d.id,
      date: d.createdAt.toISOString(),
      intitule: d.intitule,
      anneeObtention: d.anneeObtention,
    })),
    ...certificats.map(c => ({
      type: 'certificat_recu' as const,
      id: c.id,
      date: c.obtenuLe.toISOString(),
      intitule: c.formation,
      urlCertificat: c.urlCertificat,
    })),
  ]

  items.sort((a, b) => b.date.localeCompare(a.date))
  return items.slice(0, take)
}
