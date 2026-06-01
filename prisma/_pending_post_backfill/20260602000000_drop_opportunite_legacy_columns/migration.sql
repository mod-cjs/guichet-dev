-- GUIC-185 (M3 v2 — 178d/4) — Drop des colonnes legacy `type` et `organisation`.
-- Voir spec `.agent_context/specs/M3-schema-polymorphique.md` §10 étape 8.
--
-- ⚠️ NE PAS APPLIQUER tant que `scripts/migrate-opportunites-to-polymorphic.ts`
-- n'a pas été exécuté avec succès en preprod ET prod, ET que la vérification
-- post-migration a confirmé que :
--   - 100% des lignes `opportunites` ont `type_id IS NOT NULL`
--   - 100% des lignes ont au moins un sous-type 1:1 non-null
--   - 100% des lignes ont `organisation_libelle` renseigné OU `organisation_id`
--     résolu
--
-- Cette migration est livrée préparée (présente sur la branche) mais reste
-- non appliquée tant que le go/no-go Lead n'est pas posé. Elle complète
-- l'étape 7 (`add_constraints` — NOT NULL sur type_id, drop index legacy)
-- qui sera livrée dans un commit séparé une fois le backfill prod validé.

-- 1. Supprimer l'index legacy sur (type, domaine) — remplacé par
--    opportunites_type_id_domaine_idx créé en 20260601100000.
DROP INDEX `opportunites_type_domaine_idx` ON `opportunites`;

-- 2. Drop des colonnes legacy
ALTER TABLE `opportunites`
  DROP COLUMN `type`,
  DROP COLUMN `organisation`;

-- 3. Drop de l'enum `type_opportunite` au catalogue (MariaDB le supprime
--    automatiquement avec la colonne — pas de DROP TYPE explicite nécessaire
--    en MySQL/MariaDB, contrairement à PostgreSQL).

-- NOTE : le `schema.prisma` doit être mis à jour dans le MÊME commit que
-- l'application de cette migration en prod, pour supprimer :
--   - `model Opportunite { type TypeOpportunite ; organisation String ... }`
--   - `enum TypeOpportunite { ... }`
-- Ce commit de cleanup schema est à livrer après confirmation backfill prod.
