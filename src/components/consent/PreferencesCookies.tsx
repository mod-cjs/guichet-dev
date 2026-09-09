'use client'

import { useState } from 'react'
import { Button, Icon, Switch } from '@/components/ui'
import {
  CATALOGUE_COOKIES,
  choixToutAccepte,
  choixToutRefuse,
  type ChoixCookies,
  type Consentement,
} from '@/lib/consent/cookies'

export interface PreferencesCookiesProps {
  /** Décision déjà enregistrée — le panneau repart de l'état réel, pas d'un état neutre. */
  consentement?: Consentement | null
  /** Reçoit les choix retenus. */
  onEnregistrer: (choix: ChoixCookies) => void
  /** Libellé du bouton de validation. */
  libelleValidation?: string
}

/**
 * PreferencesCookies — GUIC-712. Panneau par catégorie, rendu à l'identique dans la
 * modale du bandeau et sur la page `/legal/cookies`. Un seul composant pour les deux :
 * deux panneaux qui divergeraient finiraient par ne plus dire la même chose de ce qui
 * est déposé, et c'est exactement ce qu'un contrôle regarde.
 *
 * Les catégories obligatoires sont rendues en état verrouillé — jamais en `<Switch />`.
 * Proposer la case reviendrait à offrir un choix sans portée : le site ne fonctionne pas
 * sans elles.
 */
export function PreferencesCookies({
  consentement,
  onEnregistrer,
  libelleValidation = 'Enregistrer mes choix',
}: PreferencesCookiesProps) {
  // Sans décision antérieure, on part d'un refus : aucune case pré-cochée, c'est la
  // définition d'un opt-in.
  const [choix, setChoix] = useState<ChoixCookies>(consentement?.choix ?? choixToutRefuse())

  const basculer = (cle: keyof ChoixCookies, valeur: boolean) =>
    setChoix((actuel) => ({ ...actuel, [cle]: valeur }))

  return (
    <div className="flex flex-col gap-space-4">
      <ul className="flex flex-col gap-space-3 list-none p-0 m-0">
        {CATALOGUE_COOKIES.map((categorie) => (
          <li
            key={categorie.cle}
            className="flex items-start gap-space-3 border border-gj-line rounded-gj-lg p-space-3"
          >
            <div className="flex-1">
              <p className="font-bold text-fs-300 text-gj-ink m-0">{categorie.titre}</p>
              <p className="text-fs-200 text-gj-grey mt-space-1 mb-0">{categorie.description}</p>
              {categorie.cookies.length > 0 && (
                <p className="text-fs-100 text-gj-grey mt-space-2 mb-0 font-mono break-all">
                  {categorie.cookies.join(' · ')}
                </p>
              )}
            </div>

            {categorie.obligatoire ? (
              <span className="flex items-center gap-space-1 text-fs-100 font-bold text-gj-teal-deep whitespace-nowrap mt-space-1">
                <Icon name="shield" size={14} aria-hidden />
                Toujours actif
              </span>
            ) : (
              <div className="mt-space-1">
                <Switch
                  checked={choix[categorie.cle] === true}
                  onChange={(valeur) => basculer(categorie.cle, valeur)}
                  aria-label={categorie.titre}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-col sm:flex-row gap-space-2 sm:justify-end">
        <Button variant="ghost" onClick={() => onEnregistrer(choixToutAccepte())}>
          Tout accepter
        </Button>
        <Button variant="primary" onClick={() => onEnregistrer(choix)}>
          {libelleValidation}
        </Button>
      </div>
    </div>
  )
}
