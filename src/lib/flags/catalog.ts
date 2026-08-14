// GUIC-706 — Catalogue des fonctionnalités du lancement séquentiel.
//
// SOURCE DE VÉRITÉ. La table `feature_flags` ne porte que les ÉCARTS à ce catalogue :
// une clé absente de la base vaut son `defaultEnabled` ici. Ajouter une fonctionnalité ne
// demande donc aucune migration.
//
// Module pur (aucune I/O), sur le modèle de `src/lib/notifications/catalog.ts`.
// Spec : `.agent_context/specs/GUIC-706-feature-flags.md`.

import type { Audience, Face, FeatureFlagDef } from './types'

export type { Audience, Face, FeatureFlagDef } from './types'
export { AUDIENCES } from './types'

/** Publics fermés par défaut : la face consommateur, connectée ou non. */
const CONSOMMATEURS: Audience[] = ['anonyme', 'beneficiaire']

type Options = Partial<Omit<FeatureFlagDef, 'key' | 'module' | 'label' | 'description'>>

function def(
  key: string,
  module: string,
  label: string,
  description: string,
  o: Options = {},
): FeatureFlagDef {
  return {
    key,
    module,
    label,
    description,
    userRoutes: o.userRoutes ?? [],
    adminRoutes: o.adminRoutes ?? [],
    apiPrefixes: o.apiPrefixes ?? [],
    navIds: o.navIds ?? [],
    crons: o.crons ?? [],
    closes: o.closes ?? CONSOMMATEURS,
    dependsOn: o.dependsOn ?? [],
    requires: o.requires ?? [],
    closeMode: o.closeMode ?? 'sec',
    engagements: o.engagements,
    defaultEnabled: o.defaultEnabled ?? true,
    locked: o.locked ?? false,
  }
}

/** Raccourci pour le socle : verrouillé, sans face utilisateur, sans route fermée. */
function socle(key: string, module: string, label: string, description: string): FeatureFlagDef {
  return def(key, module, label, description, { closes: [], locked: true, defaultEnabled: true })
}

export const FEATURE_FLAGS: readonly FeatureFlagDef[] = [
  // ── Socle — jamais masquable ────────────────────────────────────────────────
  socle('m1.socle', 'm1', 'Socle applicatif', 'Layouts, sécurité, base de données, pages légales.'),
  socle('m2.auth', 'm2', 'Authentification SSO', 'Connexion CJS, callback, déconnexion, webhook SSO.'),
  socle('m2.profil', 'm2', 'Profil utilisateur', 'Identité, CV, diplômes, langues, complétude.'),
  socle('m7.seo', 'm7', 'Référencement', 'Sitemap, robots, manifeste, aperçus sociaux.'),
  socle('m8.admin', 'm8', 'Console d’administration', 'L’espace depuis lequel tout est piloté.'),
  socle('m14.ops', 'm14', 'Exploitation', 'Sondes de santé, observabilité, instrumentation.'),

  // ── Onboarding — verrouillé mais dépendant des centres ──────────────────────
  def('m2.onboarding', 'm2', 'Parcours d’accueil', 'Les étapes suivies à la première connexion.', {
    closes: [],
    locked: true,
    // L'étape « centre principal » charge la liste des centres : masquer `m4.centres`
    // sans rendre l'étape conditionnelle casserait un parcours pourtant verrouillé.
    requires: ['m4.centres'],
    adminRoutes: ['/admin/onboarding'],
  }),

  // ── Vague 1 — modules isolés ────────────────────────────────────────────────
  def('m5.agenda', 'm5', 'Agenda & événements', 'Le calendrier public et les inscriptions aux ateliers.', {
    userRoutes: ['/agenda', '/jeune/mes-inscriptions'],
    adminRoutes: ['/admin/evenements', '/admin/analytics/evenements', '/api/admin/evenements'],
    apiPrefixes: ['/api/evenements'],
    navIds: ['agenda', 'evenements'],
    closeMode: 'drain',
    engagements: {
      model: 'inscriptionEvenement',
      activeStates: ['inscrit', 'liste_attente'],
      label: 'inscriptions à des événements à venir',
    },
  }),

  def('m6.ressources', 'm6', 'Ressources documentaires', 'Guides, articles, modèles et fiches pratiques.', {
    userRoutes: ['/ressources'],
    adminRoutes: ['/admin/ressources'],
    apiPrefixes: ['/api/ressources', '/api/favoris/ressources'],
    navIds: ['ressources'],
  }),

  def('m6.formations', 'm6', 'Suivi de formation', 'Le parcours de formation en ligne d’un jeune et sa progression.', {
    userRoutes: ['/jeune/mes-formations'],
    navIds: ['formations'],
    closes: ['beneficiaire'],
    dependsOn: ['m6.ressources'],
  }),

  def('m4.bibliotheque', 'm4', 'Bibliothèque physique', 'Le catalogue de livres des centres et les emprunts.', {
    userRoutes: ['/jeune/bibliotheque', '/conseiller/bibliotheque', '/centre-staff/bibliotheque'],
    adminRoutes: ['/admin/bibliotheque', '/api/admin/bibliotheque'],
    apiPrefixes: ['/api/bibliotheque'],
    navIds: ['bibliotheque'],
    closeMode: 'drain',
    engagements: {
      model: 'emprunt',
      activeStates: ['initie', 'en_cours', 'en_retard'],
      label: 'emprunts en cours',
    },
  }),

  def('m4.carte_cjs', 'm4', 'Carte CJS', 'La carte de membre du jeune et son QR code personnel.', {
    userRoutes: ['/jeune/ma-carte'],
    apiPrefixes: ['/api/cjs-card'],
    navIds: ['ma-carte'],
    closes: ['beneficiaire'],
  }),

  // Le pointage suppose une carte à scanner : sans elle, le comptoir n'a rien à lire.
  def('m4.checkin', 'm4', 'Pointage de présence', 'Le scan du badge à l’accueil d’un centre et le comptage des présences.', {
    userRoutes: ['/checkin', '/conseiller/checkin', '/centre-staff/checkins'],
    apiPrefixes: ['/api/v1/checkin'],
    navIds: ['checkin'],
    closes: ['beneficiaire', 'conseiller'],
    dependsOn: ['m4.carte_cjs'],
    crons: ['/api/cron/cleanup-checkins'],
  }),

  def('x.messagerie', 'x', 'Messagerie interne', 'Les échanges directs entre jeunes, conseillers et recruteurs.', {
    userRoutes: ['/jeune/messagerie', '/recruteur/messagerie', '/conseiller/messagerie'],
    navIds: ['messagerie'],
    closes: ['beneficiaire', 'recruteur', 'conseiller'],
  }),

  // ── Vague 2 — espaces entiers ───────────────────────────────────────────────
  def('m9.recruteur', 'm9', 'Espace recruteur', 'L’intégralité de l’espace partenaire.', {
    userRoutes: ['/recruteur'],
    adminRoutes: ['/admin/partenaires'],
    apiPrefixes: ['/api/recruteur'],
    closes: ['recruteur'],
    dependsOn: ['m3.opportunites', 'm3.candidatures'],
  }),

  def('m9.offres', 'm9', 'Publication d’offres', 'La création et la gestion des offres par un recruteur.', {
    userRoutes: ['/recruteur/mes-offres'],
    navIds: ['offres'],
    closes: ['recruteur'],
    dependsOn: ['m9.recruteur'],
  }),

  def('m9.pipeline', 'm9', 'Suivi des candidatures', 'Le vivier et le tableau kanban de sélection du recruteur.', {
    userRoutes: ['/recruteur/candidatures'],
    apiPrefixes: ['/api/recruteur/candidatures'],
    navIds: ['candidatures'],
    closes: ['recruteur'],
    dependsOn: ['m9.recruteur', 'm3.candidatures'],
  }),

  // Dépend d'une OAuth Google externe : sans flag propre, une panne côté Google casserait
  // un item de navigation sans qu'on puisse le retirer.
  def('m9.entretiens', 'm9', 'Entretiens & visioconférence', 'La planification d’entretiens et les liens Google Meet.', {
    userRoutes: ['/recruteur/entretiens'],
    apiPrefixes: ['/api/recruteur/google-meet'],
    navIds: ['entretiens'],
    closes: ['recruteur'],
    dependsOn: ['m9.recruteur'],
  }),

  def('m9.modeles_emails', 'm9', 'Modèles d’e-mails', 'Les réponses types que le recruteur envoie aux candidats.', {
    userRoutes: ['/recruteur/modeles-emails'],
    navIds: ['modeles-emails'],
    closes: ['recruteur'],
    dependsOn: ['m9.recruteur'],
  }),

  def('m8.conseiller', 'm8', 'Espace conseiller', 'L’intégralité de l’espace des agents de centre.', {
    userRoutes: ['/conseiller'],
    closes: ['conseiller'],
  }),

  def('m8.beneficiaires', 'm8', 'Suivi des bénéficiaires', 'L’annuaire et les fiches de suivi des jeunes rattachés au centre.', {
    userRoutes: ['/conseiller/beneficiaires'],
    navIds: ['benef'],
    closes: ['conseiller'],
    dependsOn: ['m8.conseiller'],
  }),

  def('m8.publications', 'm8', 'Publications de centre', 'La rédaction de contenus par les conseillers.', {
    userRoutes: ['/conseiller/publications'],
    navIds: ['publications'],
    closes: ['conseiller'],
    dependsOn: ['m8.conseiller', 'm6.ressources'],
  }),

  // Agenda dérivé de Réservation + Événement (GUIC-497) : il n'a de contenu que si l'une
  // au moins de ces deux sources est ouverte.
  def('m8.agenda_conseiller', 'm8', 'Agenda du conseiller', 'Le planning quotidien d’un agent : réservations et événements du centre.', {
    userRoutes: ['/conseiller/agenda'],
    navIds: ['agenda'],
    closes: ['conseiller'],
    dependsOn: ['m8.conseiller'],
  }),

  def('m8.centre_staff', 'm8', 'Espace centre (ancien)', 'L’ancien espace personnel de centre, en cours de migration.', {
    userRoutes: ['/centre-staff'],
    apiPrefixes: ['/api/centre-staff', '/api/staff'],
    closes: ['conseiller'],
  }),

  // ── Vague 3 — coût externe ou risque ────────────────────────────────────────
  def('m12.yaye', 'm12', 'Assistant IA — Yaye', 'Interrupteur général de l’IA : coupe tout appel au modèle.', {
    adminRoutes: ['/admin/yaye', '/admin/analytics/yaye', '/api/admin/ia', '/api/admin/yaye'],
    closes: ['anonyme', 'beneficiaire', 'recruteur', 'conseiller'],
    crons: ['/api/cron/yaye-graph-sync'],
  }),

  def('m12.yaye_chat', 'm12', 'Yaye — conversation', 'La bulle d’assistance et la page de discussion.', {
    userRoutes: ['/jeune/yaye'],
    apiPrefixes: ['/api/ia'],
    dependsOn: ['m12.yaye'],
    crons: ['/api/cron/yaye-warm-search'],
  }),

  def('m12.yaye_whatsapp', 'm12', 'Yaye — WhatsApp', 'Le même assistant, joignable par WhatsApp.', {
    closes: ['beneficiaire'],
    dependsOn: ['m12.yaye', 'm11.whatsapp'],
  }),

  def('m12.reco', 'm12', 'Recommandations IA', 'Le score de correspondance affiché sur une opportunité.', {
    dependsOn: ['m12.yaye'],
    crons: ['/api/cron/yaye-reco-precompute'],
  }),

  def('m12.adequation', 'm12', 'Score d’adéquation', 'Le score candidat/offre qui classe le vivier du recruteur.', {
    closes: ['recruteur'],
    dependsOn: ['m12.yaye'],
  }),

  def('m12.eval', 'm12', 'Évaluation de Yaye', 'Le juge automatique qui note les réponses de l’assistant.', {
    closes: [],
    dependsOn: ['m12.yaye'],
    crons: ['/api/cron/yaye-eval'],
  }),

  def('m11.whatsapp', 'm11', 'Canal WhatsApp', 'Le rattachement du numéro et la conversation WhatsApp.', {
    apiPrefixes: ['/api/whatsapp'],
    closes: ['beneficiaire'],
  }),

  def('x.notif_in_app', 'x', 'Notifications dans l’application', 'La cloche et le centre de notifications.', {
    userRoutes: ['/jeune/notifications', '/recruteur/notifications', '/conseiller/notifications'],
    adminRoutes: ['/admin/notifications'],
    apiPrefixes: ['/api/notifications'],
    navIds: ['notifications'],
    closes: ['beneficiaire', 'recruteur', 'conseiller'],
  }),

  // `/api/cron/notifications-reminders` existe en code mais n'est PAS planifié dans
  // vercel.json — anomalie préexistante révélée par l'invariant de couverture des crons.
  // On ne le référence pas ici : un flag qui prétendrait couper une tâche qui ne tourne
  // pas donnerait une fausse assurance. À rattacher le jour où le cron sera planifié.
  def('x.notif_email', 'x', 'Notifications par e-mail', 'Les envois d’e-mails transactionnels.', {
    closes: ['beneficiaire', 'recruteur', 'conseiller'],
  }),

  def('x.notif_sms', 'x', 'Notifications par SMS', 'Les envois de SMS.', {
    closes: ['beneficiaire', 'recruteur', 'conseiller'],
  }),

  def('x.notif_whatsapp', 'x', 'Notifications par WhatsApp', 'Les notifications poussées sur WhatsApp.', {
    closes: ['beneficiaire'],
    dependsOn: ['m11.whatsapp'],
  }),

  def('m3.curation', 'm3', 'Veille & curation', 'Le robot qui détecte les opportunités et la file de validation.', {
    adminRoutes: ['/admin/curation', '/admin/sources-veille', '/api/admin/sources-veille'],
    closes: [],
    crons: ['/api/cron/veille-sources'],
  }),

  def('m13.datahub', 'm13', 'Data Hub', 'Les flux d’export ouverts aux systèmes partenaires.', {
    adminRoutes: ['/admin/data-hub', '/api/admin/export'],
    apiPrefixes: ['/api/v1/export'],
    closes: [],
  }),

  def('m13.consultations', 'm13', 'Traçage des consultations', 'La mesure de ce que les jeunes consultent, web, IA et WhatsApp confondus.', {
    apiPrefixes: ['/api/v1/track'],
    closes: [],
  }),

  def('m10.interop_brm', 'm10', 'Interop — BRM', 'L’échange machine avec la Banque de Ressources.', {
    apiPrefixes: ['/api/interconnexion/brm'],
    closes: [],
  }),

  def('m10.interop_centres', 'm10', 'Interop — Centres', 'L’échange machine avec le système des centres.', {
    apiPrefixes: ['/api/interconnexion/centres'],
    closes: [],
  }),

  def('m10.interop_moodle', 'm10', 'Interop — Moodle', 'La remontée des certificats e-learning.', {
    apiPrefixes: ['/api/interconnexion/moodle'],
    closes: [],
  }),

  def('m10.interop_edupop', 'm10', 'Interop — EduPop', 'L’échange machine avec EduPop.', {
    apiPrefixes: ['/api/interconnexion/edupop'],
    closes: [],
  }),

  // ── Irréductibles — interrupteurs d'incident, pas leviers de lancement ──────
  def('m3.opportunites', 'm3', 'Catalogue d’opportunités', 'Emplois, stages, bourses, formations et appels à projets.', {
    userRoutes: ['/opportunites'],
    adminRoutes: ['/admin/opportunites', '/admin/types-opportunite', '/api/admin/export/opportunites'],
    apiPrefixes: ['/api/opportunites'],
    navIds: ['opp-all', 'opp-emploi', 'opp-bourse', 'opp-formation', 'opp-concours'],
  }),

  def('m3.favoris', 'm3', 'Sauvegardes', 'La mise de côté d’une opportunité ou d’une ressource pour y revenir.', {
    userRoutes: ['/jeune/mes-favoris'],
    apiPrefixes: ['/api/favoris'],
    navIds: ['favoris'],
    closes: ['beneficiaire'],
    dependsOn: ['m3.opportunites'],
  }),

  def('m3.programmes', 'm3', 'Rattachement aux programmes', 'Le lien entre un contenu et les programmes YEAH, YJC, EduPop, Yaakaar.', {
    adminRoutes: ['/admin/programmes'],
    closes: [],
    crons: ['/api/cron/programme-integrity'],
  }),

  def('m3.candidatures', 'm3', 'Candidatures', 'Le dépôt de candidature et son suivi.', {
    userRoutes: ['/jeune/mes-candidatures', '/jeune/candidature'],
    adminRoutes: ['/admin/candidatures', '/api/admin/candidatures'],
    apiPrefixes: ['/api/candidatures'],
    navIds: ['candidatures'],
    dependsOn: ['m3.opportunites'],
    closeMode: 'drain',
    engagements: {
      model: 'candidature',
      activeStates: ['En_attente', 'Vue'],
      label: 'candidatures en cours d’instruction',
    },
  }),

  def('m4.centres', 'm4', 'Centres CJS', 'L’annuaire des centres et leurs fiches.', {
    userRoutes: ['/centres'],
    adminRoutes: ['/admin/centres', '/admin/analytics/centres', '/api/admin/analytics/centres'],
    apiPrefixes: ['/api/centres'],
    navIds: ['centres'],
    crons: ['/api/cron/cleanup-centre-events'],
  }),

  def('m4.reservations', 'm4', 'Réservation de ressources', 'La réservation de salles et d’équipements en centre.', {
    userRoutes: ['/jeune/mes-reservations-centres', '/conseiller/reservations', '/centre-staff/reservations'],
    apiPrefixes: ['/api/reservations'],
    navIds: ['resa', 'reservations'],
    dependsOn: ['m4.centres'],
    crons: ['/api/cron/reservations-batch'],
    closeMode: 'drain',
    engagements: {
      model: 'reservation',
      activeStates: ['EnAttente', 'Acceptee'],
      label: 'réservations à venir',
    },
  }),
] as const

const PAR_CLE = new Map(FEATURE_FLAGS.map((f) => [f.key, f]))

export function getFlagDef(key: string): FeatureFlagDef | undefined {
  return PAR_CLE.get(key)
}

/** État de chaque flag en l'absence de toute surcharge en base. */
export function catalogDefaults(): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const f of FEATURE_FLAGS) out[f.key] = f.defaultEnabled
  return out
}

/**
 * Préfixes indexés du plus long au plus court : `/jeune/bibliotheque/mes-emprunts` doit
 * tomber sur la bibliothèque, pas sur un préfixe plus court qui l'engloberait.
 */
const PREFIXES: { prefix: string; key: string }[] = FEATURE_FLAGS.flatMap((f) =>
  [...f.userRoutes, ...f.apiPrefixes].map((prefix) => ({ prefix, key: f.key })),
).sort((a, b) => b.prefix.length - a.prefix.length)

function couvre(pathname: string, prefix: string): boolean {
  // Frontière de segment obligatoire : sans elle, `/centres-partenaires` serait rattaché
  // au flag `/centres`.
  return pathname === prefix || pathname.startsWith(prefix + '/') || pathname.startsWith(prefix + '?')
}

/**
 * Flag couvrant une route, ou `null` si elle n'est pas gardée.
 *
 * Les chemins d'administration renvoient toujours `null` : la console reste ouverte même
 * si un préfixe du catalogue venait à les englober par accident (§2.1).
 */
export function flagForPath(pathname: string): string | null {
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) return null
  return PREFIXES.find((p) => couvre(pathname, p.prefix))?.key ?? null
}

/** Rôles reconnus par face, du plus spécifique au plus général. */
const FACES: { face: Face; roles: Set<string> }[] = [
  { face: 'admin', roles: new Set(['admin', 'super_admin', 'moderator']) },
  { face: 'conseiller', roles: new Set(['conseiller']) },
  { face: 'recruteur', roles: new Set(['recruteur']) },
  { face: 'beneficiaire', roles: new Set(['beneficiaire', 'jeune', 'chercheur_d_emploi']) },
]

/**
 * Face applicable à un visiteur.
 *
 * L'ordre est intentionnel et non commutatif : le SSO comme `rolesPourDevLogin` accordent
 * TOUJOURS `beneficiaire` en plus du rôle métier. Prendre « le premier rôle trouvé »
 * appliquerait la face bénéficiaire à un conseiller, qui perdrait son comptoir alors que
 * le lancement séquentiel lui demande justement de continuer à préparer.
 */
export function resolveAudience(roles: readonly string[] | null | undefined): Face {
  if (!roles || roles.length === 0) return 'anonyme'
  return FACES.find(({ roles: connus }) => roles.some((r) => connus.has(r)))?.face ?? 'beneficiaire'
}

/**
 * Vrai si la fonctionnalité doit être masquée à cette face.
 *
 * Deux garde-fous : l'administration n'est jamais fermée, et un flag ouvert ne ferme
 * personne. Le croisement avec `closes` permet à un même identifiant de navigation
 * (`agenda` existe chez le bénéficiaire et chez le conseiller) de disparaître d'un espace
 * sans disparaître de l'autre.
 */
export function isHiddenFor(key: string, face: Face, flags: Record<string, boolean>): boolean {
  if (face === 'admin') return false
  const def = PAR_CLE.get(key)
  if (!def) return false
  if (flags[key] !== false) return false
  return def.closes.includes(face)
}
