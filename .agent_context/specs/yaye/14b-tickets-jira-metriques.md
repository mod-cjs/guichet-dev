# Tickets JIRA — Métriques de performance conversationnelle Yaye (YQS)

> À créer dans le projet **GUIC**. Spec de référence : [`14-metriques-performance-conversationnelle.md`](./14-metriques-performance-conversationnelle.md).
> Structure : 1 Story chapeau + 6 sous-tickets (jalons A→F). Remplacer `GUIC-<n>` par les numéros réels après création.

---

## STORY CHAPEAU

**Titre** : `Métriques de performance conversationnelle de Yaye (Yaye Quality Score)`
**Type** : Story · **Module** : m12-ia · **Composant** : Yaye · **Labels** : yaye, m12-ia, metrics, observabilite

**Description** :
> Mettre en place un système de mesure objectif et reproductible de la qualité conversationnelle de Yaye, à partir des bases enrichies existantes (`agent_logs`, transcripts WhatsApp, tables métier), **sans modifier les services existants** (on ajoute, on ne touche pas à l'agent ni aux endpoints métier).
>
> On mesure 5 couches — opérationnel, efficacité conversationnelle, qualité (juge LLM Groq llama-3.3-70b), résultat métier, satisfaction utilisateur — agrégées en un score composite unique, le **Yaye Quality Score (YQS, 0-100)**, décliné par canal / intention / centre / cohorte / semaine, avec tendance et détection de régression.
>
> **Garde-fous non compensables** : une fidélité (anti-hallucination) ou une conformité CDP sous le seuil plafonne le YQS et lève une alerte rouge, quelle que soit la note globale.
>
> Spec : `.agent_context/specs/yaye/14-metriques-performance-conversationnelle.md`

**Critères d'acceptation (niveau Story)** :
- [ ] YQS calculé et visible par canal/intention/centre/semaine avec courbe de tendance
- [ ] Garde-fous fidélité + conformité CDP fonctionnels (plafonnement + alerte rouge)
- [ ] Feedback 👍/👎 capturé sur web ET WhatsApp
- [ ] Pipeline d'éval nocturne opérationnel (échantillonnage stratifié + juge LLM)
- [ ] Golden set rejouable détectant les régressions avant déploiement
- [ ] Conformité CDP : purge au droit à l'oubli (cascade `cjs_uid`) sur transcripts/scores/feedback
- [ ] Aucune modification des modèles/services existants (`AgentLog`, `tools.ts`, endpoints métier)

**Sous-tickets** : A (socle) · B (feedback) · C (juge) · D (résultat) · E (golden set) · F (YQS composite)

---

## SOUS-TICKET A — Socle de mesure (rollups + transcript + dashboard couches 1-2)

**Titre** : `[Yaye Metrics] Socle : reconstructeur transcript + rollups agent_logs + dashboard couches 1-2`
**Type** : Sous-tâche · **Parent** : Story chapeau

**Description** :
> Fondations exploitant `agent_logs` tel quel, **zéro nouvelle capture, zéro risque**.
> - Reconstructeur de transcript (`src/lib/ia/metrics/transcript.ts`) : assemble une conversation complète par `session_id` depuis `agent_logs` + `MessageWhatsApp`. Soumis au droit à l'oubli.
> - Service de rollups (`src/lib/ia/metrics/rollups.ts`) : agrège `agent_logs` en KPI matérialisés (latence E2E P50/P95, taux succès outil, taux d'erreur, profondeur de boucle, taux de requête sèche, tours-jusqu'à-résolution, taux de confinement/escalade, reformulation, abandon).
> - Dashboard admin `/admin/analytics/yaye` (conforme à la convention existante `src/app/admin/analytics/`, couches 1-2) avec filtres canal/intention/centre, composants `src/components/ui/` uniquement.

**Critères d'acceptation** :
- [ ] Transcript reconstructible pour n'importe quel `session_id` (web + WhatsApp)
- [ ] KPI couches 1-2 calculés et affichés, filtrables canal/intention/centre/période
- [ ] Aucune écriture nouvelle dans agent_logs ni modif de l'agent
- [ ] Rollups matérialisés (pas de scan live d'agent_logs pour le dashboard)

**Dépendances** : aucune.

---

## SOUS-TICKET B — Feedback utilisateur (couche 5)

**Titre** : `[Yaye Metrics] Feedback explicite 👍/👎 web + WhatsApp + CSAT`
**Type** : Sous-tâche · **Parent** : Story chapeau

**Description** :
> Capture de la satisfaction utilisateur.
> - Modèle Prisma `YayeFeedback` (sessionId, cjsUid?, canal, tourIndex?, note ±1, raison? PII, createdAt). Migration.
> - UI pouce 👍/👎 sur chaque bulle assistant côté web (dans `src/components/yaye/YayeBlocks.tsx`) → `POST /api/ia/feedback`.
> - WhatsApp : quick-reply 👍/👎 → même endpoint.
> - Métriques : CSAT (% 👍), feedback qualitatif (raison sur 👎), clics sur blocs, bascule WA→web, réouverture de session.

**Critères d'acceptation** :
- [ ] `YayeFeedback` migré, indexé (sessionId ; cjsUid+createdAt)
- [ ] Pouce fonctionnel web + WhatsApp, fail-soft (n'interrompt jamais la conversation)
- [ ] CSAT affiché au dashboard
- [ ] `raison` purgée au droit à l'oubli (cascade `cjs_uid`)

**Dépendances** : A (dashboard).

---

## SOUS-TICKET C — Juge LLM (couche 3 qualité)

**Titre** : `[Yaye Metrics] Pipeline d'éval offline + juge LLM Groq (qualité conversationnelle)`
**Type** : Sous-tâche · **Parent** : Story chapeau

**Description** :
> Notation qualitative par juge LLM Groq `llama-3.3-70b-versatile` (même modèle que Yaye).
> - Modèle Prisma `YayeEvalScore` (sessionId, tourIndex?, juge+version rubric, fidelite, pertinence, utilite, persona, conformiteCdp, langue, drapeauRouge, commentaire). Migration.
> - Cron `src/app/api/cron/yaye-eval/route.ts`, nocturne **après** `yaye-graph-sync` (02:30 → planifier à 03:00+ dans `vercel.json`). **Auth `Authorization: Bearer ${CRON_SECRET}`** (mirroir de `yaye-graph-sync`). Échantillonnage **stratifié** : 100 % des sessions escaladées/en erreur + échantillon aléatoire du reste.
> - Rubric structurée (JSON schema) appliquée au transcript reconstruit (jalon A). Prompt de juge **adversarial** (cherche activement une faute ; doute ⇒ note basse).
> - Pseudonymisation du transcript avant envoi au juge.

**Critères d'acceptation** :
- [ ] `YayeEvalScore` migré, indexé
- [ ] Cron protégé par `Authorization: Bearer ${CRON_SECRET}` (comme `yaye-graph-sync`) ; planifié dans `vercel.json` à 03:00+
- [ ] Cron échantillonne, reconstruit, note et écrit les scores ; fail-soft
- [ ] 6 dimensions notées 0-1 ; `drapeauRouge` levé si fidélité OU conformité CDP < seuil
- [ ] Transcript pseudonymisé avant tout appel au juge
- [ ] Mitigation biais auto-complaisance documentée (prompt adversarial + point de calibration humaine)

**Dépendances** : A (transcript).

---

## SOUS-TICKET D — Résultat métier (couche 4)

**Titre** : `[Yaye Metrics] Conversion & complétion d'action (jointures métier)`
**Type** : Sous-tâche · **Parent** : Story chapeau

**Description** :
> Mesure de l'impact réel des conversations via jointures `agent_logs` ↔ tables métier (**lecture seule**).
> - Conversion reco→candidature : `RecommandationIA.vuePar` → `Candidature` sous X jours.
> - Complétion d'action : `submit_application` (confirm=true) → `Candidature` réelle ; `reserve_resource` (confirm=true) → `Reservation` effective.
> - Taux d'aboutissement de tâche par intention ; time-to-action.
> - Alimente le champ `converti` de `YayeSessionSummary`.

**Critères d'acceptation** :
- [ ] Conversion reco→candidature calculée et affichée
- [ ] Complétion candidature + réservation mesurée
- [ ] Time-to-action par intention disponible
- [ ] Aucune écriture dans les tables métier (lecture seule)

**Dépendances** : A (rollups/summary).

---

## SOUS-TICKET E — Golden set & détection de régression

**Titre** : `[Yaye Metrics] Golden set rejouable + précision d'intention + garde de déploiement`
**Type** : Sous-tâche · **Parent** : Story chapeau

**Description** :
> Garde déterministe, non sujette au biais du juge LLM.
> - Jeu de conversations-types versionnées + intentions attendues (`src/lib/ia/metrics/golden/`).
> - Harnais rejouable en CI/offline : précision d'intention (bon outil vs attendu) + détection de régression (chute du YQS / d'une dimension après un changement de prompt ou d'outil, via marqueur de version).
> - Sert de **garde de déploiement** : le YQS informe, le golden set décide.

**Critères d'acceptation** :
- [ ] Golden set versionné avec scénarios + intentions attendues
- [ ] Précision d'intention calculée contre le golden set
- [ ] Régression détectée et signalée avant déploiement
- [ ] Rejouable via `npm run` (intégrable CI)

**Dépendances** : C (juge), A (rollups).

---

## SOUS-TICKET F — YQS composite & alertes

**Titre** : `[Yaye Metrics] Yaye Quality Score composite + garde-fous + alertes de régression`
**Type** : Sous-tâche · **Parent** : Story chapeau

**Description** :
> Agrégation finale.
> - Modèle Prisma `YayeSessionSummary` (rollup par session : nbTours, dureeMs, escalade, resolu, converti, yqs, intentionPrinc). Migration.
> - Calcul du YQS = Σ(poids_couche × score_normalisé), **après garde-fous** (fidélité/CDP plafonnent + drapeau rouge).
> - Pondérations initiales : Qualité 35 % · Résultat 25 % · Efficacité 20 % · Satisfaction 15 % · Opérationnel 5 % (calibrables).
> - Déclinaisons canal/intention/centre/cohorte/semaine + tendance + alerte de régression au dashboard.

**Critères d'acceptation** :
- [ ] `YayeSessionSummary` migré, `sessionId` unique
- [ ] YQS calculé avec garde-fous appliqués (plafonnement + drapeau rouge)
- [ ] Déclinaisons + tendance + alerte de régression visibles au dashboard
- [ ] Pondérations centralisées et ajustables

**Dépendances** : A, B, C, D (couches alimentant le composite).

---

## Ordre de réalisation recommandé

`A → (B ∥ C ∥ D) → F → E`
A pose le socle ; B/C/D alimentent les couches en parallèle ; F agrège ; E verrouille la non-régression.
