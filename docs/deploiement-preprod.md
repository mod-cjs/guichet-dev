# Déploiement de la version TEST (préprod `devguichet`) — runbook exact

> Serveur **OVH / Plesk** partagé avec le SSO et le BRM. La préprod se déploie **à la main**
> en combinant deux compose — **PAS** via `scripts/deploy/deploy.sh` (réservé à la future prod,
> qui ne prend qu'un seul compose).
> Prod finale : voir `docs/runbook-production.md`. Retour d'expérience complet : `docs/go-live-checklist.md`.

---

## 0. Pourquoi cette procédure diffère de la prod

- `docker-compose.prod.yml` **ne publie aucun port** (en prod, Plesk → proxy applicatif).
- `docker-compose.test.yml` (GUIC-641) **ajoute** un port `127.0.0.1:8081 → 3000` pour que Plesk
  proxifie la préprod, sur la **boucle locale uniquement** (jamais exposé à Internet).
- On combine donc les deux : `-f docker-compose.prod.yml -f docker-compose.test.yml`.

---

## 1. Construire et pousser l'image (depuis le poste de dev)

L'image **doit être `linux/amd64`** (le serveur est amd64 ; un Mac ARM produit de l'arm64 qui
plante avec « exec format error »). Depuis GUIC-674, `build-push.sh` construit en **amd64 par
défaut** (buildx + builder `docker-container`).

```bash
# Depuis un arbre PROPRE, sur le commit à livrer
echo "$GHCR_TOKEN" | docker login ghcr.io -u <utilisateur> --password-stdin   # jeton write:packages
./scripts/deploy/build-push.sh v1.0.0-test
#   → construit linux/amd64, pousse sur GHCR, affiche la RÉFÉRENCE PAR EMPREINTE (…@sha256:…)
```

- Multi-arch au besoin : `PLATFORMS=linux/amd64,linux/arm64 ./scripts/deploy/build-push.sh <version>`.
- Toujours déployer **par empreinte** (`@sha256:…`), jamais par tag mutable : un tag peut être
  réécrit, l'empreinte non.
- Vérifier l'arch avant de déployer : `docker buildx imagetools inspect <ref>` (ou pull + inspect
  `.Architecture` → `amd64`).

---

## 2. Prérequis sur le serveur

- Fichier de secrets `/etc/guichet/test.env` (chmod 600, propriétaire dédié). **Attention aux
  lignes malformées** (un espace parasite après `=` casse une variable en silence).
- Réseau partagé externe **déjà créé** (`redis_cjs`, `neo4j-cjs`, MinIO). Retrouver son nom :
  `docker network ls` → l'exporter en `SERVICES_NETWORK` s'il diffère du défaut `cjs-net`.
- MariaDB préprod jointe depuis le conteneur (base `guichet_test`).

---

## 3. Déployer

```bash
cd /var/www/vhosts/.../guichet            # checkout serveur

# Empreinte AMD64 issue de l'étape 1
export GUICHET_IMAGE='ghcr.io/adiop-consortiumjeunessesenegal-org-cjs/guichet@sha256:<empreinte>'

# Isolation projet (conteneur/réseau/volumes distincts de la future prod « guichet »)
export COMPOSE_PROJECT_NAME=guichet-test

# Secrets : EXPORTÉ, car le compose interpole ${GUICHET_ENV_FILE}.
# ⚠️ `--env-file` NE SUFFIT PAS → « required variable GUICHET_ENV_FILE is missing ».
export GUICHET_ENV_FILE=/etc/guichet/test.env

# Nom réel du réseau partagé si ≠ cjs-net
# export SERVICES_NETWORK=<nom-du-réseau>

# Port hôte surchargeable si 8081 est pris
# export GUICHET_TEST_PORT=127.0.0.1:8082

CT="-f docker-compose.prod.yml -f docker-compose.test.yml"

docker pull "$GUICHET_IMAGE"
docker compose $CT run --rm --no-deps app npx prisma migrate deploy   # migrer AVANT la bascule
docker compose $CT up -d --no-deps app
```

---

## 4. Vérifier

```bash
# Statut de santé (le healthcheck sonde /api/health EN INTERNE : DB + Redis)
docker inspect --format '{{.State.Health.Status}}' "$(docker compose $CT ps -q app)"   # → healthy

# Réponse HTTP via la boucle locale (ce que Plesk proxifie)
curl -fsS http://127.0.0.1:8081/api/health && echo OK
```

Puis tester **explicitement** chaque service branché (config manquante = panne silencieuse) :
connexion SSO, upload MinIO, chat Yaye (Vertex), recos Yaye (Neo4j), carte (Maps). Détail dans
`docs/go-live-checklist.md` §4.

---

## 5. Revenir en arrière (rollback test)

```bash
# Redéployer l'empreinte précédente (garder la trace du @sha256:… d'avant)
export GUICHET_IMAGE='ghcr.io/adiop-consortiumjeunessesenegal-org-cjs/guichet@sha256:<précédent>'
docker pull "$GUICHET_IMAGE"
docker compose $CT up -d --no-deps app
```

Une migration additive ne se « dé-migre » pas : le rollback d'image suffit tant que le schéma
reste compatible. Sinon, restaurer une sauvegarde (cf. §6 du runbook prod).

---

## 6. Pièges vérifiés (préprod juillet 2026)

| Piège | Symptôme | Parade |
|---|---|---|
| Image arm64 sur serveur amd64 | conteneur crash « exec format error » | build **amd64** (défaut `build-push.sh`) ; vérifier l'arch |
| `GUICHET_ENV_FILE` non exporté | `required variable GUICHET_ENV_FILE is missing` | `export` (pas `--env-file`) |
| Mauvais réseau partagé | app ne joint pas Redis/Neo4j/MinIO | `SERVICES_NETWORK=<nom réel>` (`docker network ls`) |
| `deploy.sh` en préprod | ne combine pas les deux compose → pas de port 8081 | combiner `-f prod -f test` à la main |
| Migration après bascule | trafic sur schéma non migré | migrer **avant** `up -d` |
| **Backup préprod cassé** | `mariadb-dump : base injoignable` (mauvais réseau) | dette connue — migrer sur schéma additif = risque accepté ; à corriger |
| Secret en clair dans `test.env` | ligne malformée → variable vide silencieuse | pas d'espace après `=` ; `chmod 600` |

---

Références : `docs/go-live-checklist.md` (retour d'expérience complet + activation services),
`docs/runbook-production.md` (prod + rollback), `scripts/deploy/build-push.sh` (build amd64),
`docker-compose.test.yml` (override port test).
