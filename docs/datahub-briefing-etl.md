# Briefing — pipeline ETL Data Hub (à transmettre tel quel)

Document autonome destiné à quelqu'un qui reprend l'exploitation du conteneur Meltano
sans connaître le dépôt Guichet. Tout ce qui est nécessaire pour faire tourner, vérifier
et dépanner le pipeline est ici.

---

## 1. Objectif

Extraire **périodiquement** les données du Guichet Jeunesse CJS vers une base **PostgreSQL**,
avec un **dictionnaire de données consultable**, afin d'y brancher des tableaux de bord.

## 2. Architecture

```
MariaDB (Guichet)
   │  API REST, HTTPS, clé Bearer
   ▼
GET /api/v1/export/{flux}        ← 13 flux, pagination par curseur
   │
   ▼
tap-guichet (Singer)  →  target-postgres  →  schéma « guichet_raw »
                                  │
                                  ▼
                            dbt  →  schéma « marts »  →  outils BI
```

Le tap est le **seul** consommateur de l'API. Les outils BI lisent PostgreSQL, jamais le
Guichet. Cadence prévue : **quotidienne**.

## 3. État au 2026-07-31

**Prêt** : l'API d'export (13 flux), le tap, le projet Meltano, les modèles dbt, les
générateurs de documentation. Vérifié contre la base réelle : 22 511 utilisateurs et
26 161 candidatures paginés intégralement, sans perte ni doublon.

**Pas encore fait** :
- aucun `meltano run` n'a jamais été exécuté — c'est là que se révèlent les écarts de
  version du SDK Singer ;
- PostgreSQL cible à créer ;
- `DATAHUB_API_KEYS` à poser sur le déploiement Guichet (voir §6) — **sans elle l'API
  refuse tout**, y compris avec un token correct côté tap.

## 4. Contrat de l'API

```
GET https://guichet.cjs.sn/api/v1/export/{flux}?since=<ISO>&cursor=<opaque>&limit=<n>
Authorization: Bearer <secret>
```

```jsonc
{
  "data": [ … ],
  "meta": {
    "next_cursor": "eyJ0Ijoi…",   // null en fin de flux
    "has_more": true,
    "replication_key": "updated_at",
    "generated_at": "2026-07-31T09:00:00.000Z"
  }
}
```

| Code | Sens |
|---|---|
| 401 | Clé absente, invalide, **ou non configurée côté serveur** |
| 404 | Flux inconnu |
| 400 | Curseur ou borne `since` malformés |
| 429 | Quota dépassé (300 requêtes/minute par clé) |

**Pas de `total`** : un `COUNT` par page coûterait plus cher que la page. Pour compter,
utiliser l'endpoint de réconciliation :

```
GET /api/v1/export/counts?since=<ISO>    → { "data": { "utilisateurs": 22511, … } }
```

Contrat détaillé et versionné : `docs/openapi/datahub-v1.yaml` (généré, ne pas éditer).

## 5. Les 13 flux

| Flux | Clé de réplication | Nature |
|---|---|---|
| `utilisateurs` | `updated_at` | mutable, suppression logique |
| `profils_jeunes` | `updated_at` | mutable |
| `opportunites` | `updated_at` | mutable, suppression logique |
| `candidatures` | `updated_at` | mutable |
| `evenements` | `updated_at` | mutable |
| `inscriptions_evenements` | `updated_at` | mutable |
| `centres` | `updated_at` | mutable |
| `reservations` | `updated_at` | mutable |
| `checkins` | `effectue_a` | append-only |
| `ressources` | `updated_at` | mutable |
| `consultations` | `created_at` | append-only, **plus gros volume attendu** |
| `emprunts` | `updated_at` | mutable |
| `programmes` | `updated_at` | mutable |

Les lignes supprimées logiquement **sortent** avec leur `deleted_at` renseigné : c'est
volontaire, pour que l'entrepôt propage la suppression au lieu de garder des fantômes.

**Aucune donnée personnelle directe n'est exportée** — ni nom, ni téléphone, ni e-mail,
ni date de naissance brute (seulement une tranche d'âge), ni CV, ni texte libre. Le
`cjs_uid` est exporté comme pseudonyme de jointure, ce qui fait entrer l'entrepôt dans le
périmètre CDP : accès restreint, chiffrement au repos, purge propagée.

## 6. Variables d'environnement

### Conteneur Meltano — minimum vital

```bash
TAP_GUICHET_AUTH_TOKEN=<secret>
TARGET_POSTGRES_HOST=<hôte>
TARGET_POSTGRES_PORT=5432
TARGET_POSTGRES_USER=<utilisateur>
TARGET_POSTGRES_PASSWORD=<mot de passe>
TARGET_POSTGRES_DATABASE=<base>
```

### Fortement recommandé

```bash
MELTANO_DATABASE_URI=postgresql://<user>:<mdp>@<hôte>:5432/<base>
```

Sans elle l'état vit dans un SQLite **interne au conteneur** : une recréation du conteneur
le perd, et le run suivant réextrait tout depuis le début.

### Optionnel — valeurs par défaut dans `meltano.yml`

| Variable | Défaut |
|---|---|
| `TAP_GUICHET_API_URL` | `https://guichet.cjs.sn` |
| `TAP_GUICHET_START_DATE` | aucun (tout l'historique) |
| `TAP_GUICHET_PAGE_SIZE` | `1000` (max serveur : 5000) |
| `TAP_GUICHET_LOOKBACK_MINUTES` | `5` |

### Pour dbt

`DBT_POSTGRES_HOST`, `_PORT`, `_USER`, `_PASSWORD`, `_DB` — mêmes valeurs que les
`TARGET_POSTGRES_*`. Doublon connu, à unifier.

### Côté Guichet (déploiement Vercel, PAS le conteneur)

```
DATAHUB_API_KEYS="meltano:<le même secret>"
```

Le nom avant les deux-points identifie le consommateur dans le journal d'audit. Plusieurs
entrées séparées par des virgules permettent une **rotation sans coupure**.

### Réconciliation automatisée (GUIC-697, lot 5)

```
WAREHOUSE_DATABASE_URL=postgresql://<user>:<mdp>@<hôte>:5432/<base>
```

Lue par `scripts/datahub/reconcile.ts`, appelé automatiquement par `run-nightly.sh` (§10)
après chaque `dbt build`. Sonde l'entrepôt via un conteneur `postgres:16-alpine --rm` — pas
de client PostgreSQL installé côté Guichet.

## 7. Trois invariants à ne jamais casser

**`lookback_minutes` ne doit jamais valoir 0.** La colonne de réplication est posée à
l'écriture applicative, pas au commit. Une transaction ouverte avant le point d'arrêt et
committée après porte un horodatage antérieur : sans recouvrement, elle n'est **jamais**
extraite. Aucune erreur ne le signale.

**`load_method: upsert`** côté loader. C'est lui qui absorbe les doublons que le
recouvrement produit volontairement. En `append`, l'entrepôt en accumule à chaque run.

**Ne pas remplacer le curseur par un offset.** L'offset pagine par rang, et le rang bouge :
une insertion pendant l'extraction décale les pages suivantes et une ligne passe entre deux
pages sans jamais être lue.

## 8. Le dictionnaire de données

Les descriptions sont écrites **une seule fois**, dans le schéma Prisma du Guichet, et
dérivées vers plusieurs cibles. Aucune n'est saisie à la main.

| Cible | Comment |
|---|---|
| Base MariaDB source | `npm run db:comments` — 41 tables, 142 colonnes |
| Contrat OpenAPI | `npm run datahub:openapi` |
| Catalogue Singer | `npm run datahub:tap` |
| Sources dbt | `npm run datahub:dbt` |
| **`dbt docs`** | `dbt docs generate && dbt docs serve` — **le dictionnaire consultable** |
| **`COMMENT` PostgreSQL** | `persist_docs` dans `dbt_project.yml`, **modèles dbt uniquement** |

`npm run datahub:generate` régénère les quatre premiers. Un test échoue si un artefact est
modifié à la main.

⚠ **Point de vigilance** : les targets Singer ne posent pas de `COMMENT` PostgreSQL. La
couche brute `guichet_raw` n'a donc pas de commentaires en base — sa documentation est dans
`dbt docs`. Seuls les **modèles dbt** (schéma `marts`) portent des `COMMENT`, et ce sont eux
que les outils BI doivent lire.

**Conséquence pour les tableaux de bord** : brancher les outils BI sur le schéma `marts`,
pas sur `guichet_raw`.

## 9. Modèles disponibles pour les tableaux de bord

| Modèle | Contenu |
|---|---|
| `v_users_summary` | Démographie par région, genre, tranche d'âge, statut |
| `v_opportunities_summary` | Offres et pression de candidature par domaine et région |
| `v_centers_summary` | Fréquentation des centres : passages badgés, réservations, absences |
| `v_programs_summary` | **Dégradé** — dimension programme seule (voir §11) |

## 10. Exploitation

```bash
# Diagnostic de configuration
meltano config tap-guichet list
meltano config target-postgres list

# Extraction
meltano run tap-guichet target-postgres

# Extraction + transformation
meltano run tap-guichet target-postgres dbt-postgres:run

# Dictionnaire consultable
meltano invoke dbt-postgres docs generate
```

### Joignabilité — deux règles à ne jamais mélanger (GUIC-700, tranché au premier run réel)

| Cible | Comment le tap/les scripts la joignent | Jamais |
|---|---|---|
| **Guichet** (l'app, pour le tap) | **URL publique HTTPS** (`TAP_GUICHET_API_URL`) — route machine-à-machine pensée pour être appelée de l'extérieur, comme BRM/Centres/Moodle/EduPop | `host.docker.internal` (l'app peut être verrouillée en loopback) ; un réseau Docker partagé avec l'app |
| **Entrepôt PostgreSQL** (pour `target-postgres`/dbt, et pour `psqlEntrepot`) | **Réseau Docker partagé** (`cjs-net` par défaut) — c'est un conteneur (`cjs_analytics_postgres` en préprod), pas un domaine public | Une URL publique (il n'y en a pas) |
| **MariaDB de l'app** (pour `reconcile.ts`/`purge-absents.ts`, côté Prisma) | **Le conteneur `app` lui-même**, via `docker compose run --rm --no-deps app` (`exec_via_app`, `scripts/etl/lib-app-exec.sh`) — `DATABASE_URL` peut pointer un nom de conteneur (`mariadb-test` en préprod), injoignable depuis un process nu sur l'hôte | `npm run` exécuté directement sur l'hôte ETL (piste qui semble naturelle, invalidée en la testant en réel : timeout de pool sans jamais résoudre l'hôte) |

`docker-compose.etl.yml` rejoint `cjs-net` pour la 2e ligne ; il ne touche à aucun réseau
de l'app pour la 1ère. La 3e ligne est différente des deux autres : elle n'a pas de service
dédié, elle réutilise le conteneur `app` du déploiement — voir plus bas.

### Chaîne planifiée (GUIC-697/700, lots 5 et 7)

Planification recommandée — une crontab plutôt qu'un conteneur permanent : le pipeline est
un batch, et un service qui tourne sans rien faire masque les échecs.

```cron
30 2 * * * cd /srv/guichet && GUICHET_ETL_ENV_FILE=.env.etl \
  WAREHOUSE_DATABASE_URL=postgresql://... \
  GUICHET_IMAGE=ghcr.io/adiop-consortiumjeunessesenegal-org-cjs/guichet@sha256:... \
  COMPOSE_PROJECT_NAME=guichet GUICHET_ENV_FILE=/etc/guichet/prod.env \
  scripts/etl/run-nightly.sh

0 1 * * 0 cd /srv/guichet && WAREHOUSE_DATABASE_URL=postgresql://... \
  GUICHET_IMAGE=ghcr.io/adiop-consortiumjeunessesenegal-org-cjs/guichet@sha256:... \
  COMPOSE_PROJECT_NAME=guichet GUICHET_ENV_FILE=/etc/guichet/prod.env \
  scripts/etl/purge-absents-weekly.sh
```

En préprod (deux compose combinés), ajouter aussi :
`GUICHET_COMPOSE_FILES="-f docker-compose.prod.yml -f docker-compose.test.yml"` et
`COMPOSE_PROJECT_NAME=guichet-test` — sans quoi la commande cible le service `app` de
production par défaut. `GUICHET_IMAGE`/`COMPOSE_PROJECT_NAME`/`GUICHET_ENV_FILE` sont les
**mêmes variables** qu'un déploiement normal (`docs/go-live-checklist.md`) : les copier
depuis le dernier déploiement effectué, pas en inventer de nouvelles.

La deuxième ligne (dimanche 1h, avant le nightly de 2h30) planifie la purge hebdomadaire des
clés absentes (`purge-absents.ts`, lot 7 GUIC-700) — un full-refresh des clés de tous les
flux, plus coûteux que l'extraction incrémentale quotidienne, donc une fréquence à part.
`scripts/etl/purge-absents-weekly.sh` et `run-nightly.sh` partagent le même contrat de log
(`scripts/etl/lib-log.sh`) : marqueur ✓/✗ horodaté, rotation par seuil de taille, code de
sortie non nul surveillé par l'alerting (GUIC-576) — sans cette ligne, `purge-absents.ts`
existait mais ne tournait jamais.

`scripts/etl/run-nightly.sh` chaîne trois étapes, chacune bloquante pour la suivante
(tout-ou-rien assumé, §4.1 B5 du rapport GUIC-693 : isoler l'échec par étape produirait des
runs **verts** avec un flux ou une transformation morte dedans) :

1. **Extraction** — `meltano run tap-guichet target-postgres`.
2. **Transformation et tests dbt** — `meltano invoke dbt-postgres build` (`build` = modèles
   **et** tests ensemble ; les 35 tests dbt n'étaient auparavant lancés par aucune commande
   documentée).
3. **Réconciliation automatisée** — `exec_via_app scripts/datahub/reconcile.ts <since>`
   (GUIC-700 : plus un `npm run` nu — voir tableau de joignabilité ci-dessus) : compare,
   flux par flux, un comptage Prisma côté Guichet à un comptage PostgreSQL côté entrepôt
   sur la fenêtre du run qui vient de se terminer. « Le pipeline n'a pas planté » et « le
   pipeline a tout extrait » sont deux choses différentes : une extraction incrémentale
   mal bornée se termine proprement en ayant perdu des lignes, silencieusement.
   **Piège vérifié en réel** : sur un `since` correspondant à l'instant même du démarrage
   du run, une comparaison à 0 des deux côtés est **triviale** (rien n'a eu le temps de
   changer), pas une preuve. Pour auditer un premier chargement complet (bookmark jamais
   posé), relancer manuellement avec un `since` ancien (ex. `1970-01-01T00:00:00.000Z`) et
   vérifier des comptages non nuls des deux côtés.

Chaque étape écrit un marqueur `✓`/`✗` horodaté dans `DATAHUB_LOG_FILE` (défaut
`/var/log/guichet/datahub-nightly.log`), avec rotation automatique par seuil de taille
(`DATAHUB_LOG_MAX_BYTES`, défaut 10 Mio). Un code de sortie non nul est ce que
l'alerting (GUIC-576) surveille sur ce log — même convention que `scripts/cron/run-job.sh`.

### Procédure de rejeu

Un run interrompu ou en écart de réconciliation ne se rejoue **pas** en relançant
`run-nightly.sh` tel quel si l'état Meltano a déjà avancé son bookmark au-delà du point
voulu : le recouvrement de 5 minutes absorbe les micro-décalages, pas un rejeu de plusieurs
heures.

```bash
# Voir l'état actuel du bookmark par flux
docker compose -f docker-compose.etl.yml run --rm meltano state get dev:tap-guichet-to-target-postgres

# Effacer l'état d'UN flux (le fait repartir en full-refresh à sa prochaine extraction) —
# jamais celui de tous les flux d'un coup, sauf incident majeur confirmé.
docker compose -f docker-compose.etl.yml run --rm meltano state clear dev:tap-guichet-to-target-postgres --state-id <flux>

# Rejouer manuellement une fenêtre précise (contourne temporairement le bookmark)
docker compose -f docker-compose.etl.yml run --rm meltano run tap-guichet target-postgres \
  --state-id-suffix rejeu-manuel
```

Après tout rejeu manuel : relancer `npm run datahub:reconcile <since>` avant de considérer
le pipeline de nouveau fiable.

## 11. Limites connues

**Rattachements des programmes.** `v_programs_summary` ne porte pas les compteurs attendus.
Ils vivent dans cinq tables de jonction sans horodatage ni clé primaire simple : aucun
watermark n'y est disponible, le contrat ne peut pas les servir. Résolution recommandée :
supporter une réplication `FULL_TABLE` (ces tables sont petites) plutôt que de modifier le
schéma métier pour satisfaire l'outillage. Non implémenté.

**Suppressions dures.** Les cascades ne sont pas capturables par watermark. Traitement
prévu, non implémenté : rafraîchissement hebdomadaire des clés seules pour que dbt marque
les absents.

**Volumétrie de `consultations`.** Faible sur la base de test (8 lignes), inconnue en
production. Si elle est forte, prévoir un premier run hors heures de trafic et surveiller
la durée. L'API accepte `limit` jusqu'à 5000.

## 12. Dépannage

| Symptôme | Cause probable |
|---|---|
| 401 sur tous les flux | `DATAHUB_API_KEYS` absente **côté Guichet**, ou token erroné, ou préfixe `meltano:` oublié (format `nom:secret`, sinon la clé entière est ignorée) |
| Le tap s'arrête après une page | `meta.next_cursor` absent — vérifier que l'URL vise bien la route du contrat |
| Doublons dans l'entrepôt | `load_method` n'est pas `upsert` |
| Tout est réextrait à chaque run | `MELTANO_DATABASE_URI` non défini : l'état est perdu avec le conteneur |
| `Invalid time value` côté API | Dates `0000-00-00` en base source — lancer `npm run datahub:preflight` côté Guichet, puis `scripts/sql/apply-repair.ts` si besoin |
| Lignes manquantes sans erreur | `lookback_minutes` à 0, ou pagination modifiée |
| `could not translate host name "..." to address` sur `meltano`/`psqlEntrepot` | L'entrepôt est un **conteneur**, pas un domaine — `docker-compose.etl.yml` doit rejoindre `cjs-net` (`networks:`), et `psqlEntrepot`/`scripts/datahub/psql-entrepot.ts` doit passer `--network` sur son `docker run` interne |
| `pool timeout: failed to retrieve a connection from pool` sur `reconcile.ts`/`purge-absents.ts` | Exécuté **nu sur l'hôte** : `DATABASE_URL` peut pointer un nom de conteneur (ex. `mariadb-test`), injoignable hors du réseau Docker de l'app. Utiliser `exec_via_app` (`scripts/etl/lib-app-exec.sh`), jamais `npm run` direct |
| `DATABASE_URL manquante` en lançant un script `datahub:*` à la main | `dotenv` charge `.env.local`, pas le fichier réel du serveur — `set -a; source /etc/guichet/xxx.env; set +a` avant, ou passer par `exec_via_app` |
| Une valeur de secret contient des guillemets littéraux (`"mysql://...`) | `docker run --env-file` ne retire **pas** les guillemets (contrairement à `docker compose`, ou à `source` en bash) — ne jamais utiliser `docker run --env-file` pour lire `test.env`/`prod.env` |
| `0/N flux en écart` triviaux (tous à 0, des deux côtés) sur un premier chargement | `since` = l'instant du run, donc rien n'a eu le temps de changer — vert par construction, pas une preuve. Relancer avec un `since` ancien pour un vrai comptage total |
| `npm: command not found` sur le serveur ETL | Node.js n'est pas garanti installé sur l'hôte — de toute façon, `reconcile.ts`/`purge-absents.ts` doivent passer par `exec_via_app`, pas par un `npm` hôte |

**Avant toute mise en service** : `npm run datahub:preflight` depuis l'environnement
Guichet (pas depuis le serveur ETL — il contrôle MariaDB, pas l'entrepôt). 58 contrôles :
dates de réplication valides, intégrité des jonctions, index composites, clé configurée,
`sql_mode` de connexion (GUIC-700 : posé côté code, `avecSqlModeStrict`, pas côté serveur),
état Meltano externalisé.

## 13. Références dans le dépôt Guichet

| Fichier | Rôle |
|---|---|
| `.agent_context/specs/M13-etl-meltano.md` | Spec complète et arbitrages |
| `etl/README.md` | Projet Meltano |
| `etl/meltano.yml` | Configuration du pipeline |
| `docs/openapi/datahub-v1.yaml` | Contrat d'API (généré) |
| `src/lib/datahub/streams.ts` | **Contrat d'export — point de contrôle CDP** |
| `scripts/datahub/preflight.ts` | Contrôles de mise en service |
| `scripts/etl/run-nightly.sh` | Orchestration planifiée : extraction → dbt → réconciliation |
| `scripts/etl/purge-absents-weekly.sh` | Orchestration planifiée hebdomadaire : purge des clés absentes |
| `scripts/etl/lib-log.sh` | Helpers de log partagés (✓/✗, rotation) entre les deux scripts ci-dessus |
| `scripts/etl/lib-app-exec.sh` | `exec_via_app` — exécute un script `datahub:*` via le conteneur `app` (GUIC-700, joignabilité MariaDB) |
| `scripts/datahub/reconcile.ts` | Réconciliation automatisée des comptages post-run |
| `scripts/datahub/purge-absents.ts` | Suppression physique des clés absentes de l'entrepôt (lot 7) |
| `scripts/datahub/psql-entrepot.ts` | Sonde `psql` de l'entrepôt (réseau `cjs-net`), partagée par les deux scripts ci-dessus |
| `scripts/sql/apply-repair.ts` | Applique `repair-donnees-poc.sql` via Prisma (pas de client MariaDB requis) |
| `.env.etl.example` | Gabarit des variables ETL attendues (jamais de vraie valeur — copier vers `.env.etl`/un fichier serveur) |
