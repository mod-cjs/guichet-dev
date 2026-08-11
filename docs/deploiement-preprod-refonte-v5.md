# Déploiement préprod de la refonte v5 — runbook ordonné

> Complète `docs/deploiement-preprod.md` (procédure générique deux-compose). Ce
> document ne traite que ce que **cette** livraison ajoute : une clé bloquante,
> deux scripts de rattrapage et un enrichissement de données.
>
> **L'ordre n'est pas commutatif.** Chaque étape suppose la précédente.

---

## Pourquoi un ordre

Trois contraintes se croisent :

- `CONSULTATION_HASH_KEY` doit exister **avant** le premier démarrage : sans elle
  le conteneur refuse de se lever, donc la migration elle-même échoue.
- Les scripts de rattrapage supposent le **schéma migré** : `matricule` et le
  barème rééquilibré n'existent qu'après `prisma migrate deploy`.
- L'enrichissement suppose les **données déjà en place** : il complète, il ne crée
  pas.

---

## 0 — Avant de toucher quoi que ce soit

```bash
# Point de retour : noter l'image actuellement servie
docker compose $CT ps -q app | xargs -r docker inspect --format '{{index .Config.Image}}'
```

La sauvegarde préprod fonctionne désormais (`scripts/backup/backup.sh` +
`restore-drill.sh` ciblent `cjs-net`, GUIC-662/GUIC-571) — lancer
`bash scripts/backup/backup.sh` avant de migrer reste la bonne pratique. Le
redéploiement de l'image notée ci-dessus reste le retour arrière **le plus
rapide** pour une migration additive, mais n'est plus le seul filet.

---

## 1 — La clé de pseudonymisation (BLOQUANT)

Sans elle, le conteneur **ne démarre pas** : `cleHachage()` lève au chargement du
hook d'instrumentation dès que `NODE_ENV=production`.

```bash
sudo cp -a /etc/guichet/test.env /etc/guichet/test.env.bak-$(date +%Y%m%d-%H%M)

if sudo grep -q '^CONSULTATION_HASH_KEY=..*' /etc/guichet/test.env; then
  echo "Déjà présente — on n'y touche pas."
else
  printf 'CONSULTATION_HASH_KEY=%s\n' "$(openssl rand -hex 32)" \
    | sudo tee -a /etc/guichet/test.env >/dev/null
fi

sudo chmod 600 /etc/guichet/test.env
```

Vérifier — les trois doivent être satisfaits :

```bash
sudo grep -c '^CONSULTATION_HASH_KEY=..*' /etc/guichet/test.env   # → 1, jamais 2
sudo grep -nE '^[A-Z_]+= ' /etc/guichet/test.env                  # → rien (espace après = ⇒ variable vide)
sudo cut -d= -f1 /etc/guichet/test.env | sort | uniq -d           # → rien (doublon ⇒ la dernière gagne)
```

**Une fois posée, ne plus la changer.** Elle pseudonymise les consultations : la
remplacer rendrait les hachages existants incomparables avec les nouveaux, sans
erreur ni signal.

Ne pas confondre avec `chown 1001:1001` : `test.env` est lu par Docker Compose
**sur l'hôte** (`env_file:`), il n'est pas monté dans le conteneur. `600 root:root`
est correct. La règle uid 1001 vaut pour les fichiers montés, comme la clé GCP.

---

## 2 — Bascule de l'image

```bash
export GUICHET_IMAGE='ghcr.io/adiop-consortiumjeunessesenegal-org-cjs/guichet@sha256:5dd1f472045059ad64c07912b618c830705fc1fc94b7bb282e3fb463d0787af3'
export COMPOSE_PROJECT_NAME=guichet-test
export GUICHET_ENV_FILE=/etc/guichet/test.env    # EXPORTÉ — --env-file ne suffit pas

CT="-f docker-compose.prod.yml -f docker-compose.test.yml"

docker pull "$GUICHET_IMAGE"
docker inspect --format '{{.Architecture}}' "$GUICHET_IMAGE"   # → amd64, sinon STOP

docker compose $CT run --rm --no-deps app npx prisma migrate deploy
docker compose $CT up -d --no-deps app

docker inspect --format '{{.State.Health.Status}}' "$(docker compose $CT ps -q app)"
curl -fsS http://127.0.0.1:8081/api/health && echo OK
```

Le contrôle d'architecture n'est pas décoratif : une image arm64 construite sur un
Mac démarre en « exec format error », **après** le pull et la migration.

---

## 3 — Rattrapages, une fois l'application debout

Les deux scripts sont **idempotents** et disposent d'un `--dry-run`. Les lancer
dans cet ordre.

### 3.1 Matricules de membre

Le matricule est nullable : les comptes migrés n'en ont pas tant que ce script
n'est pas passé, et la carte reste utilisable sans (le QR porte
l'identification).

```bash
docker compose $CT run --rm --no-deps app npx tsx scripts/backfill-matricules.ts --dry-run
docker compose $CT run --rm --no-deps app npx tsx scripts/backfill-matricules.ts
```

L'année du matricule est celle de l'**inscription**, pas de l'exécution : un
membre de 2019 porte `GJ-2019-…`.

### 3.2 Scores de complétion

Le barème a été rééquilibré à 100 points (il totalisait 110, plafonnés). Le score
persisté ne se recalcule qu'à l'enregistrement du profil — et il alimente
**l'export Data Hub** (palier public) et **la projection du graphe Yaye**. Sans ce
script, l'écran afficherait une valeur et les exports une autre.

```bash
docker compose $CT run --rm --no-deps app npx tsx scripts/recalcul-scores-completion.ts --dry-run
docker compose $CT run --rm --no-deps app npx tsx scripts/recalcul-scores-completion.ts
```

---

## 4 — Enrichissement des données (optionnel)

**Ne pas utiliser `enrich-enriched-db.sql`.** Il est écrit pour le dataset POC
`yaye_poc_enriched` — il vide douze tables sans `WHERE`, fabrique des données
personnelles sensibles et redistribue les rôles.

Utiliser `scripts/sql/enrichir-preprod.sql`, qui n'ajoute que ce qui manque :

```bash
# Toujours mesurer avant
mysql -h <hôte> -u <user> -p <base> -e "
  SELECT COUNT(*) AS offres_recruteur FROM opportunites WHERE recruteur_uid IS NOT NULL;
  SELECT COUNT(*) AS rattachements    FROM opportunites_programmes;"

mysql -h <hôte> -u <user> -p <base> < scripts/sql/enrichir-preprod.sql
```

Le script affiche son périmètre avant d'écrire et cinq contrôles après. Relire la
sortie : « offres portant plusieurs sous-types » ne doit **pas augmenter**.

---

## 5 — Vérifier service par service

La configuration manquante ne fait pas planter : elle rend une fonctionnalité
muette. Deux pannes de ce type ont été trouvées pendant cette livraison — la clé
de pseudonymisation et le stockage MinIO — et **aucune des deux ne se voyait sur
la page d'accueil**.

| Service | Comment le prouver |
|---|---|
| SSO | se connecter réellement, pas seulement charger `/auth/connexion` |
| MinIO | changer sa photo de profil, puis **recharger** — l'URL stockée doit s'afficher |
| Vertex | poser une question à Yaye et obtenir une réponse avec sa ligne de sources |
| Neo4j | ouvrir les recommandations : vides = graphe non reprojeté |
| Maps | ouvrir `/centres` — la clé `NEXT_PUBLIC_*` est inlinée **au build** |
| Carte CJS | `/jeune/ma-carte` doit afficher un matricule `GJ-AAAA-NNNNNX` |
| Profil | `/jeune/mon-profil` — la checklist et le bandeau doivent afficher le **même** score |

Détail complet dans `docs/go-live-checklist.md` §4.

---

## 6 — Retour arrière

```bash
export GUICHET_IMAGE='<empreinte notée à l’étape 0>'
docker pull "$GUICHET_IMAGE"
docker compose $CT up -d --no-deps app
```

Les migrations de ce lot sont additives : le retour d'image suffit. Le seul
`DROP COLUMN` du lot (`opportunites.programme_id`) est **auto-portant** — il
recopie les rattachements dans la table de jonction avant de supprimer. Ne pas
rejouer `enrichir-preprod.sql` après un rollback : il complète, il ne défait rien.
