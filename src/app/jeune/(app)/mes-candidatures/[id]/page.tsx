import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { loadCandidatureDetail } from '@/lib/candidature-detail-loader'
import { CandidatureDetail } from '@/components/candidatures'

/**
 * GUIC-253 — Page détail d'une candidature appartenant au jeune connecté.
 *
 * - Server component async (RSC) — auth + ownership vérifiés côté serveur.
 * - `loadCandidatureDetail` filtre `where: { id, cjsUid }` → un utilisateur
 *   ne peut jamais accéder à la candidature d'un autre (404 indifférenciable
 *   d'un ID inexistant — pas d'oracle de présence).
 * - Métadonnées : pas d'index, pas de leak d'identité dans le titre.
 */

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Candidature — Guichet Jeunesse',
    robots: { index: false, follow: false },
  }
}

export default async function CandidatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  const { id } = await params
  const candidature = await loadCandidatureDetail(id, session.cjsUid)
  if (!candidature) notFound()

  return <CandidatureDetail candidature={candidature} />
}
