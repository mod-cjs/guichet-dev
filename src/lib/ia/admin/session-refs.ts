// Fiches métier liées à une session Yaye (Lot 7, spec §57 — « liens directs »).
// Lecture seule : on scanne les événements `api_appelee` pour en extraire des IDs
// d'entités (opportuniteId, ressourceId) présents dans les `args`, puis on les résout
// en liens cliquables vers les pages EXISTANTES. Le bénéficiaire (cjs_uid) donne un
// lien direct vers sa fiche admin. Aucune écriture.

import { prisma } from '@/lib/prisma'
import type { ReconstructedTranscript } from '@/lib/ia/metrics/transcript'

export interface SessionRef {
  kind: 'beneficiaire' | 'opportunite' | 'ressource'
  label: string
  href: string
}

/** Extrait une string sous une clé d'un payload `{ args: <json> }` de façon défensive. */
function idsFromEvents(transcript: ReconstructedTranscript, key: string): string[] {
  const ids = new Set<string>()
  for (const ev of transcript.events) {
    const p = ev.payload
    if (!p || typeof p !== 'object') continue
    const argsRaw = (p as Record<string, unknown>).args
    if (typeof argsRaw !== 'string') continue
    try {
      const args = JSON.parse(argsRaw) as Record<string, unknown>
      const v = args[key]
      if (typeof v === 'string' && v.trim()) ids.add(v.trim())
    } catch {
      /* args non parsable → ignoré */
    }
  }
  return [...ids]
}

/**
 * Résout les fiches métier référencées par une session en liens directs.
 * Bénéficiaire + opportunités citées + ressources réservées.
 */
export async function resolveSessionRefs(transcript: ReconstructedTranscript): Promise<SessionRef[]> {
  const refs: SessionRef[] = []

  // Bénéficiaire — lien direct vers sa fiche admin.
  if (transcript.cjsUid) {
    refs.push({
      kind: 'beneficiaire',
      label: transcript.cjsUid,
      href: `/admin/utilisateurs/${transcript.cjsUid}`,
    })
  }

  const oppIds = idsFromEvents(transcript, 'opportuniteId')
  const resIds = idsFromEvents(transcript, 'ressourceId')

  const [opps, ressources] = await Promise.all([
    oppIds.length
      ? prisma.opportunite.findMany({
          where: { id: { in: oppIds } },
          select: { slug: true, titre: true },
        })
      : Promise.resolve([]),
    resIds.length
      ? prisma.ressourceCentre.findMany({
          where: { id: { in: resIds } },
          select: { id: true, nom: true, centre: { select: { slug: true, nom: true } } },
        })
      : Promise.resolve([]),
  ])

  for (const o of opps) {
    if (o.slug) refs.push({ kind: 'opportunite', label: o.titre, href: `/opportunites/${o.slug}` })
  }
  for (const r of ressources) {
    if (r.centre.slug) {
      refs.push({
        kind: 'ressource',
        label: `${r.nom} · ${r.centre.nom}`,
        href: `/centres/${r.centre.slug}/ressources/${r.id}`,
      })
    }
  }

  return refs
}
