# 08 — Analyse d'écart : existant vs cible ⭐

> **À lire avant d'écrire la moindre ligne de code Yaye.** Beaucoup de briques existent déjà sous une autre forme. On **étend** l'existant, on ne le réécrit pas.

## Tableau de synthèse

| Brique cible (note Yaye) | État dans le repo | Écart | Action |
|--------------------------|-------------------|-------|--------|
| Agent Groq + intention + 11 outils | `src/lib/ia/rag.ts` = **1 seul appel chat, sans function calling** · `recommandation.ts` = stub `return []` | 🟠 Partiel | Réécrire `rag.ts` en function calling + brancher les 11 outils (dont `submit_application`, `get_recommendations`) |
| **Backend chat web** | `src/app/api/ia/route.ts` → **501 Not Implemented** (POST) / `[]` (GET) | 🔴 Stub | Implémenter le vrai endpoint (SSE) + orchestration agent |
| Webhook WhatsApp HMAC + idempotence | `src/app/api/whatsapp/route.ts` ✅ (GUIC-240) — appelle déjà `generateAgentResponse` | 🟢 Fait | Réutiliser, brancher le pipeline agent complet |
| Envoi WhatsApp | `src/lib/whatsapp.ts` : `sendTextMessage`, **`sendTemplateMessage`**, `verifyWebhookSignature` | 🟠 Partiel | Ajouter **boutons (3 max) + listes interactives Meta (10 max)** + médias |
| **Persistance conversation** | `ConversationWhatsApp` (téléphone↔cjs_uid, `contexte` Json Groq) + `MessageWhatsApp` (wamid, sens, contenu) | 🟢 Existe | Réutiliser comme transcript durable ; Redis = cache chaud (cf. décision 6) |
| **Recommandation d'opportunités** | `RecommandationIA` (Prisma) ✅ modèle · `recommandation.ts` = stub `return []` | 🟠 Partiel | Pipeline de scoring (KG → `RecommandationIA`) + outil `get_recommendations` (proactif) ; `query_knowledge_graph` couvre le réactif. Cf. [11](./11-fonctionnalites.md) F2 |
| **Canal notif Yaye** | `Notification` + `TypeNotification.Yaye` ✅ | 🟢 Existe | Réutiliser pour escalade + alertes proactives v1.1 |
| UI chat web Yaye | `src/app/jeune/yaye/YayeChat.tsx` + `src/components/ui/Yaye/*` (FAB, Bubble, SidePanel, ActionCard, QuickReplies) | 🟢 Bon socle | Brancher au vrai backend + formateur |
| Knowledge Graph Neo4j | ❌ Absent (aucune dépendance ni connexion) | 🔴 Manquant | Chantier complet : driver, **schéma enrichi 21 nœuds** (cf. [02](./02-knowledge-graph-neo4j.md)), pipeline sync Prisma→Neo4j, templates Cypher |
| Décompression opportunités (KG) | `Opportunite` + 10 sous-types CTI **déjà en Prisma** | 🟢 Dérivable | Projeter en `(:Opportunite:Emploi)` etc. via labels multiples — **ne pas aplatir** |
| Normalisation compétences jeune | `ProfilJeune.competences` = **Json** (non normalisé) | 🟠 À normaliser | Projeter en relations `MAITRISE`→`Competence` (+ dériver des certificats/diplômes) |
| Table `agent_logs` | ❌ Absent (`CentreEvent` = KPI ≠ ; `MessageWhatsApp` = transcript ≠ trace technique) | 🔴 Manquant | Nouveau modèle Prisma + migration + journaliseur (cf. décision 2) |
| Badge numérique | `src/app/api/cjs-card/qr-token` = **JWT HS256 rotatif** (ADR-002) + `CheckIn` model + `/checkin` scanner | 🟠 Divergent | **Arbitrage PO** : JWT existant vs HMAC note (cf. doc 05) |
| Ressources centre | `RessourceCentre` enum **riche** (`Salle, Vehicule, Poste_info, Equipement, Atelier_recurrent`) + `Reservation` + workflow validation (`StatutReservation`) | 🟠 Partiel | Mapper outils sur l'existant ; **ajouter champ zone-restriction véhicule (absent)** |
| Restriction géo véhicule | ❌ Aucun champ sur `Reservation`/`RessourceCentre` | 🔴 Manquant | Ajouter `zoneRestriction` ou dériver `Centre.region` vs `Utilisateur.region` |
| Bibliothèque (Livre/Exemplaire/Rayon/Emprunt) | ❌ Absent (≠ module « ressources » pédago numériques) | 🔴 Manquant | Nouveaux modèles Prisma + routes + sync Neo4j |
| Ressources pédagogiques | Module « ressources » : `RessourceFavorite` + enums `TypeRessource/NiveauRessource/LangueRessource{FR,Wolof}` — **pas** de modèle `RessourcePedagogique` | 🟢 Existe (autre forme) | Mapper le nœud KG `RessourcePedagogique` sur ce module |
| Profil utilisateur | `/api/profil/*` (cv, diplomes, experiences, completude, certificats…) · `Utilisateur` + `ProfilJeune` (`competences`, `domainesInteret` en Json) | 🟢 Existe | Mapper `get_user_profile` dessus (route réelle ≠ `/api/users/[cjs_uid]/profile`) |
| Réservation salle | `/api/reservations` + `Reservation` model (auto-validée `Acceptee`) | 🟢 Existe | Mapper `reserve_resource` ; flux véhicule = `StatutReservation.EnAttente` (déjà prévu, désactivé MVP) |
| Escalade conseiller | ❌ Pas de module dédié · `src/lib/notifications/` + `Notification(Yaye)` existent | 🟠 Partiel | Outil `escalate_to_advisor` + module envoi WA panel admin |
| Panel admin sessions Yaye | ❌ Absent (`src/app/admin` existe pour le reste) | 🔴 Manquant | Vue liste + détail 2 niveaux + indicateurs |
| Lien magique WhatsApp ↔ cjs_uid | ⚠️ À vérifier côté SSO (`../cjs_auth/`) · `Utilisateur.telephone` unique existe | 🟠 Incertain | Confirmer contrat SSO avant dev |

Légende : 🟢 existe / réutilisable · 🟠 partiel / à étendre · 🔴 manquant / chantier · 🔵 décision requise

## Divergences techniques note ↔ repo (à acter)

1. **Base de données** — la note dit *PostgreSQL* ; le repo est **MariaDB 11 + Prisma 7** (CLAUDE.md). → Cible réelle = MariaDB/Prisma. La note décrit l'intention métier.
2. **Logs** — la note dit *MySQL* pour `agent_logs` ; créer comme **modèle Prisma** dans le schéma principal (MariaDB), pas une base séparée, sauf décision contraire.
3. **Nommage des routes** — la note utilise `/api/centers/*`, `/api/users/*` (anglais). Le repo est en **français** : `/api/centres/*`, `/api/profil/*`, `/api/reservations`. → Garder le français, mapper les outils dessus.
4. **Badge** — JWT rotatif (ADR-002, déjà livré) vs HMAC note. → **arbitrage requis** (doc 05).
5. **Next.js** — la note dit *Next.js 15* ; le repo est **Next.js 16** (CLAUDE.md).

## Dépendances à introduire (probables)

- `neo4j-driver` (KG) — **nouvelle dépendance lourde**, valider l'infra Neo4j (hébergement OVH, connexion).
- `groq-sdk` — **déjà présent** (utilisé dans `rag.ts`).
- Redis — **déjà présent** (`src/lib/redis.ts`).

## Décisions à soumettre au PO avant code (spec-first, CLAUDE.md §Protocole)

1. Badge : conserver JWT rotatif (recommandé) ou migrer HMAC ?
2. `agent_logs` : MariaDB/Prisma (recommandé) ou MySQL séparé ? Et **coexistence** avec `MessageWhatsApp` (transcript) — confirmer la séparation transcript/trace technique.
3. Neo4j : infra disponible ? Sinon, fallback Cypher→Prisma temporaire ?
4. Bibliothèque physique : in-scope v1 immédiat ou lot ultérieur (gros chantier modèles) ?
5. Mapping outils → routes françaises existantes (confirmer la table doc 03).
6. **Stockage du contexte conversationnel** : la note dit « Redis uniquement », mais `ConversationWhatsApp.contexte` (Prisma) existe déjà. → Acter : Prisma = durable, Redis = cache chaud (TTL 30 min web / 7 j WA). Pas de 3ᵉ stockage.
7. **Restriction géo véhicule** : ajouter un champ `zoneRestriction` sur `RessourceCentre`/`Reservation`, ou la dériver de `Centre.region` vs `Utilisateur.region` à la volée ?
8. **Wolof** : la couche données (`LangueRessource.Wolof`) est prête ; confirmer que la *réponse NL de Yaye en wolof* reste bien v1.1 (pas v1).
9. ✅ **Périmètre du Knowledge Graph — ACTÉ : graphe enrichi** (21 nœuds : opportunités décompressées en 10 sous-types, Evenement, Tag, Candidature/`A_POSTULE`, profil normalisé `MAITRISE`, parcours Moodle `ATTESTE`). Tout dérive de Prisma, aucune saisie supplémentaire. Schéma complet : [02-knowledge-graph-neo4j.md](./02-knowledge-graph-neo4j.md). Reste à confirmer : infra Neo4j (hébergement OVH).
