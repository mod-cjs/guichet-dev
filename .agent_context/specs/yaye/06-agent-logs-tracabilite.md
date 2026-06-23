# 06 — Traçabilité & journalisation (`agent_logs`)

## Philosophie

Chaque action de Yaye génère un événement écrit **au moment exact** où elle se produit. Objectif : permettre au staff CJS de **reconstruire exactement** ce qui s'est passé dans n'importe quelle interaction. Une conversation de 10 échanges génère typiquement **40 à 60 lignes de logs**.

## Structure de la table `agent_logs` (15 champs)

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID PK | identifiant unique événement |
| `session_id` | VARCHAR | ID conversation, commun à tous les events |
| `cjs_uid` | VARCHAR null | ID SSO utilisateur, null si non identifié |
| `role` | ENUM | beneficiaire, recruteur, staff, gestionnaire, admin ⚠️ *(valeurs de la note ; à réconcilier avec `RoleAgent {conseiller, directeur, admin_centre}` du repo — cf. ADR-001)* |
| `centre_id` | VARCHAR null | centre de portée si rôle scoped |
| `canal` | ENUM | whatsapp \| web |
| `timestamp` | BIGINT | horodatage en millisecondes |
| `type_evenement` | ENUM | cf. taxonomie ci-dessous |
| `tool_called` | VARCHAR | outil Groq appelé (get_badge, reserve_resource, search_library, borrow_book…) |
| `payload` | JSON | message, paramètres, résultats Neo4j, réponse LLM — ⚠️ **contient des PII** (message brut) : minimisation + inclusion au droit à l'oubli requises (cf. [10-risques.md](./10-risques.md) R5) |
| `cypher_query` | TEXT | requête Cypher envoyée à Neo4j |
| `nodes_returned` | JSON | nœuds Neo4j retournés avec propriétés |
| `format_canal` | VARCHAR | card_react, liste_whatsapp, image_qr, pdf_joint, synthese |
| `duree_ms` | INT | durée d'exécution en millisecondes |
| `statut` | ENUM | succes, echec, partiel |

## Taxonomie des événements

| Type | Contenu du payload |
|------|--------------------|
| `session_ouverte` | Canal · cjs_uid si dispo · rôle · centre_id · timestamp |
| `message_recu` | Message brut · longueur · canal |
| `intention_detectee` | Intention Groq · niveau de confiance · paramètres extraits |
| `graph_interroge` | Requête Cypher · paramètres · nœuds retournés · relations traversées · durée |
| `api_appelee` | Route Handler · paramètres · code HTTP · durée |
| `reponse_generee` | Réponse LLM brute · longueur · durée de génération |
| `badge_genere` | cjs_uid · format (web/whatsapp) · timestamp · durée validité |
| `reservation_soumise` | Type ressource (salle/véhicule) · centre_id · créneau · statut initial |
| `emprunt_initie` | Exemplaire ID · titre livre · centre_id · date retour attendue |
| `retour_enregistre` | Exemplaire ID · nouveau statut · emplacement confirmé ou mis à jour |
| `contenu_transmis` | Type (card/PDF/image_qr/liste/synthese) · identifiant · canal |
| `format_canal` | Format de sortie appliqué |
| `escalade_conseiller` | Raison · stade de la conversation · conseiller notifié · timestamp |
| `erreur` | Message d'erreur complet · outil en échec · type d'erreur · durée avant échec |

## Alimentation du Data Hub

Agrégations depuis `agent_logs` → indicateurs via Route Handlers dédiés :
sessions par canal/période · taux de conversion recommandation→candidature · intentions fréquentes par rôle · taux d'escalade · latence moyenne · taux de bascule WhatsApp→web · requêtes sans résultat Neo4j (angles morts du graphe) · volumes emprunts/réservations via Yaye.

## Panel admin (consultation)

- **Vue liste** : sessions paginées, filtrables (date, canal, rôle, centre, statut, intention). Chaque ligne : utilisateur, canal, heure, durée, intention, résultat, alertes erreur.
- **Vue détail — 2 niveaux** :
  - *Conversation* : transcription horodatée lisible, contenus transmis (QR, liste créneaux, fiche livre), format réel WhatsApp.
  - *Technique* : par message — intention + confiance, paramètres, Cypher + nœuds, route + code réponse, format de sortie, durée par étape, erreurs.
- Liens directs depuis une session vers la fiche réservation / emprunt (avec emplacement actuel de l'exemplaire).
- **Indicateurs qualité** : taux d'escalade, taux de conversion, requêtes sans résultat Neo4j, latence par outil/canal, taux de bascule WA→web, taux d'abandon tunnels.

## ⚠️ Existant repo — 3 tables à ne pas confondre

| Table | Rôle | Réutiliser pour `agent_logs` ? |
|-------|------|-------------------------------|
| `CentreEvent` | KPI fréquentation centres, INSERT-only, rétention 6 mois | ❌ But différent |
| `MessageWhatsApp` | **Transcript** lisible (wamid, sens, contenu, type) d'une conversation WhatsApp | ❌ Complémentaire — c'est le niveau « conversation » du panel admin, pas la trace technique |
| `ConversationWhatsApp` | Lie téléphone↔cjs_uid + `contexte` Groq (Json) | ❌ Contexte/session, pas trace événementielle |

**Conclusion** : `agent_logs` est un **nouveau modèle Prisma** à créer (migration), distinct des 3 ci-dessus. Il porte la trace **technique par événement** (Cypher, nœuds, durées, outil, statut) qui alimente le « niveau technique » du panel admin et le Data Hub. La note l'annonce en MySQL ; le repo standardise sur **MariaDB/Prisma** → créer comme modèle Prisma normal.

> Modèles Yaye **déjà présents** et réutilisables ailleurs : `RecommandationIA` (scores reco), `Notification` + `TypeNotification.Yaye` (notifs/escalade), `ConversationWhatsApp`/`MessageWhatsApp` (persistance conversation).
