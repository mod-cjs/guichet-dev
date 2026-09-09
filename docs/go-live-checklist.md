# Go-live PROD — checklist & pièges (retour d'expérience préprod)

> Consolidé après le déploiement **préprod** de juillet 2026. Chaque point ci-dessous **a coûté du temps** :
> ce document existe pour que la **prod finale ne les repaie pas**. Complète `docs/runbook-production.md`
> (procédure) — ici on liste les **pièges** et l'**ordre d'activation** des services.
>
> Règle d'or apprise : **presque chaque panne était une config manquante qui échouait EN SILENCE**
> (Vertex, S3, Neo4j, Maps ne cassent pas l'app — ils la dégradent sans bruit). Vérifier chaque service
> **explicitement**, jamais « ça a démarré donc c'est bon ».

---

## 0. Prérequis AVANT de builder (sinon on rejoue les mêmes erreurs)

- [ ] **Les PRs deploy-infra sont mergées dans la branche déployée** : GUIC-657 (redirections URL publique),
      GUIC-662 + #305 (`.dockerignore`, Dockerfile buildable, backup réseau, montage Vertex, `ARG` Maps).
      Sans elles, **le build échoue** (`prisma generate` / `next build`) et le déploiement rejoue les bugs.
- [ ] **Secrets rotés** : tout secret ayant transité par un canal non sûr (chat, e-mail, historique git) est
      **compromis**. En préprod ont fuité : token GitHub, clé Vertex, secret MinIO. **Les tourner avant prod.**
- [ ] **CI verte sur le commit exact** déployé (pas « ça passait en local »).

---

## 1. Construire l'image (pièges de build)

| Piège vécu | Correctif |
|---|---|
| Build sur **Mac ARM** → image ARM64 → `exec format error` / manifest unknown sur serveur x86_64 | `docker buildx build --platform linux/amd64` avec un builder **`docker-container`** (le driver `docker` ne pousse pas cross-plateforme). Émulé QEMU ⇒ **~15 min**, prévoir. |
| `.dockerignore` **absent** → contexte embarque `node_modules` (ARM), `.git`, `.claude/worktrees` (~1 Go) | Fourni par GUIC-662. Vérifier qu'il exclut `node_modules`, `.git`, `.claude`. |
| `prisma generate` échoue : « Cannot resolve DATABASE_URL » | `ARG DATABASE_URL=<défaut>` dans le Dockerfile (le CD ne passe **aucun** build-arg). GUIC-662. |
| `next build` échoue à la collecte de pages : garde-fou Redis/secrets | ENV de build **factices** au stage builder (`REDIS_URL`…), stage builder uniquement. GUIC-662. |
| **Google Maps** vide même avec la clé dans l'env runtime | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` est **inlinée au BUILD** → `--build-arg NEXT_PUBLIC_GOOGLE_MAPS_KEY=<clé>`. La mettre au runtime n'a **aucun** effet. |
| Image doit pouvoir **migrer** | GUIC-637 : `prisma.config.ts` + `node_modules` complet dans l'image (sinon `migrate deploy` échoue). |

**GHCR (dépôt privé)** : login avec un **token classic** (`read:packages` + **autoriser l'org via SSO**) — les
fine-grained échouent sur les packages privés d'org. Le **serveur** doit aussi `docker login ghcr.io` pour `pull`.

**Déployer par EMPREINTE** (`@sha256:…`), jamais par tag mutable.

---

## 2. Topologie serveur (réseau + services partagés)

- **Réseau externe partagé `cjs-net`** (`${SERVICES_NETWORK:-cjs-net}`). L'app **et** tous les services
  qu'elle joint par nom doivent y être : `redis_cjs`, MinIO, `neo4j-cjs`, MariaDB.
  - Vérif : `docker inspect <svc> --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'`
  - Rattacher si besoin : `docker network connect cjs-net <conteneur>`
- **Piège underscore (GUIC-620)** : un conteneur MinIO nommé `minio_cjs` (underscore) **refuse toutes les
  requêtes** (HTTP 400 « invalid hostname »). Correctif : `docker network connect --alias minio cjs-net <minio>`
  puis `S3_ENDPOINT=http://minio:9000`.
- **`backup.sh`** doit cibler `${SERVICES_NETWORK:-cjs-net}` (comme `deploy.sh`), **pas** `${projet}_guichet`
  (sinon la base est injoignable → on migre **sans point de restauration**). GUIC-662.
- **MariaDB Plesk** (prod) = service **hôte** → `host.docker.internal` + `--add-host host.docker.internal:host-gateway`.

---

## 3. Mécanique de déploiement (les frictions shell)

- **`deploy.sh` ne prend qu'UN `COMPOSE_FILE`.** La prod = `docker-compose.prod.yml` seul (aucun port publié ;
  Plesk proxifie). La préprod combinait `-f prod -f test` (port 8081) → **à la main**, pas via `deploy.sh`.
- **`GUICHET_ENV_FILE` doit être EXPORTÉ** (le compose interpole `${GUICHET_ENV_FILE}`) — `--env-file` seul
  donne `required variable GUICHET_ENV_FILE is missing`.
- **Se placer DANS le dépôt** avant tout `docker compose` (chemins compose relatifs) — sinon
  `stat …/docker-compose.prod.yml: no such file`.
- **Les variables se perdent entre shells** (`COMPOSE_PROJECT_NAME`, `GUICHET_IMAGE`, `GUICHET_ENV_FILE`, `CT`)
  → **ré-exporter** à chaque session SSH.
- **Reverse proxy Plesk** : `proxy_set_header Host $host` (Directives nginx additionnelles), sinon `request.url`
  = `0.0.0.0:3000` interne → redirections cassées (le vrai correctif est GUIC-657 côté code).
- Fichier `test.env`/`prod.env` : **attention aux lignes malformées** — un `S3_SECRET_KEY= valeur"` (espace en
  tête, guillemet non apparié) → auth **silencieusement fausse**. Guillemets appariés, aucun espace après `=`.

---

## 4. Activation des services (matrice — chacun manquait au départ)

> Ordre conseillé : **DB/migrations → Redis → MinIO → Vertex → Neo4j → Maps (build) → reproject**.

### 4.1 Vertex AI (Yaye — LLM)
- `test.env`/`prod.env` : `LLM_PROVIDER=vertex`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION=us-central1`,
  `GOOGLE_APPLICATION_CREDENTIALS=/etc/guichet/gcp/vertex-sa.json`.
- **Monter la clé** dans le conteneur (GUIC-646, compose `:/etc/guichet/gcp/vertex-sa.json:ro`).
- **PIÈGE uid 1001** : le conteneur tourne en `nextjs` (uid 1001, non-root). Une clé montée `600 root:root`
  → **`EACCES: permission denied`** (auth GoogleAuth échoue, « Connection error » dans yaye-memo).
  Correctif : **`chown 1001:1001 /etc/guichet/gcp/vertex-sa.json`** sur l'hôte (garde 600, reflété à chaud).
- **Egress** : le serveur doit sortir vers `*.googleapis.com:443`. Test dans le conteneur :
  `docker compose … exec app node -e "fetch('https://us-central1-aiplatform.googleapis.com/').then(r=>console.log(r.status))"`.
- Modèle par défaut `google/gemini-2.5-flash` (facturation ON_DEMAND). Le **chat** marche sans Neo4j ; les
  **recos** non (cf. 4.4).

### 4.2 MinIO / S3 (upload photo/CV/diplômes)
- L'app bascule sur MinIO **seulement si `S3_ENDPOINT` est défini** (sinon Vercel Blob → KO sur OVH).
- `test.env`/`prod.env` : `STORAGE_DRIVER=s3`, `S3_ENDPOINT=http://minio:9000`, `S3_BUCKET`, `S3_ACCESS_KEY`,
  `S3_SECRET_KEY` (ou `_ID`/`_ACCESS_KEY` pour AWS).
- **Le bucket doit exister** : `docker run --rm --network cjs-net --entrypoint sh minio/mc -c "mc alias set s3 <ep> <ak> <sk> && (mc ls s3/<bucket> || mc mb s3/<bucket>)"`.
- MinIO **sur `cjs-net`** (cf. §2, piège underscore).

### 4.3 Redis
- `REDIS_URL` **obligatoire** (garde-fou : refuse le repli localhost = le conteneur lui-même → 500 partout).
- Clés sous le préfixe ACL `guichet:` (sinon rate-limit + idempotence webhooks KO en silence — piège B5).

### 4.4 Neo4j (Yaye — graphe = « le cerveau »)
- **Sans Neo4j, Yaye chatte mais NE recommande PAS** (`recommandation.ts` : recos = graphe uniquement).
- Conteneur **`neo4j-cjs`** sur `cjs-net`, **Neo4j Community** (GUIC-567). `test.env`/`prod.env` :
  `NEO4J_URI=bolt://neo4j-cjs:7687`, `NEO4J_USER=neo4j`, `NEO4J_PASSWORD=<fort>`.
  **NE PAS définir `NEO4J_DATABASE`** (multi-db = Enterprise ; Community = base par défaut).
- Neo4j = **read-model reconstructible** → on peut supprimer/recréer le conteneur **sans perte** (on reprojette).
- **Mot de passe cohérent** : générer une fois, l'utiliser dans `NEO4J_AUTH` (docker run) ET `test.env`.
- **Projeter le graphe** après avoir chargé les données MariaDB : `GET /api/cron/yaye-graph-sync`
  (`Authorization: Bearer $CRON_SECRET`). Ré-exécuter à chaque changement majeur de données.

### 4.5 Google Maps
- Clé **au BUILD** (`NEXT_PUBLIC_*`, cf. §1). **Restreindre par referer/domaine** côté console GCP
  (une clé `NEXT_PUBLIC_*` est publique côté navigateur). Activer « Maps JavaScript API ».

### 4.6 Cron
- `CRON_SECRET` dans l'env (reproject Yaye, purge CV rétention CDP…).
- **Piège B8** : les crons étaient sur **Vercel Cron** → sur OVH, **plus personne ne les exécute**.
  Installer un crontab serveur (`scripts/cron/`), dont la **purge CV** (rétention CDP).

### 4.7 Data Hub / ETL (GUIC-693/700 — export analytics)
- **Côté app** (`test.env`/`prod.env`) : `DATAHUB_API_KEYS="meltano:<secret>"` — **le préfixe
  `meltano:` est obligatoire** (format `nom:secret`), sans lui la clé est silencieusement
  ignorée et tout est refusé en 401 même avec un token correct côté tap. Générer avec
  `openssl rand -hex 32`. **Redéployer/redémarrer le conteneur `app`** pour que la variable
  soit prise en compte — poser la clé seule sans redéployer ne fait rien.
- **Vérifier après déploiement** (lecture seule, sans toucher à l'entrepôt) :
  `curl -H "Authorization: Bearer <secret>" https://<domaine>/api/v1/export/counts?since=2026-01-01T00:00:00Z`
  → attendu `200`, pas `401`.
- **Guichet (l'app), pour le tap : SÉPARATION**, jamais de réseau Docker partagé. Appelée
  par son URL publique HTTPS — jamais `host.docker.internal` ni `cjs-net`. Fonctionne quel
  que soit l'hôte du serveur ETL.
- **Entrepôt PostgreSQL, pour `target-postgres`/dbt/`psqlEntrepot` : COHABITATION réseau**,
  testé en réel (tranché différemment de l'app ci-dessus, ne pas confondre). L'entrepôt est
  un **conteneur** (`cjs_analytics_postgres` en préprod, stack déjà provisionnée par
  l'infra — Superset, pgAdmin), pas un domaine public : `docker-compose.etl.yml` rejoint
  `cjs-net` pour le résoudre. Accès (hôte/utilisateur/mot de passe/base) transmis
  séparément, à poser dans `.env.etl`/serveur (voir `.env.etl.example` — gabarit à jour).
- **MariaDB de l'app, pour `reconcile.ts`/`purge-absents.ts` (côté Prisma) : ni séparation
  ni cohabitation directe** — `DATABASE_URL` peut pointer un nom de conteneur (ex.
  `mariadb-test` en préprod), injoignable depuis un `npm run` nu sur l'hôte ETL (testé en
  réel : timeout de pool). Ces deux scripts s'exécutent via le conteneur `app` du
  déploiement (`exec_via_app`, `scripts/etl/lib-app-exec.sh`) — `run-nightly.sh` et
  `purge-absents-weekly.sh` requièrent donc aussi `GUICHET_IMAGE`, `COMPOSE_PROJECT_NAME`,
  `GUICHET_ENV_FILE` (les mêmes variables qu'un déploiement) en plus des variables ETL.
- Séquence complète de mise en service (préflight, premier run hors trafic, réconciliation
  — **avec un `since` ancien pour un premier chargement, sinon la comparaison est triviale
  à 0=0** —, deuxième run vérifié, crontab nightly + purge hebdomadaire) :
  `.agent_context/specs/M13-durcissement-etl.md` §7 et `docs/datahub-briefing-etl.md` §10/§12.

---

## 5. Données & migrations

- **MariaDB 10.11 (Plesk) ≠ 11** : collation par défaut différente → une migration sans `COLLATE` explicite
  passe en CI et **échoue en prod** (errno 150, base à moitié migrée). Rejouer les migrations **à froid sur 10.11**.
- **Ordre imposé** (`deploy.sh`) : sauvegarde → migration (conteneur éphémère, nouvelle image) → bascule →
  smoke test → rollback auto. **Ne jamais migrer après la bascule.**
- **Seed enrichi** : le dump du lead peut être à un **schéma ancien** (46 migrations de retard) avec des
  **migrations en échec**. Ne pas charger tel quel. Méthode qui a marché :
  1. base fraîche au **schéma actuel** (`prisma migrate deploy` sur base vide) ;
  2. **transplant** table par table (intersection de colonnes → les colonnes ajoutées prennent leurs défauts) ;
  3. **anonymisation** (voir 5.1) ; 4. dump → charger sur la cible (schéma identique, état propre).
- **`_prisma_migrations`** : Prisma matche par **nom** → une base chargée avec un état de migrations « en avance »
  ne crée pas de conflit futur (les migrations homonymes sont vues comme appliquées).

### 5.1 PII / CDP (loi 2008-12)
- Le dataset POC = **vraie PII** (19,5k e-mails perso réels). **Jamais tel quel** sur un env non-prod sans
  arbitrage CDP (Abdou Khadre).
- **Anonymisation qui marche** (`scripts/sql/anonymize-preprod.sql`) : pseudonymise
  (`cjs_uid` gardé pour l'intégrité FK) ; remplace nom/prénom/e-mail/téléphone ; **NULL** bio/CV/photo/IP/
  lettres de motivation ; **vide** logs/messages ; **GARDE** les signaux de matching (competences,
  domaines_interet, poste, etablissement, statut/scores candidatures).
- **Piège** : des e-mails/téléphones réels sont **noyés dans le texte libre** (descriptions d'offres). Scrubber
  **toutes** les colonnes `TEXT/LONGTEXT` par regex, pas seulement les colonnes structurées.
- **Toujours vérifier le CONTENU du dump** (`gzip -dc | grep -icE '@gmail|@yahoo'` → doit = 0) avant de le sortir.
- Supprimer le **dump brut** (PII) après validation.

---

## 6. Vérifications post-déploiement (ne se délèguent pas)

- [ ] Conteneur **`healthy`** + `/api/health` `checks.db` **et** `checks.redis` à `true` (le healthcheck sonde
      EN INTERNE — pas de port publié en prod, lire l'état du **conteneur**).
- [ ] **Se connecter réellement via le SSO** (pas juste charger l'accueil) → **redirection par rôle** OK
      (admin→/admin, recruteur→/recruteur, conseiller→/conseiller). *Prérequis : rôles posés côté SSO + `cjs_uid`
      = `sub` réel du SSO (sinon `auth_failed` sur collision email/téléphone à l'upsert du callback).*
- [ ] **Déconnexion** → revient sur le domaine (pas `0.0.0.0`), sans flash du shell (GUIC-657/661).
- [ ] **Upload** photo/CV → s'enregistre (MinIO de bout en bout).
- [ ] **Yaye** → répond (Vertex) **et** recommande (Neo4j reprojeté).
- [ ] **Carte** `/centres` → Google Maps s'affiche (sinon `RefererNotAllowed`/`ApiNotActivated` côté GCP).
- [ ] Taux de **5xx** stable 10 min.

---

## 7. Les pièges qui ont coûté le plus (mémo express)

1. **Config manquante = panne silencieuse** (Vertex/S3/Neo4j/Maps) → tester chaque service explicitement.
2. **`request.url` = `0.0.0.0` derrière le proxy** → toujours `NEXTAUTH_URL` pour les redirections (GUIC-657).
3. **uid 1001** : les secrets montés doivent être **lisibles par 1001** (`chown 1001:1001`).
4. **NEXT_PUBLIC_* = build-time** : rebuild pour changer, pas le runtime.
5. **Neo4j = le cerveau de Yaye** : pas de graphe → recos vides (chat trompeusement OK).
6. **PII dans le texte libre** : scrubber les descriptions, pas seulement les colonnes e-mail.
7. **backup avant migration** : réseau du backup = `cjs-net`, sinon pas de point de restauration.
8. **`GUICHET_ENV_FILE` exporté** + **`cd` dans le dépôt** + **image par digest**.
9. **Le CD ne passe aucun build-arg** → le Dockerfile doit avoir ses valeurs par défaut de build.
10. **Merges partiels** : vérifier que TOUS les commits d'une PR sont bien dans la branche déployée
    (le merge de #301 avait laissé 2 commits dehors → #305).
