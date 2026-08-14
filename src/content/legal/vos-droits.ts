/**
 * GUIC-605 — Page « Vos droits sur vos données personnelles ».
 *
 * Source : `TEXTES DE CONSENTEMENT POUR LA COLLECTE DE DONNÉES
 * PERSONNELLES.docx` (Drive, Mars 2026), section 4 — page entièrement rédigée
 * par le responsable données, publiée ici sans reformulation de fond.
 *
 * C'est le document que l'utilisateur doit avoir à disposition pour exercer
 * ses droits. Il ne dépend d'aucun schéma : l'exercice se fait par contact du
 * responsable, pas en self-service (une page « Mes données » outillée reste
 * hors périmètre, cf. spec §Hors périmètre).
 *
 * Écarts assumés vis-à-vis du .docx (arbitrages PO 2026-08-14) :
 * - Délai de réponse **15 jours**, retenu contre les 30 j de la politique.
 * - Adresse courrier : *SICAP Point E* → **CDEPS de Guédiawaye**, valeur des
 *   deux autres documents.
 * - Le droit d'opposition, avalé dans la puce du droit de rectification par un
 *   défaut de mise en forme, est rétabli en item distinct (cf. `droits.ts`).
 */
import type { DocumentLegal } from './types'
import { AUTORITE_CDP, CONTACT_CDP } from './contact'
import { CHAPEAU_DROITS, DROITS_CDP } from './droits'

export const VOS_DROITS: DocumentLegal = {
  slug: 'vos-droits',
  titre: 'Vos droits sur vos données personnelles',
  resume:
    'Accès, rectification, opposition, effacement : les droits dont vous disposez sur vos données et comment les exercer auprès du CJS.',
  version: '2026-03',
  dateMaj: 'Mars 2026',
  sections: [
    {
      titre: 'Les droits dont vous disposez',
      blocs: [
        { type: 'paragraphe', texte: CHAPEAU_DROITS },
        { type: 'definitions', items: DROITS_CDP.map((d) => ({ ...d })) },
      ],
    },
    {
      titre: 'Comment exercer ces droits',
      blocs: [
        {
          type: 'definitions',
          items: [
            { terme: 'Email', valeur: CONTACT_CDP.emailDonnees },
            { terme: 'Téléphone', valeur: CONTACT_CDP.telephone },
            { terme: 'Courrier', valeur: `${CONTACT_CDP.organisme}, ${CONTACT_CDP.adresse}` },
            { terme: 'Délai de réponse', valeur: `${CONTACT_CDP.delaiReponse} à compter de la réception de votre demande.` },
          ],
        },
        {
          type: 'paragraphe',
          texte: `Votre demande est traitée par ${CONTACT_CDP.responsableDonnees}, responsable des données personnelles du CJS.`,
        },
      ],
    },
    {
      titre: 'Réclamation',
      blocs: [
        {
          type: 'paragraphe',
          texte: `Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la ${AUTORITE_CDP.nom} :`,
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
  ],
}
