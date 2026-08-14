import Link from 'next/link'
import { CONTACT_CDP, LOI_CDP } from '@/content/legal/contact'

/**
 * GUIC-607 — Mention d'information affichée au point de collecte.
 *
 * Critère d'acceptation du ticket : l'utilisateur doit être informé « au
 * moment où la collecte a lieu », pas seulement via un lien de pied de page.
 *
 * Purement **informatif** : cet encart ne coche rien et n'enregistre rien. Le
 * consentement explicite opt-in et sa traçabilité (qui, quoi, quand, version
 * du texte) relèvent de GUIC-608 — les livrer sans stockage donnerait
 * l'apparence d'un consentement qu'on ne saurait pas prouver en cas de
 * contrôle, ce qui est pire que de ne rien afficher.
 *
 * La source .docx prévoyait le placeholder `[finalité spécifique du
 * formulaire]`, jamais résolu. `finalite` le remplace par la finalité réelle
 * du point de collecte, et devient donc obligatoire.
 */
export interface MentionFormulaireProps {
  /**
   * Finalité réelle de CE formulaire, à la forme verbale et sans majuscule
   * initiale. Ex. « créer votre compte et vous recommander des opportunités
   * adaptées à votre profil ».
   */
  finalite: string
  className?: string
}

export function MentionFormulaire({ finalite, className = '' }: MentionFormulaireProps) {
  return (
    <p
      data-testid="mention-formulaire"
      className={`text-fs-100 text-color-text-muted leading-relaxed ${className}`}
    >
      Les données à caractère personnel collectées dans ce formulaire sont traitées par le{' '}
      {CONTACT_CDP.organisme} pour {finalite}. Elles sont destinées aux services internes habilités
      du CJS. En application de la {LOI_CDP}, vous disposez d’un droit d’accès, de rectification,
      d’opposition et de suppression de vos données, que vous pouvez exercer auprès de{' '}
      {CONTACT_CDP.responsableDonnees} —{' '}
      <a href={`mailto:${CONTACT_CDP.emailDonnees}`} className="underline">
        {CONTACT_CDP.emailDonnees}
      </a>
      . Pour en savoir plus, consultez la{' '}
      <Link href="/legal/confidentialite" className="underline">
        politique de confidentialité
      </Link>
      ,{' '}
      <Link href="/legal/informations-collecte" className="underline">
        la notice de collecte
      </Link>{' '}
      et{' '}
      <Link href="/legal/vos-droits" className="underline">
        vos droits
      </Link>
      .
    </p>
  )
}
