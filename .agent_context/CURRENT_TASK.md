# CURRENT_TASK — Refonte admin (stack LOCAL, épic GUIC-679)

**Branche** `feature/GUIC-704-curation-admin` (stack empilé) · **Worktree** `admin-refonte` — **isolé** (base `guichet_admin_refonte` + node_modules propre + port 3000)
**Règle** tout reste **LOCAL** jusqu'à une PR de pivot groupée — aucun push/PR sur dev.
**État santé** dernier run complet : **603 suites / 4266 tests · tsc 0 · lint 0.**

⚠️ **Divergence** : ce stack a divergé d'`origin/dev` de **~525 commits** — dont le système de feature-flags GUIC-706 du lead (voir §Système). Toute migration réelle est à authorer **depuis origin/dev au pivot**.

---

## 1. Système Yaye — Phase 3 COMPLÉTÉE (cette session)
Clés Vertex installées (600, jamais lues/collées) + **appel live vérifié** (3 slots ~1.7 s).
- ✅ **#1 GUIC-558** health-check fournisseur LIVE (`pingProvider` + bouton « Tester la connexion » sur hub Santé de Yaye).
- ✅ **#2 GUIC-435** « intention » → « outil déclenché » (honnête : la donnée EST le nom d'outil, `agent.ts:540`).
- ✅ **#3 GUIC-537** température/max_tokens pilotables **bornés** (clamp serveur, câblé agent/juge/adéquation, UI `/admin/yaye/modele`).
- *(antérieur : hub Santé de Yaye + config LLM statique — GUIC-435 P4/P2.)*
- ⏳ Migration additive `LlmConfig` (6 colonnes temp/max_tokens) à authorer au pivot.

## 2. Écran Escalade — audité + entièrement durci (GUIC-259, cette session)
- ✅ SLA actionnable (filtre « En retard », échéance/ligne, lien hub→file filtrée).
- ✅ Traçabilité (audit non-PII), concurrence (garde optimiste → 409), **note conservée à la réouverture** + confirmation.
- ✅ Humanisation raison/danger, recherche libre, filtre dates, toast succès, tick 30 s.
- ✅ Réassignation entre opérateurs, actions groupées, aperçu conversation inline.
- Résolus par analyse : #2 scoping centre (pool volontairement non-scopé, `reminders.ts:177`), #22 rétention (`cdp-purge` couvre déjà), #20 skeleton (déjà couvert).

## 3. Découplage Partenaires/Recruteurs — LOT TERMINÉ (antérieur, en attente pivot)
2a + 2b + multi-recruteur + gate message + Q5 fusion. **171 tests verts, tsc 0.** Spec `partenaires-recruteurs-decouplage.md`.
⚠️ Commits labellisés `[GUIC-706]` par erreur → **à renuméroter au pivot** (GUIC-706 = feature-flags du lead, pas le découplage).
- ⏳ Migration réelle 2b (`MembreOrganisation` + enums) à authorer depuis origin/dev au pivot.
- ⏳ Rendu authentifié fiche partenaire (Membres + fusion) : e2e/manuel (SSO = lead).

---

## 4. Onglet Système — ANALYSE FAITE, 0 code (EN ATTENTE décisions lead)
Le lead a livré **GUIC-706** sur `origin/dev` : pas de simples flags mais un **plan de contrôle de lancement** (`src/lib/flags/**` : catalog modules + cascade `dependsOn` + `engagements.ts` + `prelaunch.ts` checklist d'ouverture + `metrics.ts` accès-refusés + écran `systeme/fonctionnalites` + RBAC `canManageFlags`, gate en `middleware.ts`).
**Challenge** : mon plan « 5 piliers » était sur-dimensionné. Cible retenue = **brancher 2 entrées d'observation manquantes** sur le cockpit du lead (source de vérité crons `CronRun` ; santé live des dépendances reliée aux flags-leviers) + ligne d'état layout + alerte push (`ALERT_WEBHOOK_URL` existe). PAS un mur de dashboards.

### Étape 0 — BLOQUANTS (décisions lead avant tout code Système)
1. **Réconciliation admin-refonte ↔ origin/dev** (525 commits divergents ; le pilotage se construit sur origin/dev, pas sur le stack).
2. **Ordonnanceur cron autoritaire en prod** : Vercel *et* `scripts/cron/generate-crontab.sh` coexistent → risque double exécution / idempotence.
3. `prelaunch.ts` : lit un journal d'exécution ou infère ? · `m14.ops` : flag basculable ou doc ? · Landing Système vs outils contextuels + ligne d'état.
4. Constat design : « Lot 13 — États Système » (maquette) = états d'UI (vide/hors-ligne/chargement), **PAS** une console ops → aucune maquette PO pour un poste de pilotage.

---

## Garde-fous
- TDD strict RED→GREEN ; commits `[GUIC-<n>]` + `Closes` ; `mod-cjs` ; zéro mention IA ; bypass hook `git -c core.hooksPath=/dev/null` (tsc global du repo).
- Tests RÉELS (DB dédiée), pas de faux-vert. `export DATABASE_URL` depuis `.env.local` pour l'intégration lancée à la main.
- Worktree isolé : `prisma generate`/`db push` SÛRS ici ; en Prisma 7 `db push` n'auto-régénère PAS le client → `prisma generate` explicite.
- Docker daemon retombe régulièrement (P1001 :3307) → `open -a Docker` + `docker start guichet_mariadb guichet_redis guichet_minio` avant l'intégration.
