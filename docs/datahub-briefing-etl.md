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

Planification recommandée — une crontab plutôt qu'un conteneur permanent : le pipeline est
un batch, et un service qui tourne sans rien faire masque les échecs.

```cron
30 2 * * * cd /srv/guichet && docker compose --env-file .env -f docker-compose.etl.yml \
  run --rm meltano run tap-guichet target-postgres >> /var/log/datahub.log 2>&1
```

**Après chaque run**, comparer `/api/v1/export/counts?since=<début du run>` aux `COUNT(*)`
de l'entrepôt sur la même fenêtre. « Le pipeline n'a pas planté » et « le pipeline a tout
extrait » sont deux choses différentes : une extraction incrémentale mal bornée se termine
proprement en ayant perdu des lignes.

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
| 401 sur tous les flux | `DATAHUB_API_KEYS` absente **côté Guichet**, ou token erroné |
| Le tap s'arrête après une page | `meta.next_cursor` absent — vérifier que l'URL vise bien la route du contrat |
| Doublons dans l'entrepôt | `load_method` n'est pas `upsert` |
| Tout est réextrait à chaque run | `MELTANO_DATABASE_URI` non défini : l'état est perdu avec le conteneur |
| `Invalid time value` côté API | Dates `0000-00-00` en base source — lancer `npm run datahub:preflight` côté Guichet |
| Lignes manquantes sans erreur | `lookback_minutes` à 0, ou pagination modifiée |

**Avant toute mise en service** : `npm run datahub:preflight` depuis l'environnement
Guichet (pas depuis le serveur ETL — il contrôle MariaDB, pas l'entrepôt). 30 contrôles :
dates de réplication valides, intégrité des jonctions, index composites, clé configurée.

## 13. Références dans le dépôt Guichet

| Fichier | Rôle |
|---|---|
| `.agent_context/specs/M13-etl-meltano.md` | Spec complète et arbitrages |
| `etl/README.md` | Projet Meltano |
| `etl/meltano.yml` | Configuration du pipeline |
| `docs/openapi/datahub-v1.yaml` | Contrat d'API (généré) |
| `src/lib/datahub/streams.ts` | **Contrat d'export — point de contrôle CDP** |
| `scripts/datahub/preflight.ts` | Contrôles de mise en service |
