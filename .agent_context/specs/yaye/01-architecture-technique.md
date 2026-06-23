# 01 — Architecture technique

## Vue d'ensemble

Le service agent Yaye est un **ensemble de Route Handlers Next.js colocalisés** avec tous les autres Route Handlers du Guichet. **Pas de microservice séparé.** L'agent accède directement aux mêmes données : même base principale, même connexion Neo4j, même Redis.

## Flux de traitement d'un message (8 étapes)

```
1. Réception message      WhatsApp (HMAC vérifié) · Web (SSE + token SSO)
2. Identification user     Redis session · SSO token → cjs_uid · rôle · centre_id
3. Lecture profil complet  Route Handler /api/users/[cjs_uid]/profile
4. Détection intention     Groq analyse · extrait paramètres structurés
5. Sélection + appel outil Groq choisit parmi 11 outils (function calling)
6. Génération réponse      Groq formule en français naturel et précis
7. Formateur de sortie     → WhatsApp  ou  → Chat web (Groq ne connaît PAS le canal)
8. Journalisation          → agent_logs (à chaque étape)
```

> ⚠️ Les chemins de route ci-dessus reprennent ceux de la note (anglais). Routes **réelles** du repo : `/api/profil/*` (et non `/api/users/[cjs_uid]/profile`) — mapping complet dans [03](./03-outils-function-calling.md) et [08](./08-gap-analysis-existant.md).

## Moteur LLM — Groq

`llama-3.3-70b-versatile` intervient à **3 moments** :
1. Détection d'intention + extraction de paramètres structurés.
2. Construction de la requête Cypher **ou** sélection du bon outil parmi les 11.
3. Formulation de la réponse finale en français naturel.

**Pourquoi Groq** : latence très faible (critique sur WhatsApp), cohérence avec EduPop, coût variable négligeable aux volumes projetés.

> ⚙️ **Budget de latence & garde-fous** (cf. [10-risques.md](./10-risques.md) R3/R4) : le pipeline enchaîne potentiellement 3 appels Groq + 1 requête graphe. À optimiser — **fusionner détection d'intention + sélection d'outil en un seul appel function-calling** (étapes 4+5), définir un budget cible (< 3 s perçu WhatsApp, sinon accusé « Yaye réfléchit… »), cacher les requêtes graphe fréquentes. Garde-fous : seuil de confiance d'intention, **whitelist de templates Cypher** (jamais de Cypher libre), fallback `escalate_to_advisor`.

> ⚠️ Le LLM ne connaît jamais le canal. C'est le **formateur de sortie** (dernière étape) qui adapte web vs WhatsApp. Voir [04-canaux-web-whatsapp.md](./04-canaux-web-whatsapp.md).

## Stack technique complète

| Composant | Technologie & rôle |
|-----------|--------------------|
| **Projet unifié** | Next.js (App Router) — frontend, API, agent Yaye, gestion centres, pipeline Neo4j, chat |
| **LLM** | Groq API · `llama-3.3-70b-versatile` · intention, Cypher, réponses |
| **Knowledge Graph** | Neo4j 5.x · données métier lisibles · requêtes Cypher hybrides |
| **Session** | Redis Upstash · `session_id`, `cjs_uid`, rôle, `centre_id`, contexte 10 échanges |
| **WhatsApp** | Meta Cloud API · webhooks HMAC · templates pré-approuvés · numéro dédié |
| **Auth** | Laravel Passport SSO · OAuth 2.0 · RBAC · service externe (intégration uniquement) |
| **Base principale** | Données Guichet, centres, bibliothèque, ressources |
| **Logs Yaye** | `agent_logs` · traçabilité exhaustive |
| **SMS fallback** | Orange SMS Pro · codes alphanumériques badge, OTP |

> 📌 **Note de divergence repo** : la note cite *PostgreSQL* comme base principale, mais le Guichet actuel tourne sous **MariaDB 11 + Prisma 7** (cf. CLAUDE.md) et la table de logs est annoncée en **MySQL**. → Voir [08-gap-analysis-existant.md](./08-gap-analysis-existant.md) §Base de données pour l'arbitrage. La note décrit l'intention métier ; la cible technique réelle est MariaDB/Prisma.

## Composants applicatifs

- **Service agent** : orchestration intention → outil → réponse (normalisée, sans canal).
- **Formateur de sortie** : traduit la réponse normalisée en format canal (`card_react` | `liste_whatsapp` | `image_qr` | `pdf_joint` | `synthese`).
- **Pipeline Neo4j** : sync événementielle à chaque création/modif d'entité + sync complète nocturne (filet de sécurité).
- **Journaliseur** : écrit chaque événement dans `agent_logs` au moment exact où il se produit.
