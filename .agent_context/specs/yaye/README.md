# Yaye — Conseillère Numérique du Guichet Jeunesse CJS

> **Source de vérité fonctionnelle** : *Note Technique et Fonctionnelle (v1.0)* — Abdou Khadre DIOP, Mai 2026.
> Ce dossier traduit cette note en contexte agent navigable + analyse d'écart avec le code existant.

**Branche de travail** : `feature/yaye-v1-conseillere-numerique` (depuis `dev`)
**Modules concernés** : `m11-whatsapp` · `m12-ia` · `m4-centres` (gestion centres + ressources)
**Statut** : 📐 cadrage / spec-first — aucune ligne de code écrite avant validation humaine de la spec (cf. CLAUDE.md §Protocole).

---

## 1. En une phrase

Yaye est l'agent IA conversationnel **natif** du Guichet (pas un microservice séparé) qui opère sur **deux canaux** (chat web React + WhatsApp Meta Cloud API), avec une **logique métier unique**, branché sur un **Knowledge Graph Neo4j**, exposant **11 outils** (function calling Groq), et **journalisant exhaustivement** chaque action dans `agent_logs`.

## 2. Principe architectural fondamental

> Il **n'existe pas** d'interconnexion entre le Guichet et une appli externe de gestion des centres. Tout vit dans le **même projet Next.js** : mêmes Route Handlers, même base, même SSO, même connexion Neo4j/Redis. Le SSO (Laravel Passport) est le **seul** service externe.

> 🔒 **Invariant données** : **Prisma/MariaDB = source de vérité unique ; Neo4j = vue dérivée (read-model) reconstructible.** Aucune donnée ne naît dans le graphe — sens d'écriture `Prisma → projection → Neo4j` uniquement. Détail : [02 §0](./02-knowledge-graph-neo4j.md).

## 3. Carte du dossier (par où commencer)

| # | Fichier | Quand le lire |
|---|---------|---------------|
| 00 | [vision-perimetre.md](./00-vision-perimetre.md) | Comprendre le rôle de Yaye, les utilisateurs, le périmètre v1 vs v1.1 |
| 01 | [architecture-technique.md](./01-architecture-technique.md) | Flux de traitement d'un message, moteur Groq, stack complète |
| 02 | [knowledge-graph-neo4j.md](./02-knowledge-graph-neo4j.md) | **Graphe enrichi** — 21 nœuds (10 sous-types d'opportunités décompressés + événements + tags + profil/parcours), relations, NL→Cypher, pipeline |
| 03 | [outils-function-calling.md](./03-outils-function-calling.md) | Les **11 outils** (9 de la note + `submit_application` + `get_recommendations`), leurs Route Handlers, contrats I/O |
| 04 | [canaux-web-whatsapp.md](./04-canaux-web-whatsapp.md) | Divergences de rendu, contraintes Meta, formateur de sortie |
| 05 | [badge-numerique.md](./05-badge-numerique.md) | QR HMAC, scan centre, **conflit avec le cjs-card JWT existant** |
| 06 | [agent-logs-tracabilite.md](./06-agent-logs-tracabilite.md) | Table `agent_logs`, taxonomie événements, Data Hub, panel admin |
| 07 | [securite-conformite.md](./07-securite-conformite.md) | RBAC/isolation, webhooks WhatsApp, Redis, CDP, mode offline |
| 08 | [gap-analysis-existant.md](./08-gap-analysis-existant.md) | **⭐ Ce qui existe déjà dans le code vs la cible — à lire avant de coder** |
| 09 | [roadmap-decoupage.md](./09-roadmap-decoupage.md) | Découpage en lots livrables + dépendances |
| 10 | [risques.md](./10-risques.md) | **⚠️ 6 risques + conditions de réussite (Go/No-Go) — à lire avant le Lot 1** |
| 11 | [fonctionnalites.md](./11-fonctionnalites.md) | **Les 7 fonctions de Yaye** (déclencheur · outils · flux · règles · events · état code) — vue consolidée |
| 12 | [suivi-mise-en-place.md](./12-suivi-mise-en-place.md) | **📋 Tableau de bord de suivi** — décisions, risques, lots, POC : statut de chaque tâche (à tenir à jour) |
| 13 | [journal.md](./13-journal.md) | **🗓 Journal daté** — trace des avancées, décisions et jalons (ce qui a été fait, quand, pourquoi) |

## 4. Documents liés (existant repo)

- `CLAUDE.md` — règles absolues, protocole module, conventions Git/JIRA
- `.agent_context/specs/M4-centres-lot7.md` — spec centres déjà partiellement livrée
- `.agent_context/adr/ADR-002-qr-jwt-rotatif.md` — **décision badge JWT** (à réconcilier avec la note Yaye)
- `.agent_context/adr/ADR-001-reutiliser-agentcentre.md` — modèle `AgentCentre`/`RoleAgent`
- `docs/architecture.md` · `docs/interconnexion.md` · `docs/metier.md` · `docs/sso.md`
- Code Yaye existant : `src/lib/ia/`, `src/app/api/whatsapp/`, `src/app/jeune/yaye/`, `src/components/ui/Yaye/`

## 5. Règle d'or de ce projet

Avant d'écrire du code Yaye : **lire [08-gap-analysis-existant.md](./08-gap-analysis-existant.md)**. Beaucoup de briques existent déjà sous une autre forme (badge JWT vs HMAC, `RessourceCentre` générique vs `Salle/Vehicule/Livre`, RAG basique vs 11 outils). On **étend** l'existant, on ne le réécrit pas.
