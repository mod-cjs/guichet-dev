# 15 — Plan de recommandations : fiabiliser la notation de Yaye (YQS)

> Suite à la mise en place du Yaye Quality Score (GUIC-435) et à son évaluation sur 22 conversations
> test (juge Groq, 3 itérations de rubrique). Objectif : passer d'une note **plausible** à une note
> **fiable, défendable et utile pour améliorer Yaye**.

## Principes directeurs
- Le YQS est un **signal bruité** (juge LLM non déterministe), pas une vérité absolue → suivre tendance + distribution.
- Le **golden set déterministe** reste la garde de déploiement ; le juge informe, il ne décide pas.
- **Anti-Goodhart** : garder une boucle humaine ; optimiser la note ne doit jamais dégrader l'usager.
- **CDP** : minimiser la donnée (préférer stocker des scores, pas du texte).

---

## Phase 1 — Fiabiliser la note (priorité HAUTE · court terme)

### R1. Donner les résultats d'outils au juge *(impact ★★★ · effort M)*
**Problème** : le juge ne voit que le texte → il ne peut pas vérifier le *groundedness* (la fidélité a dû être contournée par la rubrique v2).
**Action** : enrichir `agent_logs` (ou le transcript) avec un **résumé des résultats d'outils** (ce que `search_opportunities` a réellement renvoyé), et le passer au juge dans `formatTranscriptForJudge` (`judge.ts`).
**Effet** : fidélité = vraie mesure d'hallucination, plus un proxy.
**CDP** : résumés d'outils = données métier (pas PII tierce) → faible risque.

### R2. Calibration humaine du juge *(impact ★★★ · effort M)*
**Problème** : sans référence humaine, le juge « note dans le vide ».
**Action** : faire doubler-noter ~50 conversations (humain + juge), mesurer l'**accord (Cohen's kappa)** par dimension, ajuster la rubrique jusqu'à kappa ≥ 0,6.
**Effet** : la note devient défendable devant le PO / la CDP.
**Livrable** : un jeu de référence `golden-labels` versionné + un rapport d'accord.

### R3. Re-notation à chaque version de rubrique *(impact ★★ · effort S)*
**Déjà amorcé** : `RUBRIC_VERSION` (v1→v3).
**Action** : à chaque changement, re-noter un set figé et comparer (détection de dérive). Brancher sur le golden set (`metrics/golden/`).

---

## Phase 2 — Robustesse & indépendance (priorité MOYENNE · moyen terme)

### R4. Juge indépendant du modèle de Yaye *(impact ★★ · effort M)*
**Problème** : llama-3.3-70b se juge lui-même → auto-complaisance.
**Action** : en **audit périodique** (pas en continu), juger avec un modèle différent (`YAYE_JUDGE_MODEL` le permet déjà) et comparer.

### R5. Jugement EN LIGNE pour le web (option B) *(impact ★★ · effort M)*
**Problème** : l'option A stocke du texte web (sensible CDP même autorisé).
**Action** : noter la réponse **pendant la requête** (le texte est déjà en mémoire), n'écrire que le score → désactiver à terme `YAYE_PERSIST_WEB_TRANSCRIPT`. Garder l'option A pour WhatsApp (texte déjà durable).
**Effet** : couche 3 web sans stocker un seul caractère de conversation.

### R6. Calibrer seuils & poids sur données réelles *(impact ★★ · effort S)*
**Problème** : seuils (0,6) et poids des couches (35/25/20/15/5) sont arbitraires.
**Action** : une fois R2 fait, ajuster pour que le YQS corrèle avec le jugement humain global. Centraliser dans `yqs.ts` (déjà le cas via env).

---

## Phase 3 — Valeur métier & gouvernance (CONTINU)

### R7. Investir la couche 4 (conversion) *(impact ★★★ · effort L)*
**Constat** : qualité 88 % mais **conversion 60 %** — la qualité conversationnelle ne garantit pas que le jeune aboutisse.
**Action** : instrumenter finement le tunnel (reco vue → candidature/réservation soumise → acceptée), segmenter par intention/centre, en faire un objectif produit. **C'est le vrai ROI de Yaye.**

### R8. Corriger le biais de non-réponse du feedback *(impact ★ · effort S)*
**Problème** : peu de 👍/👎 → CSAT biaisé.
**Action** : pondérer prudemment la couche 5 ; ne pas en faire un pilier ; éventuellement solliciter le feedback de façon ciblée (pas systématique).

### R9. Gouvernance anti-Goodhart *(impact ★★ · effort S · continu)*
**Action** : revue humaine mensuelle d'un échantillon (surtout drapeaux rouges), le golden set en garde de déploiement, et **ne jamais entraîner/optimiser Yaye directement sur le YQS** sans validation humaine.

---

## Séquencement recommandé
```
Sprint 1 : R1 (outils→juge) + R3 (re-notation versionnée)
Sprint 2 : R2 (calibration humaine) → puis R6 (seuils/poids)
Sprint 3 : R5 (jugement online web) + R4 (juge indépendant en audit)
Continu  : R7 (conversion), R8 (feedback), R9 (gouvernance)
```

## Indicateurs de succès du plan
- Accord juge↔humain (kappa) ≥ 0,6 par dimension critique (fidélité, CDP).
- YQS stable d'une exécution à l'autre sur un set figé (variance faible).
- Zéro texte de conversation web stocké (après R5).
- Conversion reco→candidature en hausse mesurable (R7).
