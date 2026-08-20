/**
 * GUIC-606 — Politique de confidentialité et de protection des données personnelles.
 *
 * Source : `POLITIQUE DE CONFIDENTIALITÉ ET DE PROTECTION DES DONNÉES
 * PERSONNELLES.docx` (Drive, Mars 2026), 11 articles, repris fidèlement.
 *
 * Écarts assumés vis-à-vis du .docx (arbitrages PO 2026-08-14) :
 * - Art. 1 : `guichetjeunesse.ss` → `.sn` (typo de la source).
 * - Art. 9 : délai de réponse 30 j → **15 j**, pour s'aligner sur la page
 *   « Vos droits » et ne pas publier deux délais contradictoires.
 * - Art. 2 : « identifiant, mot de passe (chiffré) » → identifiant unique CJS
 *   fourni par le SSO, aucun mot de passe collecté. Art. 8 : « hachage des
 *   mots de passe » → authentification déléguée. Arbitrage PO du 2026-08-14 :
 *   le Guichet est en SSO pur, il ne détient aucun mot de passe. L'article 2
 *   s'auto-délimite (« Le site https://www.guichetjeunesse.sn […] collecte »)
 *   donc une ligne vraie pour un autre site du CJS est ici une erreur de
 *   périmètre — et sur-déclarer est une fausse déclaration au même titre que
 *   sous-déclarer. Les CGU (§2) l'affirmaient déjà : les deux pages ne se
 *   contredisent plus. **À répercuter dans le .docx source.**
 * - Coordonnées centralisées dans `contact.ts`.
 *
 * Écarts NON corrigés (mise à jour documentaire à demander au responsable
 * données — cf. `.agent_context/specs/GUIC-605-conformite-cdp-legal.md` §5) :
 * les catégories réellement traitées mais non listées (CV, conversations avec
 * l'agent, WhatsApp, handicap), et les transferts hors Sénégal.
 */
import type { DocumentLegal } from './types'
import { AUTORITE_CDP, CONTACT_CDP, LOI_CDP, PHRASE_EXERCICE_DROITS, SITES_COUVERTS } from './contact'
import { DROITS_CDP } from './droits'

export const CONFIDENTIALITE: DocumentLegal = {
  slug: 'confidentialite',
  titre: 'Politique de confidentialité et de protection des données personnelles',
  resume:
    'Comment le Consortium Jeunesse Sénégal collecte, utilise et protège vos données personnelles, et comment exercer vos droits.',
  version: '2026-03',
  dateMaj: 'Mars 2026',
  sections: [
    {
      titre: 'Article 1 – Responsable du traitement',
      blocs: [
        {
          type: 'paragraphe',
          texte: `Le responsable du traitement des données collectées sur les sites ${SITES_COUVERTS.join(', ')} est :`,
        },
        {
          type: 'definitions',
          items: [
            { terme: 'Organisme', valeur: CONTACT_CDP.organisme },
            { terme: 'NINEA', valeur: CONTACT_CDP.ninea },
            { terme: 'Adresse', valeur: CONTACT_CDP.adresse },
            { terme: 'Téléphone', valeur: CONTACT_CDP.telephone },
            { terme: 'Email', valeur: CONTACT_CDP.emailGeneral },
            { terme: 'Représentant légal', valeur: CONTACT_CDP.representantLegal },
            {
              terme: 'Responsable des données personnelles',
              valeur: `${CONTACT_CDP.responsableDonnees} — ${CONTACT_CDP.emailDonnees}`,
            },
          ],
        },
      ],
    },
    {
      titre: 'Article 2 – Données collectées',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Le site https://www.guichetjeunesse.sn, plateforme numérique d’information et d’orientation des jeunes du Sénégal vers les opportunités socio-économiques (emplois, stages, formations, concours, bourses, financements), collecte les catégories de données suivantes :',
        },
        {
          type: 'definitions',
          items: [
            {
              terme: "Données d'identification",
              valeur: 'nom, prénom, adresse email, numéro de téléphone.',
            },
            {
              terme: 'Données de connexion',
              valeur:
                'identifiant unique CJS fourni par le service d’authentification du Consortium. Aucun mot de passe n’est collecté ni conservé par le Guichet Jeunesse.',
            },
            {
              terme: 'Données de profil',
              valeur: 'statut (particulier/entreprise), centres d’intérêt professionnels.',
            },
            {
              terme: 'Données de navigation',
              valeur: 'adresse IP, type de navigateur, pages consultées.',
            },
            {
              terme: 'Cookies',
              valeur: 'cookies techniques et de mesure d’audience.',
            },
          ],
        },
      ],
    },
    {
      titre: 'Article 3 – Finalités du traitement',
      blocs: [
        {
          type: 'paragraphe',
          texte: 'Vos données personnelles sont collectées et traitées pour les finalités suivantes :',
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
      ],
    },
    {
      titre: 'Article 4 – Base légale du traitement',
      blocs: [
        { type: 'paragraphe', texte: `Conformément à la ${LOI_CDP}, le traitement repose sur :` },
        {
          type: 'liste',
          items: [
            'Votre consentement explicite (article 33)',
            'L’exécution d’un contrat ou de mesures précontractuelles',
            'L’intérêt légitime du CJS, dans le respect de vos droits fondamentaux',
          ],
        },
      ],
    },
    {
      titre: 'Article 5 – Durées de conservation',
      blocs: [
        {
          type: 'definitions',
          items: [
            { terme: 'Données de compte', valeur: 'durée de vie du compte + 6 mois après clôture.' },
            { terme: 'Données de navigation et logs', valeur: '13 mois.' },
            { terme: 'Cookies', valeur: '13 mois maximum.' },
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'Au-delà de ces durées, vos données sont supprimées ou anonymisées de manière irréversible.',
        },
      ],
    },
    {
      titre: 'Article 6 – Destinataires des données',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Vos données sont destinées aux services internes du CJS habilités. Elles ne sont jamais vendues ni cédées à des tiers à des fins commerciales. Elles peuvent être communiquées à :',
        },
        {
          type: 'liste',
          items: [
            'Nos prestataires techniques (hébergement, maintenance)',
            'Nos sous-traitants, dans le strict respect de la loi',
          ],
        },
      ],
    },
    {
      titre: 'Article 7 – Cookies',
      blocs: [
        { type: 'paragraphe', texte: 'Le site utilise des cookies :' },
        {
          type: 'definitions',
          items: [
            {
              terme: 'Cookies essentiels',
              valeur:
                'session utilisateur, authentification. Base : fonctionnement du site. Durée : session.',
            },
            {
              terme: 'Cookies de mesure d’audience',
              valeur:
                'statistiques de fréquentation, pages visitées. Base : consentement. Durée : 13 mois.',
            },
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'Vous pouvez accepter ou refuser les cookies non essentiels via le bandeau de consentement affiché lors de votre première visite, ou via les paramètres de votre navigateur. Vous pouvez revenir sur votre choix à tout moment depuis la page /legal/cookies, qui détaille les cookies effectivement déposés.',
        },
      ],
    },
    {
      titre: 'Article 8 – Sécurité des données',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Le CJS met en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement HTTPS/SSL, authentification déléguée au service d’authentification du Consortium, contrôle des accès, sauvegardes régulières, mises à jour de sécurité.',
        },
      ],
    },
    {
      titre: 'Article 9 – Vos droits',
      blocs: [
        {
          type: 'paragraphe',
          texte: `Conformément à la ${LOI_CDP} (articles 62 à 68), vous disposez des droits suivants :`,
        },
        { type: 'definitions', items: DROITS_CDP.map((d) => ({ ...d })) },
        { type: 'encart', texte: PHRASE_EXERCICE_DROITS },
      ],
    },
    {
      titre: 'Article 10 – Réclamation',
      blocs: [
        {
          type: 'paragraphe',
          texte: `Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la ${AUTORITE_CDP.nom} du Sénégal :`,
        },
        {
          type: 'definitions',
          items: [
            { terme: 'Site', valeur: AUTORITE_CDP.site },
            { terme: 'Email', valeur: AUTORITE_CDP.email },
            { terme: 'Adresse', valeur: AUTORITE_CDP.adresse },
          ],
        },
      ],
    },
    {
      titre: 'Article 11 – Modification',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Le CJS se réserve le droit de modifier cette politique. Toute modification sera publiée sur ce site. Date de dernière mise à jour : Mars 2026.',
        },
      ],
    },
  ],
}

/** Garde-fou : le nombre d'articles du .docx source. */
export const NB_ARTICLES_CONFIDENTIALITE = 11
