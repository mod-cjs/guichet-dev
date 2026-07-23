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
    '<p>Bonjour <strong>{{prenom}}</strong>,</p><p>Nous confirmons la bonne réception de votre candidature au poste « {{offre}} » chez {{organisation}}. Nous revenons vers vous dès son examen.</p><p>{{complement}}</p><p style="margin-top:18px">Cordialement,<br/><strong>{{organisation}}</strong></p>',
  ),
  T(
    'pipeline.preselection',
    'Présélection',
    'Informe le candidat qu’il est présélectionné.',
    'Bonne nouvelle : vous êtes présélectionné(e) pour « {{offre}} »',
    '<p>Bonjour <strong>{{prenom}}</strong>,</p><p>Votre profil a retenu notre attention pour le poste « {{offre}} ». Vous êtes présélectionné(e) pour la suite du processus.</p><p>{{complement}}</p><p style="margin-top:18px">Cordialement,<br/><strong>{{organisation}}</strong></p>',
  ),
  T(
    'pipeline.entretien',
    'Invitation à un entretien',
    'Invite le candidat à un entretien (précisez date/heure/lieu en complément).',
    'Invitation à un entretien — « {{offre}} »',
    '<p>Bonjour <strong>{{prenom}}</strong>,</p><p>Nous souhaitons vous rencontrer dans le cadre de votre candidature au poste « {{offre}} ».</p><p>{{complement}}</p><p>Merci de confirmer votre disponibilité.</p><p style="margin-top:18px">Cordialement,<br/><strong>{{organisation}}</strong></p>',
  ),
  T(
    'pipeline.entretien_replanifie',
    'Entretien replanifié',
    'Prévient d’un changement de date/heure d’entretien.',
    'Votre entretien pour « {{offre}} » est replanifié',
    '<p>Bonjour <strong>{{prenom}}</strong>,</p><p>Votre entretien pour le poste « {{offre}} » doit être replanifié.</p><p>{{complement}}</p><p>Merci de votre compréhension.</p><p style="margin-top:18px">Cordialement,<br/><strong>{{organisation}}</strong></p>',
  ),
  T(
    'pipeline.test',
    'Convocation à un test',
    'Convoque le candidat à un test ou une évaluation.',
    'Convocation à un test — « {{offre}} »',
    '<p>Bonjour <strong>{{prenom}}</strong>,</p><p>Dans le cadre du processus de recrutement pour « {{offre}} », nous vous invitons à passer un test d’évaluation.</p><p>{{complement}}</p><p style="margin-top:18px">Cordialement,<br/><strong>{{organisation}}</strong></p>',
  ),
  T(
    'pipeline.documents',
    'Demande de documents',
    'Demande des pièces complémentaires au candidat.',
    'Documents complémentaires pour votre candidature « {{offre}} »',
    '<p>Bonjour <strong>{{prenom}}</strong>,</p><p>Pour poursuivre l’étude de votre candidature au poste « {{offre}} », merci de nous transmettre les documents suivants :</p><p>{{complement}}</p><p style="margin-top:18px">Cordialement,<br/><strong>{{organisation}}</strong></p>',
  ),
  T(
    'pipeline.relance',
    'Relance candidat',
    'Relance un candidat resté sans réponse.',
    'Sans réponse de votre part — « {{offre}} »',
    '<p>Bonjour <strong>{{prenom}}</strong>,</p><p>Nous restons sans retour de votre part concernant votre candidature au poste « {{offre}} ». Merci de nous indiquer si vous êtes toujours intéressé(e).</p><p>{{complement}}</p><p style="margin-top:18px">Cordialement,<br/><strong>{{organisation}}</strong></p>',
  ),
  T(
    'pipeline.retenue',
    'Candidature retenue',
    'Annonce au candidat qu’il est retenu.',
    'Félicitations : votre candidature à « {{offre}} » est retenue',
    '<p>Bonjour <strong>{{prenom}}</strong>,</p><p>Félicitations ! Votre candidature au poste « {{offre}} » chez {{organisation}} a été retenue.</p><p>{{complement}}</p><p>Nous vous recontactons très vite pour la suite.</p><p style="margin-top:18px">Cordialement,<br/><strong>{{organisation}}</strong></p>',
  ),
  T(
    'pipeline.refus',
    'Candidature non retenue',
    'Informe le candidat que sa candidature n’est pas retenue.',
    'Votre candidature à « {{offre}} »',
    '<p>Bonjour <strong>{{prenom}}</strong>,</p><p>Nous vous remercions de l’intérêt porté au poste « {{offre}} ». Malgré la qualité de votre profil, nous ne donnons pas suite à votre candidature.</p><p>{{complement}}</p><p>Nous vous souhaitons une pleine réussite dans vos recherches.</p><p style="margin-top:18px">Cordialement,<br/><strong>{{organisation}}</strong></p>',
  ),
  T(
    'pipeline.offre_pourvue',
    'Offre pourvue',
    'Informe les candidats restants que le poste est pourvu.',
    'Le poste « {{offre}} » est pourvu',
    '<p>Bonjour <strong>{{prenom}}</strong>,</p><p>Le poste « {{offre}} » chez {{organisation}} est désormais pourvu. Nous vous remercions de votre candidature et conservons votre profil pour de futures opportunités.</p><p>{{complement}}</p><p style="margin-top:18px">Cordialement,<br/><strong>{{organisation}}</strong></p>',
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
    .replace(/<p[^>]*>\s*<\/p>/g, '') // paragraphes HTML vidés par une variable absente
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

