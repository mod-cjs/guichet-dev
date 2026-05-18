import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { loadProfilComplet } from '@/lib/profil-loader'
import { ProfilClient } from '@/components/profil'

export default async function MonProfilPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  const data = await loadProfilComplet(session.cjsUid)
  if (!data) redirect('/auth/connexion')

  const ssoProfilUrl = process.env.SSO_BASE_URL
    ? `${process.env.SSO_BASE_URL}/profil`
    : null

  return <ProfilClient initial={data} ssoProfilUrl={ssoProfilUrl} />
}
