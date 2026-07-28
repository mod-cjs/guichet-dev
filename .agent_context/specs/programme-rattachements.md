# Rattachement aux programmes — socle générique M:N

**Ticket** : GUIC-684 · **Modules** : m3-opportunites · m5-agenda · m6-ressources · m8-admin · m12-ia
**Statut spec** : IMPLÉMENTÉE (2026-07-28) — lots 1 à 7 livrés + extension acteurs

---

## 1. Constat mesuré

Relevé le 2026-07-28 sur la base de travail `yaye_poc_enriched` et le graphe Neo4j `enriched` :

| Mesure | Valeur |
|---|---|
| Programmes en base (`programmes`) | **4** (yaakaar, yeah, yjc, edupop) |
| Opportunités | **4 340** |
| Opportunités avec `programme_id` renseigné | **0** |
| Ressources | 23 — aucun lien programme possible (pas de colonne) |
| Événements | 8 — aucun lien programme possible (pas de colonne) |
| Nœuds `:Programme` dans le graphe `enriched` | **4** |
| Arêtes `[:FINANCE]` dans le graphe `enriched` | **0** |

Autrement dit : les 4 programmes existent en base **et** dans le graphe, mais y sont **orphelins** — aucun contenu ne s'y rattache. Yaye ne peut donc répondre à aucune question du type « quelles opportunités relèvent de YEAH ? ».

Causes racines, vérifiées dans le code :

- `Opportunite.programmeId` existe (`prisma/schema.prisma:459`) mais **rien ne l'écrit** : ni `OpportuniteForm.tsx` (aucun champ programme), ni `prisma/seed/opportunites.ts`, ni `scripts/sql/diversify-enriched.sql`.
- `Ressource` (`schema.prisma:796`) et `Evenement` (`schema.prisma:752`) n'ont **aucune** relation vers `Programme`.
- La projection ne crée `FINANCE` que si `programmeId` est non nul (`src/lib/ia/graph/projection/project.ts:194` et `:475`) → 0 arête, mécaniquement.

Deux définitions concurrentes du référentiel cohabitent par ailleurs : la table `Programme` et la constante `src/lib/programmes.ts` (descriptions divergentes pour YEAH). La table doit devenir l'unique source.

---

## 2. Modèle retenu

Prisma n'a pas de relation polymorphique. Une table unique `(programme_id, entity_type, entity_id)` sacrifierait l'intégrité référentielle et les cascades → **une jonction par entité**, de forme identique, calquée sur `OpportuniteTag` (`schema.prisma:1303`) :

```prisma
model OpportuniteProgramme {          // idem RessourceProgramme / EvenementProgramme
  opportuniteId String  @map("opportunite_id") @db.VarChar(36)
  programmeId   String  @map("programme_id")   @db.VarChar(36)
  principal     Boolean @default(false)

  opportunite Opportunite @relation(fields: [opportuniteId], references: [id], onDelete: Cascade)
  programme   Programme   @relation(fields: [programmeId],   references: [id], onDelete: Cascade)

  @@id([opportuniteId, programmeId])
  @@index([programmeId])
  @@map("opportunites_programmes")
}
```

**Invariants** (applicatifs, comme l'invariant XOR mère/sous-type déjà en place) :

- au plus **un** `principal = true` par entité ;
- le **premier** programme rattaché devient principal automatiquement — l'admin ne choisit que s'il le veut ;
- au moins **un** programme à la création (décision PO du 2026-07-28).

`Opportunite.programmeId` n'est plus écrit (déprécié, conservé le temps de la transition). `programme_slug` du Data Hub est dérivé de la ligne `principal` → **contrat externe inchangé**.

**Périmètre livré** : opportunités, ressources, événements (rattachement **obligatoire**),
puis centres et organisations (rattachement **facultatif** — un centre est une infrastructure,
une organisation un partenaire : les deux existent indépendamment des programmes qui s'y
déploient ; l'exiger bloquerait leur création sans apporter de sens métier).
Deux régimes, deux fonctions nommées : `replaceProgrammes` / `replaceProgrammesOptionnels`.
**Livre** reste hors périmètre.

---

## 3. Lots

### Lot 1 — Socle (schéma + helper + backfill)

- 3 tables de jonction, migration `add_programme_rattachements`.
- `src/lib/programmes/rattachement.ts` : `replaceProgrammes(tx, delegate, fk, entityId, slugs)` — résolution `slug → id`, purge/recréation, calcul du principal. **Seul endroit testé en profondeur**, les 3 entités s'y branchent.
- `scripts/backfill-programme-rattachements.ts` idempotent (`opportunites.programme_id` → jonction, `principal = true`). No-op attendu sur les données actuelles, indispensable pour la prod.
- `src/lib/programmes.ts` réduit au mapping `slug → gradientToken` ; la table devient la source unique.

### Lot 2 — Opportunités (service + DTO)

- `OpportuniteService` : `programmeSlugs: string[]` (remplace `programmeSlug`), `programmes[]` dans l'include (`opportunite-service.ts:247`) et le type de retour, filtre de liste `programmeSlugs` (`:264`).
- `src/lib/opportunites/dto.ts` : `programmes: ProgrammeRefDTO[]` + `programmes_slugs` (aplati). `programme` et `programme_slug` **inchangés**, servis depuis le principal.
- Export Data Hub `src/app/api/v1/export/opportunites/route.ts` (include ligne 24).

### Lot 3 — Ressources & événements

- `programmes[]` dans les loaders/DTO ressources et événements + routes d'export correspondantes.

### Lot 4 — Admin (3 formulaires)

- Composant partagé `ProgrammesField` à base de `<Chip selected>` (la primitive porte déjà `aria-pressed` — **aucune primitive nouvelle**), avec désignation du principal.
- Câblage : `admin/opportunites/OpportuniteForm.tsx`, `admin/ressources/RessourceFormModal.tsx`, `admin/evenements/EvenementFormModal.tsx` + Zod dans les 3 `actions.ts`.
- Reprise du stock (sinon toute édition d'un contenu ancien échoue à la validation) : présélection à confirmer à l'édition + action de **rattachement en masse** depuis les listes de gestion.

### Lot 5 — Base enrichie (`yaye_poc_enriched`)

Le dataset POC doit porter des rattachements réalistes, sinon le graphe reste vide et Yaye ne peut pas être éprouvée.

- **Migration** : `bash scripts/sync-enriched-migrations.sh` applique la nouvelle migration à la base enrichie (l'outil de réconciliation existe déjà, GUIC-641).
- **Nouveau** `scripts/sql/attach-programmes-enriched.sql`, sur le patron **déterministe** de `diversify-enriched.sql` (CRC32 de l'id → ré-exécutable, même résultat) :

  Programme principal par cohérence métier, à partir du type et du domaine :

  | Règle (dans l'ordre, la dernière gagne) | Programme principal |
  |---|---|
  | `type IN (Emploi, Stage)` | `yjc` (Youth Job Connect) |
  | `type IN (Formation, Bourse)` | `edupop` |
  | `type IN (Appel_a_projets, Volontariat)` | `yaakaar` |
  | `domaine IN (Agriculture, Environnement)` | `yeah` (Agricultural Hub) |
  | `domaine = Entrepreneuriat` | `yaakaar` |

  Puis **second programme** pour ~30 % des lignes (`CRC32(CONCAT(id,'prog2')) % 10 < 3`), choisi différent du principal → le multi-programme est réellement exercé, pas seulement supporté.

  Ressources (23) : par `theme`/`type`. Événements (8) : par `type`. Même logique déterministe.

- **npm script** `db:programmes:enriched`, inséré dans le pipeline documenté :
  ```
  npm run db:load:enriched        # dump + réconciliation des migrations
  npm run db:diversify:enriched   # types + organisations
  npm run db:programmes:enriched  # ← NOUVEAU : rattachements programmes
  tsx scripts/enrich-taxonomie.ts # compétences fines
  npm run yaye:reproject          # MariaDB → Neo4j `enriched`
  ```
- `docs/tester-en-local.md` mis à jour (l'étape manquante est invisible sinon).

### Lot 6 — Graphe Yaye

- `FINANCE` (Programme→Opportunite) projeté depuis la jonction, aux **deux** endroits : projection batch (`project.ts:194`) et projection événementielle (`:475`).
- Nouvelle relation `PORTE` (Programme→RessourcePedagogique et Programme→Evenement), déclarée dans `OPP_PROJECTED_RELS` (`project.ts:427`) pour que la purge des arêtes reste correcte lors d'un retrait de programme.
- **Régression à corriger** : `cypher-templates.ts:182` fait `OPTIONAL MATCH (p:Programme)-[:FINANCE]->(o)` puis projette `p.nom`. Avec N programmes, cette clause **duplique les lignes de résultat** → passer en `collect(DISTINCT p.nom)`. Sans ce correctif, le multi-programme fait répéter les opportunités dans les réponses de l'agent.
- Vérification post-reprojection (requêtes de recette) :
  ```cypher
  MATCH ()-[r:FINANCE]->() RETURN count(r);         // attendu ≈ 5 600 (4 340 + ~30 %)
  MATCH (o:Opportunite) WHERE NOT (:Programme)-[:FINANCE]->(o) RETURN count(o);  // attendu 0
  MATCH ()-[r:PORTE]->() RETURN count(r);           // attendu ≥ 31 (23 ressources + 8 événements)
  ```

### Lot 7 — Catalogues publics

- Filtre « Programme » (multi-select) sur `/opportunites`, `/ressources`, `/agenda`.
- **Point de vigilance** : la liste des opportunités est en SQL brut (`src/lib/opportunites-loader.ts:125-180` — exception assumée dans `DECISIONS.md` pour `MATCH ... BOOLEAN MODE` et le tri `NULLS LAST`). Il faut une clause `EXISTS (...)` écrite à la main dans la requête **et** dans le `COUNT`, plus l'extension de la clé de cache Redis (`:74`) — sinon des résultats filtrés sont servis depuis un cache non filtré.

---

## 4. Ordre d'exécution

```
Lot 1 (socle) ──┬── Lot 2 (opportunités) ──┬── Lot 4 (admin)
                ├── Lot 3 (ressources/évts) ┘
                └── Lot 5 (base enrichie) ── Lot 6 (graphe)
                                             Lot 7 (catalogues)
```

Lot 1 bloque tout. Les lots 2 et 3 sont parallèles. Le lot 5 ne dépend que du schéma (lot 1) — il peut démarrer tôt et sert de banc d'essai aux lots 6 et 7.

---

## 5. Critères d'acceptation

- Migration créée, nommée, appliquée sur `guichet_jeunesse` **et** `yaye_migration_test` (shadow DB) **et** `yaye_poc_enriched`.
- Backfill idempotent + test : aucun rattachement perdu, `principal = true` sur chaque ligne backfillée.
- Les 3 entités acceptent 1..N programmes ; un seul principal ; le premier rattaché le devient.
- Création et édition impossibles sans programme, avec message d'erreur explicite.
- Contrats externes inchangés : `tests/integration/export-opportunites-api.test.ts` et `tests/unit/opportunite-dto.test.ts` verts **sans modification des assertions existantes**.
- Base enrichie : 100 % des 4 340 opportunités rattachées, ~30 % à ≥ 2 programmes ; les 23 ressources et 8 événements rattachés. Script rejouable → mêmes rattachements.
- Graphe : 0 opportunité orpheline de programme, arêtes `PORTE` présentes, et une question multi-programme posée à Yaye ne renvoie pas de doublons.
- TDD strict (RED avant GREEN), `npm run validate` vert, PR vers `dev`.

---

## 6. Risques

| Risque | Parade |
|---|---|
| Cache Redis servant des résultats non filtrés | Clé de cache étendue au filtre programme — testé explicitement |
| Duplication de lignes dans les réponses Yaye | `collect(DISTINCT ...)` dans le template, testé avec 2 programmes |
| Édition de l'existant bloquée par la contrainte « au moins un » | Rattachement en masse + présélection à confirmer (lot 4) |
| Dérive entre `programmeId` et la jonction | `programmeId` n'est plus écrit ; job d'intégrité étendu (`opportunite-integrity.ts`) |
| Dump enrichi rechargé sans l'étape programmes | Étape intégrée au pipeline documenté + compteur affiché en fin de script |

---

## 7. Décisions

- **2026-07-28 (PO)** — rattachement obligatoire dès la création, pas seulement à la publication.
- **2026-07-28** — jonction par entité + drapeau `principal`, plutôt qu'une table polymorphique unique.
- **2026-07-28** — périmètre v1 limité à opportunités / ressources / événements.
- **2026-07-28 (PO)** — le **M:N est assumé comme anticipation**, pas comme réponse à un besoin déjà exprimé :
  aujourd'hui la plupart des contenus n'auront qu'un seul programme, mais le modèle doit être prêt sans
  migration le jour où le cofinancement apparaît. Conséquences à tenir :
  - **ne pas sur-concevoir l'UI** — le champ reste un multi-select trivial, le cas « 1 programme » doit
    coûter un seul clic (le premier sélectionné devient principal, aucune décision supplémentaire) ;
  - **exercer quand même le chemin multi** dans le dataset enrichi (~30 % à ≥ 2 programmes) et dans les
    tests : un chemin non exercé est un chemin cassé le jour où on s'en sert ;
  - le correctif `collect(DISTINCT ...)` de `cypher-templates.ts:182` devient **critique** — le bug ne se
    manifesterait qu'au premier contenu multi-programme, donc longtemps après la mise en production.

## 8. Reste à trancher

- **Livre** : seule entité restée hors périmètre (Centre et Organisation sont livrés).
- Les rattachements du dataset enrichi sont **synthétiques et déterministes** (comme `diversify-enriched.sql`). À confirmer : acceptable pour la recette, ou faut-il une affectation métier réelle sur un sous-ensemble ?
