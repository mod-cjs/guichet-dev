# Audit adversarial — fournisseur LLM local (LMStudio / qwen3-14b)

**Date :** 2026-07-14 · **Branche :** `dev` (b77610d) · **Base :** GUIC-539 (PR #246) + GUIC-540 (PR #247), tous deux mergés
**Méthode :** lecture de code + **sondes live contre le serveur LMStudio réel** (aucun finding théorique).
**Rejoué sur `dev` le 2026-07-14 :** les 5 défauts sont présents à l'identique (`judge.ts:102`, `adequation.ts:117`,
budgets 320/240/200, timeout 20 s, zéro traitement du raisonnement) — **et le code GUIC-540 en ajoute un 6ᵉ (F12).**
**Environnement testé :** LMStudio `qwen/qwen3-14b`, contexte chargé **16 384** (max 40 960), 7 conteneurs up.

> Conclusion en une ligne : **le tool-calling fonctionne (le but de GUIC-539 est atteint), mais 4 des 5 chemins
> d'appel LLM sont cassés en mode local** — pas dégradés : sans sortie. Les tests unitaires passent (faux-vert).

---

## Cause racine commune

`qwen3` est un modèle **à raisonnement** : il émet systématiquement un bloc `<think>…</think>`
**dans le champ `content`** (LMStudio ne le sépare pas dans `reasoning_content`).
Notre code a été écrit pour Vertex/Gemini, qui n'a pas ce comportement. Trois conséquences en cascade :
le raisonnement **consomme le budget `max_tokens`**, **pollue le `content`**, et **repart dans l'historique**.

Constat mesuré : `/no_think` dans le prompt système vide le bloc et fait tomber la latence de **23 s → 3,1 s**.
Mais les balises `<think></think>` restent présentes → un strip reste nécessaire.

---

## Findings (tous reproduits en live)

### F1 — CRITIQUE · Le juge et l'adéquation renvoient une 400 (fonction morte)
`judge.ts:102` et `adequation.ts:117` envoient `response_format: { type: 'json_object' }`.
**LMStudio le rejette** : `{"error":"'response_format.type' must be 'json_schema' or 'text'"}`.
→ Le juge Yaye **et le scoring d'adéquation candidat/offre de l'espace recruteur** sont KO en local.
Impact hors-Yaye : c'est un chemin **M9-recruteur**, pas seulement M12.

### F2 — CRITIQUE · Le raisonnement mange 100 % du budget de `memory` et `adequation`
Sondes live, prompt réaliste :
| Appelant | `max_tokens` | `finish_reason` | Sortie utile |
|---|---|---|---|
| `memory.ts:77` | 240 | **length** (239 consommés) | **VIDE** — tronqué dans le `<think>` |
| `adequation.ts:116` | 200 | **length** (199 consommés) | **VIDE** |
→ La mémoire de conversation n'est **jamais** écrite ; l'adéquation ne rend **jamais** de score.

### F3 — CRITIQUE · Le `<think>` fuit dans l'UI, en direct
- Non-stream : `agent.ts:318` → `reply = choice.content` (brut) → affiché tel quel.
- **Stream** : `agent.ts:415` `yield {type:'token', text: delta.content}`. Sonde live : le **premier delta
  émis est littéralement `<think>`** → le raisonnement du modèle **défile dans le navigateur**.
  Un strip a posteriori **ne corrige pas** ce chemin : il faut un filtre **streaming, à état**.
- Persistance : `api/ia/route.ts:86` `assistantText: reply` et `:90` (historique) → le `<think>` part
  **en base** (transcripts, données d'éval) **et est réinjecté dans le contexte** au tour suivant (compounding).
- **CDP** : le raisonnement reformule souvent les données du jeune → PII dans les transcripts.

### F4 — CRITIQUE · L'agent tronque ~1 réponse sur 3
`YAYE_MAX_TOKENS = 320` (`agent.ts:40`). Round final (synthèse après outils), 3 sondes identiques :
`298 → stop` · **`319 → length` (réponse coupée en pleine phrase)** · `314 → stop`.
Le round d'appel d'outil, lui, passe (251 / 169 tokens). **Le bug ne frappe que la réponse à l'utilisateur.**

### F5 — CRITIQUE · Timeout inférieur à la latence réelle
`YAYE_LLM_TIMEOUT_MS = 20 000` (`llm-client.ts:51`). Un simple « dis bonjour » avec raisonnement actif :
**23 s** → expiration + 2 retries. Avec `/no_think` : 3,1 s (marge confortable).

### F6 — HAUT · Aucun garde-fou de capacités en mode local
`getSlotModel()` court-circuite l'allowlist (`llm-config.ts:84`) → `assertSlotModel` n'est jamais appelé,
et `ModelCaps` (`supported-models.ts`) n'existe **que pour Vertex** (`type LlmProvider = 'vertex'`).
Rien ne dit que le modèle local n'a pas le mode JSON → on découvre la 400 **à l'exécution**, en silence.

### F7 — HAUT · Pas de contrôle de disponibilité de LMStudio
`isLlmConfigured()` renvoie `true` en dur en local (`llm-client.ts:73`). Serveur éteint / modèle déchargé
→ erreur de connexion brute remontée à l'utilisateur, sans message exploitable. Friction d'onboarding.

### F8 — HAUT · Les tests passent alors que le mode local ne marche pas (faux-vert)
`tests/unit/llm-client.test.ts` ne couvre que baseURL / absence d'auth GCP. **Aucun test** ne couvre
`json_object`, le budget de tokens, le strip du raisonnement, ni le streaming.
Violation directe de la charte qualité « zéro faux-vert ».

### F12 — CRITIQUE · Le garde-fou anti-méta (GUIC-540) **écrase la bonne réponse** en local
Découvert **sur `dev` uniquement** (code arrivé avec PR #247). `reply-guard.ts:56` `detectMetaLeakage()`
cherche des marqueurs méta dans le texte, **dont les noms d'outils** (`search_opportunities`, `get_user_profile`…).
Or le `<think>` de qwen3 **raisonne explicitement sur les outils qu'il vient d'appeler** → il contient leur nom.

Exécution du **vrai code de `dev`** sur une **vraie sortie qwen3** (`scratchpad/probe-dev.ts`) :

```
content brut : "<think>\nOkay... I called the search_opportunities function with \"stage\"..."
detectMetaLeakage() → flagged: true · hits: [ 'search_opportunities' ]
finalizeReply()     → "J'ai regardé pour toi — le détail est sur les cartes juste en dessous 👇"

... alors que le modèle avait RÉELLEMENT répondu :
"Voici quelques opportunités de stages en informatique à Dakar :
 1. **Stage Dev Web** — Organisation : Socium — Lieu : Dakar
 2. **Stage Data** — Organisation : CJS — Lieu : Dakar"
```

→ **Chaque tour utilisant un outil voit sa réponse détruite et remplacée par la phrase de repli.**
Insidieux : le repli est plausible, donc un testeur humain conclut « Yaye marche, elle est juste laconique ».
Le garde-fou est correct en soi — c'est le `<think>` non retiré **en amont** qui le fait mordre à vide (cf. F3).

### F9 — MOYEN · Le harnais d'éval produit des scores faux en local
`metrics/golden/harness.ts` + `cron/yaye-eval` s'appuient sur le juge (F1, KO) → **scores nuls ou absents**
interprétés comme régression. Signal de régression **non fiable** tant que F1 n'est pas corrigé.

### F10 — MOYEN · `.env.example` ne documente pas les contraintes réelles
Rien sur : le modèle **14B requis** (le 7B n'appelle pas les outils correctement — motif du chantier),
le contexte à régler (**16 384 par défaut**, alors que 13 outils + prompt système sont volumineux),
ni le timeout à relever. `.env.local` pointait encore `qwen2.5-7b-instruct-1m` : **corrigé à la main**
pendant cet audit — donc non reproductible pour un autre dev.

### F11 — FAIBLE · Dette Groq résiduelle
`llm-config.ts:30` garde `GROQ_MODEL` en fallback ; `GROQ_API_KEY` traîne dans l'env. Le CLAUDE.md
annonce encore « IA : Groq llama-3.3-70b » alors que le fournisseur est Vertex/LMStudio.

---

## Tickets (créés le 2026-07-14)

| Ticket | Sév. | Couvre | Ordre |
|---|---|---|---|
| **GUIC-555** — `fix(m12-ia)` neutraliser le raisonnement qwen3 en local | 🔴 | F3, **F12**, F5 (latence) | **1 — ouvreur** |
| **GUIC-556** — `fix(m12-ia,m9-recruteur)` sortie JSON compatible LMStudio | 🔴 | F1 | 2 |
| **GUIC-557** — `fix(m12-ia)` budgets de tokens & timeout du provider local | 🔴 | F2, F4, F5 (timeout) | 3 |
| **GUIC-558** — `feat(m12-ia)` garde-fous provider local (capacités + health-check) | 🟠 | F6, F7 | 4 |
| **GUIC-559** — `test(m12-ia)` couverture anti-faux-vert + doc env | 🟠 | F8, F10 | 5 |
| **GUIC-560** — `fix(m12-ia)` fiabiliser le harnais d'éval en local | 🟡 | F9 | 6 (dépend de GUIC-556) |
| **GUIC-561** — `chore(m12-ia)` purger la dette Groq | 🟢 | F11 | 7 |

**GUIC-555 est l'ouvreur** : un `stripReasoning()` bien placé (avant le reply-guard et avant toute
persistance) + `/no_think` désamorcent à eux seuls F3, F12 et la latence, et détendent les budgets de F2/F4.

## Ce qui marche (vérifié, à ne pas casser)

- **Tool-calling qwen3-14b** : `finish_reason: tool_calls`, arguments extraits proprement
  (`{"type":"stage","domaine":"informatique","region":"Dakar"}`) — **l'objectif de GUIC-539 est atteint**.
- **Boucle multi-tours** : après injection du résultat d'outil, le modèle rédige bien en français.
- **Bandeau admin** (`admin/yaye/modele/page.tsx:31`) : signale correctement que les choix Vertex sont ignorés.
- `frequency_penalty` / `presence_penalty` : acceptés par LMStudio (pas de 400).
- Le routage `baseUrlForModel` / client sans auth GCP : conforme.
