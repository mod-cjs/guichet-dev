/**
 * Mentions légales — hors épic GUIC-605.
 *
 * Contenu **repris de GUIC-233** (page statique du 4 juin 2026) et enrichi de
 * l'identité d'éditeur portée par l'Article 1 de la politique de
 * confidentialité (NINEA, adresse, téléphone, représentant légal), que
 * GUIC-233 n'avait pas et signalait comme « à compléter par le service
 * juridique ». Les deux manques sont donc comblés — d'où l'absence de
 * `estCoquille`, contrairement aux CGU qui restent provisoires.
 *
 * ⚠️ L'hébergeur est **Vercel Inc. (Californie, États-Unis)** : le site est
 * donc hébergé hors du Sénégal. Ce transfert n'est mentionné nulle part dans
 * la politique de confidentialité (Art. 6 ne parle que de « prestataires
 * techniques »), alors que la loi 2008-12 encadre les transferts hors du
 * territoire. C'est l'écart n°3 de la spec §5, et cette page en est la preuve
 * la plus directe.
 */
import type { DocumentLegal } from './types'
import { CONTACT_CDP } from './contact'

export const MENTIONS_LEGALES: DocumentLegal = {
  slug: 'mentions-legales',
  titre: 'Mentions légales',
  resume:
    'Éditeur, directeur de la publication, hébergeur et propriété intellectuelle du site Guichet Jeunesse.',
  version: '2026-08',
  dateMaj: 'Août 2026',
  sections: [
    {
      titre: '1. Éditeur',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Le site Guichet Jeunesse est édité par le Consortium Jeunesse Sénégal (CJS), association de jeunesse de droit sénégalais. Directeur de la publication : le coordinateur national du Consortium.',
        },
        {
          type: 'definitions',
          items: [
            { terme: 'Organisme', valeur: CONTACT_CDP.organisme },
            { terme: 'NINEA', valeur: CONTACT_CDP.ninea },
            { terme: 'Siège', valeur: CONTACT_CDP.adresse },
            { terme: 'Téléphone', valeur: CONTACT_CDP.telephone },
            { terme: 'Email', valeur: CONTACT_CDP.emailGeneral },
            { terme: 'Représentant légal', valeur: CONTACT_CDP.representantLegal },
            { terme: 'Site institutionnel', valeur: CONTACT_CDP.siteWeb },
          ],
        },
      ],
    },
    {
      titre: '2. Hébergement',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis. Les bases de données opérationnelles (MariaDB, Redis) sont hébergées sur des serveurs choisis par le CJS.',
        },
      ],
    },
    {
      titre: '3. Propriété intellectuelle',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'L’ensemble des contenus présents sur le Guichet Jeunesse (textes, graphismes, logo, code source) est la propriété exclusive du CJS ou de ses partenaires, et est protégé par les lois sénégalaises et internationales sur la propriété intellectuelle.',
        },
      ],
    },
    {
      titre: '4. Contact et données personnelles',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Pour toute question relative au site, contactez le Consortium Jeunesse Sénégal aux coordonnées ci-dessus. Le traitement de vos données personnelles est décrit dans la politique de confidentialité ; vos droits et leurs modalités d’exercice sont détaillés sur la page « Vos droits sur vos données personnelles ».',
        },
        {
          type: 'encart',
          titre: 'Exercice de vos droits',
          texte: `${CONTACT_CDP.responsableDonnees} — ${CONTACT_CDP.emailDonnees} — ${CONTACT_CDP.telephone}. Délai de réponse : ${CONTACT_CDP.delaiReponse}.`,
        },
      ],
    },
  ],
}
