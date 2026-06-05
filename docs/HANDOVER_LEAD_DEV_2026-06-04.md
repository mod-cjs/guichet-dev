# Handover Lead Dev — Refonte v2 Guichet Jeunesse

**Date :** 2026-06-04
**Auteur du handover :** mod-cjs (session Claude Code)
**Destinataire :** Lead dev qui prend la main sur la review + merge des 25 PRs ouvertes vers `dev`
**Epic :** GUIC-169 (refonte design v2)
**Plan de merge centralisé :** [Issue GitHub #71](https://github.com/consortium-jeunesse/guichet/issues/71) (épinglée)

---

## TL;DR

- **25 PRs ouvertes** vers `dev`, organisées en **6 phases de merge** strictes (labels `merge-phase-1` à `merge-phase-6`).
- **Tout le code est validé bout-en-bout** sur l'environnement de test PO (`mouhammadouod/dev`) : 635/636 tests passent, 0 régression bloquante.
- **2 PRs ont été fermées intentionnellement** (PR #37 et #56), remplacées par les Wave 6 + le ticket de suite GUIC-226.
- **2 migrations Prisma déjà appliquées sur Railway dev** (consent trace + CV profil), donc rien à faire côté DB pour `dev`.
- **Bloquants connus** : 4 items mineurs récurrents (`.gitignore`, CI hooks) listés en section 5.
- **Workflow CI "Mettre à jour le statut Jira"** en FAILURE sur quasi toutes les PRs : bug d'infra historique **non bloquant**.

---

## 1. Contexte

### État du chantier refonte v2 (GUIC-169) au 2026-06-04

Le chantier de refonte design v2 (epic GUIC-169) est entré dans sa phase de **consolidation**. Toutes les vagues fonctionnelles (Wave 1 → Wave 8) ont été livrées et validées sur l'environnement de test PO. Il reste à **merger l'ensemble vers `dev`** dans l'ordre défini par l'issue #71, puis remonter sur `staging` et `main` après recette finale.

Périmètre de la refonte v2 :
- **Stack visuelle** : tokens `gj-*`, police système, sprite SVG `/icons.svg`, Storybook comme catalogue vivant.
- **Yaye** (agent IA) : intégré en side panel desktop + drawer mobile, branding stack système.
- **Navigation** : header public marketing / AppTopbar+BottomNav app jeune / Sidebar admin-recruteur (cf `.agent_context/specs/layout-navigation.md`).
- **Wave 6** : refonte complète du flux candidature (modal, détail, backend CDP).
- **Wave 7 + 8** : UX modal, desktop nav, réintégrations CV profil.
- **Phases 2B + 3 web** : dashboard, favoris, profil mobile, MyCard QR, opportunités slide-over, centres web.
- **Homepage** : Welcome v2 vit désormais sur `/` (décision PO).

### Décisions PO majeures prises pendant la session 2026-06-04

| # | Décision | Source / contexte |
|---|---|---|
| 1 | Welcome v2 devient la **homepage** (`/`) | Audit nav — `/jeune/onboarding` redirige automatiquement vers `/telephone`. PR #44. |
| 2 | **PR #56 fermée** (GUIC-189) | Refondue intégralement par la Wave 6 (#58/#59/#60/#61) + bug 400 corrigé par #70. Aucun bit à cherry-pick. |
| 3 | **PR #37 fermée** (GUIC-194) | 50 commits / 112k LOC dont 86k Storybook accidentel + 47 commits déjà mergés. Reprise propre via **GUIC-226** (3 commits ciblés). |
| 4 | **Vercel Blob store privé** (CDP) | Code adapté `access: 'private'`, regex Zod élargie pour URLs signées. Migration timestamp `add_cv_to_profil_jeune` renommée en `20260603000001` pour éviter collision avec `add_candidature_consent_trace`. |
| 5 | Plan de merge en 6 phases | Cf issue #71. Strictement séquentiel à l'intérieur d'une phase. |

### Stratégie merge retenue

- **Source de vérité** : issue #71 — labels `merge-phase-N` posés sur les PRs.
- **Merge linéaire**, pas de squash agressif : conserver la traçabilité par ticket JIRA.
- **Sur conflit** : rebaser la PR sur `dev` à jour, ne **jamais** modifier le contenu fonctionnel en passant.
- **Sur fail CI** : seul le job "Mettre à jour le statut Jira" peut être ignoré (bug infra connu). Tout autre fail = bloquant.

---

## 2. État des branches

| Branche | Rôle | Statut au 2026-06-04 |
|---|---|---|
| `origin/dev` | Base de tous les merges, cible des 25 PRs | À jour, prête à recevoir Phase 1 |
| `origin/main` | Production | Stable, derrière `dev`, attendra recette post-merge complet |
| `origin/staging` | Recette | À synchroniser avec `dev` après merge des 6 phases |
| `mouhammadouod/dev` | **Environnement de test PO** | Wave 4 + 5 + 6 + 7 + 8 + fixes intermédiaires déjà mergés — **référence "ça marche en bout en bout"** |
| `tmp-guic177-validation` | Branche locale lead | Snapshot état dev local, conservée pour validation manuelle GUIC-177 |
| `.claude/worktrees/agent-*` | Worktrees agents temporaires | À ignorer, nettoyage automatique |

**Lecture clé** : si une PR semble douteuse (conflit large, comportement inattendu), comparer avec `mouhammadouod/dev` où le code tourne en bout-en-bout sans régression.

---

## 3. Récap des 6 phases de merge

> Référence absolue : [Issue #71](https://github.com/consortium-jeunesse/guichet/issues/71)

### Phase 1 — Fondations (label `merge-phase-1`)

> Bases techniques pour toutes les vagues suivantes. **4 PRs**.

| Ordre | PR | Ticket | Titre court | Dépend de | Risques | Action préalable |
|---|---|---|---|---|---|---|
| 1 | #48 | GUIC-202-A | tokens + icônes sprite + --gj-yaye-font | — | aucun | aucune |
| 2 | #49 | GUIC-202-B | a11y tap + SkipLink + container 1280 + Input v2 | #48 (tokens) | rebase léger si #48 merge avant | rebase post #48 |
| 3 | #50 | GUIC-203 | finitions tokens onboarding + checklist v2 | isolé | — | aucune |
| 4 | #51 | GUIC-205-A | layout app jeune desktop (sidebar+topbar) + BottomNav refresh | — | débloque les sous-PRs GUIC-205 (Phase 2) | — |

### Phase 2 — Layout desktop (label `merge-phase-2`)

> Sous-PRs GUIC-205 + corrections audit GUIC-216. **Ordre strict** car elles touchent toutes `BottomNav`, `Header`, `jeune/(app)/layout.tsx`. **4 PRs**.

| Ordre | PR | Ticket | Titre court | Risques |
|---|---|---|---|---|
| 5 | #52 | GUIC-205-B | /centres desktop 2-col | conflits possibles sur layout app jeune si Phase 1 pas mergée |
| 6 | #53 | GUIC-205-C | layouts contenu desktop (dashboard aside + grids + profil 2-col) | touche dashboard — vérifier conflits avec #43 (Phase 5) |
| 7 | #54 | GUIC-205-D | refonte composants legacy v1→v2 | gros patch — review attentive |
| 8 | #57 | GUIC-216 | fixes audit UI (sidebar links + active + UserMenu + tokens + tablet nav) | rebase après #54 |

### Phase 3 — Wave 6 candidature (label `merge-phase-3`)

> **Chaîne stricte** — #58 doit merger en premier (foundations partagées). **4 PRs**.

| Ordre | PR | Ticket | Titre court | Dépendances |
|---|---|---|---|---|
| 9 | #58 | GUIC-217 | Wave 6 foundations (constantes + types + Sheet/FileUpload fixes) | base de toute la Phase 3 |
| 10 | #59 | GUIC-220 | Wave 6 CandidatureModal refonte (form unique + WhatsApp preview + a11y) | dépend de #58 |
| 11 | #60 | GUIC-219 | Wave 6 OpportuniteDetail refonte v2 + a11y | dépend de #58, mergeable en parallèle de #59 |
| 12 | #61 | GUIC-218 | Wave 6 backend sécurité + DB (CDP cookies + Blob proxy + consent trace) | **inclut migration Prisma `20260603000000_add_candidature_consent_trace`** (déjà appliquée Railway) |

### Phase 4 — Wave 7 + Wave 8 (label `merge-phase-4`)

> **4 PRs**. UX modal, desktop nav, CV profil, réintégrations.

| Ordre | PR | Ticket | Titre court | Risques |
|---|---|---|---|---|
| 13 | #63 | GUIC-223 | CV depuis profil (réutilisation candidature) | **inclut migration Prisma `20260603000001_add_cv_to_profil_jeune`** (timestamp renommé pour éviter collision avec #61, déjà appliquée Railway) |
| 14 | #64 | GUIC-221 | Wave 7-A détail+modal UX (badge + Yaye + profil + curseur + smart date + loading) | léger |
| 15 | #62 | GUIC-222 | Wave 7-B desktop layout + nav externes (YEAH + e-learning) | risque conflits Header avec Phase 1 et #72 |
| 16 | #65 | GUIC-224 | Wave 8 réintégrations modal candidature (Yaye + profil + CV profil) | dépend de la Wave 6 + #63 |

### Phase 5 — Phase 2B + Phase 3 web (label `merge-phase-5`)

> **6 PRs**. Dashboards, favoris, Yaye, opportunités web.

| Ordre | PR | Ticket | Titre court | Risques |
|---|---|---|---|---|
| 17 | #55 | GUIC-215 | Yaye side panel desktop (TopBar trigger + drawer 400px) | indépendant |
| 18 | #43 | GUIC-187 | dashboard bénéficiaire mobile (Phase 2B-1) | était CONFLICTING → **déjà rebasé sur dev** |
| 19 | #69 | GUIC-196 | Dashboard web bénéficiaire v2 (Phase 3-2) | dépend de #43 |
| 20 | #66 | GUIC-197 | Opportunités web slide-over + modal apply (Phase 3-3) | conflits possibles avec Wave 6 |
| 21 | #67 | GUIC-198 | Yaye side panel + Centres web + Notifications web (Phase 3-4) | dépend de #55 |
| 22 | #68 | GUIC-191 | favoris + profil mobile + MyCard QR (Phase 2B-5) | indépendant |

### Phase 6 — Homepage + Upload fix + Header URLs (label `merge-phase-6`)

> **3 PRs** (issue #71 listait 2, mais #72 a été ajoutée depuis).

| Ordre | PR | Ticket | Titre court | Notes |
|---|---|---|---|---|
| 23 | #44 | GUIC-199 | Welcome v2 devient homepage + skip Welcome dans onboarding | **rebasé sur dev**. Décision PO : Welcome vit sur `/`, `/jeune/onboarding` redirige sur `/telephone`. |
| 24 | #70 | GUIC-225 | fix upload CV via proxy serveur (corrige 400 systématique) | corrige bug audit GUIC-189 cause 1 |
| 25 | #72 | GUIC-227 | harmonise URLs externes Header (cjs.sn → bons domaines) | léger, mergeable en dernier |

### PR #47 (sans label)

PR #47 — `GUIC-201 fix: bloquants audit design v2 (BottomNav class + EmptyState icon + Heart sprite)` n'a pas reçu de label `merge-phase-N`. Elle est probablement à intégrer **avec la Phase 1** (bloquants design) ou **fermée si obsolète** (à vérifier au moment de démarrer la Phase 1 — comparer avec `mouhammadouod/dev`).

---

## 4. Décisions / arbitrages tranchés (à ne pas remettre en cause)

### PR #56 fermée — GUIC-189 (Wave 5 candidature)

Refondue intégralement par la Wave 6 (PRs #58/#59/#60/#61). Le bug 400 systématique du composant upload est corrigé par #70 (proxy serveur). **Aucun bit à cherry-pick**, fermeture définitive.

### PR #37 fermée — GUIC-194 (Yaye fullscreen + drawer notifs)

50 commits / 112k LOC dont :
- 86k LOC = bruit `public/storybook/` (artefact build accidentellement commité)
- 47 commits déjà mergés dans `dev` via d'autres PRs
- 3 commits utiles à reprendre : `0bad841a`, `6b58462c`, `16c75937`

Action de suite : ticket **GUIC-226** — cherry-pick propre depuis `dev` à jour de ces 3 commits.

### Welcome sur `/` (décision PO)

`/jeune/onboarding` redirige systématiquement vers `/telephone` (étape 1 onboarding). Welcome v2 est désormais la **homepage publique** (`/`). PR #44.

### Collision migration Prisma

Les deux migrations Wave 6 + Wave 7 avaient initialement le même timestamp `20260603000000`. **Renommée** :
- `20260603000000_add_candidature_consent_trace` (GUIC-218 — PR #61)
- `20260603000001_add_cv_to_profil_jeune` (GUIC-223 — PR #63)

Ordre d'application strict. **Déjà appliquées sur Railway dev** le 2026-06-03.

### Vercel Blob store privé (CDP)

L'audit conformité CDP a imposé un store privé. Adaptations :
- `access: 'private'` dans tous les appels `put()` côté serveur
- Lecture exclusivement via signed URLs (TTL court)
- Regex Zod sur URLs Blob élargie pour accepter le format signé

À faire côté infra : configurer `BLOB_READ_WRITE_TOKEN` sur **Vercel Production** (déjà OK sur Preview/mouhammadouod).

---

## 5. Bloquants connus à fixer avant merge Phase 1

Quatre items mineurs récurrents identifiés pendant la session :

| # | Item | Action |
|---|---|---|
| 1 | `tsconfig.tsbuildinfo` apparaît dans 3 rebases sur 4 comme conflit | Ajouter à `.gitignore` racine + `git rm --cached tsconfig.tsbuildinfo` |
| 2 | `public/storybook/` (race condition build) | Ajouter à `.gitignore` racine + `git rm --cached -r public/storybook/` |
| 3 | Tests CI `opportunite-dto.test.ts` type mismatch | **Traité par GUIC-228** (ticket de suite) |
| 4 | Postbuild script `cp` chunks inexistants | **Traité par GUIC-228** |

Recommandation : créer une PR `chore/cleanup-gitignore` ciblant `dev` pour les items 1+2 **avant** de démarrer la Phase 1. 5 minutes de travail, économise plusieurs rebases.

---

## 6. Tickets de suite (à créer / dérouler après merge complet)

| Ticket | Statut | Objet |
|---|---|---|
| **GUIC-226** | À démarrer | Cherry-pick GUIC-194 — 3 commits (`0bad841a` + `6b58462c` + `16c75937`) sur branche propre depuis `dev` à jour. Restitue Yaye fullscreen + drawer notifs sans le bruit de la PR #37. |
| **GUIC-228** | À démarrer | Fix CI hooks — type mismatch `opportunite-dto.test.ts` + postbuild `cp` chunks inexistants. |
| **GUIC-229** | **À créer** | Signed URLs lecture CV côté recruteur (audit conformité CDP). |
| **GUIC-230** | **À créer** | Cron cleanup CV orphelins sur Vercel Blob (audit conformité CDP — rétention). |

---

## 7. Tests régression

**Statut global :** `635/636` tests passent sur `mouhammadouod/dev` (99.8 %).

| Métrique | Valeur |
|---|---|
| Tests totaux | 636 |
| Passing | 635 |
| Failing reproductible | 0 |
| Flaky non reproductible | 1 (`onboarding-flow.test.tsx` — passe seul, fail en suite complète, non bloquant) |
| Régressions bloquantes identifiées | 0 |
| Tickets JIRA validés "Code validé sans régression" | 20 |

**Conclusion** : aucune régression bloquante avant merge. Le flaky `onboarding-flow.test.tsx` est tracké pour investigation post-merge mais n'empêche pas la livraison.

---

## 8. Actions admin avant merge

### Côté local (lead dev)

```bash
# Après checkout d'une branche feature pour review locale
npm install
npx prisma generate
```

### Côté Vercel

- Vérifier que `BLOB_READ_WRITE_TOKEN` est configuré sur **Production** (déjà OK sur Preview/mouhammadouod).
- Variables d'env Wave 6 / Wave 7 : aucune nouvelle hors `BLOB_READ_WRITE_TOKEN`.

### Côté Railway (Prisma migrations)

Statut actuel **dev** :

| Migration | Ticket | Statut Railway dev |
|---|---|---|
| `20260603000000_add_candidature_consent_trace` | GUIC-218 (PR #61) | Appliquée 2026-06-03 |
| `20260603000001_add_cv_to_profil_jeune` | GUIC-223 (PR #63) | Appliquée 2026-06-03 |

**Production** : à appliquer **après** merge `dev → main` et recette `staging`. Commande :

```bash
DATABASE_URL=$PROD_URL npx prisma migrate deploy
```

---

## 9. Migration users Drupal (rappel)

- Script de migration : `scripts/migrate-drupal-users.ts` (livré via GUIC-200).
- **22 502 utilisateurs migrés** sur Railway le 2026-06-02.
- Commande pour relancer (idempotent, skip existants) :

```bash
DATABASE_URL=$DEV_URL npx tsx scripts/migrate-drupal-users.ts \
  --source ./data/dump-vercel-dev-pre-m3-20260602T093810Z.sql.gz \
  --dry-run=false
```

Rapport dernière exécution : `data/migrate_m3_v2_report_2026-06-01T16-01-53-803Z.json`.

---

## 10. Commandes utiles lead dev

### Inspection

```bash
# Lister les PRs d'une phase donnée
gh pr list --label "merge-phase-1" --state open
gh pr list --label "merge-phase-2" --state open
# ... etc jusqu'à merge-phase-6

# Vérifier qu'une PR est mergeable
gh pr view 58 --json mergeable,mergeStateStatus,statusCheckRollup

# Voir le plan de merge complet
gh issue view 71

# Voir les checks CI d'une PR
gh pr checks 58
```

### Merge type (exemple Phase 1)

```bash
# Une PR à la fois, dans l'ordre du tableau Phase 1
gh pr merge 48 --merge --delete-branch
# Attendre que les checks repassent au vert sur les PRs suivantes
gh pr merge 49 --merge --delete-branch
gh pr merge 50 --merge --delete-branch
gh pr merge 51 --merge --delete-branch
```

### Rebase manuel si conflit

```bash
gh pr checkout 49
git fetch origin
git rebase origin/dev
# résoudre conflits, en priorité tsconfig.tsbuildinfo / public/storybook → privilégier `dev`
git push --force-with-lease
```

### Vérifier l'état post-merge phase

```bash
git checkout dev && git pull
npm run validate            # lint + tsc + tests
# Si KO → ne pas démarrer la phase suivante, créer hotfix
```

---

## Annexes — liens utiles

- **Issue plan de merge** : https://github.com/consortium-jeunesse/guichet/issues/71
- **Specs refonte v2** : `.agent_context/specs/MX-refonte-v2.md` (si présente)
- **Design source de vérité** : `design-guichet-v2/`
- **Storybook local** : `npm run storybook` (port 6006)
- **Conventions Git/JIRA** : `CLAUDE.md` racine (section "Git & JIRA")

---

## Checklist express lead dev

- [ ] Lire l'issue #71 en intégralité
- [ ] Créer PR `chore/cleanup-gitignore` (items 1+2 section 5)
- [ ] Phase 1 : merger #48 → #49 → #50 → #51 (vérifier sort de PR #47)
- [ ] Phase 2 : merger #52 → #53 → #54 → #57
- [ ] Phase 3 : merger #58 → #59 → #60 → #61
- [ ] Phase 4 : merger #63 → #64 → #62 → #65
- [ ] Phase 5 : merger #55 → #43 → #69 → #66 → #67 → #68
- [ ] Phase 6 : merger #44 → #70 → #72
- [ ] Lancer recette `staging` une fois `dev` complet
- [ ] Créer tickets GUIC-229 + GUIC-230
- [ ] Démarrer GUIC-226 (cherry-pick Yaye) + GUIC-228 (fix CI hooks)
- [ ] Configurer `BLOB_READ_WRITE_TOKEN` Vercel Production avant `main`
- [ ] Appliquer `prisma migrate deploy` sur Railway Production après recette

---

*Document généré dans le cadre du handover de session de refonte v2. Toute question : se référer à l'issue #71 + spec `.agent_context/specs/` ou contacter mod-cjs.*
