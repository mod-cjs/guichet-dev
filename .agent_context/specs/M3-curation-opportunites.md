# M3 — Curation automatisée d'opportunités (épic GUIC-595)

> Statut : **draft — en attente de validation lead** (2026-07-20)
> Épic canonique : GUIC-595 (doublons GUIC-585/586/587 clôturés le 2026-07-20)
> Ordre validé : US-1 (596) → US-2 (597) → US-3 (598) → US-4 (599) → US-5 (600) → US-6 (601) → US-7 (602)

---

## 1. Vision & principes (non négociables, issus du ticket)

Un robot **interne au monolithe Next.js** surveille des sites-sources déclarés en admin,
en extrait les opportunités de façon **déterministe (SANS LLM)**, les dédoublonne et les
présente dans une **file de validation admin**. **Rien n'est publié sans validation humaine.**

- Extraction en cascade par source : JSON-LD (JobPosting/Schema.org) → RSS/Atom/API → sélecteurs HTML configurables → extraction d'article générique + regex.
- Méthode d'extraction ET fréquence de vérification **configurables par source**.
- Cas non couverts v1 (Facebook, PDF, affiches image) : saisie manuelle assistée (existant admin).
- Respect robots.txt, délai de politesse, user-agent CJS identifiable.

## 2. Architecture d'exécution — décision

**Pattern existant réutilisé : cron → route API interne** (comme `/api/cron/cleanup-cv`,
`/api/cron/yaye-graph-sync`).

- Nouvelle route `GET /api/cron/veille-sources` protégée `Authorization: Bearer CRON_SECRET` (pattern exact de `src/app/api/cron/cleanup-cv/route.ts`), `maxDuration = 300`.
- Planifiée **toutes les heures** dans `vercel.json` (staging/Vercel) et via crontab en prod Plesk (M14 — hors périmètre ici, juste documenté).
- À chaque tick, le job sélectionne les sources **dues** (`prochaineVerifLe <= now`) et les traite séquentiellement avec délai de politesse. La fréquence par source est donc découplée de la fréquence du cron.
- **Aucune modification** de `instrumentation.ts`, `src/lib/observability/`, `src/lib/storage/` (zone réservée autre session M14).

## 3. Modèle de données cible (posé progressivement, une migration par US)

```
SourceVeille (US-1)          ExecutionVeille (US-2)        ItemCuration (US-3/4/5)
─────────────────            ──────────────────            ─────────────────
id uuid                      id uuid                       id uuid
nom, url                     sourceId FK                   sourceId FK
methode (enum)               demarreLe, dureeMs            executionId FK
frequence (enum)             nouveautes, erreurs (Json)    empreinte @unique  ← dédup US-4
actif bool                   statut (ok|erreur)            urlCanonique, titre
configExtraction Json?                                     payloadExtrait Json
typeDefaut TypeOpportunite?                                scoreCompletude Int
prochaineVerifLe                                           statut (a_valider|approuvee|
derniereVerifLe                                                    rejetee|en_attente|doublon)
createdAt/updatedAt/deletedAt                              motifRejet?, modereePar?, modereeLe?
                                                           opportuniteId? FK  ← US-6 publication
```

- Enums : `MethodeExtraction { auto, jsonld, rss, api, html_selecteurs, article_regex }` (`auto` = cascade complète) · `FrequenceVeille { horaire, six_heures, quotidienne, hebdomadaire }`.
- Nommage français + `@@map` snake_case, aligné sur le schéma existant.
- **Toute migration : `COLLATE utf8mb4_unicode_ci` explicite** (prod MariaDB 10.11 ≠ CI MariaDB 11 — errno 150 déjà vécu).
- La publication (US-6) crée une `Opportunite` standard (`statut publiee`, traçabilité `moderePar`/`modereLe` — mécanique GUIC-471 existante) et lie `ItemCuration.opportuniteId`.

## 4. US-1 — Gestion des sources de veille (GUIC-596) — périmètre détaillé

**En tant qu'admin, je déclare et gère les sites-sources surveillés par le robot.**

### Inclus
1. **Prisma** : modèle `SourceVeille` + enums + migration (COLLATE explicite).
2. **API admin** (session + `isAdminRole`, pattern `src/app/admin/layout.tsx`) :
   - `GET/POST /api/admin/sources-veille` (liste paginée 20/page · création)
   - `GET/PATCH/DELETE /api/admin/sources-veille/[id]` (détail · édition · soft-delete `deletedAt`)
   - Réponses `ApiResponse<T>` · validation zod : URL http(s) valide, nom 3-120, `configExtraction` JSON objet si `methode ∈ {api, html_selecteurs}`, fréquence/méthode dans les enums.
   - Activation/désactivation via `PATCH { actif }` — une source désactivée n'est jamais sélectionnée par le robot.
3. **UI admin** `/admin/sources-veille` : liste (nom, URL, méthode, fréquence, actif, dernière vérif), formulaire création/édition, toggle actif, suppression avec confirmation. Composants `src/components/ui/` uniquement, tokens `gj-*` espace admin (sombre+doré), `<Icon />` sprite, tap-min 44px.
4. **Journal d'audit** : réutiliser le mécanisme `journal-audit` existant pour créer/modifier/supprimer une source.

### Exclus (US suivantes)
Le robot lui-même (US-2), tout fetch réseau, l'extraction, la file de curation, les stats par source (US-7 — la colonne `derniereVerifLe` est posée mais alimentée en US-2).

### Tests (TDD strict, charte robustesse)
- **Commit RED d'abord** : `test(opportunites): [GUIC-596] RED gestion des sources de veille`.
- Unitaires : validation zod (URL invalide, méthode inconnue, config manquante pour `html_selecteurs`), normalisation.
- **Intégration MariaDB réelle** (base test 3307, pattern suites d'intégration existantes) : CRUD complet via les routes API, pagination, soft-delete, **chemins de refus** (non-admin → 401/403, payload invalide → 400, id inconnu → 404).
- Pas de mock Prisma dans les tests d'intégration (un vert contre un mock ne protège de rien).

## 5. US suivantes — cadrage court (specs détaillées au fil de l'eau)

| US | Ticket | Cœur | Points durs |
|---|---|---|---|
| US-2 robot | GUIC-597 | Route cron + orchestrateur sources dues + fetch politesse | robots.txt parser, user-agent `CJSGuichetBot/1.0 (+https://guichetjeunesse.sn)`, timeout/retry, `ExecutionVeille` |
| US-3 extraction | GUIC-598 | Cascade déterministe → `payloadExtrait` + `scoreCompletude` | mapping vers champs `Opportunite` (type, domaine, deadline, région), zéro LLM |
| US-4 dédup | GUIC-599 | `empreinte = sha256(urlNormalisee + titreNormalise)` `@unique` | quasi-doublons inter-sources (normalisation aggressive + similarité titre), déjà publié ≠ resoumis |
| US-5 file | GUIC-600 | UI admin file à valider, détail éditable, approuver/rejeter/attente + motif, filtres | formulaire pré-rempli mappé sur `OpportuniteForm` existant |
| US-6 publication | GUIC-601 | Approbation → création `Opportunite` publiée + traçabilité GUIC-471 | slug unique, sous-type polymorphique selon `typeDefaut`/extraction |
| US-7 monitoring | GUIC-602 | Stats par source, vue synthèse, alertes (erreurs répétées, zéro extraction) | s'appuie sur `ExecutionVeille` posé dès US-2 |

## 6. Contraintes transverses

- 1 US = 1 branche `feature/GUIC-<n>-…` depuis `origin/dev` = 1 PR vers `dev` — jamais de push direct.
- Dette connue hors périmètre : 12 erreurs tsc `storage-config-alias.test.ts` (GUIC-622) · 17 suites Jest rouges sur dev (MariaDB/Redis) — tout blocage pre-push sera diagnostiqué et classé préexistant/introduit avant toute demande de bypass au lead.
- Périmètre protégé intouché : `src/components/centres/*`, zone M14 (deploy/backup/observability/storage/instrumentation).
