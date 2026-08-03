'use server'

import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { sendResendEmail } from '@/lib/email/resend'
import { sendOrangeSms, toOrangeRecipient } from '@/lib/sms/orange'
import { sendTemplateMessage } from '@/lib/whatsapp'
import { planRelance, type CanalRelance, type CibleRelance } from '@/lib/notifications/relance-plan'
import { getCandidatureDetail, type CandidatureDetail } from '@/lib/loaders/candidature-detail'
import type { DestinataireRelance, Prisma } from '@prisma/client'

/**
 * Charge la fiche détail d'une candidature pour le slide-over admin (GUIC-692 PR-B).
 * Garde admin — supervision (lecture seule). Renvoie `null` si introuvable.
 */
export async function chargerCandidatureDetail(id: string): Promise<CandidatureDetail | null> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) throw new Error('FORBIDDEN')
  if (!id) return null
  return getCandidatureDetail(id)
}

const WA_TEMPLATE = process.env.WHATSAPP_TEMPLATE_RELANCE ?? 'guichet_relance'

/**
 * Relance multi-canal (admin — SUPERVISION, GUIC-692 PR-C). In-app + e-mail en message
 * libre ; WhatsApp/SMS par template + skip si pas de numéro (findings spike). Journalisée
 * (AuditLog) + historisée (RelanceCandidature). Best-effort : un canal en échec (creds/env)
 * n'interrompt pas les autres.
 */
export async function relancerCandidatures(
  ids: string[],
  opts: { destinataire: DestinataireRelance; canaux: CanalRelance[]; message?: string },
): Promise<{ envoyees: number; ignorees: number }> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) throw new Error('FORBIDDEN')
  if (ids.length === 0 || opts.canaux.length === 0) return { envoyees: 0, ignorees: 0 }

  let envoyees = 0
  let ignorees = 0

  for (const id of ids) {
    const c = await prisma.candidature.findUnique({
      where: { id },
      select: {
        cjsUid: true,
        utilisateur: { select: { email: true, telephone: true, prenom: true, nom: true } },
        opportunite: { select: { titre: true, recruteurUid: true } },
      },
    })
    if (!c) continue

    const recruteurUid = c.opportunite.recruteurUid
    const plan = planRelance({
      destinataire: opts.destinataire,
      canaux: opts.canaux,
      candidatHasPhone: Boolean(c.utilisateur.telephone),
      recruteurResolvable: Boolean(recruteurUid),
    })
    ignorees += plan.ignores.length

    // Contacts recruteur (chargés une fois si ciblé).
    let recruteur: { cjsUid: string; email: string | null; telephone: string | null } | null = null
    if (recruteurUid && plan.envois.some((e) => e.cible === 'recruteur')) {
      const u = await prisma.utilisateur.findUnique({ where: { cjsUid: recruteurUid }, select: { cjsUid: true, email: true, telephone: true } })
      if (u) recruteur = u
    }

    const titre = `Relance — ${c.opportunite.titre}`
    const contenu = opts.message?.trim() || `Rappel concernant la candidature « ${c.opportunite.titre} ».`

    for (const env of plan.envois) {
      const dest = env.cible === 'candidat'
        ? { cjsUid: c.cjsUid, email: c.utilisateur.email, telephone: c.utilisateur.telephone }
        : recruteur
      if (!dest) { ignorees++; continue }
      try {
        await deliverRelance(env.cible, env.canal, dest, titre, contenu)
        envoyees++
      } catch {
        // Canal en échec (creds/env manquants) — non bloquant.
      }
    }

    await prisma.relanceCandidature.create({
      data: {
        candidatureId: id,
        parAdminCjsUid: session.cjsUid,
        destinataire: opts.destinataire,
        canaux: opts.canaux as unknown as Prisma.InputJsonValue,
        message: opts.message?.trim() || null,
      },
    })
    await recordAudit(session.cjsUid, 'candidature.relance', {
      targetType: 'candidature', targetId: id,
      meta: { destinataire: opts.destinataire, canaux: opts.canaux, envois: plan.envois.length, ignores: plan.ignores.length },
    })
  }

  return { envoyees, ignorees }
}

async function deliverRelance(
  cible: CibleRelance,
  canal: CanalRelance,
  dest: { cjsUid: string; email: string | null; telephone: string | null },
  titre: string,
  contenu: string,
): Promise<void> {
  switch (canal) {
    case 'in_app':
      await prisma.notification.create({ data: { cjsUid: dest.cjsUid, type: 'Candidature', titre, contenu, iconName: 'bell' } })
      return
    case 'email':
      if (!dest.email) throw new Error('NO_EMAIL')
      await sendResendEmail(dest.email, titre, `<p>${contenu}</p>`)
      return
    case 'sms':
      if (!dest.telephone) throw new Error('NO_PHONE')
      await sendOrangeSms(toOrangeRecipient(dest.telephone), `${titre} — ${contenu}`)
      return
    case 'whatsapp':
      if (!dest.telephone) throw new Error('NO_PHONE')
      // Message business hors fenêtre 24h → template Meta pré-approuvé (paramétré).
      await sendTemplateMessage(dest.telephone, WA_TEMPLATE, 'fr', [contenu])
      return
  }
  // cible non utilisée directement mais conservée pour l'audit/typage.
  void cible
}
