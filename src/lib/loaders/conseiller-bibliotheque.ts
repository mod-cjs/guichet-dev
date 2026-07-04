import { prisma } from '@/lib/prisma'
import type { StatutEmprunt } from '@prisma/client'

/**
 * GUIC-521 — Emprunts de la bibliothèque du centre, pour l'espace conseiller.
 * Enrichit la vue emprunt avec l'emprunteur (le jeune) — non exposé par
 * `EmpruntVue` du service. Scopé centre.
 */
export interface EmpruntConseillerItem {
  id: string
  statut: StatutEmprunt
  livreTitre: string
  livreAuteur: string
  codeBarre: string
  emplacement: string
  emprunteur: string
  dateLabel: string
  retourLabel: string | null
  enRetard: boolean
}

const FMT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
function fmt(d: Date | null): string | null {
  if (!d) return null
  const s = FMT.format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export async function getEmpruntsBibliotheque(
  centreId: string,
  statuts: StatutEmprunt[],
  now: Date = new Date(),
): Promise<EmpruntConseillerItem[]> {
  const rows = await prisma.emprunt.findMany({
    where: { exemplaire: { centreId }, statut: { in: statuts } },
    orderBy: { initieA: 'desc' },
    take: 200,
    include: {
      utilisateur: { select: { prenom: true, nom: true } },
      exemplaire: { include: { livre: { select: { titre: true, auteur: true } } } },
    },
  })
  return rows.map((e) => ({
    id: e.id,
    statut: e.statut,
    livreTitre: e.exemplaire.livre.titre,
    livreAuteur: e.exemplaire.livre.auteur,
    codeBarre: e.exemplaire.codeBarre,
    emplacement: `${e.exemplaire.rayon} · ${e.exemplaire.etagere} · ${e.exemplaire.position}`,
    emprunteur: `${e.utilisateur.prenom} ${e.utilisateur.nom}`.trim(),
    dateLabel: fmt(e.initieA) ?? '',
    retourLabel: fmt(e.dateRetourPrevue),
    enRetard: e.statut === 'en_retard' || (e.dateRetourPrevue != null && e.statut === 'en_cours' && e.dateRetourPrevue < now),
  }))
}

/** Compteurs par onglet (à confirmer / à rendre / en retard). */
export async function getBibliothequeCounts(centreId: string): Promise<{ confirmer: number; rendre: number; retard: number }> {
  const [confirmer, rendre, retard] = await Promise.all([
    prisma.emprunt.count({ where: { exemplaire: { centreId }, statut: 'initie' } }),
    prisma.emprunt.count({ where: { exemplaire: { centreId }, statut: 'en_cours' } }),
    prisma.emprunt.count({ where: { exemplaire: { centreId }, statut: 'en_retard' } }),
  ])
  return { confirmer, rendre, retard }
}
