# M13 — API d'export Data Hub & pipeline ETL Meltano

**Epic** GUIC-13 · **Story** GUIC-36 · **Module** `m13-data`
**Statut** : arbitrages tranchés (§14) — spec à valider avant tout code
**Entrepôt cible** : PostgreSQL · **Orchestrateur** : Meltano (Singer) · **Emplacement** : `etl/` (monorepo)
**Consommateur unique de l'API** : le tap Meltano

---

## 1. Objectif

Permettre au Data Hub CJS d'extraire, de façon **incrémentale, fiable et traçable**, les
données produites par le Guichet Jeunesse, via l'API REST `/api/v1/export/`, vers un
entrepôt PostgreSQL alimenté par Meltano.

Le besoin métier est celui de GUIC-36 : *« En tant que Data Steward je veux un Data Hub
centralisé exposant les données via API REST afin de permettre aux outils BI de consommer
les données CJS »*.

**Périmètre de cette spec** : tout ce qui vit dans le dépôt Guichet. La modélisation dbt
et les vues matérialisées (GUIC-149) sont décrites au §9 sous forme de contrat d'interface,
mais leur implémentation appartient au dépôt Data Hub.

---

## 2. État des lieux vérifié

| Élément | Constat |
|---|---|
| `/api/v1/export/utilisateurs` | Stub 18 lignes, `data: []`, garde d'auth faible (GUIC-631) |
| `/api/v1/export/formations` | Stub 18 lignes, garde faible |
| `/api/v1/export/opportunites` | Implémentée, DTO plat DP7, **pagination offset**, garde durcie |
| `/api/v1/export/programmes` | Implémentée, agrégats, **aucune pagination**, garde durcie |
| `docs/openapi/datahub-v1.yaml` | 135 lignes, écrit à la main, déjà partiellement désynchronisé |
| Commentaires en base | **Aucun** — 0 `COMMENT` dans les 66 migrations |
| Doc du schéma | 110 `///` + 194 `//` dans `schema.prisma`, invisibles hors du dépôt |
| Watermarks | 45 modèles sur 72 sans `updatedAt` |

**Vérifications empiriques menées** :
- Prisma 7.8 ne génère **aucune** clause `COMMENT` à partir des `///` (testé via `migrate diff`).
- Les `///` sont **invisibles au moteur de diff** (diff entre schéma commenté et non commenté = migration vide).
- `@prisma/internals` n'est plus installé en Prisma 7 → le parsing du schéma se fera par un parseur dédié.

---

## 3. Décisions d'architecture

### DA-1 — Tap Singer custom plutôt que tap générique
`tap-rest-api-msdk` ne couvre pas le curseur opaque + le lookback. Un tap construit avec le
Meltano SDK (`tap-guichet`) donne le contrôle sur la pagination, l'état et les schémas, pour
un coût marginal une fois la classe de base écrite.

*Alternative écartée* : `tap-mysql` en CDC binlog — techniquement supérieur (capture les
DELETE, aucun problème de watermark), mais suppose d'ouvrir une réplique MariaDB au Data Hub
et **prive du contrôle champ par champ exigé par la CDP**. L'API reste le bon choix ici.

### DA-2 — Pagination keyset, jamais offset
L'offset est incorrect sous écriture concurrente : une insertion pendant l'extraction décale
les pages et une ligne peut n'être jamais lue. Le curseur keyset `(replication_key, id)`
n'a pas ce défaut et reste en O(log n) en profondeur.

### DA-3 — Le contrat d'export est du TypeScript typé, la prose vit dans `schema.prisma`
- `///` dans `schema.prisma` = **la description** de chaque colonne. Domicile unique, exportée ou non.
- `src/lib/export/streams.ts` = **la sélection** : quelles colonnes, sous quel nom, quel tier, quelle transformation.
- Un générateur joint les deux et produit cinq artefacts (§7).

Ce découpage garantit qu'aucune description n'est dupliquée et que toute erreur de sélection
est une erreur de compilation.

### DA-4 — Le Data Hub ne reçoit jamais de PII directe
Deux tiers exportables et une liste d'interdiction (§6). Il n'existe pas de tier
« opérationnel » : aucune clé, quelles que soient ses permissions, ne peut obtenir un nom,
un téléphone, un e-mail, une date de naissance brute, une IP, un CV ou un texte libre saisi
par un jeune.

### DA-5 — Les suppressions sont émises, pas filtrées
`Utilisateur` et `Opportunite` sont en soft-delete. Les filtrer (comportement actuel de
`opportunites/route.ts`) laisse des fantômes indéfiniment dans l'entrepôt. Elles sortent avec
`deleted_at` renseigné et l'entrepôt applique la suppression.

---

## 4. Prérequis de schéma

Le périmètre est **plus étroit qu'estimé initialement** — vérification faite, `CheckIn`
(`effectueA`) et `InscriptionEvenement` (`inscritA` + `updatedAt`) portent déjà des
watermarks exploitables.

### 4.1 Colonnes à ajouter

| Modèle | Manque | Justification |
|---|---|---|
| `Reservation` | `updatedAt` | Mutable (`statut`, `decisionA`, `annuleeA`) — sans watermark, incrémental impossible |
| `Emprunt` | `updatedAt` | Mutable (`statut`, `confirmeA`, `renduA`) |

Backfill : `UPDATE … SET updated_at = created_at`.

### 4.2 Index composites à créer

Un index par stream, sur `(replication_key, id)`. **Sans eux, chaque page déclenche un
filesort sur la table entière** et toute mesure de débit est sans valeur.

| Modèle | Index |
|---|---|
| `Utilisateur` | `(updated_at, cjs_uid)` |
| `ProfilJeune` · `Opportunite` · `Candidature` · `Evenement` · `InscriptionEvenement` · `Centre` · `Ressource` · `Programme` | `(updated_at, id)` |
| `Reservation` · `Emprunt` | `(updated_at, id)` — après 4.1 |
| `CheckIn` | `(effectue_a, id)` |
| `Consultation` | `(created_at, id)` |

---

## 5. Streams v1

13 streams. `type` : **M** = mutable (incrémental sur `updated_at`), **A** = append-only.

| Stream | Modèle | PK | Replication key | Type | Soft delete |
|---|---|---|---|---|---|
| `utilisateurs` | `Utilisateur` | `cjs_uid` | `updated_at` | M | oui |
| `profils_jeunes` | `ProfilJeune` | `id` | `updated_at` | M | — |
| `opportunites` | `Opportunite` | `id` | `updated_at` | M | oui |
| `candidatures` | `Candidature` | `id` | `updated_at` | M | — |
| `evenements` | `Evenement` | `id` | `updated_at` | M | — |
| `inscriptions_evenements` | `InscriptionEvenement` | `id` | `updated_at` | M | — |
| `centres` | `Centre` | `id` | `updated_at` | M | — |
| `reservations` | `Reservation` | `id` | `updated_at` | M | — |
| `checkins` | `CheckIn` | `id` | `effectue_a` | A | — |
| `ressources` | `Ressource` | `id` | `updated_at` | M | — |
| `consultations` | `Consultation` | `id` (BigInt) | `created_at` | A | — |
| `emprunts` | `Emprunt` | `id` | `updated_at` | M | — |
| `programmes` | `Programme` | `id` | `updated_at` | M | — |

**Hors périmètre v1** : `Message`, `Conversation`, `MessageWhatsApp`, `YayeTranscriptTurn`
(contenus conversationnels — valeur analytique faible au regard du risque CDP),
`AgentLog` (à rouvrir en v2 pour le suivi d'usage de Yaye, métadonnées seules),
tables de jonction et sous-types polymorphiques (aplatis dans leur parent).

---

## 6. Modèle de confidentialité

### 6.1 Tiers

| Tier | Définition | Exemples |
|---|---|---|
| `public` | Aucune ré-identification, même par croisement | `region`, `genre`, `tranche_age`, `statut`, `pipeline_stage`, compteurs, dates |
| `pseudonyme` | Contient une clé de jointure permettant de relier les lignes entre streams | `cjs_uid`, `opportunite_id`, `centre_id` |
| *(interdit)* | Jamais exporté, quelle que soit la clé | voir 6.2 |

**Arbitrage validé** : le `cjs_uid` descend dans l'entrepôt. Sans lui, aucune jointure entre
streams n'est possible et l'entrepôt ne sait produire que des comptages par dimension — pas
de parcours individuel, pas de funnel de candidature, pas de mesure de fréquentation par
jeune. C'est la contrepartie assumée : **l'entrepôt PostgreSQL entre dans le périmètre CDP**
et hérite des obligations correspondantes :

- déclaration du traitement au même titre que la base du Guichet ;
- chiffrement au repos et accès nominatif restreint aux profils Data Steward ;
- durée de conservation alignée sur celle du Guichet, avec purge propagée ;
- une demande d'effacement CDP doit être honorée dans l'entrepôt comme dans la source
  (cf. §8.5 — le full-refresh hebdomadaire des clés est le mécanisme qui le permet).

Ces obligations sortent du dépôt Guichet mais conditionnent la conformité de l'ensemble :
à porter au dossier CDP avant la première extraction en production.

### 6.2 Liste d'interdiction — testée, indépendante de l'allowlist

`nom` · `prenom` · `telephone` · `email` · `dateNaissance` (brut) · `consentIp` ·
`cvUrl` · `lettreMotivation` · `biographie` · `formulaireData` · `photoUrl` ·
tout contenu de message.

`dateNaissance` est exportée uniquement sous forme dérivée `tranche_age`.

### 6.3 Clé API — profil unique

**Arbitrage validé** : le tap Meltano est le **seul** consommateur de l'API. PostgreSQL
devient la seule source des outils BI, qui s'y branchent directement et ne touchent jamais
l'API du Guichet.

| Profil | Tiers | Quota | Usage |
|---|---|---|---|
| `etl-machine` | `public` + `pseudonyme` | 300 / minute | tap Meltano — unique consommateur |

Le « rate limit 100/h » de GUIC-150 visait des outils BI branchés en direct : ce cas d'usage
disparaît. Appliqué au tap, ce quota rendrait l'extraction de `consultations` impossible
(1 M de lignes ≈ 1000 requêtes ≈ 10 heures).

Conséquence de simplification : ni négociation de format, ni profil de permissions multiple,
ni pagination « conviviale ». L'API n'a qu'un client, connu et versionné avec elle.

### 6.4 Traçabilité

Chaque appel d'export écrit dans `AuditLog` : identifiant de clé, stream, `since`, nombre de
lignes servies. Exigence de traçabilité des accès en cas de contrôle CDP.

---

## 7. Le générateur

`npm run datahub:generate` lit `streams.ts` + les `///` de `schema.prisma` et produit :

| Artefact | Consommateur |
|---|---|
| `src/lib/export/generated/descriptors.ts` | `keysetExport()` — select Prisma, mapping, tri |
| `docs/openapi/datahub-v1.yaml` | GUIC-151 — Swagger, `description` par propriété |
| `etl/tap-guichet/**/schemas/*.json` | Singer — descriptions propagées jusqu'aux colonnes Postgres |
| `etl/transform/models/sources.yml` | dbt — `description` + `meta.tier` |
| `scripts/db/comments.sql` | `ALTER TABLE … COMMENT` pour **toutes** les colonnes |

**Artefacts committés** + étape CI qui régénère et échoue si le diff n'est pas vide. Sans
cette étape, les cinq artefacts divergent en quelques sprints.

### 7.1 Le contrat

```ts
// src/lib/export/streams.ts
export const streams = {
  utilisateurs: defineStream('Utilisateur', {
    primaryKey: ['cjsUid'],
    replicationKey: 'updatedAt',
    softDelete: 'deletedAt',
    fields: {
      cjsUid:        { as: 'cjs_uid',          tier: 'pseudonyme' },
      region:        { as: 'region',           tier: 'public' },
      genre:         { as: 'genre',            tier: 'public' },
      dateNaissance: { as: 'tranche_age',      tier: 'public', transform: trancheAge },
      statut:        { as: 'statut',           tier: 'public' },
      createdAt:     { as: 'date_inscription', tier: 'public' },
      updatedAt:     { as: 'updated_at',       tier: 'public' },
    },
  }),
} satisfies StreamRegistry
```

`defineStream` est générique sur le nom du modèle. Garanties à la compilation :
- une clé de `fields` qui n'est pas une colonne du modèle → erreur `tsc` ;
- une `transform` dont la signature ne correspond pas au type Prisma de la colonne → erreur `tsc` ;
- une `replicationKey` qui n'est pas une colonne `DateTime` du modèle → erreur `tsc`.

**Fail-closed** : ce qui n'est pas listé n'est jamais exporté.

### 7.2 Échappatoire

L'export plat DP7 des opportunités (10 sous-types polymorphiques préfixés,
`src/lib/opportunites/dto.ts`, 505 lignes) est de la logique métier, non générable.
Il reste en `transform` au niveau du stream. Le générateur couvre les 12 autres.

### 7.3 Commentaires MariaDB — précaution

MariaDB n'a pas de `COMMENT ON COLUMN` : il faut `ALTER TABLE … MODIFY COLUMN <définition
complète> COMMENT '…'`. Or toute migration Prisma ultérieure touchant une colonne émet un
`MODIFY COLUMN` **sans** clause `COMMENT` et efface le commentaire silencieusement.

D'où : les commentaires ne sont jamais écrits à la main en base ; `comments.sql` est
idempotent et rejoué après chaque `prisma migrate deploy`. Les définitions sont reconstruites
depuis `information_schema.COLUMNS` (jamais retraduites à la main depuis les types Prisma).

Limites : 1024 caractères par commentaire de colonne, 2048 par table ; commentaires
multi-lignes à aplatir ; apostrophes à échapper ; les valeurs d'enum ne sont pas commentables
en MySQL et restent documentées dans les artefacts générés.

---

## 8. L'API d'extraction

### 8.1 Contrat

```
GET /api/v1/export/{stream}?since=<ISO>&cursor=<opaque>&limit=<n>
Authorization: Bearer <clé scopée>
```

```jsonc
{
  "data": [ … ],
  "meta": {
    "next_cursor": "eyJ0Ijoi…",   // null quand terminé
    "has_more": true,
    "replication_key": "updated_at",
    "generated_at": "2026-07-30T09:00:00.000Z"
  }
}
```

Pas de `total` : un `COUNT(*)` par page coûterait plus cher que la page elle-même.

### 8.2 Invariants

1. **Tri total déterministe** : `ORDER BY replication_key ASC, id ASC`.
2. **Curseur keyset** encodant `(timestamp ms, id)`, opaque, validé strictement (400 si malformé).
3. **Lookback de 5 minutes** côté tap : `updated_at` est posé à l'écriture applicative, pas au
   commit — une transaction ouverte avant le bookmark et committée après ne serait jamais
   extraite. L'upsert de l'entrepôt absorbe les doublons.

Ces trois invariants portent toute la fiabilité. Si l'un saute, l'extraction perd des lignes
sans erreur visible.

### 8.3 Pièges identifiés

- **BigInt** — `Consultation` et `CentreEvent` ont un `id` BigInt. `JSON.stringify` le refuse :
  sérialisation en `String`, mais comparaison **numérique** dans le curseur (sinon `"9" > "10"`
  et l'extraction saute des lignes). Le descripteur porte le type de la clé.
- **`dynamic = 'force-dynamic'`** obligatoire sur la route : sans lui Next.js peut servir une
  réponse en cache et le tap boucle sur la même page. Plus `Cache-Control: no-store`.
- **Index composite** — la forme `OR` de la comparaison keyset n'exploite pas toujours l'index
  aussi bien que la comparaison de tuples `(a,b) > (x,y)` native de MySQL. À vérifier à
  l'`EXPLAIN` sur `consultations` ; si dégradation, c'est le cas où un `$queryRaw` se justifie —
  **à documenter comme exception dans `DECISIONS.md`**, la règle « toujours Prisma » du CLAUDE.md
  étant explicite.

### 8.4 Réconciliation

```
GET /api/v1/export/counts?since=<ISO>  →  { "utilisateurs": 22014, "candidatures": 4380, … }
```

Appelé en fin de pipeline et comparé aux `COUNT(*)` de l'entrepôt sur la même fenêtre.
Distingue « le pipeline n'a pas planté » de « le pipeline a tout extrait ».

### 8.5 Suppressions dures

Les cascades ne sont pas capturables par watermark. Traitement retenu à l'origine :
full-refresh hebdomadaire des clés seules, léger. **Implémenté au lot 7 du durcissement
(GUIC-700, `.agent_context/specs/M13-durcissement-etl.md`)** — révisé en un script autonome
(`scripts/datahub/purge-absents.ts`, Prisma direct + `psql`), pas un paramètre `?fields=`
exposé sur l'API publique : le comparatif clés source/entrepôt reste un usage strictement
interne, sans surface API supplémentaire à sécuriser. Écarté : un stream d'événements de
suppression, plus coûteux pour un besoin BI.

### 8.6 Format

**JSON uniquement.** Le CSV mentionné dans GUIC-150 sort du périmètre : il visait des outils
humains branchés en direct sur l'API, cas d'usage supprimé par l'arbitrage du §6.3. Singer
consomme du JSON ; l'export Excel se fait désormais depuis PostgreSQL.

NDJSON (`application/x-ndjson`, `ReadableStream`) à activer si la volumétrie de
`consultations` l'impose — permet des pages de 5–10k lignes sans buffériser la réponse sur
une fonction Vercel. **Déroge à la règle « payload max 50KB » du CLAUDE.md → à acter dans
`DECISIONS.md` comme exception Data Hub.**

---

## 9. Meltano et l'entrepôt

### 9.1 Projet — monorepo `etl/`

**Arbitrage validé** : le projet Meltano vit dans le dépôt Guichet.

```
etl/
  meltano.yml
  plugins/extractors/tap-guichet/     # tap Singer, schémas générés
  transform/                          # dbt-postgres
```

Motif : le générateur (§7) produit les schémas du tap et le `sources.yml` de dbt. Dans un
dépôt séparé, l'étape CI anti-dérive deviendrait une publication inter-dépôts — le genre de
mécanisme qu'on finit par désactiver, et on retombe sur des schémas désynchronisés du schéma
source. En monorepo, ajouter une colonne au Data Hub est **une seule PR** (migration, `///`,
`streams.ts`, schéma du tap, `sources.yml`).

Deux précautions obligatoires :

1. **Exclure `etl/` du build Vercel** — `.vercelignore` + `outputFileTracingExcludes`, sinon
   le déploiement Next embarque la toolchain Python.
2. **Aucun secret d'entrepôt dans la CI du Guichet** — le dépôt porte le code et la config ;
   les identifiants PostgreSQL vivent sur le runner qui exécute le pipeline. Sinon une
   compromission du dépôt produit ouvre l'entrepôt.

Réversibilité : si le Data Hub gagne une équipe dédiée, `etl/transform/` s'extrait proprement
(dbt est autonome) pendant que le tap reste collé au schéma source.

Extracteur `tap-guichet`, loader `target-postgres`, transformeur `dbt-postgres`.
Config : `api_url`, `auth_token` (secret, jamais dans `meltano.yml`), `start_date`,
`page_size`, `lookback_minutes`. State backend externalisé (pas la systemdb SQLite) si le
pipeline tourne en CI.

Cadence : quotidienne, conformément à GUIC-13 (« pipelines ETL quotidiens »).

### 9.2 Contrat avec dbt — couvre GUIC-149

GUIC-149 demande `v_users_summary`, `v_opportunities_summary`, `v_centers_summary`,
`v_programs_summary` avec rafraîchissement quotidien. Ces objets vivent **dans l'entrepôt**,
pas dans le Guichet : ce sont des modèles dbt (couche `marts`), matérialisés en table ou en
vue matérialisée, rafraîchis par le même run Meltano quotidien.

Le Guichet fournit le contrat : `sources.yml` généré, descriptions et `meta.tier` inclus.

### 9.3 Intégrité référentielle

Ne pas chercher à ordonner les streams : une candidature peut arriver avant son utilisateur.
L'entrepôt tolère des références temporairement pendantes ; les tests dbt signalent celles
qui persistent d'un run à l'autre.

---

## 10. Tests et critères d'acceptation

### 10.1 Garde-fous (bloquants en CI)

```
tests/unit/export-contract.test.ts
  ✓ toute colonne exportée porte un /// non vide dans schema.prisma
  ✓ aucun champ de la liste d'interdiction n'apparaît dans un stream
  ✓ chaque stream déclare une primaryKey et une replicationKey
  ✓ les artefacts générés sont à jour (diff vide après régénération)
```

Le premier test transforme « il faudrait documenter » en « on ne peut pas exporter une
colonne non documentée ».

### 10.2 Tests d'intégration par stream

- 401 sans clé · 401 avec clé invalide · **401 quand `DATAHUB_API_KEY` est absente côté serveur** (GUIC-631)
- 403 sur un stream hors scope de la clé
- un profil `bi-interactif` ne reçoit aucune colonne `pseudonyme`
- pagination : la concaténation des pages ne perd ni ne duplique de ligne
- `since` filtre bien ; un curseur malformé rend 400
- les lignes soft-deleted sortent avec `deleted_at` renseigné

Ces tests répondent aussi partiellement à GUIC-629 (routes d'export servant des données
personnelles sans aucun test).

### 10.3 Acceptation de bout en bout

`meltano run tap-guichet target-postgres` deux fois de suite : le second run n'extrait que
les lignes modifiées, et `counts` concorde avec l'entrepôt.

---

## 11. Découpage

**Prérequis** — GUIC-631 : propager la garde d'auth durcie aux 3 routes stub. 3 lignes,
avant toute implémentation, le ticket le dit lui-même.

| # | Lot | Livrable | Dépend de |
|---|---|---|---|
| 1 | Schéma | Migration `updated_at` (2 tables) + 13 index composites | — |
| 2 | Dictionnaire | Promotion des `///`, parseur, `comments.sql`, test de garde | — |
| 3 | Contrat | `streams.ts` typé + générateur + 5 artefacts + étape CI | 2 |
| 4 | Socle | `cursor.ts`, `keysetExport()`, auth scopée, rate limit 2 profils, audit | 1, 3 |
| 5 | Routes | Route dynamique `[stream]` + migration des 4 routes + `counts` | 4 |
| 6 | Doc (GUIC-151) | OpenAPI généré + guide consommateur | 3, 5 |
| 7 | Tap | `tap-guichet`, `meltano.yml`, `target-postgres` | 5 |
| 8 | dbt (GUIC-149) | Staging + marts, hors dépôt Guichet | 7 |

Ordre de mise en œuvre : le lot 1 bloque tout et est indépendant des arbitrages en attente.
Valider la chaîne de bout en bout sur **un seul stream** (`utilisateurs`, aujourd'hui un stub)
avant de généraliser aux douze autres.

---

## 12. Mises à jour JIRA proposées

À valider avant modification des tickets.

| Ticket | Proposition |
|---|---|
| GUIC-36 | 8 story points sous-estimés au regard du périmètre réel (contrat typé, générateur, keyset, tap, dictionnaire). Redécouper selon le §11. |
| GUIC-150 | Trois corrections issues des arbitrages : « rate limit 100/h » → 300/min, profil `etl-machine` unique (§6.3) ; **retirer le CSV** du périmètre (§8.6) ; ajouter incrémental, suppressions et réconciliation, absents du ticket. |
| GUIC-149 | Requalifier : les vues matérialisées vivent dans l'entrepôt, pas dans le Guichet. Devient un ticket dbt côté Data Hub (§9.2). |
| GUIC-151 | Deux corrections : l'OpenAPI est **généré**, non écrit à la main (le fichier actuel est déjà désynchronisé) ; le « guide Power BI / Metabase / Excel » ne documente plus l'API mais **la connexion à PostgreSQL** — les outils BI ne touchent plus le Guichet. |
| *(nouveau)* | Créer un ticket CDP : déclaration de l'entrepôt PostgreSQL comme traitement, `cjs_uid` y descendant (§6.1). Prérequis à la première extraction en production. |
| GUIC-631 | Traiter en prérequis du lot 1. |
| GUIC-629 | Les tests du §10.2 couvrent le volet export ; le reste (CV, profil, staff) demeure. |

---

## 13. Risques

| Risque | Traitement |
|---|---|
| Perte silencieuse de lignes (skew de commit) | Lookback 5 min + upsert idempotent + `counts` |
| Générateur non exécuté → artefacts divergents | Étape CI qui régénère et échoue sur diff non vide |
| Commentaires MariaDB effacés par une migration | `comments.sql` idempotent rejoué après chaque `migrate deploy` |
| Filesort sur `consultations` | Index composites (lot 1), `EXPLAIN` avant mise en service |
| Timeout Vercel sur gros volume | `limit` plafonné, NDJSON en réserve, premier full-refresh hors heures de trafic |
| Fuite PII par ajout de colonne | Fail-closed + liste d'interdiction testée |

---

## 14. Arbitrages tranchés

| # | Question | Décision | Effet sur la spec |
|---|---|---|---|
| 1 | Consommateurs de l'API | **Meltano uniquement** — PostgreSQL devient la seule source BI | Profil de clé unique (§6.3), CSV retiré (§8.6), GUIC-150 et GUIC-151 à corriger |
| 2 | `cjs_uid` dans l'entrepôt | **Autorisé** — jointures entre streams possibles | L'entrepôt entre dans le périmètre CDP, obligations listées au §6.1 |
| 3 | Emplacement du projet Meltano | **Monorepo `etl/`**, tap et dbt | §9.1, avec exclusion du build Vercel et secrets hors CI produit |

### Restent à préciser en cours de route

- **Volumétrie réelle** de `consultations` et `agent_logs` en production — décide de l'activation
  du NDJSON (§8.6) et du dimensionnement du premier full-refresh. Mesurable au lot 1 ; la base
  locale était arrêtée au moment de la rédaction.
- **`start_date` du tap** — quelle profondeur d'historique charger. Sans contrainte identifiée,
  la date de mise en production du Guichet.
