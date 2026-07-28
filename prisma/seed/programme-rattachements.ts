/**
 * GUIC-684 — Rattachement des contenus seedés à un programme sectoriel.
 *
 * POURQUOI : le rattachement est obligatoire à la création d'un contenu. Un seed
 * qui n'en pose aucun produit une base fraîche entièrement orpheline — sur un
 * environnement neuf (CI, préprod, poste d'un nouveau dev), l'admin est bloqué en
 * édition dès la première fiche ouverte, sans rien avoir fait de mal.
 *
 * Mêmes règles de cohérence métier que `scripts/sql/attach-programmes-enriched.sql`,
 * pour que les deux jeux de données racontent la même histoire.
 *
 * Idempotent : `skipDuplicates` sur la PK composite.
 */
import type { PrismaClient } from '@prisma/client'

/** Programme porteur d'une opportunité, d'après son type et son domaine. */
export function programmePourOpportunite(type: string, domaine: string): string {
  if (domaine === 'Agriculture' || domaine === 'Environnement') return 'yeah'
  if (domaine === 'Entrepreneuriat') return 'yaakaar'
  if (type === 'Emploi' || type === 'Stage') return 'yjc'
  if (type === 'Formation' || type === 'Bourse') return 'edupop'
  return 'yaakaar'
}

/** Programme porteur d'une ressource, d'après son thème éditorial. */
export function programmePourRessource(theme: string): string {
  const t = theme.toLowerCase()
  if (t.includes('emploi')) return 'yjc'
  if (t.includes('entrepreneur')) return 'yaakaar'
  if (t.includes('agri')) return 'yeah'
  return 'edupop'
}

/** Map `slug → id` des programmes (seedés avant les contenus — cf. seed/index.ts). */
export async function chargerProgrammes(prisma: PrismaClient): Promise<Map<string, string>> {
  const rows = await prisma.programme.findMany({ select: { id: true, slug: true } })
  return new Map(rows.map((p) => [p.slug, p.id]))
}

/** Rattache les opportunités seedées, chacune à son programme porteur. */
export async function rattacherOpportunites(prisma: PrismaClient): Promise<number> {
  const programmes = await chargerProgrammes(prisma)
  const opportunites = await prisma.opportunite.findMany({
    where: { programmes: { none: {} } },
    select: { id: true, type: true, domaine: true },
  })

  const data = opportunites
    .map((o) => ({
      opportuniteId: o.id,
      programmeId: programmes.get(programmePourOpportunite(String(o.type), String(o.domaine))),
      principal: true,
    }))
    .filter((r): r is { opportuniteId: string; programmeId: string; principal: boolean } =>
      Boolean(r.programmeId),
    )

  if (data.length === 0) return 0
  const res = await prisma.opportuniteProgramme.createMany({ data, skipDuplicates: true })
  return res.count
}

/** Rattache les ressources seedées, chacune à son programme porteur. */
export async function rattacherRessources(prisma: PrismaClient): Promise<number> {
  const programmes = await chargerProgrammes(prisma)
  const ressources = await prisma.ressource.findMany({
    where: { programmes: { none: {} } },
    select: { id: true, theme: true },
  })

  const data = ressources
    .map((r) => ({
      ressourceId: r.id,
      programmeId: programmes.get(programmePourRessource(r.theme)),
      principal: true,
    }))
    .filter((r): r is { ressourceId: string; programmeId: string; principal: boolean } =>
      Boolean(r.programmeId),
    )

  if (data.length === 0) return 0
  const res = await prisma.ressourceProgramme.createMany({ data, skipDuplicates: true })
  return res.count
}
