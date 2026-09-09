'use client'

import { useEffect, useState } from 'react'
import { lireConsentementNavigateur, ecrireConsentementNavigateur } from '@/lib/consent/client'
import { construireConsentement, type ChoixCookies, type Consentement } from '@/lib/consent/cookies'
import { PreferencesCookies } from './PreferencesCookies'

/**
 * GestionCookies — GUIC-712. Panneau permanent de `/legal/cookies`.
 *
 * Même composant de préférences que la modale du bandeau, monté hors modale : c'est la
 * seule porte de sortie accessible depuis les espaces qui n'ont pas de pied de page
 * (jeune, conseiller, recruteur). Sans elle, retirer son consentement supposerait de
 * revenir sur une page publique — donc une révocation théorique.
 */
export function GestionCookies() {
  const [consentement, setConsentement] = useState<Consentement | null>(null)
  const [enregistre, setEnregistre] = useState(false)
  // Le cookie n'existe pas au rendu serveur. Monter le panneau avant de l'avoir lu
  // figerait ses interrupteurs sur « tout refusé » — `useState` ne rejoue pas sa valeur
  // initiale — et la page afficherait un refus à qui vient d'accepter.
  const [lu, setLu] = useState(false)
  // Le panneau est remonté après enregistrement pour repartir de la décision écrite,
  // plutôt que de garder un état local qui pourrait diverger du cookie.
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    setConsentement(lireConsentementNavigateur())
    setLu(true)
  }, [])

  const enregistrer = (choix: ChoixCookies) => {
    const decision = construireConsentement(choix)
    ecrireConsentementNavigateur(decision)
    setConsentement(decision)
    setEnregistre(true)
    setGeneration((n) => n + 1)
  }

  if (!lu) return null

  return (
    <div className="mt-space-6">
      <PreferencesCookies
        key={generation}
        consentement={consentement}
        onEnregistrer={enregistrer}
        libelleValidation="Enregistrer mes choix"
      />
      {enregistre && (
        <p
          role="status"
          className="mt-space-3 text-fs-200 font-bold text-gj-teal-deep"
        >
          Vos préférences sont enregistrées.
        </p>
      )}
    </div>
  )
}
