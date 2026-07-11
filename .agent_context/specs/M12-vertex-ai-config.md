# M12 — Migration Groq → Vertex AI + choix de modèle piloté par l'admin

> Module : `m12-ia` · Ticket JIRA : `GUIC-537` · Statut : **validée — en cours**
> Auteur : mod-cjs · Date : 2026-07-11

## 1. Contexte & motivation

**Driver réel :** Groq est *inscriptible-bloquant* — impossible d'ouvrir un compte pro
(facturation non disponible depuis le Sénégal). Ce n'est pas un problème de qualité ni de
latence : il faut simplement un fournisseur LLM ouvrable et facturable. **GCP Vertex AI**
est accessible → on migre.

**Exigence supplémentaire (PO) :** pouvoir **changer de modèle au runtime depuis l'espace
admin**, sans redéploiement ni édition d'env — un slot par usage.

## 2. Décisions validées

| Décision | Choix |
|---|---|
| Fournisseur cible | **Vertex AI uniquement** (Gemini + Llama MaaS), un seul mode d'auth (service account GCP) |
| Granularité admin | **Un slot par usage** : `agent` (Yaye), `judge` (éval), `adequation` (scoring) |
| Interface | **OpenAI-compatible** (Vertex expose `.../endpoints/openapi/chat/completions`) → change minimal des conscommateurs |
| Défaut des 3 slots | **Gemini 2.5 Flash** (tools + streaming natifs, bon marché, latence correcte) |
| Fallback | Env vars actuelles si la table de config est vide → **zéro régression** |

## 3. Périmètre technique

### 3.1 Couche client provider-agnostic
- Remplacer `src/lib/ia/groq-client.ts` par `src/lib/ia/llm-client.ts`.
- Retourne un client **OpenAI-compatible** (`openai` npm) pointé sur Vertex :
  `https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/{LOCATION}/endpoints/openapi`
- Auth : bearer OAuth via `google-auth-library` (ADC / service account). Token mis en cache
  et rafraîchi avant expiration.
- Conserver la robustesse actuelle : `timeout` + `maxRetries` (mêmes env `YAYE_*_MS` / `_MAX_RETRIES`).
- **Filtrage des paramètres par modèle** : Gemini (compat) ne supporte pas toujours
  `frequency_penalty` / `presence_penalty` → un helper `buildParams(model, opts)` qui retire
  les params non supportés selon le provider/famille du modèle.

### 3.2 Config modèle en base (Prisma)
- Table `LlmConfig` (singleton, une ligne) OU table clé/valeur `AppSetting`. **Choix : `LlmConfig`
  singleton** (typé, simple).
  ```
  model LlmConfig {
    id              String   @id @default("default")   // singleton
    agentModel      String
    judgeModel      String
    adequationModel String
    updatedAt       DateTime @updatedAt
    updatedBy       String?  // cjs_uid admin
    @@map("llm_config")
  }
  ```
- Accès via `getLlmConfig()` : lit la ligne, **cache Redis** (TTL court, ex. 60 s) +
  **invalidation au save**. Fallback env (`YAYE_MODEL`, `YAYE_JUDGE_MODEL`, `GROQ_MODEL`→`ADEQUATION_MODEL`)
  puis défaut `gemini-2.5-flash` si vide.
- `agent.ts`, `judge.ts`, `adequation.ts` lisent le modèle via `getLlmConfig()` au lieu de la
  const env directe (le reste du code est inchangé).

### 3.3 Allowlist de modèles
- `src/lib/ia/supported-models.ts` : const curé, source de vérité UI + validation serveur.
  IDs Vertex exacts (vérifiés en ligne) :
  | Label | id | Intégration |
  |---|---|---|
  | Gemini 2.5 Flash-Lite | `google/gemini-2.5-flash-lite` | endpoint openapi partagé |
  | Gemini 2.5 Flash (défaut) | `google/gemini-2.5-flash` | idem |
  | Gemini 2.5 Pro | `google/gemini-2.5-pro` | idem |
  | Gemini 3 Flash (Preview) | `google/gemini-3-flash-preview` | idem |
  | Llama 3.1 8B | `meta/llama-3.1-8b-instruct-maas` | MaaS partagé |
  | Llama 3.1 70B | `meta/llama-3.1-70b-instruct-maas` | MaaS partagé |
  | Llama 3.1 405B | `meta/llama-3.1-405b-instruct-maas` | MaaS partagé |
  | Llama 3.3 70B | `meta/llama-3.3-70b-instruct-maas` | MaaS partagé |
  | Llama 4 Scout | `meta/llama-4-scout-17b-16e-instruct-maas` | MaaS partagé |
  | Llama 4 Maverick | `meta/llama-4-maverick-17b-128e-instruct-maas` | MaaS partagé |
  | Gemma 3 4B | `google/gemma-3-4b-it` | **self-deployed** → endpoint dédié |
- Le slot `agent` **doit** exiger `caps.tools && caps.stream` (validation serveur).
- **Gemma (self-deployed)** : flag `deployed: true`. `baseUrlForModel()` route vers
  `VERTEX_DEDICATED_ENDPOINT_URL` (lève si absent → pas d'appel silencieusement cassé).
  Les Gemini/Llama passent par l'endpoint `endpoints/openapi` partagé. Le client est
  mémoïsé par base URL (`getLlmClient(model)`).
- NB : « Gemini 3.5 Flash » n'existe pas → mappé sur **Gemini 3 Flash** (preview).

### 3.4 UI + API admin
- API : `GET/PUT /api/admin/ia/config` — RBAC admin (même garde que les autres routes
  `/api/admin/*`), valide chaque slot contre l'allowlist, écrit `LlmConfig`, invalide le cache,
  journalise dans le journal d'audit (`updatedBy`).
- Page : `src/app/admin/yaye/modele/page.tsx` — 3 `<Select>` (composants `src/components/ui/`),
  affiche modèle actif + provider + note, bouton Enregistrer. Aucun HTML Tailwind brut.

## 4. Variables d'environnement (nouvelles)
```
GOOGLE_CLOUD_PROJECT=<id projet GCP>
GOOGLE_CLOUD_LOCATION=<région, ex. us-central1 / europe-west1>
GOOGLE_APPLICATION_CREDENTIALS=<chemin JSON service account>   # ou creds inline selon hébergement
# Optionnels (fallback / défaut) :
YAYE_MODEL, YAYE_JUDGE_MODEL, ADEQUATION_MODEL  # sinon gemini-2.5-flash
```
- `GROQ_API_KEY` : supprimé du code ; retirer de `.env.example` en fin de migration.
- Dépendances : `+ openai`, `+ google-auth-library` · `- groq-sdk`.

## 5. Plan TDD (RED → GREEN)
1. **RED** — specs :
   - `llm-client` : construit le bon endpoint Vertex, injecte le bearer, filtre les params non supportés.
   - `getLlmConfig` : lit la table, fallback env→défaut, cache+invalidation.
   - `supported-models` : allowlist, validation slot `agent` (tools+stream requis).
   - API admin : RBAC, rejet modèle hors allowlist, persistance + audit.
2. **GREEN** — implémentation minimale pour passer au vert.
3. Adapter `agent.ts` / `judge.ts` / `adequation.ts` (import + source du modèle) — tests existants Yaye restent verts.
4. UI admin + story si nouvelle primitive.
5. `npm run validate` avant commit.

## 6. Risques & points ouverts
- **Function calling via compat Vertex** : à valider empiriquement pour Gemini (format `tools`/`tool_calls`
  OpenAI). Plan B si divergence : brancher `@ai-sdk/google-vertex` pour l'agent seulement.
- **Params non supportés** : géré par `buildParams` (§3.1).
- **Latence WhatsApp** : Gemini Flash < Groq mais dans la cible < 20 s. À mesurer sur le cron éval.
- **Région / résidence données** : choisir `GOOGLE_CLOUD_LOCATION` selon exigence CDP (à confirmer PO).
- **Coût** : Gemini Flash très bas ; surveiller via billing GCP.
