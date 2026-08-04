import { prisma } from '@/lib/prisma'
import type { UserDetailData } from '@/app/admin/utilisateurs/[cjsUid]/UserDetailTabs'

/**
 * Détail utilisateur (admin — fiche 5 onglets, GUIC-701 PR-B). Lecture seule ; le rôle
 * est piloté par le SSO. Anonymisé : les PII sont déjà null en base (effacées à l'anonymisation).
 * Garde-fou spike : `select` ciblé.
 */

const dFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
const mFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' })
function relSeen(d: Date | null, now: Date): string | null {
  if (!d) return null
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} j`
  const m = Math.floor(days / 30)
  return m < 12 ? `il y a ${m} mois` : `il y a ${Math.floor(m / 12)} an(s)`
}
function toArr(v: unknown): string[] { return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [] }

export async function getUtilisateurDetail(cjsUid: string): Promise<UserDetailData | null> {
  const now = new Date()
  const [u, retenues, consentsRaw] = await Promise.all([
    prisma.utilisateur.findUnique({
      where: { cjsUid },
      select: {
        cjsUid: true, prenom: true, nom: true, email: true, telephone: true, region: true, commune: true, genre: true,
        statut: true, role: true, createdAt: true, updatedAt: true, lastSeenAt: true, deletedAt: true,
        notifCandidatures: true, notifMessages: true,
        profil: {
          select: {
            completionScore: true, niveauEtude: true, situationEmploi: true, biographie: true, photoUrl: true,
            competences: true, domainesInteret: true, cvUrl: true,
            centrePrincipal: { select: { nom: true } },
            experiences: { orderBy: { dateDebut: 'desc' }, select: { id: true, poste: true, organisation: true, dateDebut: true, dateFin: true } },
            diplomes: { orderBy: { anneeObtention: 'desc' }, select: { id: true, intitule: true, etablissement: true, anneeObtention: true, niveau: true, mention: true } },
            certificats: { orderBy: { obtenuLe: 'desc' }, select: { id: true, formation: true, obtenuLe: true } },
          },
        },
        _count: { select: { candidatures: true, inscriptions: true, reservations: true, checkIns: true, ressourcesFavoris: true, opportunitesFavorites: true, insertions: true } },
      },
    }),
    prisma.candidature.count({ where: { cjsUid, statut: 'Retenue' } }),
    prisma.candidature.findMany({ where: { cjsUid, consentAt: { not: null } }, orderBy: { consentAt: 'desc' }, take: 5, select: { cguVersion: true, consentAt: true, consentIp: true } }),
  ])
  if (!u) return null

  return {
    cjsUid: u.cjsUid, prenom: u.prenom, nom: u.nom, email: u.email, telephone: u.telephone,
    region: u.region, commune: u.commune, genre: u.genre,
    statut: u.statut, role: u.role,
    createdAt: dFmt.format(u.createdAt), lastSeenAt: relSeen(u.lastSeenAt, now),
    profil: u.profil ? {
      completionScore: u.profil.completionScore, niveauEtude: u.profil.niveauEtude, situationEmploi: u.profil.situationEmploi,
      biographie: u.profil.biographie, photoUrl: u.profil.photoUrl, centrePrincipalNom: u.profil.centrePrincipal?.nom ?? null,
      competences: toArr(u.profil.competences), domainesInteret: toArr(u.profil.domainesInteret), cvUrl: u.profil.cvUrl,
    } : null,
    activite: {
      candidatures: u._count.candidatures, candidaturesRetenues: retenues, inscriptions: u._count.inscriptions,
      reservations: u._count.reservations, checkIns: u._count.checkIns,
      favoris: u._count.ressourcesFavoris + u._count.opportunitesFavorites, insertions: u._count.insertions,
    },
    parcours: {
      experiences: (u.profil?.experiences ?? []).map((e) => ({ id: e.id, poste: e.poste, organisation: e.organisation, periode: `${mFmt.format(e.dateDebut)} — ${e.dateFin ? mFmt.format(e.dateFin) : 'auj.'}` })),
      diplomes: (u.profil?.diplomes ?? []).map((d) => ({ id: d.id, intitule: d.intitule, etablissement: d.etablissement, annee: d.anneeObtention, niveau: d.niveau, mention: d.mention })),
      certificats: (u.profil?.certificats ?? []).map((c) => ({ id: c.id, formation: c.formation, obtenuLe: mFmt.format(c.obtenuLe) })),
      cvUrl: u.profil?.cvUrl ?? null,
    },
    conformite: {
      consentements: consentsRaw.map((c) => ({ version: c.cguVersion ?? '—', date: c.consentAt ? dFmt.format(c.consentAt) : '—', ip: c.consentIp ?? '—' })),
      notifCandidatures: u.notifCandidatures, notifMessages: u.notifMessages,
      createdAt: dFmt.format(u.createdAt), updatedAt: dFmt.format(u.updatedAt), lastSeenAt: relSeen(u.lastSeenAt, now),
      deletedAt: u.deletedAt ? dFmt.format(u.deletedAt) : null,
    },
  }
}
