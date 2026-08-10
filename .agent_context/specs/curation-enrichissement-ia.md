# Spec — Enrichissement IA de l'extraction de curation (GUIC-704)

## Contexte
L'extraction de curation (GUIC-598) est **déterministe sans LLM** : cascade JSON-LD → sélecteurs
→ og/meta → filet regex. Fiable mais littérale → limites terrain (deadline = souvent la date de
publication, type mono par source, région/domaine ratés si hors champ dédié).

Le Guichet dispose déjà d'une IA (Vertex, `gemini-2.5-flash`, `src/lib/ia/llm-client.ts`,
sortie `response_format: json_object`, modèle piloté par `LlmConfig`). Décision (2026-08-10) :
**hybride** = socle déterministe conservé + **couche d'enrichissement LLM** sur les items faibles.

## Pourquoi c'est sûr ici
L'admin **valide chaque item avant publication** (rien ne s'auto-publie) → une hallucination LLM
(deadline/orga inventée) est rattrapée par le garde humain. C'est ce qui rend le LLM acceptable
sur ce système (contrairement à un pipeline auto-publiant).

## Architecture
```
extraireOpportunite() déterministe (inchangé, gratuit, toujours dispo)
  └─ needsEnrich = score < SEUIL(70)  OU  type/deadline/région manquants
       └─ [gate: CURATION_ENRICHISSEMENT_IA=1 ET isLlmConfigured()]
            └─ enrichirParIa(texteNettoyé, dejaExtrait) : 1 appel LLM
               · prompt STRICT « uniquement ce qui est littéralement sur la page, sinon null »
               · response_format json_object, temperature 0, max_tokens borné
               · sortie validée zod (titre/description/organisation/region/domaine/typeSlug/deadline, tous nullable)
            └─ merge TROUS-SEULEMENT (ne surcharge jamais une valeur déterministe fiable)
            └─ region/domaine re-mappés sur l'enum ; typeSlug résolu en id
       └─ typeDefaut = filet FINAL (après schema.org ET LLM) → permet le type par item
  └─ score recalculé · payload.enrichiParIa = true (trace admin)
```
Fail-soft : toute erreur LLM (Vertex down, JSON invalide) → `{}` → on garde le déterministe.
Opt-in par env (`CURATION_ENRICHISSEMENT_IA`) → aucun appel Vertex surprise en CI/local.

## Décisions
- **D1** — Merge trous-seulement : le LLM ne remplit que les champs vides du déterministe.
- **D2** — Enums conservés : la région/le domaine renvoyés par le LLM repassent par `mapperRegion`/
  `mapperDomaine` (pas de valeur enum hors référentiel) ; le type par la résolution slug→id.
- **D3** — `typeDefaut` de la source devient le **filet final** (plus appliqué avant enrichissement)
  → une source mixte (concoursn : emploi/concours) obtient un type par item.
- **D4** — Seam de test : `executerExtraction({ enrichir })` injectable ; défaut = vraie fonction
  gated par env. Tests d'enrichissement injectent un faux (déterministe, sans réseau).
- **D5** — Deadline déterministe corrigée EN AMONT (fix #1) : le filet regex ne capte une date que
  près d'un **label d'échéance** (« date limite / délai / clôture / avant le / au plus tard /
  deadline / échéance / expire »). Sinon vide (jamais une date de publication déguisée). Sans ça,
  l'item ne serait jamais « faible sur deadline » → l'enrichissement ne se déclencherait pas.

## Limites traitées (rappel arbitrage)
- #1 deadline, #2 région/domaine, #3 type → **enrichissement LLM** (+ fix #1 déterministe amont).
- #4 sites 403/406 → **Accept configurable par source** (négo légitime ; PAS de spoof UA). Déterministe.
- #5 SPA → **slice séparée** : rendu headless **par source** (flag `configExtraction.rendreJs`)
  via **Playwright** (déjà dépendance e2e), activé UNIQUEMENT sur les sources marquées SPA — le
  crawler reste léger/poli par défaut, coût ops isolé. Le LLM n'aide PAS à fetcher un SPA (transport).
- By-design conservés : dédup prudent, pas d'auto-rejet, débit borné, SSRF interne interdit.

## Plan TDD (slices, commits séparés RED→GREEN)
1. Fix #1 deadline déterministe (label-only).                 ← ce commit
2. Module `enrichir-ia.ts` (prompt/schema/merge) — LLM mocké.
3. Câblage `executerExtraction` (gate env, seam, typeDefaut filet final, flag, score).
4. #4 Accept configurable par source (`ClientHttp` opt + `configExtraction.accept`).
5. #5 SPA : rendu headless par source (Playwright) — slice ultérieure.
```
```
