"""
Mapping déclaratif MariaDB → Neo4j pour le POC Yaye — COUVERTURE COMPLÈTE.

Source de vérité : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md (§3 nœuds, §4 relations).
Les noms de tables/colonnes proviennent du schéma Prisma (@@map / @map snake_case).

⚠️ Invariant : SQL → projection → Neo4j uniquement. Rien ne naît dans le graphe.
Tout est MERGE sur clé naturelle → rejouable (idempotent).

Principe « aucun élément du périmètre écarté » :
- Tout nœud/relation de la spec ayant une source dans le dump est projeté.
- Ce qui n'a PAS encore de source (biblio physique = Lot 3 ; ACCESSIBLE_A/zone = Lot 2)
  est listé explicitement dans PENDING_NO_SOURCE — accounté, jamais inventé.
"""

# ─────────────────────────────────────────────────────────────────────────────
# 1. NŒUDS « simples » : 1 table → 1 label, clé naturelle + propriétés projetées.
# ─────────────────────────────────────────────────────────────────────────────
NODES = {
    "OpportuniteType": {
        "table": "opportunite_types", "label": "OpportuniteType", "key": "id",
        "props": {"id": "id", "slug": "slug", "libelle": "libelle",
                  "action_label": "actionLabel", "requires_file_upload": "requiresFileUpload",
                  "decision_authority": "decisionAuthority"},
    },
    "Programme": {
        "table": "programmes", "label": "Programme", "key": "id",
        "props": {"id": "id", "slug": "slug", "nom": "nom", "description": "description"},
    },
    "Organisation": {
        "table": "organisations", "label": "Organisation", "key": "id",
        # Colonnes confirmées présentes dans le dump → projection complète (spec §3.B).
        "props": {"id": "id", "nom": "nom", "secteur": "secteur", "region": "region",
                  "est_verifie": "estVerifie"},
    },
    "Competence": {
        "table": "skills", "label": "Competence", "key": "id",
        "props": {"id": "id", "slug": "slug", "libelle": "libelle", "categorie": "categorie"},
    },
    "Tag": {
        "table": "tags", "label": "Tag", "key": "id",
        "props": {"id": "id", "slug": "slug", "libelle": "libelle"},
    },
    "Beneficiaire": {
        # Données MINIMALES — pas de PII sensible dans le graphe (spec §3.C + doc 07).
        # nom/prenom/email/telephone/date_naissance volontairement EXCLUS.
        "table": "utilisateurs", "label": "Beneficiaire", "key": "cjsUid",
        "props": {"cjs_uid": "cjsUid", "region": "region"},
        # niveauEtude / situationEmploi / completionScore viennent de profils_jeunes
        # → enrichis dans un second passage (notebook étape G).
    },
    "Diplome": {
        "table": "diplomes", "label": "Diplome", "key": "id",
        "props": {"id": "id", "intitule": "intitule", "niveau": "niveau",
                  "annee_obtention": "anneeObtention", "etablissement": "etablissement"},
    },
    "Experience": {
        "table": "experiences", "label": "Experience", "key": "id",
        "props": {"id": "id", "poste": "poste", "organisation": "organisation",
                  "date_debut": "dateDebut", "date_fin": "dateFin"},
    },
    "Certificat": {
        "table": "certificats_moodle", "label": "Certificat", "key": "id",
        "props": {"id": "id", "formation": "formation", "obtenu_le": "obtenuLe",
                  "moodle_cert_id": "moodleCertId"},
    },
    "Evenement": {
        "table": "evenements", "label": "Evenement", "key": "id",
        "props": {"id": "id", "titre": "titre", "type": "type", "statut": "statut",
                  "date_debut": "dateDebut", "date_fin": "dateFin", "lieu": "lieu",
                  "capacite_max": "capaciteMax", "est_gratuit": "estGratuit"},
    },
    "RessourcePedagogique": {
        "table": "ressources", "label": "RessourcePedagogique", "key": "id",
        "props": {"id": "id", "titre": "titre", "type": "type", "theme": "theme",
                  "niveau": "niveau", "langue": "langue", "url": "url"},
    },
    "Centre": {
        "table": "centres", "label": "Centre", "key": "id",
        "props": {"id": "id", "nom": "nom", "region": "region",
                  "latitude": "latitude", "longitude": "longitude"},
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. OPPORTUNITÉS DÉCOMPRESSÉES : table mère + 1 label sous-type (spec §2).
# ─────────────────────────────────────────────────────────────────────────────
OPPORTUNITE_COMMON = {
    "table": "opportunites", "key": "id",
    "props": {"id": "id", "slug": "slug", "titre": "titre", "domaine": "domaine",
              "region": "region", "statut": "statut", "deadline": "deadline",
              "remuneration": "remuneration", "niveau_etude_min": "niveauEtudeMin",
              "organisation_libelle": "organisationLibelle", "vues": "vues"},
}

OPPORTUNITE_SUBTYPES = {
    "Emploi": ("opportunites_emploi", {
        "type_contrat": "typeContrat", "duree_contrat_mois": "dureeContratMois",
        "experience_requise": "experienceRequise", "teletravail": "teletravail",
        "niveau_etude_min": "niveauEtudeMin"}),
    "Stage": ("opportunites_stage", {
        "duree_mois": "dureeMois", "conventionne_ecole": "conventionneEcole",
        "indemnise": "indemnise", "indemnite_mensuelle_fcfa": "indemniteMensuelleFcfa",
        "date_debut_prevue": "dateDebutPrevue", "niveau_etude_min": "niveauEtudeMin"}),
    "Formation": ("opportunites_formation", {
        "duree_heures": "dureeHeures", "modalite": "modalite", "certifiante": "certifiante",
        "organisme_certificateur": "organismeCertificateur", "prerequis": "prerequis",
        "gratuite": "gratuite", "frais_inscription_fcfa": "fraisInscriptionFcfa"}),
    "Bourse": ("opportunites_bourse", {
        "montant_total_fcfa": "montantTotalFcfa", "duree_mois": "dureeMois",
        "niveau_etude_requis": "niveauEtudeRequis", "pays_destination": "paysDestination",
        "organisme_financeur": "organismeFinanceur", "couple_obligatoire": "coupleObligatoire"}),
    "Concours": ("opportunites_concours", {
        "organisme_organisateur": "organismeOrganisateur", "date_epreuves": "dateEpreuves",
        "lieu_epreuves": "lieuEpreuves", "preuves_demandees": "preuvesDemandees",
        "places_disponibles": "placesDisponibles"}),
    "AppelAProjets": ("opportunites_appel_a_projets", {
        "budget_max_fcfa": "budgetMaxFcfa", "duree_projet_mois": "dureeProjetMois",
        "thematique": "thematique", "dossier_requis": "dossierRequis",
        "criteres_eligibilite": "criteresEligibilite"}),
    "Financement": ("opportunites_financement", {
        "montant_fcfa": "montantFcfa", "type_financement": "typeFinancement",
        "taux_annuel": "tauxAnnuel", "duree_remboursement_mois": "dureeRemboursementMois",
        "organisme_financeur": "organismeFinanceur", "is_continuous": "isContinuous"}),
    "Mentorat": ("opportunites_mentorat", {
        "duree_mois": "dureeMois", "modalite": "modalite", "thematique": "thematique",
        "places_disponibles": "placesDisponibles", "organisateur_libelle": "organisateurLibelle"}),
    "Mobilite": ("opportunites_mobilite", {
        "destination": "destination", "type_mobilite": "typeMobilite", "duree_mois": "dureeMois",
        "niveau_langue_requis": "niveauLangueRequis", "date_depart_prevue": "dateDepartPrevue"}),
    "Volontariat": ("opportunites_volontariat", {
        "duree_mois": "dureeMois", "type_volontariat": "typeVolontariat",
        "indemnite_mensuelle_fcfa": "indemniteMensuelleFcfa", "domaine_mission": "domaineMission",
        "places_disponibles": "placesDisponibles"}),
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. RESSOURCES PHYSIQUES DE CENTRE : 1 table, discriminée par `type`.
# ─────────────────────────────────────────────────────────────────────────────
RESSOURCE_CENTRE = {
    "table": "ressources_centre", "key": "id", "discriminator": "type",
    "labels": {"Salle": "Salle", "Vehicule": "Vehicule"},  # Poste_info/Equipement/Atelier hors v0
    "props": {"id": "id", "nom": "nom", "capacite": "capacite", "type": "type"},
}

# ─────────────────────────────────────────────────────────────────────────────
# 4. RELATIONS issues de clés étrangères / tables de jonction (spec §4).
# ─────────────────────────────────────────────────────────────────────────────
RELATIONS = [
    # — Cœur opportunités —
    {"rel": "EST_DE_TYPE", "from": ("Opportunite", "id"), "to": ("OpportuniteType", "id"),
     "table": "opportunites", "fk_from": "id", "fk_to": "type_id"},
    {"rel": "FINANCE", "from": ("Programme", "id"), "to": ("Opportunite", "id"),
     "table": "opportunites", "fk_from": "programme_id", "fk_to": "id"},
    {"rel": "PUBLIE", "from": ("Organisation", "id"), "to": ("Opportunite", "id"),
     "table": "opportunites", "fk_from": "organisation_id", "fk_to": "id"},
    # REQUIERT = compétences requises (requise=1). DEVELOPPE (requise=0 sur :Formation)
    # est traité à part dans le notebook (jointure sous-type Formation) — DEVELOPPE_SPEC.
    {"rel": "REQUIERT", "from": ("Opportunite", "id"), "to": ("Competence", "id"),
     "table": "opportunites_skills", "fk_from": "opportunite_id", "fk_to": "skill_id",
     "where": {"requise": 1}, "edge_props": {"requise": "requise"}},
    {"rel": "ETIQUETTE", "from": ("Opportunite", "id"), "to": ("Tag", "id"),
     "table": "opportunites_tags", "fk_from": "opportunite_id", "fk_to": "tag_id"},

    # — Bénéficiaire & parcours —
    {"rel": "A_OBTENU", "from": ("Beneficiaire", "cjsUid"), "to": ("Diplome", "id"),
     "table": "diplomes", "fk_from": "profil_id", "fk_to": "id", "via_profil": True},
    {"rel": "A_OBTENU", "from": ("Beneficiaire", "cjsUid"), "to": ("Certificat", "id"),
     "table": "certificats_moodle", "fk_from": "profil_id", "fk_to": "id", "via_profil": True},
    {"rel": "A_EXERCE", "from": ("Beneficiaire", "cjsUid"), "to": ("Experience", "id"),
     "table": "experiences", "fk_from": "profil_id", "fk_to": "id", "via_profil": True},
    {"rel": "A_POSTULE", "from": ("Beneficiaire", "cjsUid"), "to": ("Opportunite", "id"),
     "table": "candidatures", "fk_from": "cjs_uid", "fk_to": "opportunite_id",
     "edge_props": {"statut": "statut", "soumise_a": "date"}},
    {"rel": "INTERESSE_PAR", "from": ("Beneficiaire", "cjsUid"), "to": ("Opportunite", "id"),
     "table": "opportunites_favorites", "fk_from": "cjs_uid", "fk_to": "opportunite_id"},
    {"rel": "INTERESSE_PAR", "from": ("Beneficiaire", "cjsUid"), "to": ("RessourcePedagogique", "id"),
     "table": "ressources_favorites", "fk_from": "cjs_uid", "fk_to": "ressource_id"},
    {"rel": "INSCRIT_A", "from": ("Beneficiaire", "cjsUid"), "to": ("Evenement", "id"),
     "table": "inscriptions_evenements", "fk_from": "cjs_uid", "fk_to": "evenement_id",
     "edge_props": {"statut": "statut"}},

    # — Agenda / centres —
    {"rel": "SE_DEROULE_A", "from": ("Evenement", "id"), "to": ("Centre", "id"),
     "table": "evenements", "fk_from": "id", "fk_to": "centre_id"},
    {"rel": "DISPOSE_DE", "from": ("Centre", "id"), "to": ("Salle", "id"),
     "table": "ressources_centre", "fk_from": "centre_id", "fk_to": "id",
     "where": {"type": "Salle"}},
    {"rel": "DISPOSE_DE", "from": ("Centre", "id"), "to": ("Vehicule", "id"),
     "table": "ressources_centre", "fk_from": "centre_id", "fk_to": "id",
     "where": {"type": "Vehicule"}},
]

# DEVELOPPE : Formation → Competence (opportunites_skills.requise=0, restreint aux :Formation).
# Traité dans le notebook (étape F-bis) car nécessite la jointure au sous-type Formation.
DEVELOPPE_SPEC = {
    "rel": "DEVELOPPE", "table": "opportunites_skills",
    "fk_from": "opportunite_id", "fk_to": "skill_id", "where": {"requise": 0},
    "restrict_to_subtype": "Formation",  # ne garder que les opportunite_id Formation
    "from": ("Opportunite", "id"), "to": ("Competence", "id"),
}

# ─────────────────────────────────────────────────────────────────────────────
# 5. ENUMS RÉIFIÉS EN NŒUDS : Secteur (enum Domaine) & Region (enum Region).
# ─────────────────────────────────────────────────────────────────────────────
REIFIED_ENUMS = {
    "Secteur": {"label": "Secteur", "key": "libelle", "from_columns": [
        ("opportunites", "domaine"), ("organisations", "secteur")]},
    "Region": {"label": "Region", "key": "nom", "from_columns": [
        ("opportunites", "region"), ("centres", "region"),
        ("utilisateurs", "region"), ("organisations", "region")]},
}

# Liens (entité → enum réifié), data-driven et COMPLETS (spec §4 RELEVE_DE / SITUE_A).
REIFIED_LINKS = [
    {"rel": "RELEVE_DE", "from_label": "Opportunite", "table": "opportunites",
     "id_col": "id", "val_col": "domaine", "to_label": "Secteur", "to_key": "libelle"},
    {"rel": "RELEVE_DE", "from_label": "Organisation", "table": "organisations",
     "id_col": "id", "val_col": "secteur", "to_label": "Secteur", "to_key": "libelle"},
    {"rel": "SITUE_A", "from_label": "Opportunite", "table": "opportunites",
     "id_col": "id", "val_col": "region", "to_label": "Region", "to_key": "nom"},
    {"rel": "SITUE_A", "from_label": "Centre", "table": "centres",
     "id_col": "id", "val_col": "region", "to_label": "Region", "to_key": "nom"},
    {"rel": "SITUE_A", "from_label": "Organisation", "table": "organisations",
     "id_col": "id", "val_col": "region", "to_label": "Region", "to_key": "nom"},
]

# ─────────────────────────────────────────────────────────────────────────────
# 6. RELATIONS DÉRIVÉES PAR RÈGLES (pas de FK) — matching texte ↔ Competence.
#    Version POC : exact insensible à la casse (à raffiner en flou plus tard).
#    - MAITRISE  : profils_jeunes.competences (Json)        → Competence
#    - ATTESTE   : Certificat.formation / Diplome.intitule  → Competence
#    - PREPARE   : RessourcePedagogique.theme               → Competence
# ─────────────────────────────────────────────────────────────────────────────
DERIVED_MATCH = [
    {"rel": "ATTESTE", "from_label": "Certificat", "table": "certificats_moodle",
     "id_col": "id", "text_col": "formation", "to_label": "Competence"},
    {"rel": "ATTESTE", "from_label": "Diplome", "table": "diplomes",
     "id_col": "id", "text_col": "intitule", "to_label": "Competence"},
    {"rel": "PREPARE", "from_label": "RessourcePedagogique", "table": "ressources",
     "id_col": "id", "text_col": "theme", "to_label": "Competence"},
]
# MAITRISE est traité à part (source = Json `competences`, pas une colonne texte simple).

# ─────────────────────────────────────────────────────────────────────────────
# 7. PÉRIMÈTRE SANS SOURCE AUJOURD'HUI — explicitement accounté, jamais inventé.
#    (invariant read-model : on ne crée pas de nœud sans donnée Prisma/SQL).
# ─────────────────────────────────────────────────────────────────────────────
PENDING_NO_SOURCE = {
    "nodes": {
        "Livre": "Lot 3 — modèle Prisma absent (biblio physique)",
        "ExemplaireLibre": "Lot 3 — modèle Prisma absent",
        "Rayon": "Lot 3 — modèle Prisma absent",
        "Emprunt": "Lot 3 — modèle Prisma absent",
    },
    "relations": {
        "CONTIENT": "Lot 3 — Centre→Livre (pas de table livres)",
        "A_EXEMPLAIRE": "Lot 3 — Livre→ExemplaireLibre",
        "EST_LOCALISE_EN": "Lot 3 — ExemplaireLibre→Rayon",
        "SITUE_DANS": "Lot 3 — Rayon→Centre",
        "EMPRUNTE": "Lot 3 — Beneficiaire→ExemplaireLibre",
        "ACCESSIBLE_A": "Lot 2 — Vehicule→Region (colonne zoneRestriction inexistante)",
    },
}

# Inventaire complet du périmètre cible (pour le rapport de couverture du notebook).
ALL_TARGET_NODES = (
    ["Opportunite"] + list(OPPORTUNITE_SUBTYPES) +        # opportunités décompressées
    [c["label"] for c in NODES.values()] +                # nœuds simples
    ["Salle", "Vehicule"] +                               # ressources centre
    list(REIFIED_ENUMS) +                                 # enums réifiés
    list(PENDING_NO_SOURCE["nodes"])                      # en attente (Lot 3)
)
ALL_TARGET_RELATIONS = (
    [r["rel"] for r in RELATIONS] + [DEVELOPPE_SPEC["rel"]] +
    [l["rel"] for l in REIFIED_LINKS] + ["MAITRISE"] +
    [d["rel"] for d in DERIVED_MATCH] +
    list(PENDING_NO_SOURCE["relations"])
)
