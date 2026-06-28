import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { reconstructTranscript } from '@/lib/ia/metrics/transcript'
import { resolveSessionRefs } from '@/lib/ia/admin/session-refs'
import { SessionDetailClient } from './SessionDetailClient'

// Panel admin — Détail d'une session Yaye, 2 niveaux (Conversation / Technique).
// Réutilise reconstructTranscript (agent_logs + transcript verbatim). Lecture seule.
// CDP : pas d'anonymisation du verbatim côté admin (décision PO) — cjs_uid affiché.

export const metadata: Metadata = { title: 'Détail session Yaye — Admin CJS' }

export default async function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const session = await getSession()
  if (!session || !session.roles.includes('admin')) redirect('/auth/connexion')

  const { sessionId } = await params
  const transcript = await reconstructTranscript(sessionId)

  // Aucun événement → session inexistante.
  if (transcript.events.length === 0) notFound()

  const [refs, evalScore, feedback, summary, escalade, user] = await Promise.all([
    resolveSessionRefs(transcript),
    prisma.yayeEvalScore.findFirst({ where: { sessionId }, orderBy: { createdAt: 'desc' } }),
    prisma.yayeFeedback.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' } }),
    prisma.yayeSessionSummary.findUnique({ where: { sessionId } }),
    prisma.escaladeYaye.findFirst({ where: { sessionId }, orderBy: { createdAt: 'desc' } }),
    transcript.cjsUid
      ? prisma.utilisateur.findUnique({ where: { cjsUid: transcript.cjsUid }, select: { prenom: true, nom: true, telephone: true } })
      : Promise.resolve(null),
  ])

  return (
    <SessionDetailClient
      transcript={transcript}
      refs={refs}
      user={user}
      quality={{
        eval: evalScore
          ? {
              juge: evalScore.juge,
              fidelite: evalScore.fidelite,
              pertinence: evalScore.pertinence,
              utilite: evalScore.utilite,
              persona: evalScore.persona,
              conformiteCdp: evalScore.conformiteCdp,
              langue: evalScore.langue,
              drapeauRouge: evalScore.drapeauRouge,
              commentaire: evalScore.commentaire,
            }
          : null,
        yqs: summary?.yqs ?? null,
        resolu: summary?.resolu ?? false,
        converti: summary?.converti ?? false,
      }}
      feedback={feedback.map((f) => ({ note: f.note, raison: f.raison, tourIndex: f.tourIndex, createdAt: f.createdAt.toISOString() }))}
      escalade={escalade ? { id: escalade.id, statut: escalade.statut, raison: escalade.raison, signalDanger: escalade.signalDanger, createdAt: escalade.createdAt.toISOString() } : null}
    />
  )
}
