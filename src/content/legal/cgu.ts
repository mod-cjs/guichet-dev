/**
 * Conditions générales d'utilisation.
 *
 * GUIC-233 en avait livré une version provisoire de 4 sections, marquée « à
 * compléter par le service juridique ». Complétée le 2026-08-14 : les 4
 * sections d'origine sont conservées dans leur substance, et le document
 * couvre désormais l'ensemble des services réellement rendus par la
 * plateforme (opportunités et candidatures, agenda, centres et réservations,
 * bibliothèque, messagerie, assistant Yaye, notifications WhatsApp).
 *
 * ⚠️ VALIDATION JURIDIQUE REQUISE — ce texte est un contrat opposable aux
 * utilisateurs de la plateforme. Il est rédigé pour coller au service tel
 * qu'il fonctionne, mais il n'a pas été relu par un juriste. À faire valider
 * avant mise en production.
 *
 * MINEURS — l'article 3 exige une autorisation parentale pour les moins de
 * 18 ans. Elle n'est pas contrôlée techniquement : `stepIdentiteSchema`
 * (`src/lib/validations/onboarding.ts`) collecte la date de naissance sans
 * vérification d'âge, et aucune trace d'autorisation n'est conservée.
 *
 * Arbitrage PO du 2026-08-14 : on garde l'exigence dans le contrat sans la
 * porter dans le produit. C'est une clause déclarative, comme l'exactitude des
 * informations fournies (art. 6) — décision prise en connaissance de cause, ne
 * pas la rouvrir sans nouvel arbitrage.
 */
import type { DocumentLegal } from './types'
import { CONTACT_CDP } from './contact'

export const CGU: DocumentLegal = {
  // Casse et apostrophe droite conservées telles quelles : le test hérité
  // `tests/unit/legal-pages.test.tsx` (GUIC-233) matche ce titre exact.
  slug: 'cgu',
  titre: "Conditions Générales d'Utilisation",
  resume:
    'Conditions d’accès et d’usage du Guichet Jeunesse : compte SSO, services proposés, engagements réciproques, responsabilité et résiliation.',
  version: '2026-08',
  dateMaj: 'Août 2026',
  sections: [
    {
      titre: '1. Objet',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Les présentes Conditions Générales d’Utilisation (CGU) régissent l’accès et l’usage du Guichet Jeunesse, plateforme numérique opérée par le Consortium Jeunesse Sénégal (CJS) à destination des jeunes du Sénégal, des organisations partenaires et des recruteurs.',
        },
        {
          type: 'paragraphe',
          texte:
            'Toute utilisation de la plateforme vaut acceptation des présentes CGU. L’utilisateur qui ne les accepte pas doit renoncer à utiliser le service.',
        },
      ],
    },
    {
      titre: '2. Accès au service',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'L’accès au Guichet Jeunesse nécessite la création d’un compte unique CJS via le Single Sign-On (SSO) du Consortium. Aucun mot de passe local n’est stocké par la plateforme. Le compte est strictement personnel.',
        },
        {
          type: 'paragraphe',
          texte:
            'L’accès au service est gratuit pour les jeunes bénéficiaires. Le CJS ne demande aucun paiement en contrepartie de l’inscription, de la consultation des opportunités ou du dépôt d’une candidature. Toute sollicitation financière au nom du Guichet Jeunesse doit être signalée au CJS.',
        },
        {
          type: 'paragraphe',
          texte:
            'L’utilisateur est responsable de la confidentialité de son accès. Il informe sans délai le CJS de toute utilisation non autorisée de son compte.',
        },
      ],
    },
    {
      titre: '3. Utilisateurs mineurs',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'La plateforme s’adresse à la jeunesse sénégalaise et peut être utilisée par des personnes mineures. L’utilisateur de moins de 18 ans déclare disposer de l’autorisation de son parent ou de son représentant légal pour créer un compte, renseigner son profil et déposer des candidatures.',
        },
        {
          type: 'paragraphe',
          texte:
            'Le représentant légal peut à tout moment demander la suppression du compte et des données de la personne mineure dont il a la charge, selon les modalités décrites sur la page « Vos droits sur vos données personnelles ».',
        },
      ],
    },
    {
      titre: '4. Services proposés',
      blocs: [
        {
          type: 'paragraphe',
          texte: 'Le Guichet Jeunesse met à disposition, selon le profil de l’utilisateur :',
        },
        {
          type: 'liste',
          items: [
            'la consultation d’opportunités socio-économiques (emplois, stages, formations, concours, bourses, financements, volontariat, mentorat, mobilité) et le dépôt de candidatures ;',
            'la gestion d’un profil et d’un curriculum vitae réutilisables d’une candidature à l’autre ;',
            'un agenda d’événements et l’inscription à ceux-ci ;',
            'l’accès aux centres CJS, la réservation de ressources et l’emprunt d’ouvrages ;',
            'une messagerie avec les conseillers et les recruteurs ;',
            'un agent conversationnel et des notifications par e-mail ou WhatsApp.',
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'Le CJS peut faire évoluer, suspendre ou retirer tout ou partie de ces services, notamment pour des raisons techniques, de sécurité ou d’évolution du programme.',
        },
      ],
    },
    {
      titre: '5. Opportunités publiées par des tiers',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Les opportunités diffusées émanent d’organisations partenaires, de recruteurs ou de sources publiques. Le CJS en assure la curation et la mise en forme, mais n’est ni l’auteur ni le garant de leur contenu, de leur exactitude, de leur maintien dans le temps ni de l’issue des processus de sélection.',
        },
        {
          type: 'paragraphe',
          texte:
            'L’inscription sur la plateforme et le dépôt d’une candidature ne garantissent en aucun cas l’obtention d’un emploi, d’un stage, d’une formation, d’une bourse ou d’un financement.',
        },
        {
          type: 'paragraphe',
          texte:
            'L’utilisateur signale au CJS toute annonce qui lui paraîtrait frauduleuse, trompeuse ou contraire à la loi. Le CJS se réserve le droit de retirer sans préavis toute publication de cette nature.',
        },
      ],
    },
    {
      titre: '6. Engagements de l’utilisateur',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'L’utilisateur s’engage à fournir des informations exactes, à ne pas usurper d’identité, à respecter les autres usagers et à ne pas détourner la plateforme de son objet (orientation, formation, insertion socio-économique des jeunes).',
        },
        {
          type: 'paragraphe',
          texte: 'Sont notamment interdits :',
        },
        {
          type: 'liste',
          items: [
            'la publication de contenus injurieux, diffamatoires, haineux, violents ou contraires à la loi sénégalaise ;',
            'l’usage de la messagerie à des fins de démarchage, de harcèlement ou de diffusion non sollicitée ;',
            'la collecte ou l’extraction automatisée des données de la plateforme, notamment des profils et des coordonnées ;',
            'toute tentative d’accès à un compte ou à des données qui ne sont pas les siens, et toute atteinte au fonctionnement du service.',
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'L’utilisateur qui réserve une ressource, s’inscrit à un événement ou emprunte un ouvrage s’engage à honorer sa réservation ou à l’annuler en temps utile, et à restituer les biens empruntés dans les délais convenus avec le centre.',
        },
      ],
    },
    {
      titre: '7. Agent conversationnel',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'La plateforme met à disposition un agent conversationnel automatisé, reposant sur un modèle de langage. Ses réponses sont générées et peuvent comporter des erreurs, des omissions ou des informations périmées.',
        },
        {
          type: 'paragraphe',
          texte:
            'Elles constituent une aide à l’orientation et ne remplacent ni un conseiller du CJS, ni un avis professionnel, juridique ou médical. L’utilisateur reste seul responsable des décisions qu’il prend à leur suite, et il lui appartient de vérifier toute information déterminante auprès d’un conseiller ou de l’organisme concerné.',
        },
        {
          type: 'paragraphe',
          texte:
            'Les échanges avec l’agent conversationnel sont conservés et peuvent être analysés pour améliorer la qualité du service. Leur traitement et leur effacement sont décrits dans la politique de confidentialité.',
        },
      ],
    },
    {
      titre: '8. Disponibilité et responsabilité',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Le CJS met en œuvre les moyens raisonnables pour assurer la disponibilité et la sécurité de la plateforme, sans garantir un accès continu et sans interruption. Le service peut être suspendu pour maintenance, mise à jour ou en cas d’incident technique.',
        },
        {
          type: 'paragraphe',
          texte:
            'Le CJS ne saurait être tenu responsable des dommages résultant d’une indisponibilité du service, d’une erreur dans un contenu publié par un tiers, ou d’un usage de la plateforme non conforme aux présentes CGU.',
        },
      ],
    },
    {
      titre: '9. Propriété intellectuelle',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'L’ensemble des contenus présents sur le Guichet Jeunesse (textes, graphismes, logo, code source, base de données) est la propriété exclusive du CJS ou de ses partenaires, et est protégé par les lois sénégalaises et internationales sur la propriété intellectuelle.',
        },
        {
          type: 'paragraphe',
          texte:
            'L’utilisateur conserve la propriété des contenus qu’il dépose (curriculum vitae, lettres de motivation, pièces jointes). Il concède au CJS le droit de les héberger, de les afficher dans son espace et de les transmettre aux recruteurs auprès desquels il candidate, pour les seuls besoins du service.',
        },
      ],
    },
    {
      titre: '10. Données personnelles',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Le traitement des données personnelles est décrit dans la politique de confidentialité et dans la notice d’information sur la collecte. Les droits d’accès, de rectification, d’opposition et d’effacement, ainsi que leurs modalités d’exercice, sont détaillés sur la page « Vos droits sur vos données personnelles ».',
        },
        {
          type: 'encart',
          titre: 'Une question sur vos données ?',
          texte: `${CONTACT_CDP.responsableDonnees} — ${CONTACT_CDP.emailDonnees} — ${CONTACT_CDP.telephone}. Délai de réponse : ${CONTACT_CDP.delaiReponse}.`,
        },
      ],
    },
    {
      titre: '11. Modification & résiliation',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Le CJS se réserve le droit de modifier les présentes CGU à tout moment. Tout manquement grave aux engagements ci-dessus pourra entraîner la suspension du compte. L’utilisateur peut demander la clôture de son compte à tout moment depuis son profil.',
        },
        {
          type: 'paragraphe',
          texte:
            'Les modifications entrent en vigueur dès leur publication sur cette page, dont la date de mise à jour fait foi. La poursuite de l’utilisation du service après publication vaut acceptation de la version en vigueur.',
        },
      ],
    },
    {
      titre: '12. Droit applicable',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Les présentes CGU sont régies par le droit sénégalais. En cas de différend, les parties rechercheront une solution amiable avant toute action contentieuse. À défaut d’accord, le litige sera porté devant les juridictions compétentes de Dakar.',
        },
      ],
    },
  ],
}
