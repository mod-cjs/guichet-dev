import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { loadProfilComplet } from '@/lib/profil-loader'
import { ProfilClient } from '@/components/profil'

export default async function MonProfilPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  const data = await loadProfilComplet(session.cjsUid)
  if (!data) redirect('/auth/connexion')

  // GUIC-379 — l'URL SSO d'édition profil est variabilisée pour s'adapter aux
  // environnements (preview/staging/prod). Le chemin canonique côté SSO est
  // `/profile/edit` (Laravel Passport).
  const ssoBase = process.env.SSO_BASE_URL || 'https://auth.consortiumjeunessesenegal.org'
  const ssoProfilUrl = `${ssoBase.replace(/\/$/, '')}/profile/edit`

  return <ProfilClient initial={data} ssoProfilUrl={ssoProfilUrl} />
}
