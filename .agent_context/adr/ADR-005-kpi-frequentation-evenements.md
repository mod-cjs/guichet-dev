# ADR-005 — KPI fréquentation centres : event-sourcing léger `CentreEvent`

**Date** : 2026-06-14
**Statut** : Accepté (verrouille spec M4-centres-lot7.md §3.4 + Wave 6.3 / GUIC-388)
**Décideurs** : PO + lead orchestrateur + DPO CJS
**Liens** : GUIC-350 (EPIC analytics), GUIC-351 (helper), GUIC-388 (dashboard admin)

---

## Contexte

La mesure de la **fréquentation des centres** est le KPI #1 du Lot 7
(déclaration PO « TRÈS IMPORTANT », spec §3.4). L'admin Guichet doit pouvoir
répondre à :

- Combien de jeunes physiquement présents par centre / par jour / par mois ?
- Quelles ressources les plus réservées ?
- Funnel : `centre_viewed → reservation_started → submitted → checkin_completed` ?
- Taux d'annulation, taux de no-show, par centre + par type de ressource ?
- Tendances saisonnières, comparaison inter-centres.

Contraintes :

1. **Conformité CDP Sénégal** : pas de tracker tiers (Google Analytics, Meta
   Pixel, Mixpanel cloud, Segment) — l'hébergement DOIT être local + souverain.
2. **Budget MVP** : pas de licence SaaS récurrente.
3. **Volumétrie cible** : 22 000 utilisateurs × ~5 events / session × ~3 sessions /
   mois ≈ **330 000 events / mois** au pic. Réaliste MariaDB single-instance.
4. **Rétention** : 6 mois glissants suffisent (analytics opérationnel + sprint
   reporting trimestriel). Au-delà, agrégats mensuels pré-calculés.
5. **Auditabilité** : KPI cités au reporting bailleur YEAH → traçabilité INSERT-only.

## Décision

**Table dédiée `CentreEvent` INSERT-only — pattern event-sourcing léger
side-by-side avec le modèle transactionnel.**

### Modèle Prisma

```prisma
model CentreEvent {
  id        String   @id @default(uuid()) @db.VarChar(36)
  type      String   @db.VarChar(64)        // whitelist côté code
  centreId  String?  @map("centre_id") @db.VarChar(36)
  cjsUid    String?  @map("cjs_uid")   @db.VarChar(64)
  metadata  Json?                            // ≤ 2 KB
  createdAt DateTime @default(now()) @map("created_at")

  @@index([type, createdAt])
  @@index([centreId, createdAt])
  @@index([centreId, type, createdAt])
  @@map("centre_events")
}
```

- **INSERT-only** : aucune mise à jour ni suppression applicative. Cleanup =
  job cron `cleanup-centre-events` (rétention 6 mois).
- **`cjsUid` nullable** : un `centre_viewed` peut être anonyme (visiteur non
  connecté).
- **`metadata` ≤ 2 KB** : exception `CentreEventMetadataTooLarge` côté helper.

### Whitelist d'événements (source de vérité)

Définie dans `src/lib/analytics/centre-events.ts` (`CENTRE_EVENT_TYPES`).
Regroupements :

- **Navigation / découverte** : `centres_index_viewed`, `centre_viewed`,
  `centre_map_pin_clicked`, `centre_filter_applied`.
- **Carte CJS** : `cjs_card_opened`, `cjs_card_qr_displayed`,
  `cjs_card_wallet_added`, `cjs_card_shared`.
- **Ressources / réservations** : `centre_resource_viewed`,
  `centre_resource_filter`, `centre_reservation_started`,
  `centre_reservation_submitted`, `centre_reservation_validation_error`,
  `centre_reservation_cancelled`, `centre_reservation_cancelled_by_staff`
  (GUIC-395), `centre_reservation_accepted`, `centre_reservation_refused`,
  `centre_my_reservations_viewed`, `centre_my_card_viewed`.
- **KPI fréquentation physique (principal)** : `centre_checkin`,
  `centre_checkin_completed`, `centre_checkout`, `centre_resource_picked_up`,
  `centre_no_show`.
- **Routing / contact** : `centre_itinerary_opened`, `centre_phone_clicked`,
  `centre_email_clicked`.
- **Coordination M5-agenda** : `centre_appointment_started`.
- **Dashboard admin (Wave 6.3 / GUIC-388)** : `admin_analytics_centres_viewed`,
  `admin_analytics_centres_csv_exported`.

### Pipeline d'écriture

1. **Côté serveur (server components / route handlers)** : appel direct
   `trackCentreEvent({ type, centreId, cjsUid, metadata })`. **Fail-soft** : si
   Prisma throw, on log + on continue (jamais bloquer le user flow).
2. **Côté client (Web)** : POST `/api/v1/track` avec :
   - Validation Zod stricte (`CentreEventInputSchema`).
   - Rate-limit Redis (60 req / min / IP, 200 / min / cjsUid authentifié).
   - Pas d'authentification requise (events anonymes admis).
   - Réponse `204 No Content` systématique pour minimiser exfiltration.
3. **Anti-flood** : metadata > 2 KB → 413 côté API publique, throw côté helper
   serveur.

### Pipeline de lecture

- `getCentresAnalytics({ from, to, centreId? })` dans `src/lib/centres/analytics.ts`
  → agrégations Prisma `groupBy` (type, centreId, jour).
- **Pas de OLAP / cube** : MVP via vues SQL matérialisées si dégradation
  perf au-delà de 1M events.
- Endpoint `GET /api/admin/analytics/centres` (admin Guichet uniquement, RBAC
  SSO) → JSON pour dashboard + CSV streaming pour export.

### Rétention & RGPD/CDP

- **TTL 6 mois** : cron quotidien `scripts/jobs/cleanup-centre-events.ts`
  → `DELETE FROM centre_events WHERE created_at < NOW() - INTERVAL 6 MONTH`.
- **Anonymisation post-suppression compte** : sur webhook SSO `user.deleted`,
  `UPDATE centre_events SET cjs_uid = NULL WHERE cjs_uid = ?`.
- **Droit d'accès (CDP art. 51)** : endpoint `GET /api/v1/me/events` listant
  les events portant son `cjsUid`.
- **Droit à l'effacement** : exécuté immédiatement (UPDATE NULL) à la demande.

## Alternatives évaluées

| Option | Pour | Contre | Retenu ? |
|---|---|---|---|
| **Google Analytics 4** | Gratuit, riche | Non-conforme CDP (transfert US), vie privée, fingerprinting | Non |
| **Meta Pixel** | Gratuit | Idem GA4, surveillance commerciale | Non |
| **Segment** | Pipeline propre | $120+/mois MVP, vendor lock-in connectors | Non — coût |
| **PostHog Cloud** | OSS-friendly, funnels prêts | Vendor cloud EU/US, lock-in dashboards | Non — souveraineté |
| **PostHog self-hosted** | Souverain, OSS | Stack ClickHouse + Kafka, ops lourdes, surdimensionné MVP | Non — overkill |
| **Plausible self-hosted** | Léger, RGPD-friendly | Orienté pageviews seul, pas de schéma event custom riche, pas de jointure modèle métier | Non — trop limité |
| **Matomo self-hosted** | RGPD-friendly | Stack PHP+MySQL séparée, jointures cross-systèmes coûteuses | Non — friction architecturale |
| **Table dédiée `CentreEvent` Prisma** | 0 coût licence, souverain, jointures triviales avec `Centre`/`Utilisateur`, contrôle total schéma, conforme CDP | À nous d'implémenter cleanup, dashboard, exports | **Oui** |

## Conséquences

### Positives

- **Conformité CDP totale** : aucune donnée ne quitte l'infra Guichet.
- **Autonomie analytics** : on peut ajouter un event type en 1 ligne (whitelist)
  + créer un dashboard en 1 jour (Prisma `groupBy`).
- **Jointures riches** : un `centre_checkin` peut se croiser avec
  `Reservation`, `RessourceCentre`, `Centre`, `Utilisateur` sans ETL.
- **Auditabilité INSERT-only** : impossible d'altérer historiquement les KPI
  reportés au bailleur YEAH.
- **Coût marginal** : ~10 GB MariaDB / an au pic estimé → négligeable.

### Négatives / Dette assumée

- **Pas de funnel UI prêt** : à coder (vs Mixpanel). Mitigation : 2-3 vues SQL
  matérialisées couvrent 90 % des questions.
- **Pas de session-stitching** : un event anonyme puis authentifié restent
  séparés. Mitigation : `session_id` côté client (Sprint+2) reliant les events.
- **Volumétrie à surveiller** : seuil d'alerte 1M events / mois → migration
  partitioning par mois si dépassé.
- **Pas de A/B testing intégré** : si besoin futur, ajouter table
  `experiment_assignments` séparée.

### Risques résiduels

- Si `trackCentreEvent` devient bloquant (oubli `void`), latence ajoutée sur la
  route appelante. Mitigation : revue PR + lint custom Sprint+1.
- Si la whitelist diverge entre client (POST `/api/v1/track`) et serveur :
  events rejetés silencieusement. Mitigation : tests d'intégration validant
  chaque type whitelisté.

## Métriques de succès

- Latence p95 `trackCentreEvent` < 20ms.
- Taux d'erreurs `/api/v1/track` < 0.1%.
- Volume events réel ≤ 500k/mois (= 50% de la marge).
- Dashboard admin chargé en < 2s pour fenêtre 30 jours.

## Liens

- Spec : `.agent_context/specs/M4-centres-lot7.md` (§3.4)
- Code : `src/lib/analytics/centre-events.ts`, `src/lib/centres/analytics.ts`
- Tickets : GUIC-350 (EPIC), GUIC-351 (helper), GUIC-388 (dashboard admin),
  GUIC-395 (event `centre_reservation_cancelled_by_staff`)
- Cleanup : `scripts/jobs/cleanup-centre-events.ts`
