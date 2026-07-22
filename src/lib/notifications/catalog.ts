// Catalogue des événements notifiables — GUIC-549.
// Source de vérité unique : le moteur (GUIC-548) résout les destinataires et canaux
// à partir d'ici ; la matrice admin (GUIC-550) est seedée depuis les `defaultChannels`.
// Recensé par cartographie du code (voir .agent_context/specs/GUIC-547-notifications-multicanal.md §3).

/** Types d'utilisateurs destinataires (rôles SSO regroupés côté Guichet). */
export const NOTIFICATION_ROLES = ['beneficiaire', 'recruteur', 'conseiller', 'admin'] as const
export type NotificationRole = (typeof NOTIFICATION_ROLES)[number]

/** Canaux de livraison disponibles. */
export const NOTIFICATION_CHANNELS = ['in_app', 'whatsapp', 'sms', 'email'] as const
export type NotificationChannelId = (typeof NOTIFICATION_CHANNELS)[number]

/** Définition d'un événement notifiable. */
export interface NotificationEventDef {
  /** Clé stable `module.action(.detail)` — ex. `candidature.statut_change`. */
  key: string
  /** Module métier d'origine (m2…m12). */
  module: string
  /** Libellé humain court (affiché dans la matrice admin). */
  label: string
  /** Rôles pouvant être destinataires de cet événement. */
  roles: NotificationRole[]
  /** Canaux activés par défaut (surchargés par la config admin). */
  defaultChannels: NotificationChannelId[]
  /** Événement critique : garde toujours au moins l'in-app (jamais silencieux total). */
  critical?: boolean
}

function def(
  key: string,
  module: string,
  label: string,
  roles: NotificationRole[],
  defaultChannels: NotificationChannelId[],
  critical = false,
): NotificationEventDef {
  return { key, module, label, roles, defaultChannels, critical }
}

const EVENTS: NotificationEventDef[] = [
  // ── M2 — Auth / Comptes ────────────────────────────────────────────────
  def('compte.provisioned', 'm2', 'Compte créé (bienvenue)', ['beneficiaire'], ['in_app', 'email']),
  def('partenaire.compte_verifie', 'm2', 'Compte partenaire validé', ['recruteur'], ['in_app', 'email']),
  def('recruteur.statut_change', 'm2', 'Statut recruteur modifié', ['recruteur'], ['in_app', 'email']),

  // ── M3 — Opportunités & Candidatures ───────────────────────────────────
  def('candidature.created.confirmation', 'm3', 'Candidature envoyée (confirmation)', ['beneficiaire'], ['in_app', 'whatsapp'], true),
  def('candidature.created.recruteur', 'm3', 'Nouvelle candidature reçue', ['recruteur'], ['in_app'], true),
  def('candidature.statut_change', 'm3', 'Statut de candidature mis à jour', ['beneficiaire'], ['in_app', 'whatsapp'], true),
  def('opportunite.created_recruteur', 'm3', 'Offre soumise par un recruteur', ['admin'], ['in_app']),
  def('opportunite.approved', 'm3', 'Offre approuvée / publiée', ['recruteur'], ['in_app', 'email']),
  def('opportunite.rejected', 'm3', 'Offre rejetée', ['recruteur'], ['in_app', 'email']),
  def('opportunite.matches_profile', 'm3', 'Nouvelle offre correspondant au profil', ['beneficiaire'], ['in_app', 'whatsapp']),
  def('candidature.deadline_approaching', 'm3', 'Échéance de candidature proche', ['beneficiaire'], ['in_app', 'sms']),

  // ── M4 — Centres (réservations, check-in, bibliothèque) ────────────────
  def('reservation.created.staff', 'm4', 'Nouvelle réservation à valider', ['conseiller'], ['in_app'], true),
  def('reservation.created.jeune', 'm4', 'Demande de réservation envoyée', ['beneficiaire'], ['sms', 'email']),
  def('reservation.accepted', 'm4', 'Réservation acceptée', ['beneficiaire'], ['in_app', 'sms'], true),
  def('reservation.refused', 'm4', 'Réservation refusée', ['beneficiaire'], ['in_app', 'sms'], true),
  def('reservation.creneau_proposed', 'm4', 'Nouveau créneau proposé', ['beneficiaire'], ['in_app', 'sms'], true),
  def('reservation.cancelled_by_jeune', 'm4', 'Réservation annulée par le jeune', ['conseiller'], ['in_app']),
  def('reservation.cancelled_by_centre', 'm4', 'Réservation annulée par le centre', ['beneficiaire'], ['in_app', 'sms']),
  def('reservation.reminder', 'm4', 'Rappel de réservation (J-1)', ['beneficiaire'], ['sms']),
  def('reservation.no_show', 'm4', 'Réservation non honorée', ['beneficiaire'], ['in_app']),
  def('checkin.presence_marked', 'm4', 'Présence enregistrée', ['beneficiaire'], ['in_app']),
  def('emprunt.initie', 'm4', 'Emprunt initié', ['beneficiaire'], ['in_app', 'email']),
  def('emprunt.retrait_confirme', 'm4', 'Retrait de livre confirmé', ['beneficiaire'], ['in_app', 'email']),
  def('emprunt.rendu', 'm4', 'Livre rendu', ['beneficiaire'], ['in_app']),
  def('emprunt.en_retard', 'm4', 'Emprunt en retard (rappel)', ['beneficiaire'], ['sms', 'email']),

  // ── M5 — Agenda / Événements ───────────────────────────────────────────
  def('evenement.inscription', 'm5', 'Inscription à un événement confirmée', ['beneficiaire'], ['in_app', 'email']),
  def('evenement.reminder', 'm5', 'Rappel d’événement (J-1)', ['beneficiaire'], ['sms', 'whatsapp']),
  def('evenement.modified', 'm5', 'Événement modifié', ['beneficiaire'], ['in_app', 'sms']),
  def('evenement.cancelled', 'm5', 'Événement annulé', ['beneficiaire'], ['in_app', 'sms'], true),
  def('publication.soumise', 'm5', 'Publication soumise à relecture', ['admin'], ['in_app']),
  def('publication.validee', 'm5', 'Publication validée', ['conseiller'], ['in_app']),
  def('publication.refusee', 'm5', 'Publication refusée', ['conseiller'], ['in_app']),

  // ── M6 — Ressources ────────────────────────────────────────────────────
  def('ressource.published', 'm6', 'Nouvelle ressource publiée', ['beneficiaire'], ['in_app']),
  def('ressource.modified', 'm6', 'Ressource mise à jour', ['beneficiaire'], ['in_app']),

  // ── M8 — Admin / Modération / Curation ─────────────────────────────────
  def('curation.item_discovered', 'm8', 'Nouvel item de veille à modérer', ['admin'], ['in_app']),
  def('partenaire.rattachement_centre', 'm8', 'Rattachement à un centre', ['conseiller'], ['in_app']),

  // ── M9 — Recruteur (entretiens, messagerie) ────────────────────────────
  def('entretien.planifie', 'm9', 'Entretien planifié', ['beneficiaire'], ['in_app', 'whatsapp', 'sms'], true),
  def('entretien.annule', 'm9', 'Entretien annulé', ['beneficiaire'], ['in_app', 'sms'], true),
  def('entretien.termine', 'm9', 'Entretien terminé', ['beneficiaire'], ['in_app']),
  def('entretien.reminder', 'm9', 'Rappel d’entretien (J-1)', ['beneficiaire', 'recruteur'], ['sms', 'whatsapp']),
  def('message.received', 'm9', 'Nouveau message', ['beneficiaire', 'recruteur', 'conseiller'], ['in_app'], true),

  // ── M11 — WhatsApp ─────────────────────────────────────────────────────
  def('whatsapp.opt_in_confirmed', 'm11', 'Canal WhatsApp lié', ['beneficiaire'], ['whatsapp']),

  // ── M12 — IA (Yaye) ────────────────────────────────────────────────────
  def('yaye.escalade_conseiller', 'm12', 'Escalade Yaye vers conseiller', ['conseiller'], ['in_app'], true),
  def('yaye.signalement_danger', 'm12', 'Signalement de danger (urgent)', ['conseiller'], ['in_app', 'sms'], true),
  def('yaye.escalade_resolue', 'm12', 'Escalade résolue (réponse humaine)', ['beneficiaire'], ['in_app', 'whatsapp']),
]

/** Registre indexé par clé. */
export const NOTIFICATION_EVENTS: Record<string, NotificationEventDef> = Object.freeze(
  Object.fromEntries(EVENTS.map((e) => [e.key, e])),
)

/** Récupère la définition d'un événement, ou `undefined` si inconnu. */
export function getEventDef(key: string): NotificationEventDef | undefined {
  return NOTIFICATION_EVENTS[key]
}

/** Liste toutes les définitions d'événements. */
export function listEvents(): NotificationEventDef[] {
  return Object.values(NOTIFICATION_EVENTS)
}

/** Liste toutes les clés d'événements. */
export function eventKeys(): string[] {
  return Object.keys(NOTIFICATION_EVENTS)
}
