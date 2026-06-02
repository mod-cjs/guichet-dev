# Plan de rollback — Migration schéma polymorphique opportunités (M3 v2)

**Ticket racine :** GUIC-178 (migration polymorphique) · **Sous-stories :** GUIC-182/186/183/184/185
**Spec maître :** `.agent_context/specs/M3-schema-polymorphique.md` (§9.3, §10, §14)
**Rédacteur :** GUIC-185 (sous-story 178d/4)
**Date :** 2026-06-01

---

## 0. Objectif

Décrire une procédure **reproductible et testée** pour annuler la migration
polymorphique M3 v2 en cas d'incident bloquant en preprod / production.

Trois niveaux de rollback selon l'étape à laquelle l'incident survient :

| Niveau | Étape atteinte | Procédure |
|--------|----------------|-----------|
| L1 | Avant exécution `migrate-opportunites-to-polymorphic.ts` | Rollback Prisma seul (drop des tables/colonnes nouvelles) |
| L2 | Pendant ou juste après l'exécution du script de backfill | Restore SQL dump + reset code |
| L3 | Après application de la migration `drop_legacy_columns` | Restore SQL dump obligatoire (colonnes legacy perdues) |

---

## 1. Pré-requis humains AVANT lancement (preprod / prod)

À exécuter manuellement (ne PAS scripter — checklist Lead) :

```bash
# 1. Tag git du dernier commit dev stable
git checkout dev
git pull --ff-only
git tag pre-migration-m3-v2
git push origin pre-migration-m3-v2

# 2. Dump SQL complet
TS=$(date -u +%Y%m%dT%H%M%SZ)
mysqldump --single-transaction --routines --triggers guichet_jeunesse \
  | gzip > data/dump-pre-m3-v2-${TS}.sql.gz

# 3. Upload dump sur coffre interne
#    - Plesk backup (rétention 90j)
#    - S3 chiffré CJS : s3://cjs-backups/guichet/m3-v2/dump-pre-m3-v2-${TS}.sql.gz

# 4. Capture des stats pré-migration (référence pour vérification post-rollback)
mysql guichet_jeunesse -e "
  SELECT type, COUNT(*) FROM opportunites GROUP BY type;
  SELECT COUNT(*) AS total FROM opportunites;
  SELECT COUNT(*) AS total_candidatures FROM candidatures;
" > data/stats-pre-m3-v2-${TS}.txt
```

**Sans ces 4 étapes, le rollback L3 est IMPOSSIBLE — ne pas lancer la
migration data.**

---

## 2. Procédure rollback L1 — avant backfill

Cas : migrations Prisma 182/186/183/184/185 appliquées, mais script
`migrate-opportunites-to-polymorphic.ts` **non encore exécuté**. Les colonnes
legacy `type` et `organisation` sont encore intactes.

```bash
# 1. Reset du code applicatif
git checkout pre-migration-m3-v2

# 2. Marquer les migrations Prisma comme rolled-back
npx prisma migrate resolve --rolled-back 20260601100300_add_opportunite_subtypes_post_audit
npx prisma migrate resolve --rolled-back 20260601100200_add_opportunite_skill_tag_joins
npx prisma migrate resolve --rolled-back 20260601100100_add_opportunite_subtypes
npx prisma migrate resolve --rolled-back 20260601100000_extend_opportunite_polymorphic_columns
npx prisma migrate resolve --rolled-back 20260601000300_add_tag_table
npx prisma migrate resolve --rolled-back 20260601000200_add_skill_table
npx prisma migrate resolve --rolled-back 20260601000100_add_opportunite_type_table
npx prisma migrate resolve --rolled-back 20260601000000_add_programme_table

# 3. Drop manuel des objets créés
mysql guichet_jeunesse <<'SQL'
  DROP TABLE IF EXISTS opportunites_volontariat;
  DROP TABLE IF EXISTS opportunites_mobilite;
  DROP TABLE IF EXISTS opportunites_mentorat;
  DROP TABLE IF EXISTS opportunites_financement;
  DROP TABLE IF EXISTS opportunites_appel_a_projets;
  DROP TABLE IF EXISTS opportunites_concours;
  DROP TABLE IF EXISTS opportunites_bourse;
  DROP TABLE IF EXISTS opportunites_formation;
  DROP TABLE IF EXISTS opportunites_stage;
  DROP TABLE IF EXISTS opportunites_emploi;
  DROP TABLE IF EXISTS opportunites_skills;
  DROP TABLE IF EXISTS opportunites_tags;
  DROP TABLE IF EXISTS skills;
  DROP TABLE IF EXISTS tags;
  DROP TABLE IF EXISTS opportunite_types;
  DROP TABLE IF EXISTS programmes;

  ALTER TABLE opportunites
    DROP FOREIGN KEY IF EXISTS opportunites_type_id_fkey,
    DROP FOREIGN KEY IF EXISTS opportunites_programme_id_fkey,
    DROP COLUMN IF EXISTS type_id,
    DROP COLUMN IF EXISTS programme_id,
    DROP COLUMN IF EXISTS organisation_libelle,
    DROP COLUMN IF EXISTS niveau_etude_min;
SQL

# 4. Redéploiement application avec ancien code
pm2 reload guichet # ou équivalent
```

**Pas de restore SQL nécessaire** : les colonnes legacy `type` et
`organisation` n'ont pas été touchées.

---

## 3. Procédure rollback L2 — pendant ou après backfill

Cas : script `migrate-opportunites-to-polymorphic.ts` exécuté (partiel ou
total), mais migration `drop_opportunite_legacy_columns` **pas encore
appliquée**. Les colonnes legacy contiennent encore les valeurs originelles.

Option recommandée — **utiliser le dump SQL** :

```bash
# 1. Reset code
git checkout pre-migration-m3-v2

# 2. Restore complet de la base
gunzip < data/dump-pre-m3-v2-<TS>.sql.gz | mysql guichet_jeunesse

# 3. Mark all migrations rolled-back (cf. L1 étape 2)

# 4. Redéploiement
pm2 reload guichet
```

Option alternative — **purge des sous-types et reset colonnes** sans restore
SQL (plus rapide mais perd les corrections admin éventuelles déjà saisies
sur les sous-types) :

```sql
TRUNCATE opportunites_emploi;
TRUNCATE opportunites_stage;
TRUNCATE opportunites_formation;
TRUNCATE opportunites_bourse;
TRUNCATE opportunites_concours;
TRUNCATE opportunites_appel_a_projets;
TRUNCATE opportunites_financement;
TRUNCATE opportunites_mentorat;
TRUNCATE opportunites_mobilite;
TRUNCATE opportunites_volontariat;
UPDATE opportunites SET type_id = NULL, organisation_libelle = NULL;
```

Puis appliquer la procédure L1 pour drop final.

---

## 4. Procédure rollback L3 — après drop des colonnes legacy

Cas : migration `20260602000000_drop_opportunite_legacy_columns` **appliquée**.
Les colonnes `type` (enum) et `organisation` (String) n'existent plus.

**Le restore SQL est obligatoire** — il n'existe aucun chemin sans perte
de données.

```bash
# 1. Mettre l'application en mode maintenance
echo "MAINTENANCE_MODE=true" >> .env
pm2 reload guichet

# 2. Reset code
git checkout pre-migration-m3-v2

# 3. Restore complet
gunzip < data/dump-pre-m3-v2-<TS>.sql.gz | mysql guichet_jeunesse

# 4. Mark migrations rolled-back
# (cf. L1 étape 2 + migration drop_legacy_columns)
npx prisma migrate resolve --rolled-back 20260602000000_drop_opportunite_legacy_columns

# 5. Sortir du mode maintenance
sed -i '/MAINTENANCE_MODE/d' .env
pm2 reload guichet
```

**RPO maximum** = temps écoulé entre le dump et le restore. Communiquer aux
utilisateurs si des opportunités/candidatures ont été créées dans cet
intervalle (perdues).

---

## 5. Vérification post-rollback

Après tout rollback, exécuter :

```sql
-- 1. Comptes alignés avec stats pré-migration
SELECT type, COUNT(*) FROM opportunites GROUP BY type;
SELECT COUNT(*) AS total FROM opportunites;
SELECT COUNT(*) AS total_candidatures FROM candidatures;

-- 2. Aucune table polymorphique résiduelle
SHOW TABLES LIKE 'opportunites_%';
SHOW TABLES LIKE 'opportunite_types';
SHOW TABLES LIKE 'programmes';
SHOW TABLES LIKE 'skills';
SHOW TABLES LIKE 'tags';

-- 3. Aucune colonne polymorphique résiduelle
DESCRIBE opportunites;
-- ne doit contenir que les colonnes legacy + organisationId
```

```bash
# 4. Application smoke test
curl -fsS https://<host>/api/opportunites?limit=5 | jq '.meta.total'
curl -fsS https://<host>/api/v1/export/opportunites?limit=5 | jq '.meta.total'

# 5. Job CRON intégrité ne doit plus tourner (sous-types absents)
# Vérifier les logs : pas d'erreurs Prisma sur opportuniteEmploi etc.

# 6. Test E2E candidature (création opportunité legacy + soumission CV)
npx playwright test tests/e2e/candidature.spec.ts
```

---

## 6. Tests rollback en preprod (obligatoire avant prod)

Avant tout déploiement prod, exécuter cette répétition complète sur
l'environnement preprod :

1. Snapshot stats pré-migration (cf. §1 étape 4)
2. Appliquer migrations 182 → 185
3. Exécuter `migrate-opportunites-to-polymorphic.ts`
4. **Choisir un scénario de rollback (L1, L2 ou L3) au hasard**
5. Exécuter la procédure correspondante
6. Comparer stats post-rollback ↔ snapshot étape 1 → doivent être strictement
   identiques (modulo timestamps `updated_at`)
7. Smoke tests application

**Échec si :** différence dans le nombre d'opportunités, candidatures, ou
table polymorphique résiduelle.

---

## 7. Communication en cas de rollback prod

- **Slack #guichet-incidents** : annonce immédiate (timestamp, niveau de
  rollback, RPO estimé)
- **Email partenaires Data Hub** : si rollback L3, indiquer une éventuelle
  fenêtre de données manquantes
- **JIRA** : créer un ticket GUIC-XXX d'incident, lié à GUIC-178

---

**Documenté par GUIC-185 (sous-story 178d/4). Validé par Lead avant
exécution prod.**
