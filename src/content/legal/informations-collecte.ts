/**
 * GUIC-607 — Notice d'information sur la collecte des données personnelles.
 *
 * Source : `INFORMATIONS SUR LA COLLECTE DE VOS DONNÉES PERSONNELLES.docx`
 * (Drive, Mars 2026), 6 sections.
 *
 * Écarts assumés vis-à-vis du .docx (arbitrages PO 2026-08-14) :
 * - §5 : téléphone `+221 33 824 83 83` → `+221 33 877 78 05`, valeur retenue
 *   par la politique et le document de consentement (2 sources sur 3).
 * - §3 : le titre « Combien de temps conservons-nous vos données ? » avait
 *   perdu son niveau de titre dans la source (fondu dans la section 3) — il
 *   est rétabli en section à part entière, d'où 7 sections rendues pour 6
 *   numérotées à l'origine.
 * - §6 : la mention par formulaire est factorisée dans `<MentionFormulaire>`,
 *   qui remplace le placeholder `[finalité spécifique du formulaire]` par la
 *   finalité réelle du point de collecte.
 * - Le « formulaire de connexion » listé par la source n'existe pas sur le
 *   Guichet (authentification déléguée au SSO CJS) — non repris.
 */
import type { DocumentLegal } from './types'
import { AUTORITE_CDP, CONTACT_CDP, LOI_CDP, PHRASE_EXERCICE_DROITS, SITES_COUVERTS } from './contact'
import { CHAPEAU_DROITS, DROITS_CDP } from './droits'

export const INFORMATIONS_COLLECTE: DocumentLegal = {
  slug: 'informations-collecte',
  titre: 'Informations sur la collecte de vos données personnelles',
  resume:
    'Quelles données le Guichet Jeunesse collecte, pourquoi, combien de temps elles sont conservées et qui y a accès.',
  version: '2026-03',
  dateMaj: 'Mars 2026',
  sections: [
    {
      titre: 'Qui collecte vos données ?',
      blocs: [
        {
          type: 'paragraphe',
          texte: `Le ${CONTACT_CDP.organisme}, association de droit sénégalais, est responsable du traitement des données personnelles collectées sur les sites ${SITES_COUVERTS.join(', ')}.`,
        },
        {
          type: 'encart',
          titre: 'Contact données personnelles',
          texte: `${CONTACT_CDP.responsableDonnees} — ${CONTACT_CDP.emailDonnees} — ${CONTACT_CDP.telephone}`,
        },
      ],
    },
    {
      titre: 'Quelles données collectons-nous ?',
      blocs: [
        { type: 'paragraphe', texte: 'Les données personnelles collectées sur ce site sont :' },
        {
          type: 'definitions',
          items: [
            {
              terme: "Données d'identification",
              valeur: 'nom, prénom, adresse email, numéro de téléphone.',
            },
            { terme: 'Données de connexion', valeur: 'identifiant, mot de passe (chiffré).' },
            {
              terme: 'Données de profil',
              valeur: 'statut (particulier/entreprise), centres d’intérêt professionnels.',
            },
            {
              terme: 'Données de navigation',
              valeur: 'adresse IP, type de navigateur, pages consultées.',
            },
            { terme: 'Cookies', valeur: 'cookies techniques et de mesure d’audience.' },
          ],
        },
      ],
    },
    {
      titre: 'Pourquoi collectons-nous vos données ?',
      blocs: [
        {
          type: 'paragraphe',
          texte: 'Vos données sont collectées exclusivement pour les finalités suivantes :',
        },
        {
          type: 'liste',
          items: [
            'Création et gestion de votre compte utilisateur',
            'Mise en relation avec les opportunités (emplois, stages, formations, concours, bourses, financements)',
            'Diffusion d’informations et d’actualités pertinentes',
            'Gestion de l’agenda des événements',
            'Amélioration des services et de l’expérience utilisateur',
            'Statistiques de fréquentation du site',
          ],
        },
        {
          type: 'paragraphe',
          texte: 'Vos données ne seront jamais utilisées à des fins incompatibles avec ces finalités.',
        },
      ],
    },
    {
      titre: 'Combien de temps conservons-nous vos données ?',
      blocs: [
        {
          type: 'definitions',
          items: [
            { terme: 'Données de compte', valeur: 'durée de vie du compte + 6 mois après clôture.' },
            { terme: 'Données de navigation et logs', valeur: '13 mois.' },
            { terme: 'Cookies', valeur: '13 mois maximum.' },
          ],
        },
      ],
    },
    {
      titre: 'Qui a accès à vos données ?',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Seuls les services internes du CJS habilités ont accès à vos données, dans le strict cadre de leurs missions. Vos données ne sont jamais vendues ni cédées à des tiers à des fins commerciales.',
        },
      ],
    },
    {
      titre: 'Quels sont vos droits ?',
      blocs: [
        { type: 'paragraphe', texte: CHAPEAU_DROITS },
        { type: 'definitions', items: DROITS_CDP.map((d) => ({ ...d })) },
        { type: 'encart', texte: PHRASE_EXERCICE_DROITS },
        {
          type: 'paragraphe',
          texte: `Vous pouvez également saisir la ${AUTORITE_CDP.nom} : ${AUTORITE_CDP.site} — ${AUTORITE_CDP.email}.`,
        },
      ],
    },
    {
      titre: 'Mentions d’information par formulaire',
      blocs: [
        {
          type: 'paragraphe',
          texte: `Chaque formulaire du site affiche, sous les champs de saisie, une mention rappelant la finalité de la collecte, les destinataires des données et la façon d’exercer vos droits, en application de la ${LOI_CDP}.`,
        },
        {
          type: 'paragraphe',
          texte:
            'Sont concernés : le parcours d’inscription et de création de compte, le formulaire de contact et le formulaire de signalement d’opportunités.',
        },
      ],
    },
  ],
}
