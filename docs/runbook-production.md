# Runbook — mise en production et rollback (GUIC-159)

> **À qui ça sert :** la personne d'astreinte, à 2 h du matin, sous stress, qui n'a pas écrit ce code.
> Chaque commande ci-dessous existe et a été vérifiée. Rien n'est « à adapter » sans que ce soit dit.
>
> **Règle qui prime sur tout le reste :** *la perte de données est irrattrapable, une indisponibilité ne
> l'est pas.* En cas de doute, on coupe le service et on réfléchit. On ne « tente » jamais sur la base.

**Architecture, décisions et constats** : `.agent_context/specs/M14-mise-en-prod.md`.
**Observabilité** : `docs/observabilite.md`.

---

## 0. Ce qu'il faut avoir sous la main

| Élément | Valeur |
|---|---|
| Serveur | OVH + Plesk (BRM, SSO et Guichet sur la même machine) |
| Secrets | `/etc/guichet/prod.env` — **hors dépôt**, `chmod 600`. Jamais commité, jamais collé dans un chat. |
| Compose de prod | `docker-compose.prod.yml` |
| Déploiement | `scripts/deploy/deploy.sh` |
| Rollback | `scripts/deploy/rollback.sh` |
| Sauvegarde / restauration | `scripts/backup/backup.sh` · `scripts/backup/restore-drill.sh` |
| Dumps | `/var/backups/guichet` |
| État de déploiement | `/var/lib/guichet` (dont `previous-image`) |
| Santé | `/api/health` → `{status, checks:{db, redis}}` · **200** si sain, **503** si dégradé |

**Base de données : instance MariaDB de Plesk (10.11.18), pas un conteneur.** Les sauvegardes Plesk
existent déjà — c'est l'argument qui a tranché.

---

## 1. Go / No-Go — avant de lancer quoi que ce soit

**Commencer par ça — une commande, dix secondes, aucun effet de bord :**

```bash
./scripts/deploy/preflight.sh
```

Il vérifie les **faits** contre le serveur réel (secrets et permissions, variables, garde
dev-login, MariaDB joignable **depuis un conteneur**, écriture Redis sous le préfixe ACL,
endpoint S3 qui parle vraiment S3). Il **refuse bruyamment** en disant quoi corriger — plutôt que
de laisser l'app démarrer avec une mauvaise valeur et échouer **en silence** (§5, piège B5).

`deploy.sh` le lance **automatiquement en premier** : il n'y a rien à penser. Le lancer à la main
sert au **diagnostic** — notamment pour obtenir les valeurs d'infra encore inconnues (§9).
Il n'a **aucune variable d'échappement**, volontairement : s'il refuse, c'est qu'il a trouvé
quelque chose. On ne désarme pas un garde-fou.

Le reste de la checklist couvre ce qu'aucun script ne peut vérifier. Une seule case non cochée
= **No-Go**. Il n'y a pas de « presque ».

- [ ] **CI verte sur le commit exact déployé** — pas « la CI d'hier », pas « ça passait en local ».
- [ ] **Staging tourne la même image**, par empreinte (`…@sha256:…`), et a été utilisé pour de vrai.
- [ ] **Sauvegarde restaurée avec succès** dans les 7 jours (`scripts/backup/restore-drill.sh`).
      *Une sauvegarde jamais restaurée n'est pas une sauvegarde.*
- [ ] **Migrations rejouées à froid sur MariaDB 10.11** (pas 11 — cf. §5, piège B1).
- [ ] `/etc/guichet/prod.env` **présent, `chmod 600`**, sans `APP_ENV=local` ni `ALLOW_DEV_LOGIN=true`.
      `/api/dev/login` pose une session **sans passer par le SSO**. La garde (GUIC-564,
      `src/lib/security/prod-guards.ts`) exige **les deux** variables pour l'autoriser, et
      **refuse le démarrage** si elles sont activables alors que `NEXTAUTH_URL` n'est pas locale.
      Autrement dit : ce scénario **casse bruyamment** au lieu d'ouvrir la porte en silence — c'est
      voulu. Si l'app refuse de démarrer avec ce message, c'est le garde-fou qui fait son travail :
      retirer les variables, **jamais neutraliser la garde**.
- [ ] **Fenêtre de déploiement** : hors pic d'usage, avec quelqu'un de disponible pendant 30 min après.
- [ ] **Personne d'astreinte identifiée et joignable** (§7), qui sait où est ce runbook.
- [ ] **Rollback possible** : `/var/lib/guichet/previous-image` existe (sauf tout premier déploiement).

---

## 2. Déployer

```bash
# Sur le serveur, dans le dépôt.
# GUICHET_IMAGE DOIT être une empreinte (@sha256:…), jamais un tag mouvant comme :latest.
# Un tag peut être redéployé sur un contenu différent — l'empreinte, non.
export GUICHET_IMAGE='ghcr.io/<org>/guichet@sha256:<empreinte>'
./scripts/deploy/deploy.sh
```

Le script enchaîne, **dans cet ordre**, et s'arrête à la première erreur :

1. **Sauvegarde de la base** → `/var/backups/guichet/guichet-<stamp>.sql.gz`.
   Un dump vide est **refusé** : pas de migration sur une fausse sauvegarde.
2. **Migrations** dans un conteneur **éphémère bâti sur la nouvelle image** — le schéma est prêt
   *avant* que le nouveau code ne serve une seule requête.
3. **Bascule** de l'image, puis **smoke test** sur l'état de santé du conteneur.
4. **Rollback automatique** vers l'image précédente si le smoke test échoue.

Ce qu'il faut retenir : **le déploiement se rattrape tout seul tant que la base n'a pas été migrée.**
Une fois migrée, le rollback d'image ne suffit plus (§4).

### Après le déploiement — vérifications qui ne se délèguent pas

⚠️ **Le compose de production ne publie AUCUN port** (Plesk possède le 443 et fera le reverse
proxy). Il n'y a donc **pas** de `curl http://127.0.0.1:<port>/api/health` sur l'hôte : la santé se
lit sur le **conteneur**, exactement comme le fait `deploy.sh`.

```bash
C=docker-compose.prod.yml; E=/etc/guichet/prod.env

docker compose -f $C --env-file $E ps                       # état du service
docker compose -f $C --env-file $E logs --tail=100 app      # erreurs au démarrage

# Verdict de santé (le healthcheck interroge /api/health EN INTERNE : DB + Redis)
docker inspect --format '{{.State.Health.Status}}' \
  "$(docker compose -f $C --env-file $E ps -q app)"          # → healthy

# Le détail des sondes, depuis l'intérieur du conteneur
docker compose -f $C --env-file $E exec app \
  node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(console.log)"
```

- [ ] Conteneur **`healthy`** — et `/api/health` renvoie `checks.db` **et** `checks.redis` à `true`.
      **200** = sain · **503** = *dégradé* (base ou Redis muet) : le service ne sert à rien.
- [ ] **Se connecter réellement via le SSO** (pas seulement charger la page d'accueil).
      C'est le seul moyen d'entrer : il n'y a pas de login local.
- [ ] **Téléverser un fichier** (CV ou photo) → vérifie MinIO de bout en bout.
- [ ] Taux de **5xx** stable sur 10 minutes (`docs/observabilite.md`).

---

## 3. Rollback — cible : moins de 15 minutes

**Décider vite.** Le rollback n'est pas un aveu d'échec, c'est la procédure normale.

### Cas A — le déploiement vient d'échouer

`deploy.sh` a **déjà** basculé sur l'image précédente. Vérifier (via le conteneur — aucun port
n'est publié), puis comprendre à froid :

```bash
C=docker-compose.prod.yml; E=/etc/guichet/prod.env
docker compose -f $C --env-file $E ps
docker inspect --format '{{.State.Health.Status}}' "$(docker compose -f $C --env-file $E ps -q app)"
```

### Cas B — régression détectée plus tard (hors fenêtre du smoke test)

```bash
./scripts/deploy/rollback.sh                       # image précédente (/var/lib/guichet/previous-image)
./scripts/deploy/rollback.sh <ref-image@sha256:…>  # ou une image précise
```

### Cas C — le rollback d'image ne suffit pas

**C'est le cas dangereux, et il est prévisible :** si le déploiement fautif a **migré la base**,
l'image antérieure attend un **schéma antérieur**. **Prisma ne rétrograde pas.**

Ordre imposé — ne pas improviser :

1. **Couper le service** (mieux vaut une page d'erreur qu'une base corrompue) :
   ```bash
   docker compose -f docker-compose.prod.yml --env-file /etc/guichet/prod.env stop app
   ```
2. **Restaurer le dump pris juste avant le déploiement** — `/var/backups/guichet/guichet-<stamp>.sql.gz`,
   celui que `deploy.sh` a écrit à l'étape 1.
   ⚠️ **Acte destructeur, décision humaine.** Aucun script ne le fait tout seul, exprès.
   Toute écriture faite depuis ce dump est **perdue** : l'évaluer AVANT (§6).
   ⚠️ **Ce dump-là n'est pas couvert par l'exercice de restauration** (`restore-drill.sh` ne teste que
   les `mariadb-*` — **GUIC-619**). C'est pourtant celui dont tout dépend ici. **Vérifier qu'il est
   lisible avant de détruire quoi que ce soit** :
   ```bash
   gzip -t /var/backups/guichet/guichet-<stamp>.sql.gz && \
     gzip -dc /var/backups/guichet/guichet-<stamp>.sql.gz | head -40   # doit montrer du SQL
   ```
3. **Redéployer l'image correspondant à ce schéma.**
4. Vérifier `/api/health`, puis reprendre §2.

---

## 4. Arbre de décision

```
Incident en production
│
├─ /api/health → 200, checks db+redis true ?
│   ├─ NON → est-ce arrivé APRÈS un déploiement récent ?
│   │        ├─ OUI, base NON migrée ──────► rollback.sh (§3B)          ~5 min
│   │        ├─ OUI, base MIGRÉE ──────────► stop + restauration (§3C)  ~15 min, décision humaine
│   │        └─ NON ────────────────────────► panne d'un service : MariaDB (Plesk) ?
│   │                                          Redis ? MinIO ? → §5
│   └─ OUI mais fonctionnellement cassé (connexion SSO KO, upload KO…)
│            └─────────────────────────────► rollback.sh (§3B), diagnostic à froid
│
└─ Dans le doute : COUPER, puis réfléchir. Une indisponibilité se rattrape.
```

---

## 5. Pièges connus — vérifiés, pas supposés

Chacun a déjà mordu. Détail et preuves dans `.agent_context/specs/M14-mise-en-prod.md` §2.

| # | Piège | Ce que ça donne |
|---|---|---|
| B1 | **MariaDB 10.11 ≠ 11** : collation `utf8mb4` par défaut différente (`general_ci` vs `unicode_ci`) | Une migration sans `COLLATE` explicite passe en CI et **échoue en prod** : clé étrangère refusée (errno 150), `migrate deploy` s'arrête **base à moitié migrée**. |
| B3 | Compose de **dev** déployé en prod (`APP_ENV=local` + `ALLOW_DEV_LOGIN=true`, base POC, ports sur `0.0.0.0`, mots de passe en dur) | C'était le scénario redouté. **Désormais l'app refuse de démarrer** (garde GUIC-564) au lieu de servir avec sa porte d'authentification ouverte. Le risque résiduel n'est plus la porte ouverte, c'est le **service qui ne démarre pas** — et le message d'erreur dit quoi retirer. |
| B5 | Clés Redis hors préfixe `guichet:` | Refusées par l'ACL → **rate-limiting et idempotence des webhooks KO**, en silence. |
| B7 | Migration **après** bascule | Code neuf sur ancien schéma. `deploy.sh` impose l'ordre inverse — **ne pas le contourner**. |
| B8 | Tâches planifiées | Portées par **Vercel Cron** à l'origine : sur OVH, **plus personne ne les exécute** (dont la **purge des CV — rétention CDP**). Vérifier `scripts/cron/`. |
| B9 | Sauvegardes | « Persistant » ≠ « sauvegardé ». MinIO (CV = **données personnelles**), MariaDB, Neo4j. |
| **B10** | **Deux conventions de nommage des dumps** (trouvé en écrivant ce runbook — **GUIC-619**) | `deploy.sh` écrit `guichet-<stamp>.sql.gz`, `backup.sh` écrit `mariadb-<stamp>.sql.gz`. Or la purge de `backup.sh` (rétention 14 j) ne vise **que** `mariadb-*` : **les dumps de déploiement ne sont jamais supprimés**. Ils contiennent les données personnelles de 22 000 personnes → conservation illimitée, **hors de toute politique de rétention (CDP)**. Et `restore-drill.sh` ne cherche que `mariadb-*` : les dumps de déploiement ne sont **jamais testés**. En attendant le correctif : **purger `guichet-*.sql.gz` à la main** après un déploiement validé. |

**Les échecs silencieux sont les pires** : B5 et B8 ne déclenchent aucune alerte. Le service a l'air sain.

---

## 6. Avant de restaurer une sauvegarde — les questions qui font mal

Une restauration **efface les écritures faites depuis le dump**. Se les poser à voix haute :

1. **Quelle heure porte le dump ?** (`ls -la /var/backups/guichet`)
2. **Qu'a-t-on perdu entre ce dump et maintenant ?** Candidatures, réservations, check-ins, messages.
3. **Peut-on l'exporter avant d'écraser ?** Si oui, le faire — même à la main.
4. **Qui prévient les utilisateurs concernés ?** 22 000 personnes : ce n'est pas un détail technique.

Ensuite seulement, restaurer.

---

## 7. Contacts et astreinte

> **Partiellement complété — 3 lignes sur 4 restent vides : toujours un No-Go (§1)
> tant qu'elles ne le sont pas.**
> Un runbook sans contact joignable n'est pas un runbook.

| Rôle | Qui | Joignable | Quand l'appeler |
|---|---|---|---|
| Astreinte applicative | `odiallo@consortiumjeunessesenegal.org`, `adiop@consortiumjeunessesenegal.org` (mêmes destinataires que les alertes Grafana, `infra/observabilite/grafana/provisioning/alerting/contact-points.yml`) | E-mail | 5xx, rollback, doute sur la base |
| Infra / Plesk / serveur | *à compléter* | *à compléter* | MariaDB, réseau, TLS, MinIO, Redis |
| SSO (CJS Auth) | *à compléter* | *à compléter* | Connexion impossible pour tous |
| Décision métier | *à compléter* | *à compléter* | Perte de données, communication utilisateurs |

**Le seuil d'escalade doit être bas.** Réveiller quelqu'un coûte moins cher qu'une base corrompue.

---

## 8. Entretien courant

| Quand | Quoi |
|---|---|
| Hebdomadaire | `scripts/backup/restore-drill.sh` — restaure le dernier dump dans une base **jetable** et vérifie qu'il est exploitable. **Une sauvegarde jamais restaurée n'est pas une sauvegarde.** ⚠️ Ne couvre que les dumps `mariadb-*` (GUIC-619). |
| Après un déploiement validé | **Purger à la main** les `guichet-*.sql.gz` devenus inutiles : la rétention automatique les ignore (piège B10 / GUIC-619). Données personnelles — ne pas les laisser s'accumuler. |
| Avant le go-live | Le même, **obligatoire** (§1). |
| Après toute modif de schéma | Rejouer les 49 migrations **à froid sur MariaDB 10.11** (piège B1). |
| Mensuel | Relire §7 : les gens changent de poste, les numéros meurent. |

---

## 9. Ce que ce runbook ne couvre pas (encore)

Honnêteté sur les trous, plutôt qu'une fausse impression de complétude :

- **Go-live progressif et canary** (10 % → 50 % → 100 %) → **GUIC-158** / **GUIC-160**.
- **Alerting et astreinte outillée** (canal nommé, seuils) → **GUIC-576**. Aujourd'hui, la détection
  d'un incident repose sur quelqu'un qui regarde.
- **Sonde de disponibilité externe** → **GUIC-575**. Un monitoring hébergé sur la machine qu'il
  surveille ne détecte pas sa propre panne.
- **Agrégation des logs** (Loki/Grafana) → **GUIC-544** · **supervision** → **GUIC-545**.
- **Valeurs d'infra encore dues** : nom du conteneur **MinIO** (`S3_ENDPOINT=http://<nom>:9000`),
  **motif de clés ACL Redis** (`ACL GETUSER GUICHET` → ligne `keys`), et confirmation que **MariaDB
  écoute sur une interface joignable depuis le bridge Docker**.
  → **`./scripts/deploy/preflight.sh` répond aux trois en une commande** (§1) : chaque contrôle en
  échec nomme la cause et le correctif. Ces valeurs sont **déjà des variables**
  (`S3_ENDPOINT`, `REDIS_KEY_PREFIX`, `SERVICES_NETWORK`) — ce qui manquait n'était pas le
  mécanisme, c'était la valeur.
  ⚠️ **Si le conteneur MinIO porte un underscore** (`minio_cjs`…, la convention CJS l'utilise —
  `redis_cjs`), **MinIO refusera toutes les requêtes** (HTTP 400, « invalid hostname ») : les
  uploads seront cassés. Correctif non destructif — un alias réseau :
  `docker network connect --alias minio <réseau> <conteneur-minio>` puis
  `S3_ENDPOINT=http://minio:9000`. Le préflight détecte ce cas et le dit (**GUIC-620**).
- **Rotation des secrets** : tout secret ayant transité par un canal non sûr (chat, e-mail) est
  **compromis** et doit être tourné avant le go-live.

---

## Déploiement manuel — sans GitHub Actions (GUIC-639)

**Quand.** Le dépôt est privé ; les minutes GitHub Actions peuvent s'épuiser et bloquer le CD.
Cette procédure construit et déploie **sans une seule minute Actions**. Elle a été **prouvée par
répétition locale** (préflight → sauvegarde → 50 migrations → app healthy).

⚠️ L'image doit contenir le correctif **GUIC-637** (`prisma.config.ts` + toolchain), sinon la
migration échoue. Vérifier que la branche construite l'inclut.

> `build-push.sh` construit en **`linux/amd64` par défaut** (le serveur est amd64 ; un Mac ARM
> produirait de l'arm64 qui plante au démarrage). Surcharge : `PLATFORMS=…`.
> Pour la **version TEST (préprod)**, le déploiement diffère (deux compose combinés, pas
> `deploy.sh`) → voir `docs/deploiement-preprod.md`.

```bash
# 1. S'authentifier auprès de GHCR (jeton avec le scope write:packages)
echo "$GHCR_TOKEN" | docker login ghcr.io -u <utilisateur> --password-stdin

# 2. Construire et pousser — depuis un arbre PROPRE, sur le commit à livrer
./scripts/deploy/build-push.sh v1.0.0
#    → affiche la RÉFÉRENCE PAR EMPREINTE (…@sha256:…) à déployer

# 3. Sur le SERVEUR, déployer cette empreinte (jamais un tag mutable)
GUICHET_IMAGE=ghcr.io/<org>/guichet@sha256:<empreinte> ./scripts/deploy/deploy.sh
```

`deploy.sh` fait le reste : préflight → sauvegarde → migration → bascule → smoke test → rollback
automatique si échec. **Rien d'autre à faire à la main.**

> **Ne jamais rendre le dépôt public pour contourner le quota Actions.** Des secrets sont encore
> dans l'historique git (GUIC-625) : le rendre public les exposerait. La solution durable est un
> **runner auto-hébergé** (GUIC-640), pas la visibilité publique.
