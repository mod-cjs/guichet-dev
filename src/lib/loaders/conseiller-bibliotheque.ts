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

// ── Fiche livre (détail centre) — GUIC-522 ────────────────────────────────

export interface ExemplaireDetail {
  id: string
  codeBarre: string
  emplacement: string
  statut: string
  statutLabel: string
  statutTone: 'green' | 'yellow' | 'blue' | 'grey'
  emprunteur: string | null
}
export interface LivreDetailCentre {
  id: string
  titre: string
  auteur: string
  theme: string
  niveau: string | null
  langue: string
  isbn: string | null
  resume: string | null
  couvertureUrl: string | null
  disponibles: number
  total: number
  exemplaires: ExemplaireDetail[]
}

const EX_STATUT: Record<string, { label: string; tone: ExemplaireDetail['statutTone'] }> = {
  disponible: { label: 'Disponible', tone: 'green' },
  emprunte: { label: 'Emprunté', tone: 'yellow' },
  reserve: { label: 'Réservé', tone: 'blue' },
  indisponible: { label: 'Indisponible', tone: 'grey' },
}

/** Fiche d'un livre limitée aux exemplaires du centre (tous statuts + emprunteur courant). */
export async function getLivreDetailCentre(centreId: string, livreId: string): Promise<LivreDetailCentre | null> {
  const livre = await prisma.livre.findUnique({
    where: { id: livreId },
    include: {
      exemplaires: {
        where: { centreId },
        include: {
          emprunts: {
            where: { statut: { in: ['initie', 'en_cours', 'en_retard'] } },
            orderBy: { initieA: 'desc' },
            take: 1,
            include: { utilisateur: { select: { prenom: true, nom: true } } },
          },
        },
        orderBy: [{ rayon: 'asc' }, { etagere: 'asc' }, { position: 'asc' }],
      },
    },
  })
  if (!livre || livre.exemplaires.length === 0) return null

  const exemplaires: ExemplaireDetail[] = livre.exemplaires.map((e) => {
    const s = EX_STATUT[String(e.statut)] ?? { label: String(e.statut), tone: 'grey' as const }
    const emp = e.emprunts[0]
    return {
      id: e.id,
      codeBarre: e.codeBarre,
      emplacement: `${e.rayon} · ${e.etagere} · ${e.position}`,
      statut: String(e.statut),
      statutLabel: s.label,
      statutTone: s.tone,
      emprunteur: emp ? `${emp.utilisateur.prenom} ${emp.utilisateur.nom}`.trim() : null,
    }
  })

  return {
    id: livre.id,
    titre: livre.titre,
    auteur: livre.auteur,
    theme: livre.theme,
    niveau: livre.niveau,
    langue: livre.langue,
    isbn: livre.isbn,
    resume: livre.resume,
    couvertureUrl: livre.couvertureUrl,
    disponibles: exemplaires.filter((e) => e.statut === 'disponible').length,
    total: exemplaires.length,
    exemplaires,
  }
}
