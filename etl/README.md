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

Les descriptions rédigées dans `schema.prisma` voyagent jusqu'au bout : Singer les propage
dans le catalogue et le loader les écrit en commentaires de colonnes PostgreSQL.

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

## Limite connue

Les suppressions dures (cascades) ne sont pas capturables par watermark. Le traitement
retenu est un rafraîchissement hebdomadaire des clés seules, qui permet à dbt de marquer
les absents — non encore implémenté (spec §8.5).
