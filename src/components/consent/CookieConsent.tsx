'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Button, Modal } from '@/components/ui'
import { lireConsentementNavigateur, ecrireConsentementNavigateur } from '@/lib/consent/client'
import {
  choixToutAccepte,
  choixToutRefuse,
  construireConsentement,
  consentementCaduc,
  type ChoixCookies,
  type Consentement,
} from '@/lib/consent/cookies'
import { PreferencesCookies } from './PreferencesCookies'

export interface CookieConsentProps {
  /** Ouvre directement le panneau de préférences (page « Cookies »). */
  ouvrirPreferences?: boolean
}

/**
 * CookieConsent — GUIC-712. Bandeau de première visite, monté UNE fois dans le layout
 * racine : un montage par espace multiplierait les points d'oubli, et c'est un oubli par
 * espace qui a produit l'écart d'origine (l'Article 7 promettait un bandeau que personne
 * n'avait posé).
 *
 * Le bandeau n'offre aucune fermeture sans décision. Une croix ou un « Plus tard »
 * transformerait le silence en acceptation, ce qui n'est pas un consentement. La seule
 * manière de le faire disparaître est de trancher — dans un sens ou dans l'autre, au
 * même coût.
 */
export function CookieConsent({ ouvrirPreferences = false }: CookieConsentProps = {}) {
  const [consentement, setConsentement] = useState<Consentement | null>(null)
  // Le cookie n'existe pas au rendu serveur : afficher le bandeau avant la lecture
  // produirait un décalage d'hydratation, et un flash de bandeau chez qui a déjà choisi.
  const [lu, setLu] = useState(false)
  const [panneauOuvert, setPanneauOuvert] = useState(ouvrirPreferences)

  useEffect(() => {
    setConsentement(lireConsentementNavigateur())
    setLu(true)
  }, [])

  const enregistrer = useCallback((choix: ChoixCookies) => {
    const decision = construireConsentement(choix)
    ecrireConsentementNavigateur(decision)
    setConsentement(decision)
    setPanneauOuvert(false)
  }, [])

  if (!lu) return null

  if (panneauOuvert) {
    return (
      <Modal
        isOpen
        // Refermer sans trancher ramène le bandeau : on ne sort pas de la boucle par
        // l'abandon.
        onClose={() => setPanneauOuvert(false)}
        title="Préférences de cookies"
        size="lg"
      >
        <PreferencesCookies consentement={consentement} onEnregistrer={enregistrer} />
      </Modal>
    )
  }

  if (!consentementCaduc(consentement)) return null

  // Couche « overlay » et non « chat » : le FAB Yaye occupe `--gj-z-chat` et, rendu dans
  // le contenu de page donc plus loin dans le DOM, recouvrait les boutons à couche égale.
  // Le bandeau conditionne un dépôt sur l'appareil — il passe au-dessus des navigations
  // et du tiroir admin, en dessous des seules alertes (`--gj-z-toast`).
  return (
    <div
      role="dialog"
      aria-labelledby="gj-consent-titre"
      aria-describedby="gj-consent-texte"
      className="fixed inset-x-0 bottom-0 bg-gj-surface border-t border-gj-line shadow-gj-lg
        px-space-4 py-space-4 pb-[calc(var(--space-4)+env(safe-area-inset-bottom,0px))]"
      style={{ zIndex: 'var(--gj-z-overlay)' }}
    >
      <div className="container-page flex flex-col gap-space-3 lg:flex-row lg:items-center lg:gap-space-5">
        <div className="flex-1">
          <h2 id="gj-consent-titre" className="font-black text-fs-400 text-gj-ink m-0">
            Vos préférences de cookies
          </h2>
          <p id="gj-consent-texte" className="text-fs-200 text-gj-grey mt-space-1 mb-0">
            Le Guichet dépose des cookies nécessaires à votre connexion. Les autres ne sont
            déposés qu'avec votre accord, et vous pouvez changer d'avis à tout moment.{' '}
            <Link href="/legal/cookies" className="text-gj-teal font-bold underline">
              En savoir plus sur les cookies
            </Link>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-space-2 lg:flex-shrink-0">
          {/* Même variante et même taille pour les deux : un refus plus coûteux qu'une
              acceptation n'est pas un refus libre. */}
          <Button variant="primary" onClick={() => enregistrer(choixToutRefuse())}>
            Tout refuser
          </Button>
          <Button variant="primary" onClick={() => enregistrer(choixToutAccepte())}>
            Tout accepter
          </Button>
          <Button variant="text" onClick={() => setPanneauOuvert(true)}>
            Personnaliser
          </Button>
        </div>
      </div>
    </div>
  )
}
