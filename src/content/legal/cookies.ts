/**
 * GUIC-712 — Document « Cookies ».
 *
 * Ce document décrit ce que le Guichet dépose **réellement**, vérifié par balayage du
 * code le 2026-08-20 : deux cookies de session httpOnly, plus le cookie de consentement
 * lui-même. Aucun traceur tiers — ni Google Analytics, ni Matomo, ni pixel publicitaire.
 *
 * Les catégories ne sont pas recopiées ici : elles sont tenues par
 * `src/lib/consent/cookies.ts`, que le panneau de préférences lit aussi. Une garde de
 * `tests/unit/consent-page-cookies.test.tsx` casse si le texte et le catalogue divergent.
 * Sans cela, on retomberait dans la faute d'origine — un document qui décrit autre chose
 * que ce que le code fait.
 */
import type { DocumentLegal } from './types'
import { CATALOGUE_COOKIES, DUREE_CONSENTEMENT_JOURS } from '@/lib/consent/cookies'
import { PHRASE_EXERCICE_DROITS } from './contact'

const DUREE_MOIS = Math.round(DUREE_CONSENTEMENT_JOURS / 30)

export const COOKIES: DocumentLegal = {
  slug: 'cookies',
  titre: 'Cookies et traceurs',
  resume:
    'Ce que le Guichet Jeunesse dépose sur votre appareil, pourquoi, et comment '
    + 'accepter ou refuser à tout moment.',
  version: '2026-08',
  dateMaj: 'Août 2026',
  sections: [
    {
      titre: 'Ce qu’est un cookie',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Un cookie est un petit fichier déposé sur votre appareil quand vous consultez '
            + 'un site. Certains sont indispensables au fonctionnement du service — sans eux, '
            + 'vous ne pourriez pas rester connecté d’une page à l’autre. D’autres servent à '
            + 'mesurer l’usage du site, et ne sont déposés qu’avec votre accord.',
        },
      ],
    },
    {
      titre: 'Ce que le Guichet dépose aujourd’hui',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'À ce jour, le Guichet Jeunesse ne dépose que des cookies strictement '
            + 'nécessaires. Aucun outil de mesure d’audience n’est installé, et aucun cookie '
            + 'publicitaire ni traceur de réseau social n’est utilisé.',
        },
        {
          type: 'definitions',
          items: CATALOGUE_COOKIES.map((categorie) => ({
            terme: categorie.titre,
            valeur:
              categorie.cookies.length > 0
                ? `${categorie.description} Cookies concernés : ${categorie.cookies.join(', ')}.`
                : categorie.description,
          })),
        },
      ],
    },
    {
      titre: 'Votre choix, et comment en changer',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Un bandeau vous est présenté lors de votre première visite. Vous pouvez tout '
            + 'accepter, tout refuser, ou régler chaque catégorie séparément. Refuser ne '
            + 'dégrade en rien votre accès au service.',
        },
        {
          type: 'paragraphe',
          texte:
            'Votre décision est conservée sur votre appareil, avec sa date et la version du '
            + `texte auquel vous avez consenti, pendant ${DUREE_MOIS} mois. Passé ce délai, `
            + 'ou si ce texte change, la question vous est posée de nouveau — un accord ne '
            + 'vaut que pour ce qu’il a énoncé.',
        },
        {
          type: 'encart',
          titre: 'Modifier vos préférences',
          texte:
            'Le panneau ci-dessous reflète vos choix actuels et vous permet d’en changer à '
            + 'tout moment. Vous pouvez également supprimer les cookies déjà déposés depuis '
            + 'les réglages de votre navigateur.',
        },
      ],
    },
    {
      titre: 'Cookies essentiels : pourquoi ils ne sont pas refusables',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Les cookies essentiels portent votre session : ils sont ce qui permet au site '
            + 'de vous reconnaître d’une page à l’autre après votre connexion. Les refuser '
            + 'reviendrait à ne pas pouvoir vous connecter. Nous ne vous proposons donc pas '
            + 'un choix qui n’en serait pas un : ils sont signalés comme toujours actifs.',
        },
        {
          type: 'paragraphe',
          texte:
            'Ces cookies ne servent qu’à cela. Ils ne suivent pas votre navigation sur '
            + 'd’autres sites et ne sont transmis à aucun tiers.',
        },
      ],
    },
    {
      titre: 'Vos droits',
      blocs: [
        { type: 'paragraphe', texte: PHRASE_EXERCICE_DROITS },
      ],
    },
  ],
}
