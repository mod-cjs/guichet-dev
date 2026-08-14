/**
 * Conditions générales d'utilisation — hors épic GUIC-605.
 *
 * Contenu **repris de GUIC-233** (page statique du 4 juin 2026), porté ici
 * dans le modèle typé sans perte : les 4 sections d'origine sont conservées à
 * l'identique. GUIC-233 la qualifiait lui-même de « version provisoire, à
 * compléter par le service juridique » — d'où `estCoquille` maintenu.
 *
 * ⚠️ Le §2 ci-dessous (« Aucun mot de passe local n'est stocké par la
 * plateforme ») **contredit frontalement** la politique de confidentialité et
 * la notice de collecte, qui déclarent toutes deux collecter un « mot de passe
 * (chiffré) ». Les CGU disent vrai — le Guichet est en SSO pur. C'est l'écart
 * n°1 de la spec §5, à corriger côté documents CDP.
 */
import type { DocumentLegal } from './types'
import { CONTACT_CDP } from './contact'

export const CGU: DocumentLegal = {
  // Casse et apostroffe droite conservées telles quelles : le test hérité
  // `tests/unit/legal-pages.test.tsx` (GUIC-233) matche ce titre exact.
  slug: 'cgu',
  titre: "Conditions Générales d'Utilisation",
  resume:
    'Conditions d’accès et d’usage du Guichet Jeunesse : compte SSO, engagements de l’utilisateur, modification et résiliation.',
  version: '2026-06',
  dateMaj: '4 juin 2026',
  estCoquille: true,
  sections: [
    {
      titre: '1. Objet',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Les présentes Conditions Générales d’Utilisation (CGU) régissent l’accès et l’usage du Guichet Jeunesse, plateforme numérique opérée par le Consortium Jeunesse Sénégal (CJS) à destination des jeunes du Sénégal, des organisations partenaires et des recruteurs.',
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
      ],
    },
    {
      titre: '3. Engagements de l’utilisateur',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'L’utilisateur s’engage à fournir des informations exactes, à ne pas usurper d’identité, à respecter les autres usagers et à ne pas détourner la plateforme de son objet (orientation, formation, insertion socio-économique des jeunes).',
        },
      ],
    },
    {
      titre: '4. Modification & résiliation',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Le CJS se réserve le droit de modifier les présentes CGU à tout moment. Tout manquement grave aux engagements ci-dessus pourra entraîner la suspension du compte. L’utilisateur peut demander la clôture de son compte à tout moment depuis son profil.',
        },
        {
          type: 'encart',
          titre: 'Une question sur vos données ?',
          texte: `${CONTACT_CDP.responsableDonnees} — ${CONTACT_CDP.emailDonnees} — ${CONTACT_CDP.telephone}`,
        },
      ],
    },
  ],
}
