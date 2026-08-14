/**
 * GUIC-605 — Les 4 droits de la loi 2008-12, définition partagée.
 *
 * Ces droits sont énoncés trois fois dans les documents sources (politique
 * Art. 9, notice §5, page « Vos droits »), avec des formulations légèrement
 * différentes pour un contenu juridique identique. Une définition unique évite
 * qu'une future correction n'en oublie une occurrence.
 *
 * Dans la page « Vos droits » du .docx, le droit d'opposition avait été avalé
 * dans la puce du droit de rectification (`…incomplètes.• Droit d'opposition`)
 * — un défaut de mise en forme. Il est ici rétabli en item distinct.
 */
import { LOI_CDP } from './contact'

export const DROITS_CDP = [
  {
    terme: "Droit d'accès",
    valeur: 'obtenir la confirmation que vos données sont traitées et en recevoir une copie.',
  },
  {
    terme: 'Droit de rectification',
    valeur: 'corriger des données inexactes ou incomplètes.',
  },
  {
    terme: "Droit d'opposition",
    valeur: 'vous opposer, pour des motifs légitimes, au traitement de vos données.',
  },
  {
    terme: "Droit à l'effacement",
    valeur: 'demander la suppression de vos données.',
  },
] as const

/** Chapeau commun introduisant l'énoncé des droits. */
export const CHAPEAU_DROITS = `Conformément à la ${LOI_CDP} relative à la protection des données à caractère personnel, vous disposez des droits suivants :`
