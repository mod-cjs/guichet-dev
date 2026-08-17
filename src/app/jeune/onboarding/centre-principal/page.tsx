import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { estMasquee } from '@/lib/flags/ui-server'
import { getCentresWithStatusAndHoraires } from '@/lib/loaders/centres'
import { suggestCentrePrincipal, getUserRegion, resolveOnboardingRegion } from '@/lib/loaders/profil-onboarding'
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

  // GUIC-706 — étape conditionnelle. Le parcours d'accueil est verrouillé, mais cette
  // étape charge la liste des centres : sans ce saut, masquer les centres casserait un
  // parcours qu'on ne peut même pas fermer pour compenser, et le service devait refuser
  // la bascule. On saute plutôt qu'on ne rend : la page afficherait sinon une liste vide
  // en demandant d'y choisir quelque chose.
  //
  // Placé APRÈS le contrôle de session : décider du saut avant d'authentifier
  // renseignerait un visiteur anonyme sur l'état d'une fonctionnalité.
  if (await estMasquee('m4.centres', session.roles)) {
    redirect('/jeune/onboarding/recommandations')
  }

  // La région saisie à l'étape profil est en base mais pas dans le JWT — la base
  // fait foi pour suggérer le bon centre (GUIC-448).
  const dbRegion = await getUserRegion(session.cjsUid)
  const region   = resolveOnboardingRegion(dbRegion, session.region)

  const centres = await getCentresWithStatusAndHoraires()
  const suggestedId = await suggestCentrePrincipal({
    region,
    cjsUid: session.cjsUid,
  })

  // Trier : région du jeune d'abord, puis le reste alphabétique
  const sorted = [...centres].sort((a, b) => {
    const aMatch = region && a.region === region ? 0 : 1
    const bMatch = region && b.region === region ? 0 : 1
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
    userRegion: region,
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
