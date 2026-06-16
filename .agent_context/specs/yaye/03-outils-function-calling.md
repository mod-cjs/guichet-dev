# 03 — Les 11 outils (function calling Groq)

Groq sélectionne et appelle l'outil approprié selon l'intention détectée. Chaque outil mappe vers un Route Handler Next.js du Guichet.

> 📌 **11 outils** = les 9 du tableau de la note + **`submit_application`** (F6 candidature) + **`get_recommendations`** (F2 recommandation proactive). Les deux derniers sont requis par des fonctions de la note non couvertes par son tableau §6.3 — cf. [11-fonctionnalites.md](./11-fonctionnalites.md).

| # | Outil | Route Handler · Action |
|---|-------|------------------------|
| 1 | `get_user_profile` | `/api/users/[cjs_uid]/profile` · profil complet : secteur, région, compétences, candidatures, centre |
| 2 | `query_knowledge_graph` | Requête Cypher Neo4j construite dynamiquement · graphe **enrichi** (opportunités décompressées par sous-type, analyse d'écart de compétences, reco collaborative, parcours multi-entités) · cf. [02](./02-knowledge-graph-neo4j.md) |
| 3 | `get_realtime_data` | Route Handlers Next.js · disponibilité salle/véhicule, statut exemplaire, deadline |
| 4 | `get_badge` | `/api/users/[cjs_uid]/badge` · QR code signé HMAC + code alphanumérique 6 caractères |
| 5 | `reserve_resource` | `/api/centers/[id]/resources/[rid]/reservations` · salles et véhicules · vérifie restriction géo |
| 6 | `search_library` | `/api/centers/library/search` · titre/auteur/thème · exemplaires dispo + emplacement physique |
| 7 | `borrow_book` | `/api/centers/[id]/library/loans` · initie emprunt · statut « initié » jusqu'au scan badge |
| 8 | `get_active_loans` | `/api/users/[cjs_uid]/loans` · emprunts en cours + dates de retour attendues |
| 9 | `escalate_to_advisor` | Route Handler notification · transfert vers conseiller · journalise la raison |
| 10 | `submit_application` | `/api/candidatures` (POST, **existe déjà** — GUIC-21) · soumet une candidature pré-remplie depuis le profil · confirmation WhatsApp + email |
| 11 | `get_recommendations` | Lit `RecommandationIA` (scores pré-calculés, **sans LLM**) · opportunités recommandées selon profil/besoins + raison · mode **proactif** (ouverture session, push) |

## Notes d'implémentation

- **Routes citées par la note ≠ routes existantes.** Le repo expose déjà `/api/centres/[slug]`, `/api/reservations`, `/api/cjs-card/qr-token`, `/api/profil/*`. Le mapping outil→route réel est à arbitrer dans [08-gap-analysis-existant.md](./08-gap-analysis-existant.md) §Routes. Préférer **réutiliser/étendre** les routes existantes plutôt que créer les chemins `/api/centers/*` en anglais (le repo est en français : `/api/centres/*`).
- `borrow_book` crée un emprunt en statut **« initié »** ; il ne devient effectif **qu'au scan du badge** au centre.
- `reserve_resource` applique la **restriction géographique** (région bénéficiaire = zone centre) **avant** toute demande de véhicule.
- `escalate_to_advisor` **doit** journaliser la raison du transfert (événement `escalade_conseiller`).
- `submit_application` (et tout outil d'**écriture**) : **confirmation explicite obligatoire avant exécution** + **clé d'idempotence** (anti-double soumission). Mappe sur la route `/api/candidatures` existante.
- **Recommandation — deux modes à ne pas confondre** : `query_knowledge_graph` = recherche **réactive ad-hoc** (« trouve-moi un financement… ») ; `get_recommendations` = **proactif pré-calculé** (lecture de `RecommandationIA`). Un **pipeline de scoring** (batch + à la création d'opportunité) alimente `RecommandationIA` via le graphe — il implémente `src/lib/ia/recommandation.ts` (stub aujourd'hui). Les scores **naissent en Prisma**, jamais dans le graphe (invariant read-model, [02 §0](./02-knowledge-graph-neo4j.md)).
- Chaque appel d'outil génère un événement `api_appelee` (route, params, code HTTP, durée) dans `agent_logs`.

## Contrat de réponse normalisée

Le service agent retourne un objet **sans canal** (ex. `resultats_livres`, `badge`, `disponibilite_salle`). Le formateur de sortie traduit ensuite selon le canal — voir [04-canaux-web-whatsapp.md](./04-canaux-web-whatsapp.md). Toutes les réponses API du Guichet suivent `ApiResponse<T>` = `{ data?, meta?, error? }` (cf. CLAUDE.md §API).
