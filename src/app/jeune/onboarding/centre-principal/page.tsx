import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getCentresWithStatusAndHoraires } from '@/lib/loaders/centres'
import { suggestCentrePrincipal } from '@/lib/loaders/profil-onboarding'
import { CentrePrincipalForm } from './centre-principal-form'
import { CentrePrincipalFormWeb } from '../_screens-web/CentrePrincipalFormWeb'

export const metadata = { title: 'Ton centre CJS — Guichet Jeunesse' }

/**
 * Écran onboarding "Centre principal" (Lot 7 W2 / GUIC-353).
 *
 * S'insère entre `profil` et `recommandations`. Auto-suggère le centre
 * de la région SSO du jeune, modifiable, ou ignorable (option "skip").
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 2.
 */
export default async function OnboardingCentrePrincipalPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')
  if (session.onboardingComplete) redirect('/jeune/tableau-de-bord')

  const centres = await getCentresWithStatusAndHoraires()
  const suggestedId = await suggestCentrePrincipal({
    region: session.region,
    cjsUid: session.cjsUid,
  })

  // Trier : région du jeune d'abord, puis le reste alphabétique
  const sorted = [...centres].sort((a, b) => {
    const aMatch = session.region && a.region === session.region ? 0 : 1
    const bMatch = session.region && b.region === session.region ? 0 : 1
    if (aMatch !== bMatch) return aMatch - bMatch
    return a.nom.localeCompare(b.nom)
  })

  const formProps = {
    centres: sorted.map((c) => ({
      id: c.id,
      nom: c.nom,
      region: c.region,
      ville: c.ville,
    })),
    suggestedId,
    userRegion: session.region ?? null,
  }

  return (
    <>
      <div className="gj-onboarding-mobile">
        <CentrePrincipalForm {...formProps} />
      </div>
      <div className="gj-onboarding-web">
        <CentrePrincipalFormWeb {...formProps} />
      </div>
    </>
  )
}
