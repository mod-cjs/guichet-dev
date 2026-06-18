# 12 — Suivi de la mise en place de Yaye

> Tableau de bord **vivant** du déploiement de Yaye. À mettre à jour à chaque avancée.
> Statuts : ✅ fait · 🟡 en cours · ⬜ à faire · 🔵 décision PO requise · ⏸ bloqué.
> Sources : décisions [08](./08-gap-analysis-existant.md) · risques [10](./10-risques.md) · roadmap [09](./09-roadmap-decoupage.md) · fonctions [11](./11-fonctionnalites.md).

---

## Phase 0 — Cadrage & pré-requis (spec-first, AVANT tout code applicatif)

### Décisions PO à acter (cf. [08 §Décisions](./08-gap-analysis-existant.md))
- [ ] 🔵 **D1 — Badge** : conserver JWT rotatif existant (recommandé) ou migrer HMAC ?
- [ ] 🔵 **D2 — `agent_logs`** : MariaDB/Prisma (recommandé) ; coexistence avec `MessageWhatsApp` confirmée ?
- [ ] 🔵 **D3 — Neo4j infra** : confirmer hébergement (OVH/Aura) **ou** acter le fallback `PrismaGraphAdapter` (R1)
- [ ] 🔵 **D4 — Bibliothèque physique** : in-scope v1 ou lot ultérieur ?
- [ ] 🔵 **D5 — Mapping outils → routes FR existantes** : valider la table [03](./03-outils-function-calling.md)
- [ ] 🔵 **D6 — Contexte conversation** : Prisma durable + Redis cache (recommandé) — confirmer
- [ ] 🔵 **D7 — Zone véhicule** : champ `zoneRestriction` ou dérivation `Centre.region` vs `Utilisateur.region` ?
- [ ] 🔵 **D8 — Wolof** : réponse NL wolof bien en v1.1 (pas v1) ?
- [x] ✅ **D9 — Périmètre KG** : ACTÉ = graphe enrichi (21 nœuds)

### Conditions Go / No-Go Lot 1 (cf. [10](./10-risques.md))
- [ ] **R1** — Neo4j confirmé **ou** `GraphPort` + fallback Prisma posé
- [ ] **R2** — Pipeline de normalisation des compétences conçu (ou matching domaine assumé)
- [ ] **R3** — Budget de latence défini + fusion intention/outil en un appel
- [ ] **R4** — Seuil de confiance + whitelist templates Cypher + fallback escalade
- [ ] **R5** — `agent_logs` inclus dans le droit à l'oubli + rétention
- [ ] **R6** — Whitelist `RETURN` + sortie agrégée inter-bénéficiaires + test non-régression sécurité

### Intendance
- [ ] ⬜ Fetch tickets JIRA GUIC liés à Yaye/centres ; rattacher ce dossier de spec
- [ ] ⬜ Confirmer le contrat **lien magique WhatsApp ↔ cjs_uid** côté SSO (`../cjs_auth/`)
- [x] ✅ Branche `feature/yaye-v1-conseillere-numerique` créée + conception commitée (GUIC-259)

---

## POC Knowledge Graph (banc d'essai — fait hors application)

> But : valider le mapping MariaDB→Neo4j et les requêtes de matching avant le code de prod.
- [x] ✅ Stack Docker local : MariaDB + Neo4j (Enterprise, multi-db) + Redis
- [x] ✅ Dump chargé en base dédiée `yaye_poc` (séparée de `guichet_jeunesse`)
- [x] ✅ Mapping déclaratif complet ([`mapping.py`](../../../yaye-kg-poc/src/mapping.py)) — 21 nœuds, décompression opportunités, relations
- [x] ✅ Projection headless ([`project_to_neo4j.py`](../../../yaye-kg-poc/scripts/project_to_neo4j.py)) — MariaDB → Neo4j (read-model)
- [x] ✅ Données enrichies synthétiques ([`enrich_dump.py`](../../../yaye-kg-poc/scripts/enrich_dump.py)) — arêtes densifiées + bruit réaliste
- [x] ✅ Mesure de qualité ([`measure_quality.py`](../../../yaye-kg-poc/scripts/measure_quality.py)) — métriques IR + baselines
- [x] ✅ 2 bases Neo4j locales : `standard` (brut) vs `enriched` (comparaison)
- [ ] ⬜ Faire tourner le **notebook lui-même** (valide qu'il reproduit le script)
- [ ] ⬜ Raffiner dérivées MAITRISE/ATTESTE/PREPARE (matching flou vs exact)
- [ ] ⬜ Mesurer latence des requêtes de matching sur données réelles
- [ ] ⏸ Pertinence réelle : nécessite un pilote avec de vrais usagers (hors POC)

---

## Implémentation applicative (Next.js / TypeScript) — cf. [09 roadmap](./09-roadmap-decoupage.md)

### Lot 0 — Fondations agent (sans Neo4j) — 🟡 en cours
- [x] ✅ Service agent : orchestration intention → outil → réponse (`src/lib/ia/agent.ts`, `runAgent`)
- [x] ✅ **Function calling Groq** (fusion intention+outil en 1 appel, R3) + 2 outils (`tools.ts` : `get_user_profile`, `get_realtime_data`)
- [x] ✅ Modèle Prisma `AgentLog` + migration `20260617120000_add_agent_logs` + journaliseur fail-soft (`agent-logs.ts`)
- [x] ✅ **Tests unitaires** (16, Groq/Prisma mockés) : `runAgent` (boucle + RBAC + max-rounds + blocs), journaliser fail-soft, outils (dont `search_opportunities`), garde-fous route — `tests/unit/yaye-*.test.ts`
- [x] ✅ `src/app/api/ia/route.ts` implémentée (réponse **en blocs**) — SSE reporté au Lot 5
- [x] ✅ **Bonne surface câblée** : drawer du bouton flottant (`YayeFab`→`YayeConversation`→`YayeSidePanel`), composer réel branché sur `/api/ia` (la page `YayeChat` mobile reste à aligner sur les blocs)
- [x] ✅ **Anticipé des Lots 1/5** : outil `search_opportunities` (Prisma réel) + contrat de réponse **en blocs** + rendu **cards opportunités cliquables** (`YayeOppCard` → `/opportunites/[slug]`) + CTA **Candidater** (`?postuler=1`) + `YayeActionCard` pour les soumissions
- [x] ✅ **Contexte serveur Redis** (`context.ts`, TTL 30 min web / 7 j WhatsApp, fail-soft) — `/api/ia` est désormais autorité serveur (plus l'historique client)
- [x] ✅ **Webhook WhatsApp → `runAgent`** (`/api/whatsapp`) : résolution `cjs_uid` via binding `ConversationWhatsApp`, **formateur blocs→texte** (`format-whatsapp.ts`, liste numérotée + deep links), invite si non lié, idempotence conservée
- [ ] ⬜ *(refinement)* Miroir durable `ConversationWhatsApp.contexte` + transcript `MessageWhatsApp` (aujourd'hui : Redis pour le contexte)
- [x] ✅ Page mobile `YayeChat` (`/jeune/yaye`) alignée sur le **même flux blocs** que le drawer (cards cliquables)
- [x] ✅ **Jamais de % de compatibilité** dans les réponses Yaye (règle 7 du prompt + mocks nettoyés). Exception hors chat : `YayeMatchCard` (page détail) — à arbitrer
- [ ] ⬜ **Pour exécuter** : renseigner `GROQ_API_KEY` (vide) + `prisma migrate deploy` (table `agent_logs` absente en local) + réparer le build rouge pré-existant
- [ ] ⬜ Brancher le webhook WhatsApp (`/api/whatsapp`) sur `runAgent` (utilise encore `rag.ts`)

### Lot 1 — Knowledge Graph Neo4j (enrichi)
- [ ] ⬜ **`GraphPort`** + `Neo4jGraphAdapter` / `PrismaGraphAdapter` (fallback)
- [ ] ⬜ Driver `neo4j-driver` + connexion + contraintes/index
- [ ] ⬜ 1a — Décompression opportunités (labels multiples) + relations cœur
- [ ] ⬜ 1b — Profil & parcours : normalisation compétences → `MAITRISE` ; `A_OBTENU`/`ATTESTE`/`A_POSTULE`
- [ ] ⬜ 1c — Agenda & ressources : `Evenement`/`INSCRIT_A`/`SE_DEROULE_A` ; `PREPARE`
- [ ] ⬜ 1d — Centres : `Salle`/`Vehicule`/`DISPOSE_DE`/`ACCESSIBLE_A`
- [ ] ⬜ Pipeline d'alimentation Prisma→Neo4j (événementiel + sync nocturne)
- [ ] ⬜ `query_knowledge_graph` + templates (recherche, gap compétences, reco collab, parcours)
- [ ] ⬜ 1e — Recommandation proactive : scoring → `RecommandationIA` + outil `get_recommendations`

### Lot 2 — Ressources centres (salles + véhicules)
- [ ] ⬜ Mapper `reserve_resource` sur `Reservation`/`RessourceCentre`
- [ ] ⬜ Champ zone véhicule + restriction géo + validation gestionnaire (`StatutReservation.EnAttente`)
- [ ] ⬜ Collecte séquentielle WhatsApp

### Lot 3 — Bibliothèque physique
- [ ] ⬜ Modèles Prisma `Livre`/`ExemplaireLibre`/`Rayon`/`Emprunt` + migration
- [ ] ⬜ Routes `search_library` / `borrow_book` / `get_active_loans`
- [ ] ⬜ Emprunt « initié » → effectif au scan ; retour par scan
- [ ] ⬜ Sync nœuds Neo4j biblio

### Lot 4 — Badge (selon D1)
- [ ] ⬜ Mapper `get_badge` sur le système retenu (JWT rotatif recommandé)
- [ ] ⬜ 4 formats + actions au scan + mode offline

### Lot 5 — Formateur de sortie multi-canal
- [ ] ⬜ Objets normalisés → card/liste_whatsapp/image_qr/pdf/synthèse
- [ ] ⬜ Boutons (3) + listes interactives Meta (10) + templates
- [ ] ⬜ Bascule web (deep link SSO) si > 5 échanges

### Lot 6 — Escalade conseiller
- [ ] ⬜ Outil `escalate_to_advisor` + journalisation raison
- [ ] ⬜ Module envoi WhatsApp panel admin + notif temps réel

### Lot 7 — Panel admin sessions Yaye + Data Hub
- [ ] ⬜ Vue liste + filtres · vue détail 2 niveaux · indicateurs · export CSV
- [ ] ⬜ Agrégations `agent_logs` → Data Hub

### Lot 8 — Templates Meta & durcissement
- [ ] ⬜ 5 templates approuvés + gestion fenêtre 24h
- [ ] ⬜ Tests de charge + conformité CDP (droit à l'oubli, anonymisation)

### Candidature assistée (transverse — F6)
- [ ] ⬜ Outil `submit_application` sur `/api/candidatures` (existe) + flux WhatsApp séquentiel

---

## Légende d'avancement (à tenir à jour)

| Phase | Statut global |
|-------|---------------|
| Cadrage & décisions | 🟡 1/9 décisions actées · risques non levés |
| POC Knowledge Graph | ✅ validé (mécanique + mesure) |
| Implémentation app | 🟢 **Lot 0 ~complet** (agent, agent_logs, /api/ia blocs + Redis, drawer+page UI cards, WhatsApp→runAgent, 68 tests) — restent prérequis d'exécution (clé Groq, migration, build rouge) · Lots 1-8 ⬜ |

> Prochain jalon bloquant : **lever R1 (Neo4j) et R2 (normalisation compétences)** → débloque le Lot 1.
