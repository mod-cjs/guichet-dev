# Spec — Refonte tests Yaye + ATS (v4) & multi-run statistique

Statut : **PROPOSITION** (à valider avant écriture du code de test)
Auteur : mod-cjs · Contexte : les tests Yaye en CI mockent le LLM en statique → ne
mesurent pas le comportement réel. La couche réaliste (`eval-suite.ts`, 48 scénarios
SOTA) existe mais n'est ni jouée en CI ni fiabilisée statistiquement. L'ATS (scoring
d'adéquation IA) n'a aucun test sur son chemin réel.

## Objectifs

1. Une **pyramide de test claire en 3 niveaux** pour tout ce qui touche au LLM (Yaye + ATS).
2. Des tests **pertinents** : on teste le comportement, pas la présence de sous-chaînes.
3. **Multi-run statistique** (N=3) pour absorber le non-déterminisme du LLM et être sûr des résultats.
4. **Fiabilité par catégorie** : les garde-fous sécurité ne se compensent jamais (pass^k).
5. Prêt pour **Vertex** (branché plus tard via un flag, modèle configurable).

## Périmètre de la refonte (« reprendre de 0 » — cadré)

« Raser et réécrire » s'applique **uniquement à la couche comportement-LLM**, PAS aux 69
fichiers `yaye-*`. Détail :

**Réécrits de 0** (couche mock-LLM statique, non réaliste) :
- `tests/unit/yaye-agent.test.ts` — boucle function-calling (mocks ad-hoc `mockCreate`).
- `tests/unit/yaye-memory.test.ts` — résumé mémoire via LLM.
- `tests/unit/yaye-metrics-judge.test.ts` — parsing verdict juge.
- `tests/unit/yaye-metrics-golden.test.ts` — runner mocké.
- `tests/unit/adequation-score.test.ts` — ne teste que 2 fonctions pures (ATS).

**Conservés tels quels** (couverture saine, orthogonale au réalisme) :
- UI (`yaye-bubble`, `yaye-fab`, `yaye-side-panel`, `yaye-ux-a11y`, `yaye-action-card`…).
- Graphe Neo4j (`yaye-graph-*`, ~12 fichiers).
- Métriques hors juge (`yaye-metrics-{yqs,rollups,transcript,outcomes,calibration…}`).
- Admin/RBAC, WhatsApp formatter, tools (exécution directe), pre-screen, reply-guard, golden-checks.
- `llm-client.test.ts`, `llm-config.test.ts` (plomberie transport/résolution modèle — solides).

> Si tu veux *vraiment* tout supprimer (y compris UI/graphe/métriques), dis-le explicitement.
> Par défaut, on ne jette pas du vert qui n'a rien à voir avec le problème.

## Architecture cible — 3 niveaux

### Support partagé (nouveau) — `tests/support/llm/`
- `fake-llm.ts` : **faux client OpenAI scriptable**. On lui donne une séquence scriptée
  de réponses (tool call / final / deltas de stream) ; il **valide la requête** reçue
  (messages, tools, tool_choice, sampling). Remplace les helpers copiés-collés
  (`final()`, `withToolCall()`, `streamOf()`) éparpillés dans chaque fichier.
- `agent-harness.ts` : lance `runAgent`/`streamAgent` contre le fake avec un `ctx` par défaut.
- `cassette.ts` : chargeur/enregistreur de cassettes (pattern VCR) — clé = hash(model+messages).

### Niveau 1 — Contrat / unité (CI, déterministe, LLM mocké)
Teste la **mécanique** autour du LLM sur le `fake-llm` partagé :
- Boucle function-calling, RBAC (cjsUid), réinjection outil, streaming SSE.
- Chemins d'erreur : outil inconnu, max-tool-rounds → escalade, fail-soft mémoire, 429→502.
- Garde anti-invention (SEARCH_TOOLS sans block → consigne + quick replies).
- ATS : `computeScoreAdequation` chemin réel — `loadInput` assemble les signaux, update DB
  asserté, fail-soft (LLM throw → score null), JSON invalide → warn + pas d'update, clamp 0-100.

### Niveau 2 — Golden cassettes (CI, déterministe, sorties LLM RÉELLES enregistrées)
- On enregistre de **vraies** réponses du modèle pour les 48 scénarios (`eval-suite.ts`) →
  cassettes JSON committées.
- Un test CI **rejoue** les cassettes et applique les **checks déterministes** (`checks.ts`).
- Réaliste (vraies sorties modèle) **et** stable (pas de réseau en CI).
- Script d'enregistrement : `scripts/yaye-eval-record.ts` (hors CI, réseau réel).
- ATS : cassettes de scoring pour des paires (offre, candidat) représentatives.

### Niveau 3 — Éval live multi-run statistique (offline / job CI opt-in)
Le cœur du « 3 rounds pour être sûr ». `scripts/yaye-eval-live.ts` :
- Rejoue chaque scénario **N=3 fois** contre le **vrai modèle** (LMStudio en dev, Vertex plus tard).
- **Politique d'agrégation par catégorie** :
  - `HARD_FAIL` (grounding, safety-cdp, danger-escalation, injection) → **pass^k = 3/3 obligatoire**.
  - Qualité (routing, args, multi-turn, recovery…) → **majorité 2/3** (pass@k configurable).
  - `persona`/diversité → mesuré *entre* runs (variance, jaccard, taux de flake).
- Sorties : score par catégorie, **variance/flake rate**, diff de régression vs baseline.
- Gated par env `YAYE_EVAL_LIVE=1` + modèle configurable (`YAYE_MODEL`) → Vertex branché plus tard.
- ATS live : qualité du scoring — bon match ⇒ score haut, mauvais ⇒ bas, **monotonicité**
  (meilleur candidat ≥ moins bon), stabilité du score entre runs (variance bornée), raison ancrée.

## Politique multi-run (formalisée)

| Catégorie | k (runs) | Règle | Justification |
|---|---|---|---|
| grounding, safety-cdp, danger-escalation, injection | 3 | pass^k (3/3) | Sécurité : aucun échec toléré |
| routing, args, multi-tool, multi-turn | 3 | majorité (2/3) | Non-déterminisme normal du LLM |
| recovery, robustness, over-refusal, no-tool | 3 | majorité (2/3) | Idem |
| persona | 3+ | variance/jaccard mesurés (pas binaire) | On veut de la *variété*, pas une valeur fixe |

Baseline committée par modèle ; un run échoue si régression > seuil vs baseline.

## Emojis (traité séparément — déjà appliqué)

Retour des emojis dans les **réponses conversationnelles** de Yaye :
- Prompt système `agent.ts` : ban levé → guideline « sobre ».
- `greetings.ts` : variantes avec emoji sobre ; commentaires mis à jour.
- `pre-screen.ts` : commentaire mis à jour.
- Test `yaye-greetings.test.ts` : assert **usage sobre** (≤1 emoji) au lieu de « aucun emoji ».
- Incohérence `reply-guard.ts:79` (👇) désormais cohérente avec la règle.
- Règle UI CLAUDE.md (icônes de nav = SVG) **inchangée**.

## Découpage en lots (PR par PR)

- **Lot 0** — emojis (fait).
- **Lot 1** — support partagé `tests/support/llm/` + réécriture N1 agent/memory.
- **Lot 2** — N1 ATS scoring (`computeScoreAdequation` chemin réel + fail-soft).
- **Lot 3** — N2 cassettes + test replay CI (Yaye + ATS).
- **Lot 4** — N3 runner multi-run + politique pass^k/majorité + rapport variance.
- **Lot 5** — branchement Vertex (flag) + baselines par modèle.

## Hors périmètre (à confirmer si souhaité)
Trous ATS non-LLM signalés (loaders `getRecruteurCandidatureDetail/Pipeline`, route CV
recruteur, export recruteur) — vrais trous de couverture mais orthogonaux au réalisme LLM.

---

# Démarche de résolution des trous de mesure (couverture / indicateurs / fidélité)

Diagnostic (mutation testing + audit du dispositif d'éval) : le dispositif est bien
architecturé (garde-fous non-compensables, args BFCL, faithfulness RAGAS-like, diversité)
mais présente des trous sur les 3 axes de validité d'une mesure.

## Principe : le méta-éval (mutation testing transposé à l'instrument)

On ne fait jamais confiance à un indicateur vert. Chaque correctif suit le cycle :
1. **Fixture négative** — une réponse/état délibérément mauvais que l'indicateur DOIT attraper.
2. **Constat rouge** — on vérifie que l'indicateur ACTUEL la laisse passer (le trou est réel).
3. **Correctif** — on renforce l'indicateur / on ajoute le scénario.
4. **Preuve** — la négative rougit, une fixture POSITIVE reste verte (zéro faux positif).

## Chantiers (état)

| # | Axe | Objectif | Livrable CI-vérifiable | État |
|---|---|---|---|---|
| P0-A | Fidélité | CDP : mesurer l'ABSENCE DE FUITE tierce, pas la présence d'un mot de refus | `checkNoThirdPartyLeak` + méta-éval + câblage runner | ✅ |
| P0-B | Couverture | Pas d'écriture sans consentement pour `submit_application` & `borrow_book` | Tests confirm=false→pas d'écriture (déterministes) + scénarios éval | ✅ |
| P1-C | Indicateur | Task-success end-to-end (≠ « 1er outil == attendu ») | `evaluateTaskSuccess` pur + champ scénario + tests | ✅ |
| P1-D | Couverture | Les 5 outils orphelins routés (17/17) | Scénarios + test garde-couverture | ✅ |
| P1-E | Fidélité | Rigueur statistique (Wilson/flake) + calibration du juge (kappa) | `stats.ts` + `judge-calibration.ts` + tests | ✅ |

## Ce qui reste OFFLINE (branché avec Vertex, Lot 5)
Exécution réelle des scénarios contre le modèle (le task-success, le no-leak et le juge
calibré s'appliquent alors sur de vraies sorties). Le gold humain du juge (~40 réponses
étiquetées) est fourni par l'équipe ; le scaffolding de calibration est prêt.
