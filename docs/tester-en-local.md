# Tester le projet en local (parité prod)

> But : faire tourner **toute la plateforme Guichet Jeunesse en local**, avec les **mêmes briques qu'en production** — l'application Next.js, les **deux bases de données** (MariaDB relationnelle + Neo4j Knowledge Graph), Redis, l'IA Yaye (Groq) — et pouvoir se connecter/tester sans SSO.

---

## 1. Les briques (et leur équivalent prod)

| Brique | Rôle | Local | Production |
|--------|------|-------|-----------|
| **App Next.js** | Plateforme + API + agent Yaye | container `guichet_app` (ou `npm run dev`) | Vercel |
| **MariaDB 11** | **Source de vérité** (Prisma) — users, opportunités, candidatures… | container `guichet_mariadb` (port `3307`) | MariaDB managée |
| **Neo4j 5** | **Knowledge Graph** Yaye = *read-model dérivé* de MariaDB | container `guichet_neo4j` (`7474`/`7687`) | **Neo4j Aura** (`neo4j+s://`) |
| **Redis 7** | Contexte conversation Yaye + rate-limit + idempotence | container `guichet_redis` (`6379`) | Upstash (`rediss://`) |
| **IA — Groq** | LLM `llama-3.3-70b` (function calling) | API Groq réelle (clé) | idem |
| **Auth SSO** | OAuth2/OIDC CJS (next-auth) | **remplacé par `/api/dev/login`** | SSO CJS réel |
| **WhatsApp** | Meta Cloud API (webhook HMAC) | optionnel (tunnel) | Meta Cloud API |
| **Crons** | reprojection KG, cleanups | route + `CRON_SECRET` (appel manuel) | Vercel Cron |

> 🔒 **Invariant clé** : MariaDB = source de vérité unique ; **Neo4j est entièrement reconstructible** depuis MariaDB (sens d'écriture **Prisma → Neo4j** uniquement). En local comme en prod.

---

## 2. Prérequis

- **Docker Desktop** (démon démarré — `docker info` doit répondre)
- **Node 20+** et **npm** (pour le mode dev / les scripts)
- Un fichier **`.env.local`** à la racine (voir §4)
- Une **clé Groq** (`GROQ_API_KEY`) pour tester l'agent Yaye

---

## 3. Les deux bases de données

### 3.1 MariaDB — source de vérité

- Service `guichet_mariadb`, exposé sur **`localhost:3307`** (→ `3306` dans le réseau Docker).
- Identifiants (dev) : `guichet` / `guichet_dev_password` · root : `root`.
- Deux jeux de données possibles :
  - **`guichet_jeunesse`** — base canonique (créée par les **migrations Prisma** + **seed**). C'est la **parité prod stricte**.
  - **`yaye_poc_enriched`** — dump POC réaliste (≈ 22 000 users, 4 340 opportunités) pour tester à **volumétrie réelle**.

### 3.2 Neo4j — Knowledge Graph (read-model)

- Service `guichet_neo4j` : Browser **http://localhost:7474**, Bolt `bolt://localhost:7687`.
- Identifiants (dev) : `neo4j` / `yaye_dev_password`.
- Bases (multi-db Enterprise) : `enriched` (projection du dataset POC), `standard`, et toute base créée par le script de reprojection (ex. `yayeapp`).
- **Le graphe n'est jamais saisi à la main** : il est **projeté depuis MariaDB** (voir §6).

> Si `NEO4J_URI`/`NEO4J_PASSWORD` ne sont pas configurés, l'app **bascule automatiquement** sur un *fallback Prisma* (recherche/matching simple) — pratique, mais pour tester le vrai Lot 1 il faut Neo4j.

---

## 4. Configuration `.env.local`

`.env.local` sert au **mode dev (hôte)**. Valeurs locales typiques :

```dotenv
NODE_ENV="development"

# MariaDB (depuis l'hôte → port publié 3307)
# Parité prod stricte :
# DATABASE_URL="mysql://guichet:guichet_dev_password@127.0.0.1:3307/guichet_jeunesse"
# Dataset POC volumineux :
DATABASE_URL="mysql://guichet:guichet_dev_password@127.0.0.1:3307/yaye_poc_enriched"

REDIS_URL="redis://localhost:6379"

# Neo4j (depuis l'hôte)
NEO4J_URI="bolt://localhost:7687"
NEO4J_USER="neo4j"
NEO4J_PASSWORD="yaye_dev_password"
NEO4J_DATABASE="enriched"

# IA
GROQ_API_KEY="gsk_…"

# Cron (reprojection KG)
CRON_SECRET="un-secret-local"
```

> En **mode tout-Docker**, `docker-compose.yml` **surcharge** les URLs pour utiliser les **noms de services** (`mariadb`, `redis`, `neo4j`) au lieu de `localhost`, et active `ALLOW_DEV_LOGIN=true`. (Cf. bloc `environment` du service `app` — overrides de test, à ne pas committer vers `dev`.)

---

## 5. Démarrer le stack

### Mode A — tout en Docker (le plus proche de la prod)

L'app est **conteneurisée** (image buildée, comme en prod).

```bash
docker compose up -d --build app   # build l'image + démarre app + mariadb + redis + neo4j
docker compose ps                  # vérifier que tout est "Up (healthy)"
```

- App : **http://localhost:3000**
- Rebuild après un changement de code : **réexécuter** `docker compose up -d --build app`.

### Mode B — services en Docker + app en hot-reload

Pour développer/déboguer (hot reload, logs directs) :

```bash
docker compose up -d mariadb redis neo4j   # uniquement les services
npm install
npm run dev                                # Next sur http://localhost:3000
```

> Une seule app à la fois sur le port `3000` : ne pas cumuler le container `app` et `npm run dev`.

---

## 6. Initialiser les données (les deux bases)

### 6.1 MariaDB

**Option « parité prod »** — base `guichet_jeunesse` via Prisma :

```bash
# DATABASE_URL doit pointer sur guichet_jeunesse
npx prisma migrate deploy     # applique les migrations (schéma)
npx prisma db seed            # jeu de données de base (tsx prisma/seed/index.ts)
```

**Option « volumétrie réelle »** — base `yaye_poc_enriched` : déjà présente dans le container MariaDB (dump POC). Pointer `DATABASE_URL` dessus, rien à migrer.

### 6.2 Neo4j — projeter le graphe depuis MariaDB

Le graphe se **reconstruit** depuis MariaDB (jamais l'inverse) :

```bash
# Source = la base pointée par DATABASE_URL ; cible = --db (défaut : "yayeapp")
npm run yaye:reproject -- --db yayeapp            # purge + rebuild complet (idempotent)
npm run yaye:reproject -- --db yayeapp --no-wipe  # merge sans purge (mise à jour additive)
```

- Crée la base Neo4j cible si absente, projette **nœuds décompressés + ~25 relations + dérivées floues** (`MAITRISE`, `ATTESTE`, `PREPARE`).
- Pour viser cette base depuis l'app, mettre `NEO4J_DATABASE` sur le même nom.

**Alternative** : la route cron (identique au job nocturne de prod) :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/yaye-graph-sync
```

> En prod, cette reprojection tourne **chaque nuit** (Vercel Cron, `vercel.json`) + en **événementiel** à chaque création/modif d'opportunité (`OpportuniteService`).

---

## 7. Se connecter sans SSO (test)

Le SSO réel n'existe pas en local → route de dev qui **pose une session** :

```
http://localhost:3000/api/dev/login                      → user par défaut, va au tableau de bord
http://localhost:3000/api/dev/login?to=/jeune/yaye       → atterrit sur le chat Yaye
http://localhost:3000/api/dev/login?uid=<cjs_uid>&to=…   → connecte un user précis
```

- L'utilisateur visé doit exister dans la base MariaDB courante (`DATABASE_URL`).
- 🔒 **Sécurité** : la route renvoie **404 en production** (sauf `ALLOW_DEV_LOGIN=true`, réservé au container de test). **Jamais activer `ALLOW_DEV_LOGIN` en prod.**

---

## 8. Tester l'agent Yaye

**Page web** : ouvrir la page test ci-dessus puis discuter. Exemples qui exercent le graphe :

- « des offres à Ziguinchor » → recherche simple
- « suis-je prêt pour cette offre ? » → **écart de compétences** (compétences manquantes + formations)
- « que me conseilles-tu ? » → **reco** (collaboratif + éligibilité)
- « des parcours dans le numérique ? » → **parcours multi-entités**

**API directe** (avec un cookie de session) :

```bash
# 1) récupérer un cookie de session
curl -c /tmp/cjs.txt "http://localhost:3000/api/dev/login?to=/jeune/yaye"
# 2) interroger l'agent
curl -b /tmp/cjs.txt -H "Content-Type: application/json" -X POST \
  http://localhost:3000/api/ia \
  -d '{"message":"Quelles opportunités correspondent à mon niveau ?"}'
```

Vérifier dans les logs que le **graphe est actif** :

```bash
docker logs guichet_app 2>&1 | grep '\[graph\] adapter'
# → {"…","message":"[graph] adapter actif","backend":"neo4j"}
```

---

## 9. Inspecter les briques

```bash
# Neo4j Browser : http://localhost:7474  (neo4j / yaye_dev_password)
#   MATCH (n) RETURN count(n);            -- nœuds
#   MATCH ()-[r]->() RETURN count(r);     -- relations

# MariaDB
docker exec -it guichet_mariadb mariadb -u guichet -pguichet_dev_password yaye_poc_enriched

# Redis
docker exec -it guichet_redis redis-cli
#   KEYS yaye:ctx:*        -- contextes de conversation

# Logs app
docker logs -f guichet_app
```

---

## 10. Tests automatisés

```bash
npm run validate                       # lint + tsc + tests (à passer avant tout commit)
npm run test -- --no-coverage          # jest seul
npx jest tests/unit/yaye               # suite Yaye (agent + graphe)
```

---

## 11. Dépannage

| Symptôme | Cause / Solution |
|----------|------------------|
| `next build`/pre-commit échoue sur une erreur TS fantôme (ex. `dashboard-reco-carousel`) | **Cache `.tsbuildinfo` empoisonné** → `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit` |
| `Cannot connect to the Docker daemon` | Docker Desktop arrêté → `open -a Docker`, attendre que `docker info` réponde |
| Port `3000` occupé | `lsof -ti tcp:3000 \| xargs kill -9` (ne pas cumuler container `app` + `npm run dev`) |
| Page test en **404** | Le container tourne une **image périmée** → `docker compose up -d --build app` |
| Agent répond mais `backend":"prisma"` | `NEO4J_URI`/`NEO4J_PASSWORD` absents de l'env de l'app (fallback Prisma) |
| `dev/login` : « utilisateur introuvable » | L'`uid` n'existe pas dans la base MariaDB pointée par `DATABASE_URL` |
| `CREATE DATABASE` Neo4j refusé | Nom de base : **pas d'underscore** (ascii/chiffres/points/tirets) — ex. `yayeapp`, pas `yaye_app` |

---

## 12. Checklist « comme en prod »

- [ ] `docker compose ps` → `app`, `mariadb`, `redis`, `neo4j` **Up (healthy)**
- [ ] MariaDB initialisée (migrations + seed, **ou** dump POC)
- [ ] Neo4j **projeté** depuis MariaDB (`yaye:reproject`) et `NEO4J_DATABASE` aligné
- [ ] `GROQ_API_KEY` renseignée
- [ ] Page test atteignable → l'agent répond avec `backend":"neo4j"` et des **cards** cliquables
- [ ] `npm run validate` vert

---

## 13. Écarts local ↔ prod (à connaître)

| Sujet | Local | Prod |
|-------|-------|------|
| Auth | `/api/dev/login` (sans SSO) | SSO CJS OIDC — **dev/login 404** |
| Neo4j | container `5-enterprise` | **Neo4j Aura** (`neo4j+s://`) |
| Redis | container | Upstash (`rediss://` + TLS) |
| Crons | appel manuel `curl` | Vercel Cron (`vercel.json`) |
| App | image Docker locale / `npm run dev` | build Vercel (`output: standalone`) |
| Données | `guichet_jeunesse` (seed) ou dump POC | base de prod réelle |

> La bascule prod se fait **uniquement par variables d'environnement** (`NEO4J_URI` Aura, `DATABASE_URL` managé, `REDIS_URL` Upstash…) — **aucun changement de code**.
