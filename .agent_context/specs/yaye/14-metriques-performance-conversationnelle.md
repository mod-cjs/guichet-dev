# 14 — Métriques de performance conversationnelle (Yaye Quality Score)

> **Statut** : spec en validation · **JIRA** : `GUIC-<n>` (à créer) · **Module** : m12-ia
> **But** : noter, de façon objective et reproductible, la qualité conversationnelle de Yaye à partir des bases enrichies existantes, sans toucher aux services existants (on **ajoute**, on ne modifie pas).

## 0. Philosophie

Aucune métrique unique ne « note » un agent conversationnel. On mesure **5 couches**, de la plus mécanique à la plus qualitative, puis on les agrège en un score unique — le **Yaye Quality Score (YQS, 0-100)** — décliné par canal / intention / centre / cohorte / semaine, avec courbe de tendance et **détection de régression**.

Principe directeur : **les garde-fous ne se compensent pas**. Une fidélité (anti-hallucination) sous le seuil déclenche une alerte rouge quelle que soit la note globale — on ne rachète jamais une hallucination par de la vitesse ou un bon ton.

L'essentiel s'appuie sur l'existant : tout passe déjà par [`agent.ts`](../../../src/lib/ia/agent.ts) et est tracé événement par événement dans `AgentLog`. Les couches 3 et 5 ajoutent des modèles dédiés, sans modifier l'existant.

## 1. Les 5 couches de mesure

### Couche 1 — Opérationnel *(source : `agent_logs`, agrégation seule)*

| Métrique | Définition | Source |
|----------|-----------|--------|
| Latence E2E | P50/P95 entre `message_recu` et `contenu_transmis` d'un même `session_id` | `tsMs` |
| Taux succès outil | `api_appelee` statut=`succes` / total `api_appelee` | `statut` |
| Taux d'erreur moteur | événements `erreur` / sessions | `typeEvenement` |
| Profondeur de boucle | distribution des tool-rounds par tour ; proche de `maxToolRounds=4` = « Yaye patine » | comptage `intention_detectee`/tour |
| Taux de requête sèche | `graph_interroge` avec `nodesReturned` vide / total | `nodesReturned` |

### Couche 2 — Efficacité conversationnelle *(source : `agent_logs`, dérivation)*

| Métrique | Définition |
|----------|-----------|
| Tours-jusqu'à-résolution | nb `message_recu` par `session_id` |
| Taux de confinement | sessions **sans** `escalade_conseiller` / total |
| Taux d'escalade | sessions avec `escalade_conseiller` / total |
| Taux de reformulation | l'utilisateur réécrit ~le même message au tour suivant (similarité textuelle) → signal d'incompréhension |
| Taux d'abandon | session ouverte sans `contenu_transmis` utile, ou dernier tour user sans retour |
| Précision d'intention | bon outil appelé vs attendu — mesuré contre le **golden set** (couche E) |

### Couche 3 — Qualité conversationnelle *(LLM-as-judge → `yaye_eval_scores`)*

Non mesurable en SQL. Un **juge LLM Groq `llama-3.3-70b-versatile`** (même modèle que Yaye, décision validée) note chaque tour/conversation sur une grille structurée (JSON schema → scores 0-1). Dimensions calquées sur le `SYSTEM_PROMPT` de [`agent.ts`](../../../src/lib/ia/agent.ts) :

| Dimension | Ce qu'on vérifie | Garde-fou |
|-----------|------------------|-----------|
| **Fidélité / groundedness** | La réponse ne s'appuie QUE sur le `payload` des outils du tour (règle « jamais d'invention ») | **CRITIQUE** : sous seuil ⇒ alerte rouge |
| Pertinence | La réponse répond à l'intention réelle de l'utilisateur | — |
| Utilité | La réponse fait avancer : action concrète, lien, prochaine étape | — |
| Persona & concision | Ton chaleureux · 1-2 phrases · **pas de répétition des cards en prose** | — |
| Conformité CDP | Pas d'agrégats interdits (« X profils ont postulé ») · pas de PII tierce · escalade correcte sur sujet sensible | **CRITIQUE** |
| Adéquation linguistique | FR / Wolof selon l'utilisateur | — |

> ⚠️ **Biais d'auto-complaisance** : Yaye et le juge partagent le modèle. Mitigation : (a) prompt de juge **adversarial** (« cherche activement une faute, défaut = note basse si doute »), (b) calibration périodique contre un échantillon noté humainement, (c) ne jamais utiliser le YQS comme seule porte de déploiement — le golden set (E) reste la garde déterministe.

### Couche 4 — Résultat métier *(jointure `agent_logs` ↔ tables métier)*

Le vrai test : la conversation a-t-elle produit un résultat ?

| Métrique | Jointure |
|----------|----------|
| Conversion reco→candidature | `RecommandationIA.vuePar` → `Candidature` sous X jours |
| Complétion d'action — candidature | `submit_application` (confirm=true) → `Candidature` réelle |
| Complétion d'action — réservation | `reserve_resource` (confirm=true) → `Reservation` effective |
| Taux d'aboutissement de tâche | par type d'intention, objectif atteint dans la session |
| Time-to-action | délai entre suggestion Yaye et action métier |

### Couche 5 — Satisfaction *(nouvelle capture → `yaye_feedback`)*

| Métrique | Source |
|----------|--------|
| CSAT | % pouces 👍 / total feedback explicites |
| Feedback qualitatif | raison optionnelle attachée au pouce 👎 |
| Bascule WA→web | déjà détectable (friction / limite canal) |
| Clics sur blocs | taux de clic cards / quick-replies (signal implicite) |
| Réouverture de session | même `cjs_uid` rouvre < X min après clôture |

## 2. La note composite — Yaye Quality Score (YQS)

`YQS = Σ (poids_couche × score_normalisé_couche)`, sur 0-100, **après application des garde-fous** :

```
si fidélité < SEUIL_FIDELITE   → YQS plafonné + drapeau rouge
si conformité_CDP < SEUIL_CDP  → YQS plafonné + drapeau rouge
```

Pondérations initiales (à calibrer) : Qualité (C3) 35 % · Résultat (C4) 25 % · Efficacité (C2) 20 % · Satisfaction (C5) 15 % · Opérationnel (C1) 5 %.

Déclinaisons : **canal**, **intention**, **centre**, **cohorte**, **semaine**. Sorties : valeur courante + tendance + **alerte de régression** (chute du YQS > Δ après un changement de prompt/outil détecté via un marqueur de version).

## 3. Modèle de données (3 nouveaux modèles Prisma — aucune modif de l'existant)

```prisma
// Feedback explicite par message/session (couche 5)
model YayeFeedback {
  id         String   @id @default(uuid())
  sessionId  String   @map("session_id")
  cjsUid     String?  @map("cjs_uid")
  canal      CanalAgent
  tourIndex  Int?     @map("tour_index")          // tour visé dans la session
  note       Int                                  // +1 / -1
  raison     String?  @db.Text                    // optionnel (PII → droit à l'oubli)
  createdAt  DateTime @default(now())
  @@index([sessionId])
  @@index([cjsUid, createdAt])
  @@map("yaye_feedback")
}

// Scores du juge LLM + dimensions (couche 3)
model YayeEvalScore {
  id            String   @id @default(uuid())
  sessionId     String   @map("session_id")
  tourIndex     Int?     @map("tour_index")        // null = score conversation entière
  juge          String   @db.VarChar(60)           // modèle juge + version rubric
  fidelite      Float                              // 0-1
  pertinence    Float
  utilite       Float
  persona       Float
  conformiteCdp Float    @map("conformite_cdp")
  langue        Float
  drapeauRouge  Boolean  @default(false) @map("drapeau_rouge")
  commentaire   String?  @db.Text                  // justification courte du juge
  createdAt     DateTime @default(now())
  @@index([sessionId])
  @@index([createdAt])
  @@map("yaye_eval_scores")
}

// Rollup par session : 1 ligne / conversation (couches 1-2-4-5 agrégées)
model YayeSessionSummary {
  id              String   @id @default(uuid())
  sessionId       String   @unique @map("session_id")
  cjsUid          String?  @map("cjs_uid")
  canal           CanalAgent
  nbTours         Int      @map("nb_tours")
  dureeMs         Int      @map("duree_ms")
  escalade        Boolean  @default(false)
  resolu          Boolean  @default(false)
  converti        Boolean  @default(false)         // a produit une action métier
  yqs             Float?                            // score composite calculé
  intentionPrinc  String?  @map("intention_princ") @db.VarChar(60)
  calculeLe       DateTime @default(now()) @map("calcule_le")
  @@index([canal, calculeLe])
  @@index([intentionPrinc])
  @@map("yaye_session_summaries")
}
```

## 4. Composants techniques

1. **Reconstructeur de transcript** (`src/lib/ia/metrics/transcript.ts`) : assemble une conversation complète depuis `agent_logs` (par `session_id`) + `MessageWhatsApp`. Sert au juge ET au drill-down admin. Soumis au droit à l'oubli (cascade `cjs_uid`).
2. **Service de rollups** (`src/lib/ia/metrics/rollups.ts`) : agrège `agent_logs` en KPI matérialisés (couches 1-2-4) dans `YayeSessionSummary` — évite de scanner `agent_logs` en live pour le dashboard.
3. **Pipeline d'éval offline** (`src/app/api/cron/yaye-eval/route.ts`) : cron nocturne **après** `yaye-graph-sync` (qui tourne à 02:30 → planifier `yaye-eval` à 03:00+ dans `vercel.json`). **Auth identique aux crons existants** : `Authorization: Bearer ${CRON_SECRET}` (mirroir de `yaye-graph-sync`). Échantillonnage **stratifié** : 100 % des sessions escaladées/en erreur + échantillon aléatoire du reste. Reconstruit les transcripts, appelle le juge Groq (rubric → JSON schema), écrit `YayeEvalScore`, puis recalcule le YQS dans `YayeSessionSummary`.
4. **Capture feedback UI** : pouce 👍/👎 sur chaque bulle assistant (web, dans [`YayeBlocks.tsx`](../../../src/components/yaye/YayeBlocks.tsx)) → `POST /api/ia/feedback` ; sur WhatsApp, quick-reply 👍/👎.
5. **Harnais de régression / golden set** (`src/lib/ia/metrics/golden/`) : jeu de conversations-types versionnées + intentions attendues, rejouées en CI/offline → précision d'intention + détection de régression AVANT déploiement. C'est la garde déterministe, non sujette au biais du juge.
6. **Dashboard admin** (`/admin/analytics/yaye`, conforme à la convention existante `src/app/admin/analytics/`) : KPI des 5 couches + YQS + tendances + drill-down conversation, filtres canal/intention/centre. Composants `src/components/ui/` existants uniquement.
7. **Capture durable du transcript web** (`src/lib/ia/metrics/transcript-store.ts`, modèle `YayeTranscriptTurn`) — **option A retenue (2026-06-22)**. Sans elle, le web ne stocke que des longueurs (texte transitoire Redis 30 min) → les conversations web sont **injugeables** par le juge (constat sur la base test : 19 sessions web, 0 jugeable). `recordWebTurn` persiste le texte **pseudonymisé** des tours web, branché dans `POST /api/ia` (fail-soft), **gardé par le flag d'env `YAYE_PERSIST_WEB_TRANSCRIPT` (défaut OFF)**. Le reconstructeur lit ce texte → web devient jugeable. ⚠️ C'est la **seule modification d'un flux existant** du périmètre (le reste est additif) ; à activer après validation CDP/PO.

## 5. Conformité CDP (transversal)

- Scores agrégés et anonymisables ; `payload`/`raison`/transcripts purgés au droit à l'oubli (cascade `cjs_uid`).
- Juge LLM : minimisation + **pseudonymisation** du transcript avant envoi ; pas d'exfiltration de PII tierce.
- Le juge vérifie lui-même l'absence d'agrégats interdits dans les réponses de Yaye (dimension Conformité CDP).
- Aucune métrique ne réintroduit un agrégat interdit (« X profils ont postulé ») dans une surface utilisateur.

## 6. Découpage (livré en un lot, sous-jalons internes)

| Sous-jalon | Contenu | Capture nouvelle ? |
|-----------|---------|--------------------|
| A — Socle | Reconstructeur transcript + rollups `agent_logs` + dashboard couches 1-2 | non |
| B — Feedback | `YayeFeedback` + UI pouce web/WA + CSAT (couche 5) | oui |
| C — Juge | `YayeEvalScore` + cron `yaye-eval` + rubric (couche 3) | oui |
| D — Résultat | jointures métier + conversion (couche 4) | non |
| E — Golden set | harnais reproductible + précision d'intention + détection régression | non |
| F — YQS | composite + garde-fous + alertes de régression dans le dashboard | non |

## 7. Invariants

1. **On ajoute, on ne modifie pas** : 3 nouveaux modèles, aucun changement aux modèles/services existants (`AgentLog`, `tools.ts`, endpoints métier).
2. **Fail-soft** : une erreur de mesure (juge, rollup, feedback) n'interrompt jamais une conversation Yaye.
3. **Garde-fous non compensables** : fidélité et conformité CDP plafonnent le YQS indépendamment du reste.
4. **Le golden set reste la garde de déploiement** : le YQS informe, il ne décide pas seul (biais juge=modèle).
5. **CDP par conception** : pseudonymisation avant juge, purge au droit à l'oubli, pas de réintroduction d'agrégats interdits.
