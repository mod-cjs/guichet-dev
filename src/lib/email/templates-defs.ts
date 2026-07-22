// Templates d'emails du pipeline recruteur — GUIC-553 évolution.
// ⚠️ Module SANS Prisma : consommé par des composants client (défauts, rendu, types).
// La résolution DB vit dans ./templates.ts.
// Les DÉFAUTS vivent ici ; la DB (EmailTemplate) ne stocke que les surcharges :
// version du recruteur (ownerUid) ?? version système ("" = admin) ?? défaut du code.
// Variables {{...}} remplacées par renderTemplate (mustache minimal, sans logique).


/** Variables disponibles dans tous les templates du pipeline. */
export const TEMPLATE_VARIABLES = ['prenom', 'nom', 'offre', 'organisation', 'complement'] as const
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number]

export interface EmailTemplateDef {
  cle: string
  nom: string
  description: string
  sujet: string
  corps: string
}

const T = (cle: string, nom: string, description: string, sujet: string, corps: string): EmailTemplateDef => ({
  cle,
  nom,
  description,
  sujet,
  corps,
})

/** Jeu de templates du pipeline candidatures (utilisable par le recruteur). */
export const RECRUTEUR_TEMPLATES: EmailTemplateDef[] = [
  T(
    'pipeline.accuse_reception',
    'Accusé de réception',
    'Confirme au candidat que sa candidature est bien reçue.',
    'Votre candidature à « {{offre}} » a bien été reçue',
    'Bonjour {{prenom}},\n\nNous confirmons la bonne réception de votre candidature au poste « {{offre}} » chez {{organisation}}. Nous revenons vers vous dès son examen.\n\n{{complement}}\n\nCordialement,\n{{organisation}}',
  ),
  T(
    'pipeline.preselection',
    'Présélection',
    'Informe le candidat qu’il est présélectionné.',
    'Bonne nouvelle : vous êtes présélectionné(e) pour « {{offre}} »',
    'Bonjour {{prenom}},\n\nVotre profil a retenu notre attention pour le poste « {{offre}} ». Vous êtes présélectionné(e) pour la suite du processus.\n\n{{complement}}\n\nCordialement,\n{{organisation}}',
  ),
  T(
    'pipeline.entretien',
    'Invitation à un entretien',
    'Invite le candidat à un entretien (précisez date/heure/lieu en complément).',
    'Invitation à un entretien — « {{offre}} »',
    'Bonjour {{prenom}},\n\nNous souhaitons vous rencontrer dans le cadre de votre candidature au poste « {{offre}} ».\n\n{{complement}}\n\nMerci de confirmer votre disponibilité.\n\nCordialement,\n{{organisation}}',
  ),
  T(
    'pipeline.entretien_replanifie',
    'Entretien replanifié',
    'Prévient d’un changement de date/heure d’entretien.',
    'Votre entretien pour « {{offre}} » est replanifié',
    'Bonjour {{prenom}},\n\nVotre entretien pour le poste « {{offre}} » doit être replanifié.\n\n{{complement}}\n\nMerci de votre compréhension.\n\nCordialement,\n{{organisation}}',
  ),
  T(
    'pipeline.test',
    'Convocation à un test',
    'Convoque le candidat à un test ou une évaluation.',
    'Convocation à un test — « {{offre}} »',
    'Bonjour {{prenom}},\n\nDans le cadre du processus de recrutement pour « {{offre}} », nous vous invitons à passer un test d’évaluation.\n\n{{complement}}\n\nCordialement,\n{{organisation}}',
  ),
  T(
    'pipeline.documents',
    'Demande de documents',
    'Demande des pièces complémentaires au candidat.',
    'Documents complémentaires pour votre candidature « {{offre}} »',
    'Bonjour {{prenom}},\n\nPour poursuivre l’étude de votre candidature au poste « {{offre}} », merci de nous transmettre les documents suivants :\n\n{{complement}}\n\nCordialement,\n{{organisation}}',
  ),
  T(
    'pipeline.relance',
    'Relance candidat',
    'Relance un candidat resté sans réponse.',
    'Sans réponse de votre part — « {{offre}} »',
    'Bonjour {{prenom}},\n\nNous restons sans retour de votre part concernant votre candidature au poste « {{offre}} ». Merci de nous indiquer si vous êtes toujours intéressé(e).\n\n{{complement}}\n\nCordialement,\n{{organisation}}',
  ),
  T(
    'pipeline.retenue',
    'Candidature retenue',
    'Annonce au candidat qu’il est retenu.',
    'Félicitations : votre candidature à « {{offre}} » est retenue',
    'Bonjour {{prenom}},\n\nFélicitations ! Votre candidature au poste « {{offre}} » chez {{organisation}} a été retenue.\n\n{{complement}}\n\nNous vous recontactons très vite pour la suite.\n\nCordialement,\n{{organisation}}',
  ),
  T(
    'pipeline.refus',
    'Candidature non retenue',
    'Informe le candidat que sa candidature n’est pas retenue.',
    'Votre candidature à « {{offre}} »',
    'Bonjour {{prenom}},\n\nNous vous remercions de l’intérêt porté au poste « {{offre}} ». Malgré la qualité de votre profil, nous ne donnons pas suite à votre candidature.\n\n{{complement}}\n\nNous vous souhaitons une pleine réussite dans vos recherches.\n\nCordialement,\n{{organisation}}',
  ),
  T(
    'pipeline.offre_pourvue',
    'Offre pourvue',
    'Informe les candidats restants que le poste est pourvu.',
    'Le poste « {{offre}} » est pourvu',
    'Bonjour {{prenom}},\n\nLe poste « {{offre}} » chez {{organisation}} est désormais pourvu. Nous vous remercions de votre candidature et conservons votre profil pour de futures opportunités.\n\n{{complement}}\n\nCordialement,\n{{organisation}}',
  ),
]

/** Index par clé. */
export const RECRUTEUR_TEMPLATES_BY_KEY: Record<string, EmailTemplateDef> = Object.freeze(
  Object.fromEntries(RECRUTEUR_TEMPLATES.map((t) => [t.cle, t])),
)

export function getTemplateDef(cle: string): EmailTemplateDef | undefined {
  return RECRUTEUR_TEMPLATES_BY_KEY[cle]
}

/** Remplace les variables {{x}} ; les inconnues deviennent chaîne vide. */
export function renderTemplate(texte: string, vars: Partial<Record<TemplateVariable, string>>): string {
  return texte
    .replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_, name: string) => vars[name as TemplateVariable] ?? '')
    .replace(/\n{3,}/g, '\n\n') // compacte les lignes vides laissées par un {{complement}} absent
    .trim()
}

export interface ResolvedTemplate {
  cle: string
  nom: string
  description: string
  sujet: string
  corps: string
  /** Provenance de la version : defaut (code), systeme (admin) ou recruteur. */
  source: 'defaut' | 'systeme' | 'recruteur'
}

