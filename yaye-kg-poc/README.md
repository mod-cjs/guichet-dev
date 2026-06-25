# Yaye — POC Knowledge Graph (SQL → Neo4j)

> **Statut : banc d'essai exploratoire (POC), pas le pipeline de production.**
> Objectif : valider le mapping `MariaDB → Neo4j` et les requêtes de matching Cypher de la
> spec [`02-knowledge-graph-neo4j.md`](../.agent_context/specs/yaye/02-knowledge-graph-neo4j.md)
> avant d'écrire le pipeline Lot 1 (qui, lui, sera en **TypeScript dans Next.js**).

## ⚠️ Invariant à respecter même dans le POC

`Prisma/MariaDB = source de vérité unique. Neo4j = vue dérivée, reconstructible.`
Sens d'écriture **unique** : `SQL → projection → Neo4j`. Jamais l'inverse. Ce notebook ne fait
que **lire** la base et **projeter**. Aucune donnée ne naît dans le graphe.

## Environnement — un seul stack (celui du projet)

On réutilise le `docker-compose.yml` **du projet** (racine du repo), qui fournit désormais :

| Service | Container | Port hôte | Rôle dans le POC |
|---------|-----------|-----------|------------------|
| MariaDB 11 | `guichet_mariadb` | `3307` | source SQL — base **`yaye_poc`** (le dump y est chargé) |
| Neo4j 5 | `guichet_neo4j` | `7474` (browser) · `7687` (bolt) | cible du graphe **en local** |

> Le dump (MySQL 9.4, `data/dump-railway-*.sql`) est chargé dans une base **dédiée `yaye_poc`**,
> séparée de `guichet_jeunesse` (gérée par Prisma) → on ne touche pas à l'environnement de dev.
> Une seule collation `utf8mb4_0900_ai_ci` (MySQL) est remplacée par `utf8mb4_unicode_ci` au chargement.

**Local d'abord, Aura ensuite** : on itère sur le Neo4j local, puis on bascule vers Neo4j Aura
(online) en décommentant les `NEO4J_*` Aura dans `.env` — le notebook est identique.

## Démarche (5 étapes)

```
[1] MariaDB projet · base yaye_poc (dump déjà chargé)
        │  lecture par table (SQLAlchemy + pandas) ──► DataFrames
        ▼
[2] mapping.py : table → label(s) · colonne → propriété · clés étrangères → relations
        ▼
[3] Neo4j LOCAL (guichet_neo4j) : contraintes/index → MERGE nœuds → MERGE relations
        ▼
[4] validation : requêtes de matching de la spec §5 + comptages de cohérence vs SQL
        ▼
[5] bascule Neo4j Aura (online) : même notebook, on change NEO4J_URI dans .env
```

## Mise en route

```bash
# 1) Démarrer le stack (depuis la RACINE du repo) — mariadb + neo4j
docker compose up -d mariadb neo4j

# 2) Recharger le dump dans yaye_poc (uniquement si la base est vide / à reset) :
#    docker exec -i guichet_mariadb mariadb -uroot -proot \
#      -e "CREATE DATABASE IF NOT EXISTS yaye_poc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
#          GRANT ALL ON yaye_poc.* TO 'guichet'@'%'; FLUSH PRIVILEGES;"
#    sed 's/utf8mb4_0900_ai_ci/utf8mb4_unicode_ci/g' yaye-kg-poc/data/dump-railway-*.sql \
#      | docker exec -i guichet_mariadb mariadb -uroot -proot yaye_poc

# 3) Environnement Python (depuis yaye-kg-poc/)
cd yaye-kg-poc
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # valeurs locales déjà bonnes ; Aura en commentaire

# 4) Notebook
jupyter lab notebooks/01_sql_to_neo4j.ipynb
```

Neo4j Browser : <http://localhost:7474> (user `neo4j` / pwd `yaye_dev_password`).

## Cible de ce premier passage

Graphe **complet** (cf. spec §3) — **17 types de nœuds dérivables de la base aujourd'hui** :

- **Opportunités décompressées** : `:Opportunite` + 1 label sous-type parmi 10
  (`:Emploi :Stage :Formation :Bourse :Concours :AppelAProjets :Financement :Mentorat :Mobilite :Volontariat`)
- **Acteurs & référentiels** : `:OpportuniteType :Programme :Organisation :Competence :Tag` + `:Secteur` / `:Region` (enums réifiés)
- **Bénéficiaire & parcours** : `:Beneficiaire :Diplome :Experience :Certificat`
- **Agenda / ressources / centres** : `:Evenement :RessourcePedagogique :Centre :Salle :Vehicule`

> ❌ **Hors périmètre v0** : biblio physique (`:Livre :ExemplaireLibre :Rayon :Emprunt`) — les modèles
> Prisma n'existent pas encore (Lot 3). On ne les invente pas dans le graphe.

## Réalités du dump actuel (à connaître)

- `opportunites` **4 340** · `utilisateurs` **22 510** · `skills` **37** · `centres` **9** — cœur riche.
- ⚠️ `opportunites_skills` = **0** et `profils_jeunes` = **6** : les relations compétence↔opportunité
  (`REQUIERT`/`DEVELOPPE`) et le parcours bénéficiaire sont **quasi vides** → les requêtes d'écart
  de compétences / reco collaborative valident la **mécanique** mais pas encore la **pertinence**.

## Arborescence

```
yaye-kg-poc/
├── README.md                     ← ce fichier (la démarche)
├── requirements.txt
├── .env.example                  ← Neo4j local (défaut) + Aura (commenté) + MariaDB yaye_poc
├── data/                         ← dump-railway-*.sql (gitignored — PII : 22 510 users réels)
├── src/
│   ├── mapping.py                ← spec déclarative tables/colonnes/relations → graphe
│   └── graph_loader.py           ← helpers MariaDB → Neo4j (MERGE idempotents)
└── notebooks/
    └── 01_sql_to_neo4j.ipynb     ← le notebook de travail
```

> Le stack Docker (mariadb + neo4j) vit dans le `docker-compose.yml` **à la racine du repo**,
> pas ici — un seul environnement pour tout le projet.

## Garde-fous POC

- **Idempotence** : tout est `MERGE` sur la clé naturelle (`id`, `slug`, `cjs_uid`). Rejouable à volonté.
- **Données minimales sur `:Beneficiaire`** : pas de PII sensible dans le graphe (cf. spec §3.C + doc 07).
  La MariaDB locale détient toute la PII (22 510 users) — ne pas l'exposer ; `data/*.sql` est gitignoré.
- **Validation = comptages** : `count(:Opportunite)` Neo4j == `COUNT(*) opportunites` SQL, etc.
- Le POC ne remplace pas le pipeline événementiel + sync nocturne de prod (Lot 1, TypeScript).
```

