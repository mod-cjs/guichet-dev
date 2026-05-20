# Migration Drupal 8/9 → Guichet Jeunesse

**Ticket :** GUIC-17  
**Branche :** `feature/GUIC-17-migration-orchestrator`  
**Dépend de :** PR SSO `cjs_auth#24` (endpoints API étendus)  
**Dernière mise à jour :** 2026-05-19

---

## TL;DR — Migration en une commande

Après pre-flight, le pipeline complet tourne via :

```bash
npm run migrate:all -- --dry-run   # validation, aucune écriture
npm run migrate:all                 # migration réelle, demande confirmation
```

L'orchestrateur enchaîne les 5 phases avec rapport JSON consolidé et reprise sur erreur :

```
extract-map → create-sso → sync-utilisateurs → migrate-drupal → backfill-phones
```

Toutes les écritures côté SSO passent par l'API (`POST /users/provision/bulk`, `PATCH /users/{uuid}`) — **aucun SQL manuel** sur le serveur SSO. Les webhooks `user.provisioned` sont dispatchés vers les plateformes abonnées (BRM, Moodle, Centres). Le backfill téléphones utilise `silent=true` pour ne pas saturer ces webhooks.

**Reprise après échec :**

```bash
npm run migrate:all -- --resume-from=sync-utilisateurs
```

**Une seule phase :**

```bash
npm run migrate:all -- --only=backfill-phones
```

---

## Vue d'ensemble

La migration transfère les données de la plateforme CJS Drupal vers la base Guichet Jeunesse (MariaDB / Prisma). Elle se décompose en **5 scripts** orchestrés par `scripts/migrate-all.ts` :

| Ordre | Phase orchestrateur | Script | Rôle | Cible |
|-------|---------------------|--------|------|-------|
| 1 | `extract-map` | `scripts/extract-sso-map.py` | Extrait le mapping `drupal_uid → cjs_uid` depuis le dump SSO | Fichier local |
| 2 | `create-sso` | `scripts/create-sso-accounts.ts` | Crée les comptes SSO non-mappés via `POST /users/provision/bulk` | API SSO |
| 3 | `sync-utilisateurs` | `scripts/sync-utilisateurs-sso.ts` | Upsert en masse des Utilisateurs SSO → DB Guichet | DB Guichet |
| 4 | `migrate-drupal` | `scripts/migrate-drupal.ts` | ETL contenus : ProfilJeune + opportunités + événements + ressources | DB Guichet |
| 5 | `backfill-phones` | `scripts/backfill-sso-phones.ts` | Remplit les téléphones manquants côté SSO via `PATCH /users/{uuid}` (only_if_null + silent) | API SSO |

**Principe d'architecture :**  
Le SSO est la source de vérité pour l'identité (`nom`, `email`, `téléphone`, `cjs_uid`). La table `utilisateurs` du Guichet est alimentée depuis le SSO, jamais depuis Drupal. `migrate-drupal.ts` ne crée que des `ProfilJeune` et des contenus — il nécessite que les `Utilisateur` existent déjà.

**Aucun SQL manuel sur le serveur SSO :** toutes les écritures passent par l'API SSO étendue (PR `cjs_auth#24`). Le serveur Passport dispatch automatiquement les webhooks `user.provisioned` vers les plateformes abonnées.

---

## Variables d'environnement

Configurer dans `.env.migration` (gitignored) ou exporter dans le shell :

```bash
# ── Bases ──────────────────────────────────────────────────────────────
DATABASE_URL="mysql://user:pass@host:3306/guichet_jeunesse"
DRUPAL_DB_URL="mysql://drupal_user:pass@drupal-host:3306/drupal_db"     # read-only
SSO_DB_URL="mysql://sso_user:pass@sso-host:3306/auth_database"           # read-only

# ── API SSO (PR cjs_auth#24) ───────────────────────────────────────────
SSO_BASE_URL="https://sso.cjs.sn"
SSO_API_KEY="..."          # clé HMAC, créée côté admin SSO
SSO_API_SECRET="..."        # secret HMAC associé
SSO_ADMIN_TOKEN="..."       # Bearer Passport scope admin, créé côté SSO admin

# ── Fichiers ───────────────────────────────────────────────────────────
SSO_DUMP_FILE="/chemin/auth_database.sql"               # source pour extract-map
CJS_UID_MAP_FILE="./data/drupal_uid_cjs_uid_map.json"  # défaut, généré par extract-map
```

> Ces variables ne sont jamais utilisées par l'application Vercel — uniquement par les scripts ETL.

### Obtenir `SSO_ADMIN_TOKEN`

Sur l'interface admin du SSO (Laravel Passport), créer un Personal Access Token avec le scope `admin` pour un compte super-admin dédié à la migration. Le révoquer après la migration.

---

## Répétition générale en local (Docker)

Avant toute exécution prod, faire une répétition complète sur des dumps figés.

```bash
# 1. Placer les dumps dans data/migration-fixtures/
mkdir -p data/migration-fixtures
cp /chemin/cjs_prod_db.sql       data/migration-fixtures/drupal.sql
cp /chemin/auth_database.sql      data/migration-fixtures/auth_database.sql

# 2. Lancer la stack dédiée (3 bases isolées sur 3307 / 3308 / 3309)
npm run migration:rehearsal:up

# 3. Lancer cjs_auth côté SSO sur la branche feature
cd ../cjs_auth
git checkout feature/GUIC-17-sso-bulk-import-endpoints
docker compose up -d
# (le cjs_auth pointe sur sa propre DB MariaDB locale ; pour le test E2E,
#  utiliser la stack migration_sso_source comme source du mapping uniquement)

# 4. Configurer .env.migration en pointant sur les ports locaux 3307/3308/3309
#    + SSO_BASE_URL=http://localhost:8000 (cjs_auth local)

# 5. Lancer l'orchestrateur
cd ../guichet
npm run migrate:all:dry-run
npm run migrate:all -- --yes   # --yes pour skip la confirmation interactive

# 6. Vérifier les compteurs dans le rapport
cat data/migrate_all_report_*.json | jq '.global, .phases[].counters'

# 7. Tear down
npm run migration:rehearsal:down
```

---

## Procédure complète (ordre obligatoire)

### Étape 0 — Backup

```bash
# Snapshot de la base Guichet avant toute opération
mysqldump -h prod-host -u admin -p guichet_jeunesse > backups/guichet_$(date +%Y%m%d_%H%M).sql

# Vérifier que les migrations Prisma sont appliquées
npx prisma migrate status
# Attendu : "Database schema is up to date!"
```

### Étape 1 — Générer le mapping SSO

```bash
python3 scripts/extract-sso-map.py /chemin/vers/auth_database.sql
# Produit : data/drupal_uid_cjs_uid_map.json
# Attendu : ~20 000+ entrées
```

### Étape 2 — Créer les comptes SSO manquants (API)

Les utilisateurs Drupal actifs sans compte SSO correspondant sont créés via `POST /users/provision/bulk` (batches de 500, HMAC + Bearer admin). Le mapping local est mis à jour incrémentalement depuis les réponses API.

```bash
# Dry-run : interroge Drupal, prépare le payload, n'appelle pas l'API
SSO_BASE_URL=... SSO_API_KEY=... SSO_API_SECRET=... SSO_ADMIN_TOKEN=... \
DRUPAL_DB_URL="mysql://..." \
npm run migrate:sso:create:dry-run

# Réel : appels API
SSO_BASE_URL=... SSO_API_KEY=... SSO_API_SECRET=... SSO_ADMIN_TOKEN=... \
DRUPAL_DB_URL="mysql://..." \
npm run migrate:sso:create
```

Sorties :
- `data/drupal_uid_cjs_uid_map.json` (mis à jour incrémentalement avec les nouveaux UUIDs)
- `data/create_sso_accounts_report_<batch>.json` (rapport JSON : created, existed, errored, durée)

Aucun SQL à appliquer manuellement.

### Étape 3 — Synchroniser les Utilisateurs SSO → Guichet

```bash
SSO_DB_URL="mysql://..." \
DATABASE_URL="mysql://..." \
npm run migrate:sso:sync:dry-run

# Si propre :
SSO_DB_URL="mysql://..." \
DATABASE_URL="mysql://..." \
npm run migrate:sso:sync
# Attendu : ~22 000+ Utilisateurs créés en quelques secondes
```

Cette étape est **idempotente** : elle peut être relancée sans effet de bord. Elle met à jour uniquement `telephone`, `region` et `drupal_uid` sur les enregistrements existants — jamais `nom` ni `prenom`.

### Étape 4 — Dry-run migration (obligatoire)

```bash
DRUPAL_DB_URL="mysql://..." \
DATABASE_URL="mysql://..." \
CJS_UID_MAP_FILE="./data/drupal_uid_cjs_uid_map.json" \
npm run migrate:drupal:dry-run
```

**Interpréter le rapport :**

```
ProfilJeune
  créés             : ~22 000    ← nombre attendu si tout est en ordre
  déjà existants    : 0          ← premier run
  non-mappés SSO    : 0          ← 0 si étape 2 faite correctement (sinon ~2 200)
  Utilisateur absent: 0          ← 0 si étape 3 faite (sinon bloquer et relancer sync)
  erreurs           : 0          ← doit être 0
```

**Ne pas continuer si `Utilisateur absent > 0`.** Relancer `npm run migrate:sso:sync` puis réessayer.

### Étape 5 — Migration réelle

```bash
# Migration complète
DRUPAL_DB_URL="mysql://..." \
DATABASE_URL="mysql://..." \
CJS_UID_MAP_FILE="./data/drupal_uid_cjs_uid_map.json" \
npm run migrate:drupal

# Ou phase par phase (recommandé pour un premier passage)
npm run migrate:drupal:profils
npm run migrate:drupal:contenus
```

La migration est **idempotente** : relancer ne crée pas de doublons (`cjsUid` unique sur `ProfilJeune`, `drupalNid` unique sur les contenus).

### Étape 6 — Vérification

```bash
# Compter les enregistrements créés
mysql -h prod-host -u admin -p guichet_jeunesse <<'SQL'
SELECT 'utilisateurs'  t, COUNT(*) n FROM utilisateurs
UNION ALL SELECT 'profils_jeunes', COUNT(*) FROM profils_jeunes
UNION ALL SELECT 'opportunites (Drupal)', COUNT(*) FROM opportunites WHERE drupal_nid IS NOT NULL
UNION ALL SELECT 'evenements (Drupal)', COUNT(*) FROM evenements WHERE drupal_nid IS NOT NULL
UNION ALL SELECT 'ressources (Drupal)', COUNT(*) FROM ressources WHERE drupal_nid IS NOT NULL;
SQL
```

Un écart > 5 % entre le dry-run et le run réel mérite investigation.

### Étape 7 — Backfill téléphones SSO (API)

Le script appelle `PATCH /users/{uuid}` avec `only_if_null=true` (n'écrase jamais) et `silent=true` (court-circuite le webhook `user.updated` pour ne pas saturer les plateformes abonnées avec 22 000 notifications).

```bash
SSO_BASE_URL=... SSO_API_KEY=... SSO_API_SECRET=... SSO_ADMIN_TOKEN=... \
DRUPAL_DB_URL="mysql://..." \
npm run migrate:phones -- --concurrency=5
```

Sortie : `data/backfill_phones_report_<ts>.json` avec compteurs `ok / notFound / errors`.

---

## Phases de l'ETL (`migrate-drupal.ts`)

| Phase | `--phase=` | Contenu migré | Table Guichet |
|-------|-----------|---------------|---------------|
| 1 | `profils` | ProfilJeune (référence à l'Utilisateur SSO) | `profils_jeunes` |
| 2 | `opportunites` | Offres d'emploi, stages, formations, bourses | `opportunites` |
| 3 | `evenements` | Événements, ateliers, webinaires, conférences | `evenements` |
| 4 | `ressources` | Documents, vidéos, guides, outils | `ressources` |

> Les données démographiques (genre, région, date de naissance, commune) sont portées par la table `utilisateurs` — elles arrivent via `sync-utilisateurs-sso.ts` depuis le SSO, pas via `migrate-drupal.ts`.

### Options disponibles

```bash
# Phase spécifique
DRUPAL_DB_URL="..." npm run migrate:drupal -- --phase=profils

# Limiter à N enregistrements (debug/validation)
DRUPAL_DB_URL="..." npm run migrate:drupal -- --limit=50 --dry-run

# Bypasser le pre-flight (déconseillé hors debug)
DRUPAL_DB_URL="..." npm run migrate:drupal -- --skip-preflight
```

---

## Pre-flight automatique

`migrate-drupal.ts` exécute des vérifications avant chaque run :

| Vérification | Seuil bloquant |
|---|---|
| `_prisma_migrations` accessible | Erreur si inaccessible |
| Nombre d'Utilisateurs en DB | Erreur si 0 |
| Ratio Utilisateurs / mappés | Avertissement si < 80 % |

Si le pre-flight échoue, le message indique exactement quelle étape relancer. Bypasser avec `--skip-preflight` uniquement en cas de run partiel contrôlé (`--phase=opportunites` après que les profils sont déjà migrés).

---

## Mappings appliqués

### Genre
| Drupal | Guichet |
|--------|---------|
| `homme` / `m` / `male` | `M` |
| `femme` / `f` / `female` | `F` |
| autre / null | `null` |

### Région
Normalisation vers les codes enum Prisma (`Dakar`, `Thies`, `Saint_Louis`…). Les valeurs non reconnues sont ignorées (`null`).

### Domaine
Détection par mots-clés sur le libellé Drupal. Valeur par défaut : `Autre`.

### Type d'opportunité
Détection sur `field_type_opportunite` en priorité, puis sur le type de nœud Drupal. Défaut : `Emploi`.

### Statut événement
| Condition | Statut |
|---|---|
| Publié + date future | `a_venir` |
| Publié + date passée | `termine` |
| Non publié | `annule` |

---

## Gestion des anomalies

### `node_field_data` absente du dump Drupal
Le dump `cjs_prod_db.sql` (2026-05-06) ne contient que les tables utilisateurs. Les phases 2/3/4 détectent l'absence de `node_field_data` et se terminent proprement avec un avertissement — elles ne font pas échouer le script. Pour migrer les contenus, fournir un dump Drupal complet avec les tables `node_*`.

### Utilisateurs non-mappés (compteur `notMapped`)
Utilisateurs Drupal actifs sans correspondance dans `drupal_uid_cjs_uid_map.json`. Deux causes possibles :
1. Compte Drupal créé **après** la génération du mapping → regénérer le mapping et relancer l'étape 2
2. Utilisateur Drupal jamais importé dans le SSO → traitement manuel ou exclure volontairement

### Utilisateurs absents en DB Guichet (compteur `utilisateurAbsent`)
Le `cjsUid` est dans le mapping mais l'`Utilisateur` n'existe pas en DB Guichet. Cause : `sync-utilisateurs-sso.ts` non exécuté ou incomplet. **Relancer l'étape 3.**

### Conflit email / téléphone lors du sync SSO
Un `Utilisateur` existe déjà en DB avec le même email ou téléphone sous un autre `cjsUid`. Ces cas sont comptés dans `skipped` et logués. Ils indiquent des comptes doublons côté SSO — à résoudre manuellement sur le serveur SSO avant le run final.

---

## Rollback

La migration ne touche pas la base Drupal (lecture seule). Pour annuler côté Guichet :

```sql
-- Supprimer uniquement les données issues de Drupal
DELETE FROM profils_jeunes WHERE created_at < '2026-05-19';  -- adapter la date
DELETE FROM opportunites   WHERE drupal_nid IS NOT NULL;
DELETE FROM evenements     WHERE drupal_nid IS NOT NULL;
DELETE FROM ressources     WHERE drupal_nid IS NOT NULL;

-- Rollback des Utilisateurs créés par sync-utilisateurs-sso
-- ATTENTION : ne supprimer que ceux qui n'ont jamais utilisé l'application
-- (pas de candidatures, pas de messages WhatsApp, pas d'inscriptions)
DELETE FROM utilisateurs
WHERE drupal_uid IS NOT NULL
  AND cjs_uid NOT IN (SELECT DISTINCT cjs_uid FROM candidatures)
  AND cjs_uid NOT IN (SELECT DISTINCT cjs_uid FROM inscriptions_evenements);
```

Pour le backfill téléphones SSO, il n'y a pas de rollback automatique — le fichier `data/backfill_sso_phones.sql` sert de trace des UIDs modifiés.

---

## Checklist prod

```
[ ] Backup DB Guichet prod effectué
[ ] npx prisma migrate status → "Database schema is up to date!"
[ ] DRUPAL_DB_URL configuré (accès read-only confirmé)
[ ] SSO_DB_URL configuré (accès read-only confirmé)
[ ] DATABASE_URL pointe sur la base prod Guichet

[ ] Étape 1 : data/drupal_uid_cjs_uid_map.json présent (>20 000 entrées)
[ ] Étape 2 : create_sso_accounts.sql appliqué côté SSO
[ ] Étape 2 : drupal_uid_cjs_uid_map_updated.json copié → drupal_uid_cjs_uid_map.json
[ ] Étape 3 : migrate:sso:sync terminé sans erreur (0 erreurs, 0 conflits bloquants)
[ ] Étape 4 : dry-run → Utilisateur absent = 0, erreurs = 0
[ ] Étape 5 : migration réelle exécutée
[ ] Étape 6 : totaux vérifiés en SQL (écart < 5 % vs dry-run)

[ ] (optionnel) Étape 7 : backfill_sso_phones.sql généré, relu et appliqué côté SSO
```
