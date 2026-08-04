/**
 * M13 / Data Hub — contrat d'export (lot 3, spec §5 et §7.1).
 *
 * CE FICHIER EST LE POINT DE CONTRÔLE CDP. Il décide, colonne par colonne, de ce qui
 * quitte le Guichet pour l'entrepôt. Rien d'autre ne sort : ce qui n'est pas listé ici
 * n'est pas exporté (fail-closed). Toute modification est un acte de gouvernance des
 * données, pas un détail d'implémentation — à relire comme tel.
 *
 * Trois garanties tenues par le compilateur (cf. `stream-types.ts`) : une colonne
 * inexistante, une transformation mal typée ou un watermark qui n'est pas une date ne
 * compilent pas.
 *
 * Deux garanties tenues par les tests (`tests/unit/datahub-streams.test.ts`) : aucune
 * colonne interdite n'apparaît, et toute colonne exportée porte une documentation `///`
 * dans `schema.prisma` — ce qui rend le dictionnaire opposable au lieu d'être un vœu.
 *
 * Sont volontairement hors périmètre v1 : les contenus conversationnels (`Message`,
 * `MessageWhatsApp`, `YayeTranscriptTurn`), dont la valeur analytique est faible au regard
 * du risque, et les textes libres longs, dont le coût de transport ne se justifie pas.
 */
import { defineStream, type AnyStreamDefinition } from './stream-types'
import { trancheAge } from './transforms'

export const streams = {
  /** Démographie des comptes. Aucune donnée nominative : l'âge sort en tranche. */
  utilisateurs: defineStream('Utilisateur', {
    primaryKey: 'cjsUid',
    replicationKey: 'updatedAt',
    softDelete: 'deletedAt',
    fields: {
      cjsUid: { as: 'cjs_uid', tier: 'pseudonyme' },
      region: { as: 'region', tier: 'public' },
      commune: { as: 'commune', tier: 'public' },
      genre: { as: 'genre', tier: 'public' },
      dateNaissance: {
        as: 'tranche_age',
        tier: 'public',
        // Enveloppé : le 2e paramètre de `trancheAge` est une date de référence de test,
        // pas la ligne source que le contrat passe désormais aux transformations.
        transform: (d) => trancheAge(d),
        outputType: 'string',
        description:
          "Tranche d'âge à la date d'extraction : -18, 18-24, 25-29, 30-34, 35+, ou inconnu quand la date de naissance est absente ou aberrante. Dérivée d'une donnée identifiante qui, elle, n'est jamais exportée.",
      },
      statut: { as: 'statut', tier: 'public' },
      role: { as: 'role', tier: 'public' },
      onboardingComplete: { as: 'onboarding_complete', tier: 'public' },
      createdAt: { as: 'date_inscription', tier: 'public' },
      updatedAt: { as: 'updated_at', tier: 'public' },
      deletedAt: { as: 'deleted_at', tier: 'public' },
    },
  }),

  /** Profils jeunes — socle des indicateurs d'inclusion (handicap, zone, niveau). */
  profils_jeunes: defineStream('ProfilJeune', {
    primaryKey: 'id',
    replicationKey: 'updatedAt',
    fields: {
      id: { as: 'id', tier: 'pseudonyme' },
      cjsUid: { as: 'cjs_uid', tier: 'pseudonyme' },
      niveauEtude: { as: 'niveau_etude', tier: 'public' },
      situationEmploi: { as: 'situation_emploi', tier: 'public' },
      situationHandicap: { as: 'situation_handicap', tier: 'public' },
      zoneHabitation: { as: 'zone_habitation', tier: 'public' },
      completionScore: { as: 'completion_score', tier: 'public' },
      centrePrincipalId: { as: 'centre_principal_id', tier: 'pseudonyme' },
      createdAt: { as: 'created_at', tier: 'public' },
      updatedAt: { as: 'updated_at', tier: 'public' },
    },
  }),

  /** Offres publiées. Les textes longs restent au Guichet ; l'entrepôt compte et croise. */
  opportunites: defineStream('Opportunite', {
    primaryKey: 'id',
    replicationKey: 'updatedAt',
    softDelete: 'deletedAt',
    fields: {
      id: { as: 'id', tier: 'pseudonyme' },
      slug: { as: 'slug', tier: 'public' },
      titre: { as: 'titre', tier: 'public' },
      type: { as: 'type_legacy', tier: 'public' },
      typeId: { as: 'type_id', tier: 'pseudonyme' },
      domaine: { as: 'domaine', tier: 'public' },
      region: { as: 'region', tier: 'public' },
      organisationId: { as: 'organisation_id', tier: 'pseudonyme' },
      organisationLibelle: { as: 'organisation_libelle', tier: 'public' },
      niveauEtudeMin: { as: 'niveau_etude_min', tier: 'public' },
      remuneration: { as: 'remuneration', tier: 'public' },
      deadline: { as: 'deadline', tier: 'public' },
      statut: { as: 'statut', tier: 'public' },
      recruteurUid: { as: 'recruteur_uid', tier: 'pseudonyme' },
      vues: { as: 'vues', tier: 'public' },
      createdAt: { as: 'created_at', tier: 'public' },
      updatedAt: { as: 'updated_at', tier: 'public' },
      deletedAt: { as: 'deleted_at', tier: 'public' },
    },
  }),

  /** Funnel de candidature — le cœur de la mesure d'insertion. */
  candidatures: defineStream('Candidature', {
    primaryKey: 'id',
    replicationKey: 'updatedAt',
    fields: {
      id: { as: 'id', tier: 'pseudonyme' },
      cjsUid: { as: 'cjs_uid', tier: 'pseudonyme' },
      opportuniteId: { as: 'opportunite_id', tier: 'pseudonyme' },
      statut: { as: 'statut', tier: 'public' },
      pipelineStage: { as: 'pipeline_stage', tier: 'public' },
      scoreAdequation: { as: 'score_adequation', tier: 'public' },
      scoreCalculeLe: { as: 'score_calcule_le', tier: 'public' },
      favoriRecruteur: { as: 'favori_recruteur', tier: 'public' },
      notificationsConsent: { as: 'notifications_consent', tier: 'public' },
      consentAt: { as: 'consent_at', tier: 'public' },
      cguVersion: { as: 'cgu_version', tier: 'public' },
      soumiseA: { as: 'soumise_a', tier: 'public' },
      updatedAt: { as: 'updated_at', tier: 'public' },
    },
  }),

  /** Événements programmés. */
  evenements: defineStream('Evenement', {
    primaryKey: 'id',
    replicationKey: 'updatedAt',
    fields: {
      id: { as: 'id', tier: 'pseudonyme' },
      titre: { as: 'titre', tier: 'public' },
      type: { as: 'type', tier: 'public' },
      statut: { as: 'statut', tier: 'public' },
      dateDebut: { as: 'date_debut', tier: 'public' },
      dateFin: { as: 'date_fin', tier: 'public' },
      lieu: { as: 'lieu', tier: 'public' },
      centreId: { as: 'centre_id', tier: 'pseudonyme' },
      capaciteMax: { as: 'capacite_max', tier: 'public' },
      estGratuit: { as: 'est_gratuit', tier: 'public' },
      createdAt: { as: 'created_at', tier: 'public' },
      updatedAt: { as: 'updated_at', tier: 'public' },
    },
  }),

  /** Inscriptions aux événements — taux de remplissage et de présence. */
  inscriptions_evenements: defineStream('InscriptionEvenement', {
    primaryKey: 'id',
    replicationKey: 'updatedAt',
    fields: {
      id: { as: 'id', tier: 'pseudonyme' },
      cjsUid: { as: 'cjs_uid', tier: 'pseudonyme' },
      evenementId: { as: 'evenement_id', tier: 'pseudonyme' },
      statut: { as: 'statut', tier: 'public' },
      inscritA: { as: 'inscrit_a', tier: 'public' },
      updatedAt: { as: 'updated_at', tier: 'public' },
    },
  }),

  /** Centres CJS — référentiel géographique de la fréquentation physique. */
  centres: defineStream('Centre', {
    primaryKey: 'id',
    replicationKey: 'updatedAt',
    fields: {
      id: { as: 'id', tier: 'pseudonyme' },
      nom: { as: 'nom_centre', tier: 'public' },
      slug: { as: 'slug', tier: 'public' },
      region: { as: 'region', tier: 'public' },
      ville: { as: 'ville', tier: 'public' },
      adresse: { as: 'adresse', tier: 'public' },
      latitude: { as: 'latitude', tier: 'public' },
      longitude: { as: 'longitude', tier: 'public' },
      estActif: { as: 'est_actif', tier: 'public' },
      conseillersCount: { as: 'conseillers_count', tier: 'public' },
      gcId: { as: 'gc_id', tier: 'pseudonyme' },
      createdAt: { as: 'created_at', tier: 'public' },
      updatedAt: { as: 'updated_at', tier: 'public' },
    },
  }),

  /** Réservations de ressources en centre. Les textes libres de motif restent au Guichet. */
  reservations: defineStream('Reservation', {
    primaryKey: 'id',
    replicationKey: 'updatedAt',
    fields: {
      id: { as: 'id', tier: 'pseudonyme' },
      cjsUid: { as: 'cjs_uid', tier: 'pseudonyme' },
      centreId: { as: 'centre_id', tier: 'pseudonyme' },
      ressourceId: { as: 'ressource_id', tier: 'pseudonyme' },
      dateReservee: { as: 'date_reservee', tier: 'public' },
      creneauDebut: { as: 'creneau_debut', tier: 'public' },
      creneauFin: { as: 'creneau_fin', tier: 'public' },
      nombrePersonnes: { as: 'nombre_personnes', tier: 'public' },
      statut: { as: 'statut', tier: 'public' },
      noShow: { as: 'no_show', tier: 'public' },
      decisionA: { as: 'decision_a', tier: 'public' },
      annuleeA: { as: 'annulee_a', tier: 'public' },
      createdAt: { as: 'created_at', tier: 'public' },
      updatedAt: { as: 'updated_at', tier: 'public' },
    },
  }),

  /** Passages effectifs en centre — la mesure de fréquentation réelle. Append-only. */
  checkins: defineStream('CheckIn', {
    primaryKey: 'id',
    replicationKey: 'effectueA',
    fields: {
      id: { as: 'id', tier: 'pseudonyme' },
      cjsUid: { as: 'cjs_uid', tier: 'pseudonyme' },
      centreId: { as: 'centre_id', tier: 'pseudonyme' },
      reservationId: { as: 'reservation_id', tier: 'pseudonyme' },
      via: { as: 'via', tier: 'public' },
      effectueA: { as: 'effectue_a', tier: 'public' },
      dwellMinutes: { as: 'dwell_minutes', tier: 'public' },
    },
  }),

  /** Catalogue de ressources documentaires. */
  ressources: defineStream('Ressource', {
    primaryKey: 'id',
    replicationKey: 'updatedAt',
    fields: {
      id: { as: 'id', tier: 'pseudonyme' },
      titre: { as: 'titre', tier: 'public' },
      type: { as: 'type', tier: 'public' },
      theme: { as: 'theme', tier: 'public' },
      categorie: { as: 'categorie', tier: 'public' },
      niveau: { as: 'niveau', tier: 'public' },
      langue: { as: 'langue', tier: 'public' },
      estPublic: { as: 'est_public', tier: 'public' },
      vues: { as: 'vues', tier: 'public' },
      createdAt: { as: 'created_at', tier: 'public' },
      updatedAt: { as: 'updated_at', tier: 'public' },
    },
  }),

  /** Audience multicanal (GUIC-688). Append-only, le plus gros volume du pipeline. */
  consultations: defineStream('Consultation', {
    primaryKey: 'id',
    primaryKeyKind: 'bigint',
    replicationKey: 'createdAt',
    fields: {
      id: { as: 'id', tier: 'pseudonyme' },
      typeEntite: { as: 'type_entite', tier: 'public' },
      entiteId: { as: 'entite_id', tier: 'pseudonyme' },
      typeEvent: { as: 'type_event', tier: 'public' },
      canal: { as: 'canal', tier: 'public' },
      cjsUid: { as: 'cjs_uid', tier: 'pseudonyme' },
      // GUIC-695 — pour un utilisateur connecté, le hash est le HMAC du cjs_uid présent
      // sur la même ligne : le couple (clair, haché) serait un oracle pour confirmer une
      // clé candidate, sans rien apporter aux jointures. Il ne sort que pour les anonymes.
      sujetHash: {
        as: 'sujet_hash',
        tier: 'pseudonyme',
        transform: (hash, row) => (row.cjsUid == null ? hash : null),
        outputType: 'string',
        outputNullable: true,
        description:
          "Pseudonyme HMAC-SHA256 du visiteur anonyme (empreinte IP + user-agent, jamais stockées en clair). Null pour un utilisateur connecté : son parcours se suit par cjs_uid.",
      },
      origine: { as: 'origine', tier: 'public' },
      sessionId: { as: 'session_id', tier: 'pseudonyme' },
      createdAt: { as: 'created_at', tier: 'public' },
    },
  }),

  /** Emprunts de la bibliothèque physique. */
  emprunts: defineStream('Emprunt', {
    primaryKey: 'id',
    replicationKey: 'updatedAt',
    fields: {
      id: { as: 'id', tier: 'pseudonyme' },
      cjsUid: { as: 'cjs_uid', tier: 'pseudonyme' },
      exemplaireId: { as: 'exemplaire_id', tier: 'pseudonyme' },
      statut: { as: 'statut', tier: 'public' },
      initieA: { as: 'initie_a', tier: 'public' },
      confirmeA: { as: 'confirme_a', tier: 'public' },
      dateRetourPrevue: { as: 'date_retour_prevue', tier: 'public' },
      renduA: { as: 'rendu_a', tier: 'public' },
      createdAt: { as: 'created_at', tier: 'public' },
      updatedAt: { as: 'updated_at', tier: 'public' },
    },
  }),

  /** Programmes sectoriels — dimension de rattachement des indicateurs YEAH. */
  programmes: defineStream('Programme', {
    primaryKey: 'id',
    replicationKey: 'updatedAt',
    fields: {
      id: { as: 'id', tier: 'pseudonyme' },
      slug: { as: 'slug', tier: 'public' },
      nom: { as: 'nom_programme', tier: 'public' },
      actif: { as: 'actif', tier: 'public' },
      createdAt: { as: 'created_at', tier: 'public' },
      updatedAt: { as: 'updated_at', tier: 'public' },
    },
  }),
} satisfies Record<string, AnyStreamDefinition>

export type StreamName = keyof typeof streams
