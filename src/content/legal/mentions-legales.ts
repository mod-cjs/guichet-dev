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
 * ⚠️ GUIC-605 — L'hébergeur déclaré par GUIC-233 était **faux sur deux points** :
 * il annonçait « Vercel Inc., Californie, États-Unis » alors que la production
 * a migré sur **OVH** (GUIC-568, `scripts/deploy/deploy.sh` — OVH/Plesk, Nginx
 * + Let's Encrypt) et que les serveurs sont **en Belgique**. Corrigé ici
 * d'après l'arbitrage du 2026-08-14.
 *
 * ⚠️ ADRESSE POSTALE DE L'HÉBERGEUR À COMPLÉTER — la raison sociale exacte et
 * l'adresse d'OVH Belgique n'ont pas été fournies. Des mentions légales doivent
 * porter le nom ET l'adresse de l'hébergeur : à renseigner avant le merge.
 *
 * Corriger l'hébergement ne supprime pas tout transfert hors du Sénégal, il le
 * déplace : `llm-client.ts` fixe `DEFAULT_LOCATION = 'us-central1'` et la
 * production ne le surcharge pas — les conversations Yaye, qui contiennent des
 * PII BRUTES (cf. `src/lib/ia/cdp-purge.ts`), sont donc traitées aux
 * États-Unis.
 *
 * Ces transferts **ont été déclarés à la CDP** (information PO du 2026-08-14) :
 * la formalité légale est donc remplie. Ce qui manquait, c'était l'information
 * de l'utilisateur — l'Article 6 de la politique ne parle que de « prestataires
 * techniques », sans nommer personne ni signaler de sortie du territoire. D'où
 * la section « Localisation et transferts » ci-dessous, aujourd'hui le seul
 * endroit du site où l'utilisateur l'apprend. Cf. spec §5.
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
          type: 'definitions',
          items: [
            { terme: 'Hébergeur', valeur: 'OVH Belgique' },
            { terme: 'Localisation des serveurs', valeur: 'Belgique (Union européenne)' },
          ],
        },
        {
          type: 'paragraphe',
          texte:
            'L’application, les bases de données opérationnelles (MariaDB, Redis) et les fichiers que vous téléversez (CV, photo de profil) sont hébergés sur ce même serveur, en Belgique.',
        },
      ],
    },
    {
      titre: '3. Localisation de vos données et transferts',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'Vos données de compte, de profil et de candidature sont stockées en Belgique, au sein de l’Union européenne. Deux traitements font toutefois appel à des prestataires situés hors de l’Union européenne :',
        },
        {
          type: 'definitions',
          items: [
            {
              terme: 'Assistant conversationnel Yaye',
              valeur:
                'vos échanges avec l’assistant sont traités par Google Cloud (Vertex AI) sur une infrastructure située aux États-Unis.',
            },
            {
              terme: 'Notifications WhatsApp',
              valeur:
                'les messages envoyés via WhatsApp transitent par Meta Platforms, dont l’infrastructure est située hors de l’Union européenne.',
            },
          ],
        },
        {
          type: 'encart',
          titre: 'Transferts déclarés',
          texte:
            'Ces transferts de données hors du Sénégal ont été déclarés à la Commission de Protection des Données Personnelles (CDP) du Sénégal, conformément à la Loi n° 2008-12 du 25 janvier 2008.',
        },
        {
          type: 'paragraphe',
          texte:
            'Vous pouvez vous opposer à ces traitements et demander l’effacement des données concernées : les modalités sont détaillées sur la page « Vos droits sur vos données personnelles ».',
        },
      ],
    },
    {
      titre: '4. Propriété intellectuelle',
      blocs: [
        {
          type: 'paragraphe',
          texte:
            'L’ensemble des contenus présents sur le Guichet Jeunesse (textes, graphismes, logo, code source) est la propriété exclusive du CJS ou de ses partenaires, et est protégé par les lois sénégalaises et internationales sur la propriété intellectuelle.',
        },
      ],
    },
    {
      titre: '5. Contact et données personnelles',
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
