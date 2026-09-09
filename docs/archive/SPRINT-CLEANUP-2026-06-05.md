# Sprint 3 cleanup — 2026-06-05

> Document à l'attention du lead dev pour faciliter la review et le merge des PRs ouvertes.
> Snapshot pris le 2026-06-05 — sprint 3 GUIC (2026-06-02 → 2026-06-12).
> Aucune PR n'a été mergée, fermée ni rebasée. Aucune modification de titre.

## Synthèse

- **34 PRs ouvertes** (le rapport sprint précédent indiquait 33, +1 nouvelle depuis : #93)
- **20 mergeables** côté Git (`MERGEABLE`)
  - **3 CLEAN** : #80, #79, #74
  - **17 UNSTABLE** : Git OK mais check CI "Mettre à jour le statut Jira" en échec — voir section "Check CI cassé"
  - dont **1 APPROVED** : #72 (2 lignes, prête au merge immédiat)
- **14 en conflit** (`CONFLICTING / DIRTY`) — détail + reco par PR plus bas
- **3 PRs obsolètes / redondantes** à fermer (#69 superset #78, #70 superset #75, #43 obsoleté par #69/#78)
- **1 PR stacked** : #88 basée sur `feature/GUIC-234-…` (#83), pas sur `dev`
- **4 waves recommandées** pour vider le backlog sans interblocage

## Check CI cassé (action lead — priorité 1)

Root cause confirmée en lisant le job `Login Jira` (run 27017398795) :

```
url: ***/rest/api/3/myself
Error: Jira API error  (401)
```

→ Le secret `JIRA_API_TOKEN` du repo GitHub est invalide / expiré.
→ Conséquence : check "Mettre à jour le statut Jira" rouge sur **toutes les PRs** depuis ~3-4 jours.
→ Tous les autres checks (`Lint + Tests`, `Extraire la clé Jira`, `Valider le titre`) passent — le code est sain.

**Action lead** : régénérer le token API Jira (compte de service) puis mettre à jour les secrets GitHub :
- `JIRA_API_TOKEN`
- vérifier que `JIRA_USER_EMAIL` et `JIRA_BASE_URL` pointent encore sur le bon compte / tenant

Tant que ce check rouge subsiste, considérer `mergeStateStatus=UNSTABLE` comme un faux négatif si `Lint + Tests` est vert.

## Ordre de merge recommandé

Légende :
- `CLEAN` = aucune CI rouge légitime (état Git CLEAN ou UNSTABLE par check Jira KO uniquement)
- Toutes les PRs sont de `mod-cjs` — pas de blocage humain externe pour rebaser

### Wave 1 — merge immédiat (CLEAN ou UNSTABLE-Jira-only, faible risque)

À merger en premier pour libérer les rebases en cascade.

| PR  | Ticket    | Module        | Description courte                                       | Taille      | Risque   |
|-----|-----------|---------------|----------------------------------------------------------|-------------|----------|
| #72 | GUIC-227  | m1-socle      | Fix URLs externes Header (cjs.sn → bons domaines)        | +2 / -2  f1 | trivial — déjà APPROVED |
| #76 | GUIC-228  | ci            | Fix hook pre-push cassé (opportunite-dto + postbuild)    | +1 / -1  f1 | trivial |
| #74 | GUIC-169  | docs          | Handover lead dev — doc état refonte v2                  | +356  f1    | docs only |
| #80 | GUIC-23   | m5-agenda     | Vue calendrier mensuel + inscription événements          | +1007 f9    | feature isolée |
| #79 | GUIC-232  | m3-opportunites | Lettre 4000 chars + profil base obligatoire             | +523 f11    | feature ciblée |
| #90 | GUIC-242  | m10-interop   | verifyHmacSignature strict                               | +90  f2     | sécurité — petite surface |
| #91 | GUIC-237  | m2-auth       | Webhooks SSO fail-closed Redis + rate-limit              | +182 f2     | sécurité — surface ciblée |
| #92 | GUIC-241  | sécurité      | safeReturnTo strict + magic-bytes PDF upload CV          | +223 f6     | sécurité |
| #93 | GUIC-240  | m11-whatsapp  | HMAC + idempotence + hash cjsUid CDP                     | +462 f12    | sécurité |
| #89 | GUIC-239  | m6-ressources | Seed 20 ressources + audit /opportunites                 | +253 f2     | data seed |

→ 10 PRs mergeables sans rebase. Après cette wave, **8 conflits restants devraient s'auto-résoudre** sur dev (les conflits actuels viennent en majorité de fichiers déjà touchés par Wave 1, ex : `CandidatureModal.tsx`, `tableau-de-bord/page.tsx`).

### Wave 2 — après Wave 1 (PRs Prisma loaders / centres / stats, MERGEABLE)

Dépendent indirectement de Wave 1 (toutes UNSTABLE-Jira-only aujourd'hui).

| PR  | Ticket   | Module      | Description courte                                | Taille     | Notes |
|-----|----------|-------------|---------------------------------------------------|------------|-------|
| #83 | GUIC-234 | m4-centres  | /centres avec données Prisma (loader)             | +257 f4    | prérequis #88 |
| #84 | GUIC-235 | m1-socle    | Stats homepage réelles (loader Prisma)            | +303 f7    | indépendant |
| #85 | GUIC-233 | m7-seo      | Pages légales + /jeune/notifications + fix 404    | +361 f9    | indépendant |
| #87 | GUIC-237 | m3-opp.     | /jeune/mes-candidatures branche Prisma            | +214 f5    | indépendant |
| #88 | GUIC-238 | m4-centres  | Seed Prisma 9 centres CJS                         | +204 f3    | **stacked sur #83** — ne mergeable qu'après #83 → ensuite re-target dev |
| #77 | GUIC-231 | m13-data    | Cron cleanup CV orphelins Vercel Blob             | +598 f9    | indépendant |
| #81 | GUIC-24  | m6-ressources | Filtres avancés + favoris ressources            | +1492 f20  | gros mais isolé |
| #82 | GUIC-208 | refonte-v2  | Intégration lot design 2026-06-04                 | +5430 f29  | gros — reviewer attentivement |
| #73 | GUIC-226 | m12-ia      | Yaye fullscreen + NotificationsDrawer + cloche    | +1009 f14  | refait GUIC-194 (cherry-pick) |
| #65 | GUIC-224 | m3-opp.     | Wave 8 réintégrations modal candidature           | +1445 f13  | dépend de Wave 1 (#79) |

### Wave 3 — rebase auto-résolvable (DIRTY mais conflits triviaux/écrasables après Wave 1+2)

Les PRs ci-dessous touchent des fichiers qui sont **aussi touchés par les PRs Wave 1/2**. Une fois Wave 1+2 mergées, demander à l'auteur (mod-cjs) de rebaser ; les conflits devraient se réduire à de la résolution sémantique ciblée.

| PR  | Ticket   | Fichiers en conflit (vs dev)                                    | Reco                          |
|-----|----------|-----------------------------------------------------------------|-------------------------------|
| #66 | GUIC-197 | `CandidatureModal.tsx`, `OpportunitesClient.tsx`                | rebase après #79              |
| #67 | GUIC-198 | `centres/page.tsx`, `NotificationsPanel*`, `YayeSidePanel*`     | rebase après #85, #73         |
| #68 | GUIC-191 | `MesFavoris`, `MyCardCjs`, `ProfilClient`, `EmptyState`         | rebase après Wave 1           |
| #62 | GUIC-222 | `tableau-de-bord/page.tsx`, `BenefSidebar`, `BenefTopBar`, `HeaderNav` | rebase après Wave 1 + #72 |
| #64 | GUIC-221 | `CandidatureModal`, `OppCard`, `OpportuniteDetail`, `Sheet`     | rebase après #79              |
| #63 | GUIC-223 | `prisma/schema.prisma` (+migration `add_cv_to_profil_jeune`), `CandidatureModal` | rebase après #79 — **attention conflit migration Prisma** |
| #55 | GUIC-215 | `BenefTopBar`, `YayeSidePanel`                                  | rebase après #73              |
| #47 | GUIC-201 | `OpportunityCard`, `BottomNav`, `EmptyState`                    | rebase après Wave 1 (probablement résolu par #68) |
| #44 | GUIC-199 | `(public)/page.tsx`, `onboarding/page.tsx`, `WelcomeHero*`      | rebase après #84              |

### Wave 4 — décisions structurelles requises (conflits sémantiques importants)

| PR  | Ticket   | Fichiers en conflit                                              | Reco                          |
|-----|----------|------------------------------------------------------------------|-------------------------------|
| #78 | GUIC-206 | `tableau-de-bord/page.tsx`, tous les `WebDash*`, `dashboard/index.ts`, `loaders/dashboard.ts` | **PR canonique dashboard** (web + données réelles). À rebaser et merger en dernier. Rend obsolètes #69 et #43. |
| #75 | GUIC-229 | `api/upload/cv/route.ts`, `CandidatureModal`, `FileUpload`       | **PR canonique upload CV** (lazy + proxy). Rend obsolète #70. À rebaser après #79. |

## PRs à fermer (avec commentaire d'explication)

| PR  | Ticket   | Raison                                                                                       |
|-----|----------|----------------------------------------------------------------------------------------------|
| #69 | GUIC-196 | Sous-ensemble de #78 (mêmes 19 fichiers `WebDash*` mais sans `loaders/dashboard.ts`). #78 = dashboard web **avec données réelles** → couvre intégralement #69. Préférer #78. |
| #70 | GUIC-225 | Sous-ensemble de #75 (upload CV proxy : 4 fichiers vs 9). #75 ajoute le fix CV orphan (lazy upload) au même périmètre. Préférer #75. |
| #43 | GUIC-187 | Dashboard mobile mocks (`DashboardHero/KPIs/Tracker/MiniOppCard/…`). Remplacé par l'architecture `WebDash*` (#69 puis #78) qui couvre mobile et web via responsive. Vérifier avec PO que la version mobile reste accessible via les nouveaux composants. |

**Ne pas fermer avant validation lead.** Action recommandée : poster un commentaire sur chacune et attendre arbitrage.

## Synthèse fichiers chauds (à surveiller pendant les rebases)

| Fichier                                       | PRs concernées                          |
|-----------------------------------------------|-----------------------------------------|
| `src/components/opportunites/CandidatureModal.tsx` | #79, #75, #66, #64, #63, #65       |
| `src/app/jeune/(app)/tableau-de-bord/page.tsx`     | #78, #69, #62, #43                  |
| `src/components/ui/Yaye/YayeSidePanel/index.tsx`   | #67, #55, #73                       |
| `src/components/layout/BenefTopBar/index.tsx`      | #55, #62, #73                       |
| `src/components/dashboard/index.ts`                | #78, #69, #43                       |

Recommandation : merger #79 et #73 tôt (Wave 1) pour figer ces fichiers et faciliter les rebases en cascade.

## Recommandations finales

1. **Priorité 1 (lead)** : régénérer `JIRA_API_TOKEN` (secret GitHub) — débloque 17 PRs UNSTABLE.
2. **Mergeable immédiatement sans risque** : #72 (APPROVED, 2 lignes) + #76 (fix CI). Cycle review express.
3. **Stratégie de merge** : commencer par les sécurités (#90/#91/#92/#93) et fixes triviaux pour figer la base, puis loaders Prisma (Wave 2) qui débloquent les conflits de dashboards/centres.
4. **Re-target #88** vers `dev` après merge de #83 (sinon dépendance fantôme).
5. **Décision PO requise** sur #43 (dashboard mobile) avant fermeture.
6. **#78 (GUIC-206)** = la "vraie" PR dashboard. Mettre #69 et #43 en pause dans Jira et concentrer review sur #78.

## Annexe — tableau brut

| PR  | Mergeable    | MergeState | Base | +/-/files       | Updated     |
|-----|--------------|------------|------|-----------------|-------------|
| 93  | MERGEABLE    | UNSTABLE   | dev  | +462-27 f12     | 2026-06-05  |
| 92  | MERGEABLE    | UNSTABLE   | dev  | +223-10 f6      | 2026-06-05  |
| 91  | MERGEABLE    | UNSTABLE   | dev  | +182-6 f2       | 2026-06-05  |
| 90  | MERGEABLE    | UNSTABLE   | dev  | +90-6 f2        | 2026-06-05  |
| 89  | MERGEABLE    | UNSTABLE   | dev  | +253-0 f2       | 2026-06-05  |
| 88  | MERGEABLE    | UNSTABLE   | #83  | +204-0 f3       | 2026-06-04  |
| 87  | MERGEABLE    | UNSTABLE   | dev  | +214-22 f5      | 2026-06-04  |
| 85  | MERGEABLE    | UNSTABLE   | dev  | +361-2 f9       | 2026-06-04  |
| 84  | MERGEABLE    | UNSTABLE   | dev  | +303-23 f7      | 2026-06-04  |
| 83  | MERGEABLE    | UNSTABLE   | dev  | +257-4 f4       | 2026-06-04  |
| 82  | MERGEABLE    | UNSTABLE   | dev  | +5430-0 f29     | 2026-06-04  |
| 81  | MERGEABLE    | UNSTABLE   | dev  | +1492-81 f20    | 2026-06-04  |
| 80  | MERGEABLE    | **CLEAN**  | dev  | +1007-51 f9     | 2026-06-04  |
| 79  | MERGEABLE    | **CLEAN**  | dev  | +523-21 f11     | 2026-06-04  |
| 78  | CONFLICTING  | DIRTY      | dev  | +1724-41 f22    | 2026-06-04  |
| 77  | MERGEABLE    | UNSTABLE   | dev  | +598-1 f9       | 2026-06-04  |
| 76  | MERGEABLE    | UNSTABLE   | dev  | +1-1 f1         | 2026-06-04  |
| 75  | CONFLICTING  | DIRTY      | dev  | +1688-32 f13    | 2026-06-04  |
| 74  | MERGEABLE    | **CLEAN**  | dev  | +356-0 f1       | 2026-06-04  |
| 73  | MERGEABLE    | UNSTABLE   | dev  | +1009-3 f14     | 2026-06-04  |
| 72  | MERGEABLE    | UNSTABLE   | dev  | +2-2 f1         | 2026-06-04  | (APPROVED)
| 70  | CONFLICTING  | DIRTY      | dev  | +1468-32 f13    | 2026-06-04  |
| 69  | CONFLICTING  | DIRTY      | dev  | +1300-40 f19    | 2026-06-04  |
| 68  | CONFLICTING  | DIRTY      | dev  | +605-38 f8      | 2026-06-04  |
| 67  | CONFLICTING  | DIRTY      | dev  | +973-22 f10     | 2026-06-04  |
| 66  | CONFLICTING  | DIRTY      | dev  | +273-17 f4      | 2026-06-04  |
| 65  | MERGEABLE    | UNSTABLE   | dev  | +1445-32 f13    | 2026-06-03  |
| 64  | CONFLICTING  | DIRTY      | dev  | +395-24 f11     | 2026-06-04  |
| 63  | CONFLICTING  | DIRTY      | dev  | +329-2 f6       | 2026-06-04  |
| 62  | CONFLICTING  | DIRTY      | dev  | +215-29 f7      | 2026-06-04  |
| 55  | CONFLICTING  | DIRTY      | dev  | +563-0 f5       | 2026-06-03  |
| 47  | CONFLICTING  | DIRTY      | dev  | +76-16 f5       | 2026-06-03  |
| 44  | CONFLICTING  | DIRTY      | dev  | +440-127 f7     | 2026-06-04  |
| 43  | CONFLICTING  | DIRTY      | dev  | +1038-114 f22   | 2026-06-04  |
