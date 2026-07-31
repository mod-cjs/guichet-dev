# ETL Data Hub — Guichet Jeunesse CJS

Pipeline Meltano qui recopie chaque nuit les données du Guichet dans l'entrepôt
PostgreSQL du Data Hub. Spec complète : [`.agent_context/specs/M13-etl-meltano.md`](../.agent_context/specs/M13-etl-meltano.md).

```
MariaDB (Guichet) → API /api/v1/export → tap-guichet → target-postgres → dbt → BI
```

Le tap est le **seul** consommateur de l'API d'export. Les outils BI lisent PostgreSQL,
jamais le Guichet.

## Le contrat est la source

Aucun flux n'est écrit en dur ici. `tap_guichet/streams.json` est **généré** depuis le
contrat d'export TypeScript ([`src/lib/datahub/streams.ts`](../src/lib/datahub/streams.ts)) :

```bash
npm run datahub:tap    # depuis la racine du dépôt
```

Un test échoue si le fichier committé diverge de sa régénération. Ajouter un flux au Data
Hub ne demande donc de toucher ni au tap, ni à `meltano.yml` — seulement au contrat, qui
est vérifié par `tsc` et par les gardes de confidentialité.

Les descriptions rédigées dans `schema.prisma` voyagent jusqu'au catalogue Singer et
jusqu'à `dbt docs`.

⚠ **Elles n'atterrissent PAS automatiquement en commentaires de colonnes PostgreSQL sur la
couche brute.** Les targets Singer ne posent pas de `COMMENT` — à vérifier si un jour un
variant le fait. Le dictionnaire consultable repose donc sur deux mécanismes distincts :
`dbt docs generate` pour tout le périmètre, et `persist_docs` (activé dans
`dbt_project.yml`) qui écrit les `COMMENT` sur les **modèles dbt** — ceux que lisent les
outils BI.

## Démarrer

```bash
cd etl
pipx install meltano            # ou pip install meltano
meltano install

export TAP_GUICHET_AUTH_TOKEN="…"        # secret de la clé Data Hub
export TARGET_POSTGRES_HOST="…"          # etc.

meltano run tap-guichet target-postgres
```

**Aucun secret dans `meltano.yml`.** Les identifiants viennent de l'environnement du
runner qui exécute le pipeline : le dépôt porte le code et la configuration, jamais les
accès. Une compromission du dépôt produit ne doit pas ouvrir l'entrepôt.

## Deux réglages à ne pas toucher à la légère

**`lookback_minutes`** — recouvrement appliqué au dernier point d'arrêt. Le mettre à zéro
fait perdre des lignes en silence : la colonne de réplication est posée à l'écriture
applicative et non au commit, donc une transaction ouverte avant le point d'arrêt et
committée après porte un horodatage antérieur et ne serait jamais extraite.

**`load_method: upsert`** côté loader — c'est lui qui absorbe les doublons que le
recouvrement produit volontairement. En `append`, l'entrepôt accumulerait des doublons à
chaque run.

## Vérifier qu'un run a tout extrait

« Le pipeline n'a pas planté » et « le pipeline a tout extrait » sont deux choses
différentes. Après un run :

```bash
curl -H "Authorization: Bearer $TAP_GUICHET_AUTH_TOKEN" \
  "https://guichet.cjs.sn/api/v1/export/counts?since=<début du run>"
```

À comparer aux `COUNT(*)` de l'entrepôt sur la même fenêtre.

## Modélisation dbt

`transform/models/sources.yml` est **généré** comme le manifeste du tap
(`npm run datahub:dbt`), avec descriptions, tier de gouvernance, tests d'unicité sur les
clés et détection de fraîcheur.

Il n'y a **pas de couche staging**. C'est délibéré : le renommage et le typage qu'elle
assure habituellement ont déjà eu lieu dans le contrat d'export. Une couche de plus ne
ferait que recopier des colonnes déjà propres.

Les marts couvrent GUIC-149 : `v_users_summary`, `v_opportunities_summary`,
`v_centers_summary`, `v_programs_summary`.

## Limites connues

**Rattachements des programmes.** `v_programs_summary` est livré dégradé. Les compteurs
demandés par GUIC-149 vivent dans cinq tables de jonction sans horodatage ni clé primaire
simple — aucun watermark n'y est disponible, donc le contrat ne peut pas les servir. Deux
issues, à arbitrer : une migration ajoutant des horodatages, ou un support de la
réplication FULL_TABLE dans le contrat. La seconde est recommandée : ces tables sont
petites, et modifier le schéma métier pour satisfaire l'outillage se paie ailleurs.

**Suppressions dures.** Les cascades ne sont pas capturables par watermark. Le traitement
retenu est un rafraîchissement hebdomadaire des clés seules, qui permet à dbt de marquer
les absents — non encore implémenté (spec §8.5).
