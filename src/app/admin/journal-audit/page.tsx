import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import type { IconName } from '@/components/ui/Icon'
import { AuditTimeline, type AuditRow } from './AuditTimeline'

export const metadata: Metadata = { title: 'Journal d’audit — Admin CJS', referrer: 'no-referrer' }

const PAGE_SIZE = 100

/** Métadonnées d'affichage par type d'action auditée. */
const ACTION_META: Record<string, { text: string; tone: AuditRow['tone']; icon: IconName }> = {
  'fiche_beneficiaire.view': { text: 'a consulté une fiche bénéficiaire', tone: 'grey', icon: 'eye' },
  'export.utilisateurs': { text: 'a exporté la liste des utilisateurs', tone: 'blue', icon: 'download' },
  'export.opportunites': { text: 'a exporté les opportunités', tone: 'blue', icon: 'download' },
  'opportunite.approve': { text: 'a approuvé une publication', tone: 'green', icon: 'check' },
  'opportunite.reject': { text: 'a rejeté une publication', tone: 'red', icon: 'block' },
  'ressource_centre.create': { text: 'a créé une ressource de centre', tone: 'green', icon: 'pin' },
  'ressource_centre.update': { text: 'a modifié une ressource de centre', tone: 'grey', icon: 'pin' },
  'ressource_centre.delete': { text: 'a supprimé une ressource de centre', tone: 'red', icon: 'block' },
  'ressource_sensible.download': { text: 'a téléchargé un document personnel sensible', tone: 'blue', icon: 'download' },
}

/** Identifiant court lisible quand le nom n'est pas résolvable. */
function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id
}

export default async function Page() {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) redirect('/auth/connexion')

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: PAGE_SIZE }),
    prisma.auditLog.count(),
  ])

  // Résolution des noms : acteurs + cibles « utilisateur » en un seul findMany.
  const uids = new Set<string>()
  for (const l of logs) {
    uids.add(l.actorCjsUid)
    if (l.targetType === 'utilisateur' && l.targetId) uids.add(l.targetId)
  }
  const users = uids.size
    ? await prisma.utilisateur.findMany({
        where: { cjsUid: { in: [...uids] } },
        select: { cjsUid: true, prenom: true, nom: true },
      })
    : []
  const nameByUid = new Map(users.map((u) => [u.cjsUid, `${u.prenom} ${u.nom}`.trim() || u.cjsUid]))

  const fmt = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const rows: AuditRow[] = logs.map((l) => {
    const meta = ACTION_META[l.action] ?? { text: l.action, tone: 'grey' as const, icon: 'document' as IconName }
    let targetText: string | null = null
    if (l.targetType === 'utilisateur' && l.targetId) {
      targetText = `sur la fiche de ${nameByUid.get(l.targetId) ?? shortId(l.targetId)}`
    } else if (l.targetType === 'opportunite' && l.targetId) {
      targetText = `(réf. ${shortId(l.targetId)})`
    } else if (l.targetType === 'collection') {
      const count = (l.meta as { count?: number } | null)?.count
      if (typeof count === 'number') targetText = `(${count.toLocaleString('fr-FR')} enregistrements)`
    }
    return {
      id: l.id,
      actor: nameByUid.get(l.actorCjsUid) ?? shortId(l.actorCjsUid),
      actionText: meta.text,
      targetText,
      when: fmt.format(l.createdAt),
      tone: meta.tone,
      icon: meta.icon,
    }
  })

  return <AuditTimeline rows={rows} total={total} />
}
