'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import { confirmerEmprunt, retournerEmprunt, BiblioDomainError } from '@/lib/bibliotheque/service'
import type { ApiResponse } from '@/types/api'
import type { JeuneIdentifie, EmpruntBrief } from './types'

/**
 * GUIC-521 — Le conseiller (bibliothécaire de son centre) confirme un retrait
 * ou enregistre un retour. Réemploi du service ; périmètre = centre AgentCentre
 * (staffCentreId), traçabilité via confirmePar = cjsUid du conseiller.
 */
async function guard() {
  const session = await getSession()
  if (!session) return { error: { code: 'UNAUTHENTICATED', message: 'Session requise.' } as const }
  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) return { error: { code: 'FORBIDDEN', message: 'Accès conseiller requis.' } as const }
  return { session, ctx }
}

export async function confirmerRetrait(empruntId: string): Promise<ApiResponse<{ id: string }>> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  try {
    await confirmerEmprunt({ empruntId, staffCentreId: g.ctx.centreId, staffCjsUid: g.session.cjsUid })
    revalidatePath('/conseiller/bibliotheque')
    return { data: { id: empruntId } }
  } catch (e) {
    if (e instanceof BiblioDomainError) return { error: { code: e.code, message: 'Action impossible sur cet emprunt.' } }
    throw e
  }
}

export async function enregistrerRetour(empruntId: string): Promise<ApiResponse<{ id: string }>> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  try {
    await retournerEmprunt({ empruntId, staffCentreId: g.ctx.centreId })
    revalidatePath('/conseiller/bibliotheque')
    return { data: { id: empruntId } }
  } catch (e) {
    if (e instanceof BiblioDomainError) return { error: { code: e.code, message: 'Action impossible sur cet emprunt.' } }
    throw e
  }
}

import { prisma } from '@/lib/prisma'
import { initierEmprunt } from '@/lib/bibliotheque/service'
import { getCentreBeneficiaires } from '@/lib/loaders/conseiller'

/** Recherche de bénéficiaires du centre (typeahead du prêt au comptoir). */
export async function rechercherBeneficiairesPourPret(
  q: string,
): Promise<ApiResponse<{ cjsUid: string; name: string }[]>> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  const term = q.trim()
  if (term.length < 2) return { data: [] }
  const { items } = await getCentreBeneficiaires(g.ctx.centreId, term)
  return { data: items.slice(0, 8).map((b) => ({ cjsUid: b.cjsUid, name: b.name })) }
}

/**
 * GUIC-521 — Prêt direct au comptoir (walk-in) : le conseiller prête un exemplaire
 * disponible de son centre à un bénéficiaire → emprunt créé puis confirmé (`en_cours`).
 */
export async function preterLivre(
  exemplaireId: string,
  beneficiaireUid: string,
): Promise<ApiResponse<{ id: string }>> {
  const g = await guard()
  if ('error' in g) return { error: g.error }

  // Périmètre : l'exemplaire doit appartenir au centre du conseiller.
  const exemplaire = await prisma.exemplaire.findUnique({
    where: { id: exemplaireId },
    select: { centreId: true, statut: true },
  })
  if (!exemplaire || exemplaire.centreId !== g.ctx.centreId) {
    return { error: { code: 'FORBIDDEN', message: 'Exemplaire hors de votre centre.' } }
  }
  if (exemplaire.statut !== 'disponible') {
    return { error: { code: 'CONFLICT', message: 'Cet exemplaire n’est plus disponible.' } }
  }

  try {
    const emprunt = await initierEmprunt({ cjsUid: beneficiaireUid, exemplaireId })
    await confirmerEmprunt({ empruntId: emprunt.id, staffCentreId: g.ctx.centreId, staffCjsUid: g.session.cjsUid })
    revalidatePath('/conseiller/bibliotheque')
    revalidatePath('/conseiller/bibliotheque/catalogue')
    return { data: { id: emprunt.id } }
  } catch (e) {
    if (e instanceof BiblioDomainError) return { error: { code: e.code, message: 'Prêt impossible pour cet exemplaire.' } }
    throw e
  }
}

import { verifyCJSCardToken, CJSCardTokenError } from '@/lib/auth/verifyCJSCardToken'
import { getEmpruntsActifs, getCatalogueCentre } from '@/lib/bibliotheque/service'
import { buildInitials } from '@/lib/loaders/conseiller'


function extractCardToken(raw: string): string | null {
  const marker = '/checkin/v1/'
  const i = raw.indexOf(marker)
  const token = i === -1 ? raw.trim() : raw.slice(i + marker.length).split(/[/?#\s]/)[0]
  return token || null
}

const RET_FMT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' })

/**
 * GUIC-521 — Identifie un jeune par le scan de sa carte CJS (jeton check-in),
 * SANS enregistrer de présence, et renvoie ses emprunts au centre :
 * « à retirer » (réservés en ligne) + « à rendre » (en cours / en retard).
 */
export async function identifierParCarte(rawQr: string): Promise<ApiResponse<JeuneIdentifie>> {
  const g = await guard()
  if ('error' in g) return { error: g.error }

  const token = extractCardToken(rawQr)
  if (!token) return { error: { code: 'INVALID_QR', message: 'QR non reconnu.' } }

  let sub: string
  try {
    const payload = await verifyCJSCardToken(token)
    if (!payload) return { error: { code: 'INVALID_CARD', message: 'Carte non valide.' } }
    sub = payload.sub
  } catch (e) {
    if (e instanceof CJSCardTokenError && e.reason === 'expired') {
      return { error: { code: 'CARD_EXPIRED', message: 'QR expiré — demandez au jeune de rafraîchir sa carte.' } }
    }
    return { error: { code: 'INVALID_CARD', message: 'Carte illisible.' } }
  }

  const [u, emprunts] = await Promise.all([
    prisma.utilisateur.findUnique({ where: { cjsUid: sub }, select: { prenom: true, nom: true } }),
    getEmpruntsActifs(sub),
  ])
  if (!u) return { error: { code: 'NOT_FOUND', message: 'Jeune introuvable.' } }

  const duCentre = emprunts.filter((e) => e.exemplaire.centreId === g.ctx.centreId)
  const toBrief = (e: (typeof duCentre)[number]): EmpruntBrief => ({
    id: e.id,
    livreTitre: e.livre.titre,
    codeBarre: e.exemplaire.codeBarre,
    retourLabel: e.dateRetourPrevue ? RET_FMT.format(new Date(e.dateRetourPrevue)) : null,
    enRetard: e.statut === 'en_retard',
  })

  return {
    data: {
      cjsUid: sub,
      name: `${u.prenom} ${u.nom}`.trim(),
      initials: buildInitials(u.prenom, u.nom),
      aRetirer: duCentre.filter((e) => e.statut === 'initie').map(toBrief),
      aRendre: duCentre.filter((e) => e.statut === 'en_cours' || e.statut === 'en_retard').map(toBrief),
    },
  }
}

/** Recherche de livres disponibles au centre (pour le prêt au comptoir). */
export async function rechercherLivresPourPret(
  q: string,
): Promise<ApiResponse<import('./types').LivrePret[]>> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  const term = q.trim().toLowerCase()
  if (term.length < 2) return { data: [] }
  const catalogue = await getCatalogueCentre(g.ctx.centreId)
  const res = catalogue
    .filter((l) => l.exemplairesDisponibles > 0 && (`${l.titre} ${l.auteur}`.toLowerCase().includes(term)))
    .slice(0, 8)
    .map((l) => {
      const dispo = l.emplacements.find((e) => e.statut === 'disponible')!
      return { exemplaireId: dispo.exemplaireId, titre: l.titre, auteur: l.auteur, emplacement: `${dispo.rayon}·${dispo.etagere}·${dispo.position}`, couvertureUrl: l.couvertureUrl, exemplairesDisponibles: l.exemplairesDisponibles, exemplairesTotal: l.exemplairesTotal }
    })
  return { data: res }
}

import { createExemplaire, updateExemplaire, deleteExemplaire } from '@/lib/bibliotheque/service'

export interface ExemplaireInputConseiller {
  codeBarre: string
  rayon: string
  etagere: string
  position: string
}

export async function ajouterExemplaire(livreId: string, input: ExemplaireInputConseiller): Promise<ApiResponse<{ id: string }>> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  const codeBarre = input.codeBarre.trim()
  if (!codeBarre || !input.rayon.trim()) return { error: { code: 'VALIDATION_ERROR', message: 'Code-barre et rayon requis.' } }
  try {
    const ex = await createExemplaire({ livreId, centreId: g.ctx.centreId, codeBarre, rayon: input.rayon.trim(), etagere: input.etagere.trim(), position: input.position.trim() })
    revalidatePath(`/conseiller/bibliotheque/livre/${livreId}`)
    return { data: ex }
  } catch (e) {
    if (e instanceof BiblioDomainError) return { error: { code: e.code, message: 'Ajout impossible (code-barre déjà utilisé ?).' } }
    throw e
  }
}

export async function modifierExemplaire(
  exemplaireId: string,
  livreId: string,
  input: { rayon: string; etagere: string; position: string; statut?: 'disponible' | 'indisponible' },
): Promise<ApiResponse<{ ok: true }>> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  try {
    await updateExemplaire(exemplaireId, g.ctx.centreId, input)
    revalidatePath(`/conseiller/bibliotheque/livre/${livreId}`)
    return { data: { ok: true } }
  } catch (e) {
    if (e instanceof BiblioDomainError) return { error: { code: e.code, message: 'Modification impossible.' } }
    throw e
  }
}

export async function retirerExemplaire(exemplaireId: string, livreId: string): Promise<ApiResponse<{ ok: true }>> {
  const g = await guard()
  if ('error' in g) return { error: g.error }
  try {
    await deleteExemplaire(exemplaireId, g.ctx.centreId)
    revalidatePath(`/conseiller/bibliotheque/livre/${livreId}`)
    return { data: { ok: true } }
  } catch (e) {
    if (e instanceof BiblioDomainError) return { error: { code: e.code, message: 'Retrait impossible (exemplaire emprunté ?).' } }
    throw e
  }
}
