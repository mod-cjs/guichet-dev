import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { reconstructTranscript } from '@/lib/ia/metrics/transcript'
import { resolveSessionRefs } from '@/lib/ia/admin/session-refs'
import { SessionDetailClient } from './SessionDetailClient'

// Panel admin — Détail d'une session Yaye, 2 niveaux (Conversation / Technique).
// Réutilise reconstructTranscript (agent_logs + transcript verbatim). Lecture seule.

export const metadata: Metadata = { title: 'Détail session Yaye — Admin CJS' }

export default async function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const session = await getSession()
  if (!session || !session.roles.includes('admin')) redirect('/auth/connexion')

  const { sessionId } = await params
  const transcript = await reconstructTranscript(sessionId)

  // Aucun événement → session inexistante.
  if (transcript.events.length === 0) notFound()

  const refs = await resolveSessionRefs(transcript)

  return <SessionDetailClient transcript={transcript} refs={refs} />
}
