# 13 — Journal de mise en place de Yaye

> Trace **datée** des avancées, décisions et jalons. Complète le board [12](./12-suivi-mise-en-place.md)
> (qui liste ce qui *reste à faire*) ; ici on consigne ce qui *a été fait, quand et pourquoi*.
> Ajouter une entrée à chaque session de travail significative. Plus récent en haut.

---

## 2026-06-17 — Lot 0 : complétion (canaux + persistance + cards)
- **Fait** : réponses **en blocs** (texte + cards opportunités cliquables) — outil `search_opportunities`
  (Prisma) ; **bonne surface UI** câblée (drawer du bouton flottant `YayeConversation`/`YayeSidePanel` +
  page mobile `YayeChat`) ; **contexte serveur Redis** (`context.ts`, autorité serveur) ; **webhook
  WhatsApp → `runAgent`** + formateur blocs→texte (`format-whatsapp.ts`) + binding `cjs_uid`.
- **Prompt** : règle « jamais de % de compatibilité » + config modèle surchargeable par env.
- **Validé** : tsc ✅, eslint ✅, **68 tests Yaye** (15 suites).
- **Restes** : prérequis d'exécution (clé Groq, migration `agent_logs`, build rouge pré-existant) ;
  miroir durable `ConversationWhatsApp.contexte`/`MessageWhatsApp` ; SSE (Lot 5).

## 2026-06-17 — Lot 0 : fondations agent (code applicatif)
- **Fait** : modèle Prisma `AgentLog` + enums + migration `20260617120000_add_agent_logs` ;
  journaliseur fail-soft (`src/lib/ia/agent-logs.ts`) ; outils function-calling
  (`src/lib/ia/tools.ts` : `get_user_profile`, `get_realtime_data`) ; orchestrateur
  `runAgent` (`src/lib/ia/agent.ts`, boucle intention+outil en 1 appel, R3) ;
  route `/api/ia` (POST, auth + rate-limit + journalisation) ; `YayeChat.tsx` branché
  sur le vrai backend (fin du mock).
- **Validé** : tsc ✅ et eslint ✅ sur tous les nouveaux fichiers (0 erreur).
- **Bloqué / à suivre** : `GROQ_API_KEY` vide + migration non appliquée en local (DB cible
  ambiguë 3306/3307) → pas d'exécution end-to-end. SSE reporté (Lot 5). Webhook WhatsApp
  utilise encore `rag.ts`. Build global rouge (tests pré-existants) à réparer avant commit vert.
- **Liens** : `.agent_context/specs/yaye/12-suivi-mise-en-place.md` (Lot 0)

## 2026-06-17 — POC Knowledge Graph : enrichissement + mesure de qualité
- **Fait** : génération de données synthétiques enrichies (`enrich_dump.py`) pour densifier les arêtes
  (REQUIERT, MAITRISE, A_POSTULE, ETIQUETTE, PUBLIE, ATTESTE…) ; cadre de **mesure de qualité**
  (`measure_quality.py`, métriques IR + baselines + vérité-terrain par clusters latents bruités).
- **Infra** : Neo4j local passé en **Enterprise** (multi-database) → 2 bases `standard` (brut) et
  `enriched` (enrichi) pour comparer le « avant/après ».
- **Résultats** : reco collaborative dense (popularité ~150×) ; mesure discriminante
  (SkillMatch/Collaborative >> baselines ; compromis précision/diversité visible).
- **Garde-fous** : données 100 % synthétiques, base séparée `yaye_poc_enriched`, originaux intacts,
  invariant read-model respecté (projection, jamais de donnée née dans le graphe).
- **Limite actée** : mesure de qualité **algorithmique**, pas pertinence réelle (→ pilote requis).

## 2026-06-17 — POC Knowledge Graph : projection MariaDB → Neo4j
- **Fait** : mapping déclaratif complet (`mapping.py`, 21 nœuds + relations), helpers (`graph_loader.py`),
  projection headless (`project_to_neo4j.py`). Notebook `01_sql_to_neo4j.ipynb` mis à jour (couverture complète).
- **Confirmé** : source réelle = **MariaDB/MySQL** (pas PostgreSQL comme la note) ; c'est une **projection**
  (read-model), pas une migration.
- **Données** : dump prod (22 510 users, 4 340 offres) chargé en `yaye_poc` ; arêtes quasi vides dans le brut
  (opportunites_skills=0, profils_jeunes≈6 → séquelles de migration Drupal).

## 2026-06-17 — Conception Yaye (dossier de contexte) commitée
- **Fait** : 14 documents `.agent_context/specs/yaye/` (vision → suivi) sur la branche
  `feature/yaye-v1-conseillere-numerique`. Commits `d771f1a`, `ab5d64e` (GUIC-259).
- **Invariants posés** : Prisma = source de vérité / Neo4j = read-model ; graphe = moteur unique de reco.
- **Décisions** : périmètre KG enrichi (21 nœuds) **acté** ; 8 autres décisions ouvertes (board [12](./12-suivi-mise-en-place.md)).
- **Outils** : 11 (9 note + `submit_application` + `get_recommendations`).

---

### Modèle d'entrée (à copier)
```
## AAAA-MM-JJ — <titre du jalon>
- **Fait** : …
- **Décidé** : …
- **Bloqué / à suivre** : …
- **Liens** : commit / PR / ticket GUIC
```
