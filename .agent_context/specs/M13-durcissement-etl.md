# M13 — Durcissement du pipeline ETL Data Hub

**Épic** GUIC-13 · **Story parente** GUIC-36 · **Module** `m13-data`
**Statut** : rapport d'épreuve — **aucun correctif appliqué**, arbitrage attendu point par point
**Base auditée** : `origin/dev` @ `695540da` (PR #321 mergée le 2026-08-02)
**Date de campagne** : 2026-08-03

---

## 1. Objet

Le pipeline livré par le lead dev (26 commits, GUIC-36) n'avait **jamais été exécuté** — le
briefing d'exploitation le dit lui-même (§3 : « aucun `meltano run` n'a jamais été exécuté »).
Cette campagne monte le système en local, le fait tourner de bout en bout, l'attaque, et
consigne ce qui tient et ce qui cède.

**Résultat en une phrase** : le cœur d'ingénierie est solide et a résisté à tout ce que je lui
ai opposé ; la chaîne d'exploitation autour, elle, ne survit pas à un deuxième run.

---

## 2. Le laboratoire (reproductible)

Monté **sans toucher** aux worktrees ni aux bases des sessions parallèles.

| Élément | Choix | Raison |
|---|---|---|
| Code | worktree `.claude/worktrees/etl-lab`, branche `feature/GUIC-36-etl-durcissement` depuis `origin/dev` | isolation du travail en cours sur les autres branches |
| `node_modules` | copie par liens durs, **sauf** `.prisma` et `@prisma/client` copiés en dur | `prisma generate` aurait écrasé le client partagé et cassé les sessions parallèles |
| Base source | `guichet_etl_lab`, clone de `guichet_rich` dans le conteneur `guichet_mariadb` existant | volumétrie POC réelle (22 510 utilisateurs, 26 161 candidatures) sans nouveau conteneur |
| Entrepôt | conteneur `etllab_postgres`, PostgreSQL 16, port 5433 | cible neuve, jetable |
| Meltano | image `etllab/meltano:3.7.9` construite sur `python:3.12-slim` | l'image officielle n'était pas récupérable ; 3.12 est la version compatible dbt 1.8 |
| Application | `next dev -p 3100` sur la base labo, clés `DATAHUB_API_KEYS` de test | — |

Volumétrie complétée : **50 000 consultations injectées**, dont **20 000 partageant exactement
le même horodatage**, pour exercer le chemin BigInt et le départage par clé primaire — la table
était vide dans le dump POC, donc le chemin le plus fragile n'avait aucune donnée pour le tester.

Démontage : `docker rm -f etllab_postgres`, `DROP DATABASE guichet_etl_lab`,
`git worktree remove .claude/worktrees/etl-lab`.

---

## 3. Ce qui tient — vérifié, pas supposé

Ces points ont été attaqués et n'ont pas cédé. Ils constituent le socle sur lequel le reste
peut être réparé.

**Pagination par curseur — intègre.** Extraction complète répétée sur `utilisateurs`
(22 510 lignes) en pages de 1 000, 999, 333 et 5 000 — donc avec des frontières de page
tombant délibérément **au milieu** des groupes de 1 000 lignes partageant le même `updated_at`.
Puis sur `consultations` (50 000 lignes, dont 20 000 au même horodatage) en pages de 1 000,
997 et 5 000. Puis sur `opportunites`. À chaque fois : **0 ligne perdue, 0 doublon,
0 inversion de tri**, et concordance exacte avec `COUNT(*)`. Le départage BigInt fonctionne :
aucune trace de comparaison lexicographique.

**Résistance aux écritures concurrentes.** 2 050 modifications injectées pendant une
extraction de 123 pages (poussée en avant du watermark de lignes déjà servies, toutes les
3 pages). Aucune des 22 510 lignes présentes au départ n'a été manquée.

**Authentification.** 11 attaques repoussées : absence d'en-tête, clé inexistante, `Bearer`
vide, schéma `Basic`, casse minuscule, troncature d'un caractère, suffixe ajouté, en-tête
`Authorization` dupliqué. La comparaison à temps constant sur empreintes de longueur fixe est
correctement implémentée, sans court-circuit à la première correspondance. Le fail-closed sur
configuration absente (GUIC-631) est réel.

**Fail-closed du contrat.** `constructor`, `__proto__`, `toString`, `Utilisateurs` (casse),
traversée de chemin encodée, nom de modèle Prisma : tous en 404. `Object.hasOwn` fait son
travail.

**Réconciliation.** `/api/v1/export/counts` concorde exactement avec la source sur les
13 flux, et valide correctement sa borne `since` (400 sur borne illisible).

**Pré-vol.** Détecte les 3 flux empoisonnés du dump POC et les 1 438 rattachements orphelins,
et **sort bien en code 1** — un enchaînement `preflight && meltano run` est donc réellement
bloquant. (J'ai d'abord cru le contraire en mesurant le code de sortie derrière un `tail` ;
la mesure était biaisée, pas le script.)

**Upsert.** Le recouvrement de 5 minutes produit volontairement des doublons : après un
deuxième run complet, les comptages de l'entrepôt sont **identiques**. Le `load_method: upsert`
les absorbe comme prévu.

**Transformations dbt.** Les 4 marts se construisent et les **35 tests dbt déclarés passent**.

---

## 4. Défauts constatés

Classés par ce qu'ils empêchent. Chaque entrée porte sa preuve.

### 4.1 Bloquants d'exploitation — le pipeline ne peut pas tourner en régime établi

**B1 — Le deuxième run échoue, et tous les suivants. `client.py:28`**
`is_sorted = True` demande au SDK Singer de vérifier que la clé de réplication ne régresse
jamais. Or le recouvrement (`lookback_minutes`) la fait régresser **par construction** au
début de chaque run incrémental.
*Preuve* : run 1 → code 0, 13 flux chargés, comptages exacts. Run 2 → code 1,
`InvalidStreamSortException: Unsorted data detected in stream. Latest value
'2026-06-10T12:51:47.466Z' is smaller than previous max '2026-06-10T12:53:08.037Z'`
(81 secondes d'écart — le recouvrement). C'est le défaut le plus dangereux du lot : **le run
qu'on regarde le jour de la mise en service est vert**, et le pipeline meurt la nuit suivante.
*Correctif validé empiriquement* : ajouter `check_sorted = False` sur `GuichetStream`. Run 2
repasse à code 0, sans aucun doublon dans l'entrepôt.

**B2 — Le manifeste Singer rejette des valeurs absentes légitimes. `streams.json` (généré)**
8 colonnes sont déclarées `type: ["string","null"]` mais leur `enum` ne contient pas `null`.
En JSON Schema ce sont deux contraintes indépendantes : la valeur `null` passe le type et
échoue l'énumération.
*Colonnes* : `utilisateurs.region`, `utilisateurs.genre`, `profils_jeunes.situation_handicap`,
`profils_jeunes.zone_habitation`, `opportunites.region`, `opportunites.niveau_etude_min`,
`ressources.niveau`, `ressources.langue`.
*Preuve* : run interrompu par `InvalidRecord: None is not one of ['BFEM','BAC','BAC_PLUS_2',
'BAC_PLUS_3','BAC_PLUS_5','DOCTORAT']` — une offre sans niveau d'études minimum, cas métier
parfaitement normal. Correction du manifeste → run complet à code 0.
*Correctif* : le générateur `tap-manifest.ts` doit ajouter `null` à l'énumération quand la
colonne est nullable. **Aucun test TypeScript ne pouvait attraper ça** : le défaut n'existe
qu'au moment où un vrai chargeur Singer valide un vrai enregistrement.

**B3 — `meltano install` échoue sur le dépôt tel qu'il est commité.**
*Preuve* : `Loader 'target-postgres' is not known to Meltano`. Les fichiers de verrouillage
des plugins ne sont pas dans le dépôt ; `meltano lock --update --all` les produit et débloque
l'installation. Le README (`etl/README.md:40-43`) ne mentionne que `meltano install`.
*Correctif* : committer `plugins/loaders/target-postgres--meltanolabs.lock` et
`plugins/transformers/dbt-postgres--dbt-labs.lock`, corriger le README.

**B4 — dbt ne trouve pas son profil, et les marts atterrissent au mauvais endroit.**
*Preuve 1* : `Error: Invalid value for '--profiles-dir': Path
'/project/transform/profiles/postgres' does not exist.` L'instruction du README (copier en
`~/.dbt/profiles.yml`) est inopérante : Meltano passe `--profiles-dir` explicitement.
*Preuve 2* : une fois le profil créé, les 4 marts sont construits dans le schéma
**`marts_marts`** — concaténation du schéma du profil (`marts`) et du `+schema: marts` de
`dbt_project.yml`. Or `docs/datahub-briefing-etl.md` §8 dit aux outils BI de se brancher sur
`marts`, qui n'existe pas.
*Correctif* : committer `transform/profiles/postgres/profiles.yml` et retirer `+schema: marts`.

**B5 — Un seul flux en erreur tue le run entier, et le flux fragile est le premier servi.**
*Preuve* : sur données POC non réparées, `candidatures` rend 500 ; le tap le traite comme
une erreur retriable, réessaie 5 fois avec backoff, puis l'extracteur échoue et
**l'intégralité du run s'arrête**. Les flux étant traités par ordre alphabétique,
`candidatures` passe en premier : **zéro ligne n'atteint l'entrepôt**, y compris pour les
12 flux sains.
*Correctif à arbitrer* : isoler l'échec par flux (le SDK sait continuer les autres flux), ou
assumer le tout-ou-rien et le documenter.

**B6 — `docker-compose.etl.yml` n'existe pas.** Le briefing §10 fournit une crontab qui
l'invoque. Un exploitant qui suit le document à la lettre pose un cron qui échoue chaque nuit,
dans un fichier de log que personne ne lit.

### 4.2 Brèches de sécurité et de conformité CDP

**S1 — Le sel de pseudonymisation est vide, et le hachage est réversible.
`src/lib/analytics/consultations.ts:111`**
```ts
const SEL = process.env.CONSULTATION_HASH_SALT ?? 'guichet-jeunesse-consultations'
```
`??` ne se déclenche que sur `undefined`/`null`. Or `.env.example:455` livre littéralement
`CONSULTATION_HASH_SALT=""` — le patron de tous les fichiers de déploiement. Le sel vaut donc
la chaîne vide et le hachage devient un **SHA-256 non salé** de `":" + sujet`, où le sujet est
soit le `cjs_uid`, soit `IP|user-agent` pour un visiteur anonyme.
*Preuve chiffrée* : 3,3 millions de hachages SHA-256 par seconde sur **un seul cœur** en Node.
Énumérer les 2³² adresses IPv4 pour un user-agent donné prend **~21 minutes** sur ce seul cœur,
quelques secondes sur GPU. Une IP est donc récupérable en clair par quiconque accède à
l'entrepôt. Au sens CDP c'est une donnée personnelle, pas un pseudonyme.
*Aggravant* : `cjs_uid` et `sujet_hash` voyagent **sur la même ligne** pour les utilisateurs
connectés, ce qui fournit gratuitement des milliers de couples (clair, haché) — un oracle pour
confirmer un sel candidat.
*Correctif* : `createHmac('sha256', CLE)` avec une clé obligatoire (refus au démarrage en
production, le motif existe déjà dans `src/lib/security/prod-guards.ts`), retrait de la valeur
`""` de `.env.example`, et ne pas exporter `sujet_hash` quand `cjs_uid` est renseigné.

**S2 — Un filtre de date hors plage MySQL est silencieusement ignoré.**
*Preuve* : `?since=2030-01-01` → 0 ligne (correct). `?since=%2B275760-09-13T00:00:00.000Z`
(date valide en JavaScript, hors plage MySQL) → **200 avec les premières lignes du flux**,
comme si aucun filtre n'avait été posé. Idem pour un curseur forgé portant un `t` hors plage.
C'est le mode de défaillance que tout le module combat : une entrée invalide produit un
résultat **faux** au lieu d'une erreur.
*Correctif* : borner la plage acceptée (année 1000–9999) et refuser en 400.

**S3 — `since` illisible rend 500 au lieu de 400. `keyset.ts:91-93`**
*Preuve* : `?since=pas-une-date`, `?since=0000-00-00`, `?since=2026-01-01' OR '1'='1` → tous
**500**. La route `counts` valide pourtant correctement (400), et
`docs/datahub-briefing-etl.md:68` annonce « 400 — Curseur **ou borne `since`** malformés ».
Effet concret : un 500 est retriable pour le SDK Singer, donc le tap réessaie 5 fois avant
d'abandonner le run.
*Correctif* : extraire la garde de `counts/route.ts:55-59` dans un helper partagé.

**S4 — Curseur BigInt forgé : 500 au lieu de 400. `keyset.ts:70`**
Le commentaire dit exactement ce qu'il faut faire — « un curseur forgé ne doit pas produire une
erreur opaque » — et la ligne suivante lève un `Error` nu, que la route n'attrape pas
(elle ne teste que `BadCursorError`).
*Preuve* : curseur `{"t":"…","i":"abc"}` sur `consultations` → **500**. Accessoirement
`{"i":""}` est accepté (repositionne à `id > 0`, rejeu complet) et `{"i":"0x10"}` est converti
en 16 silencieusement.
*Correctif* : `throw new BadCursorError(...)` et valider `/^\d+$/` avant `BigInt()`.

### 4.3 Pièges de fiabilité — la perte silencieuse

**R1 — Le pré-vol est aveugle hors colonne de réplication, et une seule date corrompue tue un
flux définitivement. `scripts/datahub/preflight.ts:44-54`**
Le contrôle ne porte que sur les 13 clés de réplication, alors que ~35 colonnes date sont
exportées.
*Preuve* : injection d'**une seule** `date_naissance = '0000-00-00'` sur la 5 001ᵉ ligne du tri
de `utilisateurs`. Le pré-vol affiche **« ✅ utilisateurs — dates valides »**. L'extraction
meurt en **HTTP 500 à la page 5**, après 4 000 lignes. Le tri étant déterministe, **chaque run
rebutera exactement sur cette page** : blocage permanent, avec un pré-vol vert.
*Correctif* : boucler sur `descriptor.columns` filtrées par type date — le descripteur porte
déjà la liste.

**R2 — Le script de réparation ne couvre pas ce que le pré-vol signale.**
`scripts/sql/repair-donnees-poc.sql` traite `profils_jeunes` et `inscriptions_evenements`,
mais **pas `candidatures`** — alors que sur le dump POC actuel le pré-vol y compte 26 157
lignes fautives. Les deux outils, écrits dans la même série de commits, se contredisent.
*Preuve* : après exécution du script, `candidatures` reste à 26 157 dates zéro et le pré-vol
reste rouge. Réparation manuelle → 30/30.
*Correctif* : aligner le script sur le pré-vol, ou mieux, le générer depuis la même source.

**R3 — `trancheAge` classe une date invalide en « 35+ ». `transforms.ts:28-41`**
`age` vaut `NaN`, toutes les comparaisons sont fausses, le flot tombe jusqu'au `return '35+'`.
Le commentaire du code annonce précisément la protection qui n'est pas assurée. Sur un
programme jeunesse dont la pyramide des âges est l'indicateur structurant, chaque date
corrompue devient un plus-de-35-ans, sans signal.
*Correctif* : `if (!Number.isFinite(age) || age < 0 || age > 120) return 'inconnu'`.

**R4 — `NO_ZERO_DATE` ne protège que les conteneurs issus de `docker-compose.yml`.**
*Preuve* : le conteneur `guichet_mariadb` en cours d'exécution a pour `sql_mode`
`STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION` —
**sans** `NO_ZERO_DATE`. La préprod tourne sur une MariaDB gérée par Plesk, dont le `sql_mode`
n'est pas piloté par ce fichier. La prévention annoncée n'existe donc pas là où elle compte.
*Correctif* : poser le `sql_mode` au niveau du serveur préprod/prod et ajouter un contrôle de
pré-vol qui le vérifie.

**R5 — État Meltano facultatif.** `MELTANO_DATABASE_URI` est « fortement recommandée ». Si
elle est oubliée, l'état vit dans un SQLite du conteneur `--rm` : chaque nuit repart de zéro,
sans erreur, avec un full-refresh de plus en plus long. À rendre obligatoire par un garde-fou
au lancement.

**R6 — Suppressions dures jamais propagées.** Assumé et documenté (spec §8.5), non implémenté.
L'entrepôt accumulera des fantômes. À arbitrer avant l'ouverture aux outils BI.

### 4.4 Contrat et documentation

**D1 — `meta.replication_key` renvoie le nom Prisma, pas le nom exporté.**
*Preuve* : la réponse porte `"replication_key": "updatedAt"` alors que la colonne émise
s'appelle `updated_at` et que la spec §8.1 comme le briefing §4 documentent `updated_at`. Le
tap actuel n'est pas affecté (il lit le manifeste), mais tout second consommateur qui suit le
contrat se trompe de colonne.

**D2 — L'OpenAPI généré ne décrit ni 404, ni 429, ni `/export/counts`** — alors que le mode
opératoire impose d'appeler `counts` après chaque run.

**D3 — Le commentaire d'en-tête de `[stream]/route.ts:9-12` décrit des routes supprimées**
(`opportunites` et `programmes` ont été retirées au commit `b2128682`). Un lecteur conclura
qu'elles servent encore le DTO polymorphe.

**D4 — La spec M13 §8.4 nomme encore l'endpoint `_counts`** ; le code sert `counts`.

**D5 — Le schéma `Bearer` est comparé de façon sensible à la casse** (`auth.ts:62`), contre la
RFC 7235. Sans effet sur le tap, piège garanti pour un second consommateur.

**D6 — `counts` exécute 13 `COUNT(*)` séquentiels sans borne obligatoire**, sous
`maxDuration = 60`. C'est l'outil de diagnostic qui tombera en timeout au moment précis où on
en a besoin — sur gros volume.

**D7 — `__pycache__` commité** (`*.cpython-314.pyc`) et `.gitignore` sans règle pour
`__pycache__/`, `etl/.meltano/`, `etl/transform/target/`.

**D8 — Les 35 tests dbt ne sont lancés par aucune commande documentée** (`run` seulement,
jamais `test` ni `build`). Ils passent — mais rien ne les exécute.

---

## 5. Plan de mise à niveau

Ordonné par ce qui débloque quoi. Chaque lot est une user-story livrable en une PR, avec ses
tests écrits en RED d'abord (convention TDD du projet).

### Lot 1 — Rendre le pipeline exploitable en régime établi *(bloquant absolu)*
`check_sorted = False` (B1) · `null` dans les énumérations nullables du générateur (B2) ·
lockfiles Meltano commités (B3) · profil dbt commité + `+schema` retiré (B4) ·
`docker-compose.etl.yml` (B6) · `.gitignore` et purge des `.pyc` (D7).
**Critère de sortie** : trois `meltano run` consécutifs à code 0, comptages `counts` ↔
entrepôt identiques après chacun, marts dans `marts`, `dbt test` vert.

### Lot 2 — Fermer les brèches CDP *(bloquant go-live, porte le dossier CDP)*
HMAC + clé obligatoire pour `sujet_hash`, retrait de la valeur `""` de `.env.example`, garde de
démarrage en production (S1) · ne plus exporter `sujet_hash` quand `cjs_uid` est présent.
**Critère de sortie** : un test prouve qu'un démarrage en production sans clé échoue, et qu'un
sel vide n'est jamais accepté silencieusement.

### Lot 3 — Refus nets au lieu de résultats faux
Validation de `since` partagée avec `counts` et bornage de plage (S2, S3) ·
`BadCursorError` sur clé BigInt et validation `/^\d+$/` (S4) · `trancheAge` sur `NaN` (R3).
**Critère de sortie** : la batterie d'attaques du §6 passe intégralement.

### Lot 4 — Fiabilité des données et du pré-vol
Pré-vol étendu à toutes les colonnes date (R1) · script de réparation aligné (R2) ·
`sql_mode` serveur en préprod + contrôle de pré-vol associé (R4) · `MELTANO_DATABASE_URI`
rendue obligatoire (R5).
**Critère de sortie** : le scénario « une seule date corrompue » rend le pré-vol rouge.

### Lot 5 — Exploitabilité
Isolation de l'échec par flux ou tout-ou-rien documenté (B5) · alerte sur code de sortie non
nul · rotation des logs · procédure de rejeu (`meltano state`) · réconciliation `counts`
automatisée après chaque run · `dbt test` dans la chaîne planifiée (D8).

### Lot 6 — Contrat et documentation
`replication_key` en nom exporté (D1) · OpenAPI complété 404/429/counts (D2) · commentaires et
spec réalignés (D3, D4) · `Bearer` insensible à la casse (D5) · `since` obligatoire sur
`counts` ou comptage approximatif (D6).

### Lot 7 — Arbitré (GUIC-700), TDD à suivre
Suppressions dures (R6) · rattachements de programmes en `FULL_TABLE` pour rendre
`v_programs_summary` exploitable · rétention et purge propagée dans l'entrepôt (obligation CDP
non instrumentée).

**Vérification empirique préalable au code** (ce que R6 supposait n'est pas exactement ce que
le code fait) : `Utilisateur` n'est **jamais** hard-deleted — seulement soft-deleted
(`deletedAt` + `statut=anonymise` via le webhook SSO `user.anonymized`), déjà correctement
propagé par `softDelete: 'deletedAt'` sur le stream (seul autre stream avec `softDelete` :
`opportunites`). Hard-deletes réels et confirmés, sur des flux du contrat v1 **sans**
`softDelete` déclaré — fuites silencieuses réelles, pas théoriques : `Emprunt` (rendus/annulés,
`deleteMany` dans `src/app/api/webhooks/sso/route.ts` à l'anonymisation), `Centre`
(`src/app/admin/centres/actions.ts`), `Evenement` (`src/app/admin/evenements/actions.ts`),
`Ressource` (`src/app/admin/ressources/actions.ts`). `Opportunite.delete()` existe aussi
(suppression physique) mais aucun appelant identifié à ce jour — code à surveiller, le stream
reste couvert par son `softDelete` en attendant.

**Trois arbitrages tranchés (2026-08-03, GUIC-700)** :

1. **Absent détecté par le full-refresh hebdomadaire des clés → suppression PHYSIQUE dans
   l'entrepôt** (`guichet_raw` et `marts`, qui se recalculent dessus — vérifié : les modèles
   marts sont de simples `select` depuis les sources, pas des snapshots historisés, donc une
   suppression en `guichet_raw` se propage sans logique dbt supplémentaire). Aucun tombstone
   conservé : une ligne portant un `cjs_uid` resté en base après une demande d'effacement serait
   un risque CDP réel, pas une garantie de stabilité des agrégats BI historiques.
2. **Rétention événementielle uniquement** — aucune purge indépendante par durée côté
   entrepôt. Vérifié : le Guichet lui-même n'a aucune rétention par durée sur
   `Utilisateur`/`Candidature`/`Opportunite` (seuls CV, check-ins et événements de centre ont
   des purges cron datées) ; la rétention est déclenchée par l'anonymisation SSO, pas par le
   temps. L'entrepôt suit le même déclencheur via le mécanisme du point 1, rien de plus.
3. **`v_programs_summary` dans la même passe** — support `FULL_TABLE` dans le contrat pour les
   5 tables de jonction programmes (`opportunites_programmes` et ses sœurs) : pas de watermark
   ni de clé primaire simple (clé composite `[opportuniteId, programmeId]` + un booléen), et
   sans tension CDP contrairement aux points 1-2.

**Conception retenue pour le mécanisme de suppression (point 1)** — révise le `?fields=id`
public de la spec §8.5 initiale : plutôt qu'un paramètre exposé sur l'API publique (surface
supplémentaire à sécuriser pour un usage strictement interne), un script autonome
`scripts/datahub/purge-absents.ts`, sur le modèle de `reconcile.ts` — Prisma **direct** côté
source (pas d'aller-retour HTTP vers sa propre API), `psql` dockerisé côté entrepôt. Il liste,
pour CHAQUE flux, l'ensemble des clés primaires actuelles côté Guichet, et supprime dans
`guichet_raw` toute clé présente dans l'entrepôt mais absente de cette liste.

Appliqué **uniformément aux 13 flux**, y compris ceux avec `softDelete` : une ligne
soft-deleted reste listée par Prisma (elle existe toujours, seulement marquée), donc jamais
supprimée à tort par ce mécanisme — pas besoin de distinguer les flux par présence de
`softDelete`, ce qui simplifie le script et évite un test « ce flux est-il concerné ? » qui
serait lui-même une source d'oubli si un flux futur ne déclare pas son `softDelete` par erreur.
Cadence hebdomadaire (crontab séparée de `run-nightly.sh`) : un tour complet, léger — on ne
transporte que des clés, pas les lignes.

**B7 — trouvé en vérifiant le lot 7, même famille que B1/B2/B4** : `client.py` du tap
faisait `manifest["replication_key"]` (accès direct). Absente pour un flux FULL_TABLE, cette
ligne levait `KeyError` et tuait `discover_streams()` pour les **18 flux d'un coup**
(construits en une seule compréhension). Aucun test TypeScript/Jest ne pouvait le voir — ils
vérifient la génération du manifeste, jamais sa consommation par le tap Python, qui n'a
**aucun pipeline CI** dans ce dépôt. Reproduit et corrigé empiriquement (venv `singer-sdk`
sans Docker, cf. `etl/README.md` § Tester `tap_guichet`) : `.get("replication_key")`, le SDK
dérive nativement `replication_method` depuis sa nullité. Contre-épreuve faite (fix retiré →
les 4 nouveaux tests échouent bien). Tests ajoutés dans
`etl/plugins/extractors/tap-guichet/tests/`, **non intégrés en CI** — à faire.

---

## 6. Harnais de tests à constituer

Le trou de couverture n'est pas dans les tests unitaires — ils sont bons — mais **aux
frontières externes**. B1, B2, B4 et R1 sont invisibles à `tsc` et à Jest ; ils n'apparaissent
qu'en faisant tourner un vrai chargeur Singer contre une vraie base.

1. **Test de bout en bout, deux runs consécutifs.** Le seul qui aurait attrapé B1. À câbler en
   CI nocturne sur base jetable : `preflight` → `run` → `run` → réconciliation `counts` ↔
   entrepôt → `dbt build`.
2. **Sentinelle de manifeste.** Pour chaque colonne nullable du contrat, vérifier que le schéma
   Singer généré accepte `null` — et valider un enregistrement d'exemple avec `jsonschema`.
3. **Batterie d'attaques de l'API**, rejouable : les ~50 requêtes de cette campagne
   (authentification, noms de flux, `since`, curseur, `limit`, méthodes HTTP), avec le statut
   attendu pour chacune.
4. **Test d'intégrité de pagination sur données adverses** : un jeu où N lignes partagent le
   même watermark et où la taille de page tombe au milieu du groupe, sur clé texte **et** sur
   clé BigInt.
5. **Test d'extraction sous écritures concurrentes.**
6. **Sentinelle de date corrompue** : une ligne à `0000-00-00` dans une colonne date non-clé
   doit rendre le pré-vol rouge.
7. **Sentinelle de conformité** : le hachage de sujet doit refuser un sel vide.

---

## 6 bis. Nouveau tour de laboratoire (2026-08-04) — tous les correctifs vérifiés en réel

Question posée après le rapport initial de ce lot : « est-ce fonctionnel, pas juste testé
unitairement ? ». Réponse : non, jusqu'à ce nouveau tour. Laboratoire remonté sur
l'infrastructure de GUIC-693 (`etllab_postgres`, MariaDB `guichet_etl_lab`), pipeline
exécuté de bout en bout avec les correctifs GUIC-695/696/697/700 en place.

**Deux bugs réels supplémentaires trouvés, invisibles à tsc/Jest, tous deux corrigés** :
- B7 — tap Python (`client.py`) sur `KeyError: 'replication_key'` pour tout flux FULL_TABLE.
- B8 — image `guichet/meltano:3.7.9` sans `psycopg2` : `MELTANO_DATABASE_URI` (R5,
  obligatoire) inutilisable dès `meltano install`.

**Tout le reste vérifié vert, en conditions réelles, avec de vraies données (22 510
utilisateurs, 26 161 candidatures)** : pré-vol 57/58 (seul échec : `sql_mode` du conteneur
MariaDB partagé, non touché), deux runs consécutifs réussis (le run 2 est EXACTEMENT le
test qui avait révélé B1 à l'origine — jamais reconfirmé corrigé jusqu'ici), aucun doublon
après le run 2, `dbt build` 54/54, `v_programs_summary` avec compteurs exacts vérifiés
contre des rattachements semés, `reconcile.ts` et `purge-absents.ts` exécutés pour la
première fois de leur existence (13/13 concordants ; scénario réel de suppression physique
d'un `Centre` détecté et propagé sans aucune fausse suppression ailleurs), `run-nightly.sh`
exécuté pour la première fois en conditions réelles (chaîne complète, code de sortie 0).

Le plan de durcissement M13 est maintenant vérifié fonctionnel de bout en bout, pas
seulement testé unitairement — sous réserve du merge effectif des 5 PRs sur `dev`.

---

## 7. Intégration préprod

**Prérequis avant toute extraction** (ordre imposé) :

1. Lot 1 et Lot 2 mergés — sans eux le pipeline meurt au deuxième run et l'entrepôt reçoit des
   données personnelles réversibles.
2. `DATAHUB_API_KEYS="meltano:<secret>"` posée sur le déploiement Guichet préprod. Générer avec
   `openssl rand -hex 32`. Sans elle, tout est refusé (401), y compris avec un token correct
   côté tap.
3. `CONSULTATION_HASH_SALT` (ou la clé HMAC du lot 2) posée — **valeur non vide**, différente
   de la production.
4. ~~`sql_mode` du MariaDB préprod complété par `NO_ZERO_DATE,NO_ZERO_IN_DATE`. Le fichier
   `docker-compose.yml` ne pilote pas la MariaDB Plesk.~~ **Périmé** — cette action côté
   serveur a été abandonnée : la MariaDB est mutualisée avec la SSO et le BRM, et le BRM
   (Laravel `strict => false`) hérite entièrement du `sql_mode` global sans aucun
   garde-fou de connexion. Fermé côté **code** à la place (point 8, `avecSqlModeStrict`) —
   zéro risque sur BRM/SSO, aucune action serveur requise.
5. PostgreSQL entrepôt créé, chiffré au repos, accès nominatif restreint aux profils Data
   Steward — obligations CDP du §6.1 de la spec, non encore instrumentées.
6. **Joignabilité de Guichet — séparation, pas cohabitation réseau (GUIC-700, tranché en
   préparant l'intégration préprod)**. En préprod/prod Guichet tourne dans son propre
   projet Compose (`guichet-test`/`guichet`), pas en process direct comme dans le
   laboratoire GUIC-693 : `host.docker.internal` n'atteint rien (l'app est verrouillée sur
   la boucle locale de l'hôte, `127.0.0.1:8081`, GUIC-641). Un premier correctif a rejoint
   `services_partages`/`cjs-net` (même remède que F2 MariaDB/MinIO), puis a été **abandonné** :
   il ne marche qu'à hôte unique (pas décidé), couple `docker-compose.etl.yml` aux fichiers
   compose M14 protégés par sentinelle (alias à poser + collision possible entre
   `guichet`/`guichet-test`/`guichet-staging` cohabitant sur le même serveur), et donne à
   `meltano` une portée réseau vers redis_cjs/neo4j-cjs/MinIO sans aucun usage. **Retenu** :
   `etl/meltano.yml` fixe déjà `api_url` en HTTPS public par défaut
   (`https://guichet.cjs.sn`) — le Data Hub est une route machine-à-machine pensée pour
   être appelée de l'extérieur, comme BRM/Centres/Moodle/EduPop. `TAP_GUICHET_API_URL`
   pointe donc l'URL publique préprod (`https://devguichet.consortiumjeunessesenegal.org`) ;
   `docker-compose.etl.yml` ne touche à aucun réseau Docker de l'app, et ça fonctionne quel
   que soit l'hôte de l'ETL.
7. **Joignabilité de l'entrepôt — cohabitation réseau, cette fois justifiée (GUIC-700,
   testé en réel au premier run préprod)**. Contrairement à l'app Guichet, l'entrepôt
   PostgreSQL n'a pas d'URL publique alternative : `cjs_analytics_postgres` est un
   conteneur (stack `cjs_analytics_*` — Superset, pgAdmin, Postgres — déjà provisionnée
   par l'infra), `Name or service not known` sans réseau partagé. Il vit sur `cjs-net`, le
   MÊME réseau externe déjà utilisé par `docker-compose.prod.yml` pour MariaDB/MinIO —
   `docker-compose.etl.yml` le rejoint désormais (`networks: - cjs-net`, `external: true`),
   sans toucher au réseau de l'app.
8. `npm run datahub:preflight` — **53/58 constaté en réel le 2026-08-05**, avant réparation
   des données et fermeture du `sql_mode` côté code (`avecSqlModeStrict`, GUIC-700) ; les 5
   échecs (3 colonnes date à zéro, jonctions `opportunites_tags` orphelines, `sql_mode`
   insuffisant) traités par `scripts/sql/apply-repair.ts` + le fix ci-dessus. Reconfirmation
   58/58 après ces deux correctifs : à faire au prochain déploiement (image déjà buildée et
   poussée le 2026-08-05, digest dans le journal de session — pas encore redéployée).
9. **Joignabilité de la MariaDB de l'app, pour `reconcile.ts`/`purge-absents.ts` (côté
   Prisma) — troisième règle, différente des deux ci-dessus (GUIC-700, testée en réel)**.
   `DATABASE_URL` peut pointer un nom de **conteneur** (`mariadb-test` en préprod — pas
   `host.docker.internal`, hypothèse initiale invalidée en la testant : timeout de pool
   sans jamais résoudre l'hôte). Un process nu sur l'hôte ETL ne peut pas rejoindre ce
   réseau. Les deux scripts s'exécutent donc via le conteneur `app` du déploiement
   (`exec_via_app`, `scripts/etl/lib-app-exec.sh`) — seul point du serveur dont la
   joignabilité vers MariaDB **et** l'entrepôt est prouvée (mêmes montages `scripts/`+`src/`
   que le préflight, plus le socket Docker + `docker-cli` Alpine pour que `psqlEntrepot`
   fonctionne à l'intérieur).

### 7 bis. Premier tour réel en préprod (2026-08-05) — tout vérifié, pas supposé

Après le laboratoire local (§6 bis), première exécution contre l'infra préprod réelle
(serveur OVH/Plesk, stack `cjs_analytics_*` déjà provisionnée par l'infra). Trois bugs
réels trouvés en exécutant, aucun visible en local (PR #355, #356, #358) :

1. `docker-compose.etl.yml` ne rejoignait aucun réseau — `cjs_analytics_postgres`
   injoignable (`Name or service not known`). Corrigé : rejoint `cjs-net`.
2. `reconcile.ts`/`purge-absents.ts` sondaient l'entrepôt via leur propre `docker run
   postgres:16-alpine`, sans `--network` — même piège, dupliqué. Centralisé et corrigé dans
   `scripts/datahub/psql-entrepot.ts`.
3. `run-nightly.sh`/`purge-absents-weekly.sh` appelaient `npm run` nu sur l'hôte pour la
   réconciliation/purge — `DATABASE_URL` pointe un nom de conteneur (`mariadb-test`),
   injoignable ainsi. Corrigé : `exec_via_app` (point 9 ci-dessus).

**Tout vérifié en conditions réelles, avec de vraies données (22 518 utilisateurs, 26 161
candidatures)** :
- Build + push de l'image depuis `dev` (deux cycles : un pour `DATAHUB_API_KEYS`/l'image
  de base, un second après le fix `sql_mode`) — `docker buildx`, ~2 échecs réseau en cours
  de push sur cette machine de build, résolus en relançant (cache buildkit chaud la 2e fois)
- `DATAHUB_API_KEYS` posée et vérifiée par `curl` externe, deux fois indépendamment
- Réparation réelle appliquée (`scripts/sql/apply-repair.ts` via Prisma, pas de client
  MariaDB requis) : 8000 + 3000 + 26154 lignes de dates corrigées, 1438 liens orphelins
  supprimés — chiffres identiques à ceux prédits par le préflight
- Premier run Meltano réel : 18 flux (13 incrémentaux + 5 FULL_TABLE), 64 078 lignes
  extraites et chargées, état persisté (`Using systemdb state backend`)
- Réconciliation réelle : **piège vérifié** — un `since` correspondant à l'instant du
  démarrage du run donne `0=0` des deux côtés, trivialement vert (rien n'a eu le temps de
  changer), pas une preuve pour un premier chargement complet. Relancé avec
  `since=1970-01-01` : 13/13 flux concordants avec des comptages réels et non triviaux
  (22518 utilisateurs, 26161 candidatures, 8007 profils_jeunes, 4340 opportunites, etc.)
- `dbt build` réel : 54/54 tests, 4 modèles marts construits avec des comptages réels
  (`v_opportunities_summary` 547, `v_programs_summary` 4, `v_centers_summary` 9,
  `v_users_summary` 239) — `v_programs_summary`, corrigé au Lot 7, tourne pour la première
  fois en préprod réel sans erreur

**Reste ouvert à ce stade** : deuxième run le lendemain (test du défaut B1 original, pas
encore rejoué en réel), installation de la crontab (nightly + purge hebdo) avec les
nouvelles variables (`GUICHET_IMAGE`/`COMPOSE_PROJECT_NAME`/`GUICHET_ENV_FILE`), branchement
des outils BI sur `marts`.

**Architecture d'exécution retenue** : batch en crontab plutôt que conteneur permanent, comme
le préconise le briefing. À livrer avec le lot 1 :
`docker-compose.etl.yml` (image Meltano épinglée, montage de `etl/`, `env_file`),
`MELTANO_DATABASE_URI` pointant sur l'entrepôt, alerte sur code de sortie non nul, rotation des
logs.

**Séquence de bascule** :
1. Premier run **hors heures de trafic** — la volumétrie réelle de `consultations` en
   production est inconnue.
2. Réconciliation `counts` ↔ `COUNT(*)` de l'entrepôt sur la fenêtre du run.
3. Deuxième run le lendemain, **vérifié**, avant de considérer le pipeline en service.
4. `dbt build` puis branchement des outils BI sur le schéma `marts` — pas sur `guichet_raw`,
   qui ne porte aucun commentaire de colonne.

**Ce qui reste ouvert et doit être arbitré avant la production** : le dossier CDP de
l'entrepôt (déclaration du traitement, `cjs_uid` y descendant), la rétention et la purge
propagée, et le sort de `v_programs_summary` — livré dégradé, donc GUIC-149 n'est pas couvert
en l'état.
