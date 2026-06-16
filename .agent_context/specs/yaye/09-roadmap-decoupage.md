# 09 — Roadmap & découpage en lots

> Découpage proposé (à valider PO + JIRA). Chaque lot = une branche `feature/GUIC-<n>-<desc>` depuis `dev`, PR vers `dev`, `npm run validate` vert avant commit.

## Pré-requis (avant tout code) — spec-first

- [ ] Valider les **8 décisions ouvertes** (1-8 ; la n°9 — périmètre KG enrichi — est actée) cf. [08-gap-analysis-existant.md](./08-gap-analysis-existant.md) §Décisions.
- [ ] Lever les conditions **Go / No-Go** du Lot 1 — cf. [10-risques.md](./10-risques.md) (R1 Neo4j, R2 normalisation compétences en priorité).
- [ ] Fetch tickets JIRA GUIC liés à Yaye / centres ; rattacher cette spec.
- [ ] Confirmer le contrat **lien magique WhatsApp ↔ cjs_uid** côté SSO (`../cjs_auth/`).
- [ ] Confirmer l'infra **Neo4j** (hébergement, credentials, env vars) — **ou** acter le fallback `PrismaGraphAdapter` (R1).

## Lot 0 — Fondations agent (sans Neo4j)
- Service agent : orchestration intention → outil → réponse normalisée.
- Réécrire `rag.ts` (1 appel chat) → **function calling Groq** avec 1-2 outils réels (`get_user_profile` sur `/api/profil/*`, `get_realtime_data`). **Fusionner détection intention + sélection outil en un seul appel** (R3).
- **Implémenter `/api/ia/route.ts`** (actuellement 501) en SSE + brancher `YayeChat.tsx`.
- Réutiliser `ConversationWhatsApp`/`MessageWhatsApp` (transcript + contexte) ; Redis = cache chaud.
- Modèle Prisma `agent_logs` (distinct des tables existantes) + journaliseur + événements de base (`session_ouverte`, `message_recu`, `intention_detectee`, `reponse_generee`, `erreur`).

## Lot 1 — Knowledge Graph Neo4j (enrichi)
- **Port d'abstraction `GraphPort`** (R1) : `Neo4jGraphAdapter` (cible) + `PrismaGraphAdapter` (fallback recherche/matching simple) — le service agent ne dépend jamais en dur de Neo4j.
- Driver `neo4j-driver` + connexion + health check + contraintes/index (`id` unique par label).
- **Schéma enrichi 21 nœuds** (cf. [02](./02-knowledge-graph-neo4j.md)) :
  - **1a — Décompression opportunités** : projeter `Opportunite` + 10 sous-types en labels multiples `(:Opportunite:Emploi)`… avec toutes les props CTI. Relations `REQUIERT/DEVELOPPE/EST_DE_TYPE/ETIQUETTE/FINANCE/PUBLIE/RELEVE_DE/SITUE_A`.
  - **1b — Profil & parcours** : nœud `Beneficiaire` + normalisation `ProfilJeune.competences` (Json) → `MAITRISE`→`Competence` ; `A_OBTENU`→Diplome/Certificat ; `ATTESTE` (dérivée Moodle) ; `A_POSTULE` (depuis `Candidature`).
  - **1c — Agenda & ressources** : `Evenement` + `INSCRIT_A`/`SE_DEROULE_A` ; `RessourcePedagogique` + `PREPARE`.
  - **1d — Centres** : `Centre`/`Salle`/`Vehicule` + `DISPOSE_DE`/`ACCESSIBLE_A` (biblio physique = Lot 3).
- Pipeline d'alimentation Prisma→Neo4j : projection par modèle (upsert `MERGE`) événementiel + sync nocturne idempotente.
- `query_knowledge_graph` : NL → paramètres Groq → template Cypher → réponse + filtrage RBAC/centre. Templates : recherche simple, **analyse d'écart de compétences**, **reco collaborative**, parcours multi-entités.
- **1e — Recommandation proactive** : pipeline de **scoring** (batch + à la création/modif d'opportunité) → écrit `RecommandationIA` (implémente `recommandation.ts`, stub aujourd'hui) ; outil **`get_recommendations`** (lecture seule, sans LLM). Distinct du `query_knowledge_graph` réactif (cf. [11](./11-fonctionnalites.md) F2).
- Événement `graph_interroge`.

## Lot 2 — Ressources centres (salles + véhicules)
- Mapper `reserve_resource` sur `Reservation`/`RessourceCentre` existants (enum déjà riche).
- **Ajouter le champ zone-restriction véhicule** (absent) : `zoneRestriction` sur `RessourceCentre` ou dérivation `Centre.region` vs `Utilisateur.region`.
- Flux **véhicule** : restriction géographique + validation manuelle gestionnaire via `StatutReservation.EnAttente` (déjà prévu, désactivé MVP).
- Collecte séquentielle WhatsApp (date→créneau→durée→motif→récap).
- Événement `reservation_soumise`.

## Lot 3 — Bibliothèque physique
- Modèles Prisma : `Livre`, `ExemplaireLibre`, `Rayon`, `Emprunt` + migration.
- Routes : `search_library`, `borrow_book`, `get_active_loans`.
- Emprunt statut « initié » → effectif au scan badge ; retour par scan.
- Sync nœuds Neo4j (`CONTIENT`, `A_EXEMPLAIRE`, `EST_LOCALISE_EN`).
- Événements `emprunt_initie`, `retour_enregistre`.

## Lot 4 — Badge (selon arbitrage)
- Mapper `get_badge` sur le système retenu (JWT rotatif existant recommandé).
- 4 formats de sortie + actions au scan (entrée, événement, réservation, emprunt).
- Mode offline IndexedDB (déjà en partie via `/checkin`).
- Événement `badge_genere`.

## Lot 5 — Formateur de sortie multi-canal
- Objets normalisés → `card_react` (web) / `liste_whatsapp` / `image_qr` / `pdf_joint` / `synthese`.
- Boutons (3 max), listes interactives Meta (10 max), templates approuvés.
- Bascule web (deep link SSO) si > 5 échanges.
- Événements `contenu_transmis`, `format_canal`.

## Lot 6 — Escalade conseiller
- Outil `escalate_to_advisor` + journalisation raison.
- Module envoi WhatsApp dans panel admin · notif temps réel · passation transparente web.
- Événement `escalade_conseiller`.

## Lot 7 — Panel admin sessions Yaye + Data Hub
- Vue liste paginée + filtres.
- Vue détail 2 niveaux (conversation + technique).
- Indicateurs qualité + export CSV.
- Agrégations `agent_logs` → Data Hub.

## Lot 8 — Templates Meta & durcissement
- 5 templates approuvés (accueil, SSO, confirmation, erreur, mise à jour statut).
- Gestion fenêtre 24h.
- Tests de charge, conformité CDP (droit à l'oubli, anonymisation).

## Ordre conseillé

`Lot 0 → 1 → (2 ∥ 3) → 5 → 4 → 6 → 7 → 8`

Lot 0 et 1 débloquent tout le reste. Lots 2 et 3 parallélisables. Le formateur (5) avant le badge (4) car le badge produit des formats. Panel (7) en fin car consomme `agent_logs` rempli par les lots précédents.
