// GUIC-435 (Phase 2 — boucle qualité) — ALERTE sur régression de qualité.
//
// La garde anti-régression (`runRegressionGuard`, appelée par le cron nocturne `yaye-eval`)
// DÉTECTE une chute de YQS / dimensions critiques / précision d'intention sous la baseline,
// mais rien n'AGISSAIT dessus (juste loggé). Ici on notifie les admins → on passe de
// « mesurer » à « alerter ». Idempotence emitEvent (TTL 7 j) → cadence hebdo tant que
// régressé, jamais de spam nocturne.

import { prisma } from '@/lib/prisma'
import { emitEvent, type EmitRecipient } from '@/lib/notifications/emit'
import type { RegressionReport } from './regression-data'
import type { RegressionResult } from './regression'

/** Nomme les métriques réellement en baisse (delta négatif) pour un message actionnable. */
function libelleBaisses(deltas: RegressionResult['deltas']): string {
  const parts: string[] = []
  if (deltas.yqs != null && deltas.yqs < 0) parts.push(`YQS ${deltas.yqs}`)
  if (deltas.fidelite != null && deltas.fidelite < 0) parts.push(`fidélité ${deltas.fidelite}`)
  if (deltas.conformiteCdp != null && deltas.conformiteCdp < 0) parts.push(`conformité CDP ${deltas.conformiteCdp}`)
  if (deltas.intentPrecision != null && deltas.intentPrecision < 0) parts.push(`précision d'intention ${deltas.intentPrecision}`)
  return parts.join(' · ')
}

/**
 * Notifie les admins si la qualité a régressé. Retourne le nombre de destinataires (0 si pas
 * de régression, baseline en cours d'initialisation, ou aucun admin). Fail-soft attendu côté
 * appelant (le cron ne doit pas échouer si l'alerte échoue).
 */
export async function alerterRegressionQualite(report: RegressionReport): Promise<number> {
  if (report.baselineInitialisee || !report.result?.regressed) return 0

  const admins = await prisma.utilisateur.findMany({
    where: { role: 'admin', deletedAt: null },
    select: { cjsUid: true, prenom: true, telephone: true, email: true },
  })
  const recipients: EmitRecipient[] = admins.map((a) => ({
    cjsUid: a.cjsUid, role: 'admin', prenom: a.prenom, telephone: a.telephone, email: a.email,
  }))
  if (recipients.length === 0) return 0

  const detail = libelleBaisses(report.result.deltas)
  await emitEvent('yaye.qualite_degradee', {
    entityId: 'yaye-qualite-degradee',
    type: 'Yaye',
    titre: 'Qualité de Yaye en baisse',
    contenu: `La qualité de Yaye a régressé sous la référence${detail ? ` (${detail})` : ''}. Vérifier le tableau de bord Analytics.`,
    lien: '/admin/analytics/yaye',
    iconName: 'alert',
    recipients,
  })
  return recipients.length
}
